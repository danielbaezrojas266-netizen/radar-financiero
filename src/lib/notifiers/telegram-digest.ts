import type { AlertWithTier } from "@/lib/filters/delivery-rules";
import { verificationLabel } from "@/lib/filters/cross-verify";
import { formatDiscountForTelegram } from "@/lib/filters/discount-context";
import { formatMacroForTelegram } from "@/lib/fetchers/macro-context";
import type { MacroContextSnapshot } from "@/lib/types";
import { translateAlertText } from "@/lib/notifiers/translate";
import {
  formatCostaRicaTime,
  getTimezone,
} from "@/lib/notifiers/digest-queue";
import {
  formatTraderAlertMessage,
  sendTelegramMessage,
} from "@/lib/notifiers/telegram";

const CATEGORY_ES: Record<string, string> = {
  fed: "Fed / Tasas",
  macro: "Macro / DXY / Yields",
  geopolitics: "Geopolítica / Oro",
  btc_whale: "Flujo BTC / On-chain",
  btc_regulation: "Regulación BTC",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function formatBatch15mReport(
  alerts: AlertWithTier[],
  macro?: MacroContextSnapshot
): Promise<string> {
  if (alerts.length === 0) return "";

  const lines = [
    `<b>🟠 Prioridad ALTA — ventana 15 min</b>`,
    `<i>${alerts.length} evento(s) · ${formatCostaRicaTime()}</i>`,
    "",
  ];

  const grouped = new Map<string, AlertWithTier[]>();
  for (const a of alerts) {
    const list = grouped.get(a.category) ?? [];
    list.push(a);
    grouped.set(a.category, list);
  }

  for (const [cat, items] of grouped) {
    lines.push(`<b>${CATEGORY_ES[cat] ?? cat}</b>`);
    for (const item of items.slice(0, 5)) {
      const { title } = await translateAlertText(item.title, item.summary);
      const ver = verificationLabel(
        item.verificationStatus ?? "confirmed_traditional"
      );
      lines.push(`· ${escapeHtml(title.slice(0, 110))}`);
      lines.push(`  <i>${escapeHtml(ver)}</i>`);
      if (item.discountContext) {
        lines.push(
          `  ${formatDiscountForTelegram(item.discountContext).replace(/\n/g, "\n  ")}`
        );
      }
    }
    lines.push("");
  }

  if (macro) {
    lines.push("<b>Contexto macro:</b>");
    lines.push(formatMacroForTelegram(macro));
  }

  return lines.join("\n");
}

export async function sendBatch15mReport(
  alerts: AlertWithTier[],
  macro?: MacroContextSnapshot
): Promise<boolean> {
  const message = await formatBatch15mReport(alerts, macro);
  if (!message) return false;
  return sendTelegramMessage(message);
}

export async function formatDigestReport(
  alerts: AlertWithTier[],
  slot: "morning" | "afternoon",
  macro?: MacroContextSnapshot
): Promise<string> {
  const label =
    slot === "morning"
      ? "🌅 Resumen programado — 7:00 AM (CR)"
      : "🌇 Resumen programado — 4:30 PM (CR)";

  const lines: string[] = [
    `<b>${label}</b>`,
    `<i>Radar Financiero · ${getTimezone()}</i>`,
    "",
  ];

  // 1. Noticias y flujos institucionales
  lines.push("<b>1. Flujos institucionales recientes</b>");
  if (alerts.length === 0) {
    lines.push("Sin novedades operativas relevantes en este periodo.");
  } else {
    const top = [...alerts]
      .sort((a, b) => {
        const p = { critical: 0, high: 1, medium: 2 };
        return p[a.priority] - p[b.priority];
      })
      .slice(0, 10);

    for (const item of top) {
      const { title } = await translateAlertText(item.title, item.summary);
      const ver = verificationLabel(
        item.verificationStatus ?? "confirmed_traditional"
      );
      const link = item.url
        ? ` <a href="${escapeHtml(item.url)}">→</a>`
        : "";
      lines.push(
        `· [${item.priority.toUpperCase()}] ${escapeHtml(title.slice(0, 100))}${link}`
      );
      lines.push(`  <i>${escapeHtml(ver)} · ${escapeHtml(item.sourceName)}</i>`);
    }
  }

  // 2. Eventos programados (placeholder — calendario externo)
  lines.push("", "<b>2. Eventos macro programados</b>");
  lines.push(
    "Consultar calendario: CPI, PPI, NFP, FOMC, PMI, PCE. Priorizar consenso de Wall Street vs dato real."
  );

  // 3. Sesgo institucional
  lines.push("", "<b>3. Sesgo institucional (proxy)</b>");
  const hasRiskOff = alerts.some(
    (a) =>
      a.category === "geopolitics" ||
      (a.category === "macro" && a.priority !== "medium")
  );
  lines.push(
    hasRiskOff
      ? "Tendencia risk-off / cautela — flujos macro o geopolítica activos"
      : "Sin sesgo institucional fuerte detectado en el periodo"
  );

  // 4. Próximos eventos críticos
  lines.push("", "<b>4. Ventanas de volatilidad</b>");
  lines.push(
    "Post-CPI/NFP/FOMC: volatilidad típica 15–60 min. Ajustar EAs / esperar confirmación en manual."
  );

  // 5. Rumores X pendientes
  const rumors = alerts.filter(
    (a) =>
      a.verificationStatus === "early_signal_x" ||
      a.verificationStatus === "rumor_moving_market"
  );
  lines.push("", "<b>5. Rumores en X (estado)</b>");
  if (rumors.length === 0) {
    lines.push("Sin rumores pendientes de confirmación.");
  } else {
    for (const r of rumors.slice(0, 5)) {
      const { title } = await translateAlertText(r.title, r.summary);
      lines.push(`· ${escapeHtml(title.slice(0, 90))} — <i>no confirmado</i>`);
    }
  }

  // 6. DXY y yields
  lines.push("", "<b>6. DXY y yields</b>");
  if (macro) {
    lines.push(formatMacroForTelegram(macro));
  } else {
    lines.push("Datos macro no disponibles en este ciclo.");
  }

  lines.push(
    "",
    "<i>Prioridad CRÍTICA = instantáneo · ALTA = cada 15 min · MEDIA = solo resumen</i>"
  );

  return lines.join("\n");
}

export async function sendDigestReport(
  alerts: AlertWithTier[],
  slot: "morning" | "afternoon",
  macro?: MacroContextSnapshot
): Promise<boolean> {
  const message = await formatDigestReport(alerts, slot, macro);
  return sendTelegramMessage(message);
}

export async function sendInstantTraderAlert(
  alert: AlertWithTier,
  macro?: MacroContextSnapshot
): Promise<boolean> {
  const base = await formatTraderAlertMessage(alert, macro);
  return sendTelegramMessage(`🚨 <b>ALERTA EN TIEMPO REAL</b>\n\n${base}`);
}

/** @deprecated */
export async function sendInstantCategory1Alert(
  alert: AlertWithTier
): Promise<boolean> {
  return sendInstantTraderAlert(alert, alert.macroContext);
}
