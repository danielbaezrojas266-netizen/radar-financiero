import { runScan } from "@/lib/monitor/aggregator";
import {
  isTelegramConfigured,
  sendHighActivitySummary,
  sendTelegramMessage,
} from "@/lib/notifiers/telegram";
import {
  enqueueForDigest,
  enqueueForBatch15m,
  shouldSendDigest,
  markDigestSent,
  flushDigestQueue,
  flushBatch15mQueue,
  shouldFlushBatch15m,
  canSendInstant,
  recordInstantSent,
  getTimezone,
} from "@/lib/notifiers/digest-queue";
import {
  sendDigestReport,
  sendInstantTraderAlert,
  sendBatch15mReport,
} from "@/lib/notifiers/telegram-digest";
import { markEventsAlerted } from "@/lib/filters/event-dedup";

const SCAN_INTERVAL_MS = 45_000;
let pollerStarted = false;

async function deliverInstantAlerts(
  instantAlerts: Awaited<ReturnType<typeof runScan>>["instantAlerts"],
  macro: Awaited<ReturnType<typeof runScan>>["macroContext"]
): Promise<number> {
  if (instantAlerts.length === 0) return 0;

  if (!canSendInstant()) {
    await sendHighActivitySummary(instantAlerts, macro);
    markEventsAlerted(instantAlerts);
    recordInstantSent(1);
    return 1;
  }

  let sent = 0;
  const toSend = instantAlerts.slice(0, 3);

  for (const alert of toSend) {
    if (!canSendInstant()) {
      await sendHighActivitySummary(instantAlerts.slice(sent), macro);
      break;
    }
    const ok = await sendInstantTraderAlert(alert, macro);
    if (ok) {
      sent++;
      recordInstantSent(1);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (sent > 0) markEventsAlerted(toSend.slice(0, sent));
  return sent;
}

export function startBackgroundPoller(): void {
  if (pollerStarted) return;
  pollerStarted = true;

  const scan = async () => {
    try {
      const result = await runScan();

      if (!isTelegramConfigured()) return;

      const sent = await deliverInstantAlerts(
        result.instantAlerts,
        result.macroContext
      );
      if (sent > 0) {
        console.log(`[Poller] ${sent} alerta(s) instantánea(s) enviadas`);
      }

      if (result.batch15mAlerts.length > 0) {
        enqueueForBatch15m(result.batch15mAlerts);
      }

      if (result.digestAlerts.length > 0) {
        enqueueForDigest(result.digestAlerts);
      }

      if (shouldFlushBatch15m()) {
        const batch = flushBatch15mQueue();
        if (batch.length > 0) {
          await sendBatch15mReport(batch, result.macroContext);
          console.log(`[Poller] Batch 15m enviado (${batch.length} eventos)`);
        }
      }

      const slot = shouldSendDigest();
      if (slot) {
        const queued = flushDigestQueue();
        await sendDigestReport(queued, slot, result.macroContext);
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
      `✅ <b>Radar Financiero — Modo Trader activo</b>\n\n` +
        `🔴 CRÍTICO verificado → instantáneo (máx. 3/hora)\n` +
        `🟠 ALTA → ventana 15 min\n` +
        `🟡 MEDIA → resumen 7:00 y 16:30 (${tz})\n` +
        `💵 Monitoreo DXY + yields en alertas XAU\n` +
        `🔇 Filtro anti-FUD/TA/retail activo`
    ).catch(() => {});
  }

  scan();
  setInterval(scan, SCAN_INTERVAL_MS);
  console.log("[Poller] Modo trader (scan cada 45s)");
}
