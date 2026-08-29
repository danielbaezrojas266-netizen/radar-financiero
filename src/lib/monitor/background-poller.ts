import { runScan } from "@/lib/monitor/aggregator";
import {
  isTelegramConfigured,
  sendTelegramMessage,
} from "@/lib/notifiers/telegram";
import {
  enqueueForDigest,
  shouldSendDigest,
  markDigestSent,
  flushDigestQueue,
  getTimezone,
} from "@/lib/notifiers/digest-queue";
import {
  sendDigestReport,
  sendInstantCategory1Alert,
} from "@/lib/notifiers/telegram-digest";

const SCAN_INTERVAL_MS = 45_000;
let pollerStarted = false;

export function startBackgroundPoller(): void {
  if (pollerStarted) return;
  pollerStarted = true;

  const scan = async () => {
    try {
      const result = await runScan();

      if (!isTelegramConfigured()) return;

      // Cat. 1 → Telegram instantáneo
      for (const alert of result.instantAlerts) {
        await sendInstantCategory1Alert(alert);
        await new Promise((r) => setTimeout(r, 500));
      }

      if (result.instantAlerts.length > 0) {
        console.log(
          `[Poller] ${result.instantAlerts.length} alerta(s) Cat. 1 enviadas`
        );
      }

      // Operativas → cola de resumen
      if (result.digestAlerts.length > 0) {
        enqueueForDigest(result.digestAlerts);
        console.log(
          `[Poller] ${result.digestAlerts.length} noticia(s) en cola de resumen`
        );
      }

      // Resúmenes 7:30 y 16:30 hora local
      const slot = shouldSendDigest();
      if (slot) {
        const queued = flushDigestQueue();
        await sendDigestReport(queued, slot);
        markDigestSent(slot);
        console.log(
          `[Poller] Resumen ${slot} enviado (${queued.length} noticias)`
        );
      }
    } catch (error) {
      console.error("[Poller] Error en scan:", error);
    }
  };

  if (isTelegramConfigured()) {
    const tz = getTimezone();
    sendTelegramMessage(
      `✅ <b>Filtro estricto activo</b>\n\n` +
        `🚨 Instantáneo: solo Cat. 1 (CPI/PPI, Fed, quiebras, regulación fuerte BTC, guerra/oro)\n` +
        `📋 Resumen: 2×/día a las 7:30 y 16:30 (${tz})\n` +
        `🔇 Ignorado: opiniones, TA, memes, cuentas no institucionales`
    ).catch(() => {});
  }

  scan();
  setInterval(scan, SCAN_INTERVAL_MS);
  console.log("[Poller] Poller con filtro estricto (cada 45s)");
}
