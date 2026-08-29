import { runScan } from "@/lib/monitor/aggregator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SCAN_INTERVAL_MS = 45_000;

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("connected", { message: "Radar activo — monitoreo 24/7" });

      const scan = async () => {
        try {
          const result = await runScan();
          send("scan", result);
          if (result.newAlerts.length > 0) {
            send("new_alerts", result.newAlerts);
          }
        } catch (error) {
          send("error", {
            message: error instanceof Error ? error.message : "Scan failed",
          });
        }
      };

      await scan();

      const interval = setInterval(scan, SCAN_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
