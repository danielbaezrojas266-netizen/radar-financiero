import type { Alert } from "@/lib/types";
import {
  isApprovedSource,
  BLOCKCHAIN_SOURCE_IDS,
} from "@/lib/config/approved-sources";

export type DeliveryTier = "instant" | "digest" | "dropped";

export type AlertWithTier = Alert & { deliveryTier: DeliveryTier };

function textOf(alert: Alert): string {
  return `${alert.title} ${alert.summary}`.toLowerCase();
}

/** Categoría 1 — único motivo de alerta instantánea a Telegram */
export function isCategory1(alert: Alert): boolean {
  const text = textOf(alert);
  const src = alert.sourceName.toLowerCase();

  const isOfficial =
    src.includes("bls") ||
    src.includes("bea") ||
    src.includes("reuters") ||
    src.includes("fed") ||
    src.includes("sec") ||
    src.includes("cftc") ||
    src.includes("@federalreserve") ||
    src.includes("@reuters");

  // Datos oficiales CPI / PPI
  if (
    isOfficial &&
    /\b(cpi|ppi|consumer price index|producer price index|datos de inflación|inflation report|reporte de inflación)\b/i.test(
      text
    )
  ) {
    return true;
  }

  // Decisiones de tasas Fed / FOMC
  if (
    alert.category === "fed" &&
    isOfficial &&
    /\b(fomc|rate decision|decisión de tasas|rate cut|rate hike|recorte de tasas|subida de tasas|fed funds|basis points|puntos básicos)\b/i.test(
      text
    )
  ) {
    return true;
  }

  // Quiebras / defaults
  if (
    /\b(bankruptcy|bankrupt|quiebra|chapter 11|insolvency|insolvencia|bank failure|fallo bancario|default|colapso bancario)\b/i.test(
      text
    ) &&
    (src.includes("reuters") || src.includes("business") || src.includes("sec"))
  ) {
    return true;
  }

  // Regulación fuerte BTC
  if (
    alert.category === "btc_regulation" &&
    /\b(etf approval|etf aprobado|spot etf|enforcement action|acción de enforcement|prohibición|ban crypto|ley aprobada|sec charges|sec sue|demanda sec|cftc charges|multa millonaria)\b/i.test(
      text
    ) &&
    (src.includes("sec") ||
      src.includes("cftc") ||
      src.includes("reuters") ||
      src.includes("business"))
  ) {
    return true;
  }

  // Guerra / conflicto con impacto en oro
  if (
    alert.category === "geopolitics" &&
    /\b(war|guerra|invasion|invasión|military strike|ataque militar|missile|misil|nuclear|conflicto armado|invasion)\b/i.test(
      text
    ) &&
    (/\b(gold|oro|safe haven|refugio|xau|oro físico|physical gold)\b/i.test(
      text
    ) ||
      src.includes("reuters"))
  ) {
    return true;
  }

  return false;
}

function assignTier(alert: Alert): DeliveryTier {
  const sourceId = alert.sourceId ?? "";

  if (!isApprovedSource(sourceId, alert.sourceName)) {
    return "dropped";
  }

  if (BLOCKCHAIN_SOURCE_IDS.has(sourceId)) {
    return "digest";
  }

  if (isCategory1(alert)) {
    return "instant";
  }

  return "digest";
}

export function applyDeliveryRules(alerts: Alert[]): AlertWithTier[] {
  return alerts
    .map((alert) => ({ ...alert, deliveryTier: assignTier(alert) }))
    .filter((a) => a.deliveryTier !== "dropped");
}
