import { runScan } from "@/lib/monitor/aggregator";
import { processTelegramDelivery } from "@/lib/monitor/telegram-delivery";
import {
  isTelegramConfigured,
  sendTelegramMessage,
} from "@/lib/notifiers/telegram";
import { getTimezone } from "@/lib/notifiers/digest-queue";

const SCAN_INTERVAL_MS = 45_000;
let pollerStarted = false;

export function startBackgroundPoller(): void {
  if (pollerStarted) return;
  pollerStarted = true;

  const scan = async () => {
    try {
      const result = await runScan();

      if (!isTelegramConfigured()) return;

      const delivery = await processTelegramDelivery(result);

      if (delivery.instantSent > 0) {
        console.log(`[Poller] ${delivery.instantSent} alerta(s) instantánea(s)`);
      }
      if (delivery.batchSent > 0) {
        console.log(`[Poller] Batch 15m: ${delivery.batchSent} eventos`);
      }
      if (delivery.digestSent) {
        console.log(`[Poller] Resumen ${delivery.digestSent} enviado`);
      }
    } catch (error) {
      console.error("[Poller] Error en scan:", error);
    }
  };

  if (isTelegramConfigured()) {
    const tz = getTimezone();
    sendTelegramMessage(
      `✅ <b>Radar Financiero — en línea</b>\n\n` +
        `🔴 CRÍTICO → instantáneo (máx. 3/h)\n` +
        `🟠 ALTA → cada 15 min\n` +
        `🟡 Resúmenes → 7:00 y 16:30 (${tz})\n` +
        `📡 Servidor activo 24/7`
    ).catch(() => {});
  }

  scan();
  setInterval(scan, SCAN_INTERVAL_MS);
  console.log("[Poller] Activo (scan cada 45s)");
}
