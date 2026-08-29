import { runScan } from "@/lib/monitor/aggregator";
import {
  isTelegramConfigured,
  sendAlertsToTelegram,
  sendTelegramMessage,
} from "@/lib/notifiers/telegram";

const SCAN_INTERVAL_MS = 45_000;
let pollerStarted = false;

export function startBackgroundPoller(): void {
  if (pollerStarted) return;
  pollerStarted = true;

  const scan = async () => {
    try {
      const result = await runScan();
      if (result.newAlerts.length > 0 && isTelegramConfigured()) {
        const sent = await sendAlertsToTelegram(result.newAlerts);
        console.log(
          `[Poller] ${result.newAlerts.length} alertas nuevas, ${sent} enviadas a Telegram`
        );
      }
    } catch (error) {
      console.error("[Poller] Error en scan:", error);
    }
  };

  // Mensaje de arranque
  if (isTelegramConfigured()) {
    sendTelegramMessage(
      "✅ <b>Radar Financiero activo</b>\nMonitoreo 24/7 iniciado. Recibirás alertas de Fed, macro, geopolítica, ballenas BTC y regulación."
    ).catch(() => {});
  } else {
    console.warn(
      "[Poller] Telegram no configurado — define TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID"
    );
  }

  scan();
  setInterval(scan, SCAN_INTERVAL_MS);
  console.log("[Poller] Background poller iniciado (cada 45s)");
}
