import { NextResponse } from "next/server";
import { runScan } from "@/lib/monitor/aggregator";
import { markEventsAlerted } from "@/lib/filters/event-dedup";
import {
  isTelegramConfigured,
  sendHighActivitySummary,
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
} from "@/lib/notifiers/digest-queue";
import {
  sendDigestReport,
  sendInstantTraderAlert,
  sendBatch15mReport,
} from "@/lib/notifiers/telegram-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const url = new URL(request.url);
    const q = url.searchParams.get("secret");
    const ok = auth === `Bearer ${secret}` || q === secret;
    if (!ok) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const result = await runScan();
    let instantSent = 0;
    let batchQueued = 0;
    let digestQueued = 0;
    let batchSent = 0;
    let digestSent: string | null = null;

    if (isTelegramConfigured()) {
      if (result.instantAlerts.length > 0) {
        if (!canSendInstant()) {
          await sendHighActivitySummary(
            result.instantAlerts,
            result.macroContext
          );
          recordInstantSent(1);
          instantSent = 1;
        } else {
          for (const alert of result.instantAlerts.slice(0, 3)) {
            if (!canSendInstant()) break;
            const ok = await sendInstantTraderAlert(alert, result.macroContext);
            if (ok) {
              instantSent++;
              recordInstantSent(1);
            }
            await new Promise((r) => setTimeout(r, 400));
          }
        }
        if (instantSent > 0) markEventsAlerted(result.instantAlerts);
      }

      if (result.batch15mAlerts.length > 0) {
        enqueueForBatch15m(result.batch15mAlerts);
        batchQueued = result.batch15mAlerts.length;
      }

      if (result.digestAlerts.length > 0) {
        enqueueForDigest(result.digestAlerts);
        digestQueued = result.digestAlerts.length;
      }

      if (shouldFlushBatch15m()) {
        const batch = flushBatch15mQueue();
        if (batch.length > 0) {
          await sendBatch15mReport(batch, result.macroContext);
          batchSent = batch.length;
        }
      }

      const slot = shouldSendDigest();
      if (slot) {
        const queued = flushDigestQueue();
        await sendDigestReport(queued, slot, result.macroContext);
        markDigestSent(slot);
        digestSent = slot;
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: result.alerts.length,
      newAlerts: result.newAlerts.length,
      instantSent,
      batchQueued,
      batchSent,
      digestQueued,
      digestSent,
      macro: result.macroContext
        ? {
            dxy: result.macroContext.dxy.level,
            tips10y: result.macroContext.tips10y.level,
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
