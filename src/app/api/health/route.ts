import { NextResponse } from "next/server";
import { ensurePollerStarted } from "@/lib/monitor/ensure-poller";
import { isTelegramConfigured } from "@/lib/notifiers/telegram";
import { isCalendarConfigured } from "@/lib/fetchers/econ-calendar";
import { getTimezone, getDigestQueueSize } from "@/lib/notifiers/digest-queue";

export const dynamic = "force-dynamic";

export async function GET() {
  ensurePollerStarted();

  return NextResponse.json({
    ok: true,
    service: "radar-financiero",
    telegram: isTelegramConfigured(),
    econCalendar: isCalendarConfigured(),
    timezone: getTimezone(),
    digestQueue: getDigestQueueSize(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
