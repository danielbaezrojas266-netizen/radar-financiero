import { NextResponse } from "next/server";
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
} from "@/lib/notifiers/digest-queue";
import {
  sendDigestReport,
  sendInstantCategory1Alert,
} from "@/lib/notifiers/telegram-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Endpoint para cron externo (Railway cron, cron-job.org, GitHub Actions).
 * Auth: Authorization: Bearer <CRON_SECRET> o ?secret=
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const url = new URL(request.url);
    const q = url.searchParams.get("secret");
    const ok =
      auth === `Bearer ${secret}` || q === secret;
    if (!ok) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const result = await runScan();
    let instantSent = 0;
    let digestQueued = 0;
    let digestSent: string | null = null;

    if (isTelegramConfigured()) {
      for (const alert of result.instantAlerts) {
        const ok = await sendInstantCategory1Alert(alert);
        if (ok) instantSent++;
        await new Promise((r) => setTimeout(r, 400));
      }

      if (result.digestAlerts.length > 0) {
        enqueueForDigest(result.digestAlerts);
        digestQueued = result.digestAlerts.length;
      }

      const slot = shouldSendDigest();
      if (slot) {
        const queued = flushDigestQueue();
        await sendDigestReport(queued, slot);
        markDigestSent(slot);
        digestSent = slot;
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: result.alerts.length,
      newAlerts: result.newAlerts.length,
      instantSent,
      digestQueued,
      digestSent,
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
