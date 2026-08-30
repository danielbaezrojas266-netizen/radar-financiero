import type { Alert, AlertCategory } from "@/lib/types";
import { translateAlertText } from "@/lib/notifiers/translate";
import { verificationLabel } from "@/lib/filters/cross-verify";
import {
  formatCostaRicaTime,
} from "@/lib/notifiers/digest-queue";
import type { AlertWithTier } from "@/lib/filters/delivery-rules";
import type { MacroContextSnapshot } from "@/lib/types";
import { formatMacroForTelegram } from "@/lib/fetchers/macro-context";
import { formatDiscountForTelegram } from "@/lib/filters/discount-context";

const CATEGORY_EMOJI: Record<AlertCategory, string> = {
  fed: "🏛️",
  macro: "📊",
  geopolitics: "🌍",
  btc_whale: "🐋",
  btc_regulation: "⚖️",
};

const PRIORITY_LABEL_ES = {
  critical: "🔴 PRIORIDAD CRÍTICA",
  high: "🟠 PRIORIDAD ALTA",
  medium: "🟡 PRIORIDAD MEDIA",
};

const ASSET_LABELS: Record<string, string> = {
  XAU: "XAU/USD",
  BTC: "BTC/USD",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && getTelegramChatIds().length > 0
  );
}

/** Un chat o varios separados por coma (usuario, grupo, supergrupo) */
export function getTelegramChatIds(): string[] {
  const raw = process.env.TELEGRAM_CHAT_ID ?? "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function formatTraderAlertMessage(
  alert: AlertWithTier,
  macro?: MacroContextSnapshot
): Promise<string> {
  const { title, summary } = await translateAlertText(alert.title, alert.summary);
  const ctx = macro ?? alert.macroContext;

  const lines = [
    `<b>${CATEGORY_EMOJI[alert.category]} ${PRIORITY_LABEL_ES[alert.priority]}</b>`,
    `<b>Evento:</b> ${escapeHtml(title)}`,
    `<b>Fuente:</b> ${escapeHtml(verificationLabel(alert.verificationStatus ?? "confirmed_traditional"))}`,
    `<i>${escapeHtml(alert.sourceName)}</i>`,
    `<b>Hora (CR, GMT-6):</b> ${formatCostaRicaTime(alert.publishedAt)}`,
  ];

  if (alert.consensusNote) {
    lines.push(`<b>Consenso vs dato:</b> ${escapeHtml(alert.consensusNote)}`);
  }

  if (summary) {
    lines.push(escapeHtml(summary.slice(0, 350)));
  }

  if (alert.priceReactionNote) {
    lines.push(
      `<b>Reacción observada:</b> ${escapeHtml(alert.priceReactionNote)}`
    );
  }

  if (alert.discountContext) {
    lines.push("");
    lines.push(formatDiscountForTelegram(alert.discountContext));
  }

  if (alert.assets.includes("XAU") && ctx) {
    lines.push(`\n<b>Contexto macro (XAU):</b>`);
    lines.push(formatMacroForTelegram(ctx));
  }

  const assets = alert.assets.map((a) => ASSET_LABELS[a] ?? a).join(" · ");
  lines.push(`\n📌 Activos: ${assets}`);

  if (alert.url) {
    lines.push(`<a href="${escapeHtml(alert.url)}">Ver fuente →</a>`);
  }

  lines.push(
    `\n<i>Precaución operativa — evaluar pausa manual / EAs según tu marco temporal</i>`
  );

  return lines.filter(Boolean).join("\n");
}

/** @deprecated use formatTraderAlertMessage */
export async function formatAlertMessage(alert: Alert): Promise<string> {
  return formatTraderAlertMessage(alert as AlertWithTier);
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = getTelegramChatIds();

  if (!token || chatIds.length === 0) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no configurados");
    return false;
  }

  let anyOk = false;

  for (const chatId of chatIds) {
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
        console.error(`[Telegram] Error API chat ${chatId}:`, err);
        continue;
      }

      anyOk = true;
    } catch (error) {
      console.error(`[Telegram] Fetch error chat ${chatId}:`, error);
    }
  }

  return anyOk;
}

export async function sendAlertsToTelegram(alerts: Alert[]): Promise<number> {
  if (!isTelegramConfigured() || alerts.length === 0) return 0;

  let sent = 0;
  for (const alert of alerts) {
    const message = await formatTraderAlertMessage(alert as AlertWithTier);
    const ok = await sendTelegramMessage(message);
    if (ok) sent++;
    await new Promise((r) => setTimeout(r, 400));
  }
  return sent;
}

export async function sendHighActivitySummary(
  alerts: AlertWithTier[],
  macro?: MacroContextSnapshot
): Promise<boolean> {
  const lines = [
    `<b>📋 Resumen de alta actividad</b>`,
    `<i>Límite horario alcanzado — eventos consolidados</i>`,
    "",
  ];

  const sorted = [...alerts].sort((a, b) => {
    const p = { critical: 0, high: 1, medium: 2 };
    return p[a.priority] - p[b.priority];
  });

  for (const alert of sorted.slice(0, 8)) {
    const { title } = await translateAlertText(alert.title, alert.summary);
    lines.push(
      `· [${alert.priority.toUpperCase()}] ${escapeHtml(title.slice(0, 100))}`
    );
  }

  if (macro) {
    lines.push("", formatMacroForTelegram(macro));
  }

  return sendTelegramMessage(lines.join("\n"));
}
