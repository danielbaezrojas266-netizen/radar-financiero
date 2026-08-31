import { runScan } from "@/lib/monitor/aggregator";
import { ensurePollerStarted } from "@/lib/monitor/ensure-poller";
import { processTelegramDelivery } from "@/lib/monitor/telegram-delivery";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const q = url.searchParams.get("secret");
  return auth === `Bearer ${secret}` || q === secret;
}

export async function GET(request: Request) {
  ensurePollerStarted();

  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await runScan();
    const delivery = await processTelegramDelivery(result);

    return NextResponse.json({
      ok: true,
      scanned: result.alerts.length,
      newAlerts: result.newAlerts.length,
      ...delivery,
      note:
        result.newAlerts.length === 0
          ? "Sin alertas nuevas desde el último scan (normal si no hay eventos frescos). El digest solo se encola/envía cerca de 7:00 y 16:30 CR."
          : undefined,
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
