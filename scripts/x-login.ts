#!/usr/bin/env npx tsx
/**
 * Abre Chromium con perfil persistente para iniciar sesión en X manualmente.
 * La sesión se guarda en .x-browser-profile/ y el radar la reutiliza en headless.
 */
import { chromium } from "playwright";
import path from "path";

const PROFILE_DIR = path.join(process.cwd(), ".x-browser-profile");

async function main() {
  console.log("\n🔐 Radar Financiero — Login en X\n");
  console.log("Se abrirá un navegador. Inicia sesión con tu cuenta.");
  console.log("Cuando veas tu timeline (/home), cierra el navegador o presiona Ctrl+C.\n");
  console.log(`Perfil guardado en: ${PROFILE_DIR}\n`);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://x.com/login", { waitUntil: "domcontentloaded" });

  console.log("Esperando login... (cierra el navegador cuando termines)");

  await new Promise<void>((resolve) => {
    context.on("close", () => resolve());
    process.on("SIGINT", async () => {
      await context.close();
      resolve();
    });
  });

  console.log("✅ Sesión guardada. El radar usará este perfil para scraping.\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
