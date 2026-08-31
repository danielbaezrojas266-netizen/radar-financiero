import { NextResponse } from "next/server";
import { ensurePollerStarted } from "@/lib/monitor/ensure-poller";
import { getStateDirInfo } from "@/lib/monitor/state-dir";
import { isTelegramConfigured } from "@/lib/notifiers/telegram";
import { isCalendarConfigured } from "@/lib/fetchers/econ-calendar";
import { getTimezone, getDigestQueueSize } from "@/lib/notifiers/digest-queue";

export const dynamic = "force-dynamic";

export async function GET() {
  ensurePollerStarted();
  const state = getStateDirInfo();

  return NextResponse.json({
    ok: true,
    service: "radar-financiero",
    telegram: isTelegramConfigured(),
    econCalendar: isCalendarConfigured(),
    timezone: getTimezone(),
    digestQueue: getDigestQueueSize(),
    stateDir: state.dir,
    statePersistent: state.persistent,
    stateWritable: state.writable,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
