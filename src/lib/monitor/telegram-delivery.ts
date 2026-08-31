import { markEventsAlerted } from "@/lib/filters/event-dedup";
import type { ScanResult } from "@/lib/monitor/aggregator";
import {
  enqueueForBatch15m,
  enqueueForDigest,
  flushBatch15mQueue,
  flushDigestQueue,
  markDigestSent,
  shouldFlushBatch15m,
  shouldSendDigest,
  canSendInstant,
  recordInstantSent,
} from "@/lib/notifiers/digest-queue";
import {
  sendBatch15mReport,
  sendDigestReport,
  sendInstantTraderAlert,
} from "@/lib/notifiers/telegram-digest";
import {
  isTelegramConfigured,
  sendHighActivitySummary,
  sendTelegramMessage,
} from "@/lib/notifiers/telegram";

export interface TelegramDeliveryResult {
  instantSent: number;
  batchQueued: number;
  batchSent: number;
  digestQueued: number;
  digestSent: "morning" | "afternoon" | null;
}

export async function processTelegramDelivery(
  result: ScanResult
): Promise<TelegramDeliveryResult> {
  const out: TelegramDeliveryResult = {
    instantSent: 0,
    batchQueued: 0,
    batchSent: 0,
    digestQueued: 0,
    digestSent: null,
  };

  if (!isTelegramConfigured()) return out;

  if (result.instantAlerts.length > 0) {
    if (!canSendInstant()) {
      await sendHighActivitySummary(result.instantAlerts, result.macroContext);
      recordInstantSent(1);
      out.instantSent = 1;
      markEventsAlerted(result.instantAlerts);
    } else {
      for (const alert of result.instantAlerts.slice(0, 3)) {
        if (!canSendInstant()) break;
        const ok = await sendInstantTraderAlert(alert, result.macroContext);
        if (ok) {
          out.instantSent++;
          recordInstantSent(1);
        }
        await new Promise((r) => setTimeout(r, 450));
      }
      if (out.instantSent > 0) markEventsAlerted(result.instantAlerts);
    }
  }

  if (result.batch15mAlerts.length > 0) {
    enqueueForBatch15m(result.batch15mAlerts);
    out.batchQueued = result.batch15mAlerts.length;
  }

  if (result.digestAlerts.length > 0) {
    enqueueForDigest(result.digestAlerts);
    out.digestQueued = result.digestAlerts.length;
  }

  if (shouldFlushBatch15m()) {
    const batch = flushBatch15mQueue();
    if (batch.length > 0) {
      await sendBatch15mReport(batch, result.macroContext);
      out.batchSent = batch.length;
    }
  }

  const slot = shouldSendDigest();
  if (slot) {
    const queued = flushDigestQueue();
    await sendDigestReport(queued, slot, result.macroContext);
    markDigestSent(slot);
    out.digestSent = slot;
  }

  return out;
}

export async function sendRadarOnlinePing(): Promise<void> {
  if (!isTelegramConfigured()) return;
  await sendTelegramMessage(
    `📡 <b>Radar en línea</b>\nMonitoreo activo — recibirás alertas y resúmenes a las 7:00 y 16:30 (CR).`
  );
}
