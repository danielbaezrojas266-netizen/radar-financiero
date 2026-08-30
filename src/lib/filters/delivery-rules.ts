import {
  isApprovedSource,
  BLOCKCHAIN_SOURCE_IDS,
} from "@/lib/config/approved-sources";
import {
  CRITICAL_EVENT_TERMS,
  CRITICAL_BOOST_TERMS,
} from "@/lib/config/keywords";
import {
  applyCrossVerification,
  canBeCriticalInstant,
  detectConsensusNote,
} from "@/lib/filters/cross-verify";
import { buildDiscountContext } from "@/lib/filters/discount-context";
import type { Alert, DeliveryTier, MacroContextSnapshot } from "@/lib/types";

export type AlertWithTier = Alert & { deliveryTier: DeliveryTier };

function textOf(alert: Alert): string {
  return `${alert.title} ${alert.summary}`.toLowerCase();
}

function isCriticalEvent(alert: Alert): boolean {
  const text = textOf(alert);
  return CRITICAL_EVENT_TERMS.some((t) => {
    if (t.includes(" ")) return text.includes(t);
    return new RegExp(`\\b${t}\\b`, "i").test(text);
  });
}

function isHighTierEvent(alert: Alert): boolean {
  if (alert.priority === "high") return true;
  const text = textOf(alert);
  return CRITICAL_BOOST_TERMS.some((t) => text.includes(t));
}

function assignTier(alert: Alert, macro?: MacroContextSnapshot): DeliveryTier {
  if (!isApprovedSource(alert.sourceId, alert.sourceName)) {
    return "dropped";
  }

  if (alert.priority === "medium") {
    return "digest";
  }

  if (BLOCKCHAIN_SOURCE_IDS.has(alert.sourceId)) {
    return alert.priority === "high" ? "batch_15m" : "digest";
  }

  const isCritical =
    alert.priority === "critical" && isCriticalEvent(alert);

  if (isCritical && canBeCriticalInstant(alert)) {
    return "instant";
  }

  if (
    macro &&
    alert.category === "macro" &&
    (macro.dxyShock || macro.tipsShock) &&
    alert.title.includes("Movimiento abrupto macro")
  ) {
    return "instant";
  }

  if (alert.priority === "critical" && !canBeCriticalInstant(alert)) {
    return "batch_15m";
  }

  if (alert.priority === "high" || isHighTierEvent(alert)) {
    return "batch_15m";
  }

  return "digest";
}

export function applyDeliveryRules(
  alerts: Alert[],
  macro?: MacroContextSnapshot
): AlertWithTier[] {
  const verified = applyCrossVerification(alerts);

  return verified
    .map((alert) => {
      const tier = assignTier(alert, macro);
      const consensusNote = detectConsensusNote(textOf(alert));
      return {
        ...alert,
        deliveryTier: tier,
        macroContext: alert.assets.includes("XAU") ? macro : alert.macroContext,
        consensusNote: consensusNote ?? alert.consensusNote,
        priceReactionNote: buildPriceReactionNote(alert, macro),
      };
    })
    .filter((a) => a.deliveryTier !== "dropped");
}

export async function enrichWithDiscountContext(
  alerts: AlertWithTier[]
): Promise<AlertWithTier[]> {
  return Promise.all(
    alerts.map(async (alert) => {
      if (alert.discountContext) return alert;
      const discountContext = await buildDiscountContext(alert);
      if (!discountContext) return alert;
      return { ...alert, discountContext };
    })
  );
}

function buildPriceReactionNote(
  alert: Alert,
  macro?: MacroContextSnapshot
): string | undefined {
  if (!macro) return undefined;
  if (!alert.assets.includes("XAU") && !alert.assets.includes("BTC")) {
    return undefined;
  }

  const parts: string[] = [];
  if (alert.assets.includes("XAU") && macro.xauUsd) {
    parts.push(
      `XAU ${macro.xauUsd.changePct >= 0 ? "+" : ""}${macro.xauUsd.changePct.toFixed(2)}% (24h)`
    );
  }
  if (alert.assets.includes("BTC") && macro.btcUsd) {
    parts.push(
      `BTC ${macro.btcUsd.changePct >= 0 ? "+" : ""}${macro.btcUsd.changePct.toFixed(2)}% (24h)`
    );
  }

  if (alert.assets.includes("XAU") && macro.dxy) {
    const corr =
      (macro.dxy.direction === "up" && macro.xauUsd && macro.xauUsd.changePct < 0) ||
      (macro.dxy.direction === "down" && macro.xauUsd && macro.xauUsd.changePct > 0)
        ? "correlación DXY-oro coherente"
        : "posible divergencia DXY-oro";
    parts.push(corr);
  }

  return parts.length ? parts.join(" · ") : undefined;
}
