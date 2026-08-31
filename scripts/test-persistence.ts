/**
 * Prueba de persistencia digest + dedup.
 * Simula: encolar → “redeploy” (nuevo proceso / memoria vacía) → recargar disco.
 *
 * Uso:
 *   RADAR_STATE_DIR=/tmp/radar-persist-test npx tsx scripts/test-persistence.ts
 */
import fs from "fs";
import path from "path";

const STATE_DIR =
  process.env.RADAR_STATE_DIR ||
  path.join("/tmp", `radar-persist-test-${Date.now()}`);

process.env.RADAR_STATE_DIR = STATE_DIR;

async function main() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  console.log("=== Persistencia digest/dedup ===");
  console.log("RADAR_STATE_DIR =", STATE_DIR);

  const { resetStateDirCache, getStateDirInfo } = await import(
    "../src/lib/monitor/state-dir.ts"
  );
  resetStateDirCache();
  console.log("state info:", getStateDirInfo());

  const digest = await import("../src/lib/notifiers/digest-queue.ts");
  const dedup = await import("../src/lib/filters/event-dedup.ts");

  const sample = {
    id: "persist-test-iran-strike-1",
    sourceId: "google-geopolitics",
    category: "geopolitics" as const,
    priority: "critical" as const,
    title: "US retaliatory strike hits IRGC launchers near Hormuz",
    summary: "Personnel killed; intercepted missiles reported.",
    source: "rss" as const,
    sourceName: "Google News — Geopolítica",
    publishedAt: new Date().toISOString(),
    assets: ["XAU", "BTC"] as ("XAU" | "BTC")[],
    keywords: ["retaliatory strike", "hormuz"],
    deliveryTier: "digest" as const,
  };

  digest.enqueueForDigest([sample]);
  dedup.markEventsAlerted([sample]);

  const beforeDigest = digest.peekDigestPending().length;
  const beforeDedup = dedup.peekAlertedEventCount();
  const digestFile = path.join(STATE_DIR, "digest-queue.json");
  const alertedFile = path.join(STATE_DIR, "alerted-events.json");

  console.log("\n--- Tras encolar (proceso A) ---");
  console.log("digestPending:", beforeDigest);
  console.log("alertedEvents:", beforeDedup);
  console.log("digest file exists:", fs.existsSync(digestFile));
  console.log("alerted file exists:", fs.existsSync(alertedFile));
  console.log(
    "digest file snippet:",
    fs.readFileSync(digestFile, "utf-8").slice(0, 200).replace(/\s+/g, " ")
  );

  // Simular redeploy: vaciar memoria y recargar desde el mismo directorio
  console.log("\n--- Simulando redeploy (memoria vacía + reload disco) ---");
  digest.reloadDigestStateFromDisk();
  dedup.reloadAlertedEventsFromDisk();

  const afterDigest = digest.peekDigestPending();
  const afterDedup = dedup.peekAlertedEventCount();

  console.log("digestPending tras reload:", afterDigest.length);
  console.log(
    "ids en cola:",
    afterDigest.map((a) => a.id)
  );
  console.log("alertedEvents tras reload:", afterDedup);

  const ok =
    afterDigest.length >= 1 &&
    afterDigest.some((a) => a.id === sample.id) &&
    afterDedup >= 1;

  if (!ok) {
    console.error("\nFAIL: la cola no sobrevivió al redeploy simulado");
    process.exit(1);
  }

  console.log("\nPASS: digest + dedup sobrevivieron al redeploy simulado");
  console.log(
    "Nota producción: monta Volume Railway en /data (RADAR_STATE_DIR=/data)."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
