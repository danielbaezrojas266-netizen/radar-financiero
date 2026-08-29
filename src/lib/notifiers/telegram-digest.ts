import type { AlertWithTier } from "@/lib/filters/delivery-rules";
import { translateAlertText } from "@/lib/notifiers/translate";
import { sendTelegramMessage } from "@/lib/notifiers/telegram";

const CATEGORY_ES: Record<string, string> = {
  fed: "Fed / Tasas",
  macro: "Macro",
  geopolitics: "Geopolítica",
  btc_whale: "Ballenas BTC",
  btc_regulation: "Regulación",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function formatDigestReport(
  alerts: AlertWithTier[],
  slot: "morning" | "afternoon"
): Promise<string> {
  const label =
    slot === "morning" ? "🌅 Resumen matutino" : "🌇 Resumen vespertino";

  if (alerts.length === 0) {
    return `${label}\n\nSin novedades operativas relevantes en este periodo.`;
  }

  const lines: string[] = [
    `<b>${label}</b>`,
    `<i>${alerts.length} noticia(s) operativa(s) — no urgente</i>`,
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
    for (const item of items.slice(0, 8)) {
      const { title } = await translateAlertText(item.title, item.summary);
      const link = item.url
        ? ` <a href="${escapeHtml(item.url)}">→</a>`
        : "";
      lines.push(`· ${escapeHtml(title.slice(0, 120))}${link}`);
    }
    if (items.length > 8) {
      lines.push(`  <i>+${items.length - 8} más</i>`);
    }
    lines.push("");
  }

  lines.push("<i>Alertas instantáneas solo para eventos Cat. 1</i>");
  return lines.join("\n");
}

export async function sendDigestReport(
  alerts: AlertWithTier[],
  slot: "morning" | "afternoon"
): Promise<boolean> {
  const message = await formatDigestReport(alerts, slot);
  return sendTelegramMessage(message);
}

export async function sendInstantCategory1Alert(
  alert: AlertWithTier
): Promise<boolean> {
  const { formatAlertMessage } = await import("@/lib/notifiers/telegram");
  const base = await formatAlertMessage(alert);
  return sendTelegramMessage(
    `🚨 <b>CAT. 1 — ALERTA INMEDIATA</b>\n\n${base}`
  );
}
