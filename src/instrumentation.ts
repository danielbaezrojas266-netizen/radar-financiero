export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackgroundPoller } = await import(
      "@/lib/monitor/background-poller"
    );
    startBackgroundPoller();
  }
}
