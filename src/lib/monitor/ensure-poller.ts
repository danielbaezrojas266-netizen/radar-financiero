import { startBackgroundPoller } from "@/lib/monitor/background-poller";

let ensured = false;

/** Arranca el poller si aún no corre (backup si instrumentation no dispara en Railway). */
export function ensurePollerStarted(): void {
  if (ensured) return;
  ensured = true;
  try {
    startBackgroundPoller();
    console.log("[Radar] Poller asegurado vía ensurePollerStarted");
  } catch (error) {
    console.error("[Radar] Error al arrancar poller:", error);
    ensured = false;
  }
}
