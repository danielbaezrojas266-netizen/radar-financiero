import { NextResponse } from "next/server";
import { isTelegramConfigured } from "@/lib/notifiers/telegram";
import { getTimezone, getDigestQueueSize } from "@/lib/notifiers/digest-queue";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "radar-financiero",
    telegram: isTelegramConfigured(),
    timezone: getTimezone(),
    digestQueue: getDigestQueueSize(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
