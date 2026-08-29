import type { Alert, AlertCategory } from "@/lib/types";
import { translateAlertText } from "@/lib/notifiers/translate";

const CATEGORY_LABELS_ES: Record<AlertCategory, string> = {
  fed: "Fed / Tasas de interés",
  macro: "Macro (CPI/PPI/Empleo)",
  geopolitics: "Geopolítica / Oro",
  btc_whale: "Ballenas BTC",
  btc_regulation: "Regulación BTC",
};

const CATEGORY_EMOJI: Record<AlertCategory, string> = {
  fed: "🏛️",
  macro: "📊",
  geopolitics: "🌍",
  btc_whale: "🐋",
  btc_regulation: "⚖️",
};

const PRIORITY_LABEL_ES = {
  critical: "🔴 CRÍTICO",
  high: "🟠 ALTO",
  medium: "🟡 MEDIO",
};

const ASSET_LABELS: Record<string, string> = {
  XAU: "Oro",
  BTC: "Bitcoin",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
  );
}

export async function formatAlertMessage(alert: Alert): Promise<string> {
  const { title, summary } = await translateAlertText(alert.title, alert.summary);

  const emoji = CATEGORY_EMOJI[alert.category];
  const category = CATEGORY_LABELS_ES[alert.category];
  const priority = PRIORITY_LABEL_ES[alert.priority];
  const assets = alert.assets.map((a) => ASSET_LABELS[a] ?? a).join(" · ");
  const link = alert.url
    ? `\n<a href="${escapeHtml(alert.url)}">Ver fuente →</a>`
    : "";

  return [
    `<b>${emoji} ${priority}</b>`,
    `<i>${category}</i>`,
    `<b>${escapeHtml(title)}</b>`,
    summary ? escapeHtml(summary.slice(0, 300)) : "",
    `\n📌 Fuente: ${escapeHtml(alert.sourceName)} · ${assets}`,
    link,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados");
    return false;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Telegram] Error API:", err);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Telegram] Fetch error:", error);
    return false;
  }
}

export async function sendAlertsToTelegram(alerts: Alert[]): Promise<number> {
  if (!isTelegramConfigured() || alerts.length === 0) return 0;

  let sent = 0;
  for (const alert of alerts) {
    const message = await formatAlertMessage(alert);
    const ok = await sendTelegramMessage(message);
    if (ok) sent++;
    await new Promise((r) => setTimeout(r, 400));
  }
  return sent;
}
