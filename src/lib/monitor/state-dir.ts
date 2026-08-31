import fs from "fs";
import path from "path";

let resolvedDir: string | null = null;

function canWrite(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-probe-${process.pid}`);
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persistencia del estado (digest, dedup, seen).
 *
 * Orden:
 * 1. RADAR_STATE_DIR (explícito)
 * 2. /data — volumen Railway persistente (recomendado)
 * 3. /tmp/radar-financiero — efímero (solo fallback local/dev)
 *
 * En Railway: montar un Volume en /data y opcionalmente
 * RADAR_STATE_DIR=/data. Sin volumen, el estado se pierde en redeploy.
 */
export function getStateDir(): string {
  if (resolvedDir) return resolvedDir;

  const candidates = [
    process.env.RADAR_STATE_DIR,
    "/data",
    path.join(process.env.TMPDIR || "/tmp", "radar-financiero"),
  ].filter((d): d is string => Boolean(d));

  for (const dir of candidates) {
    if (canWrite(dir)) {
      resolvedDir = dir;
      if (dir.startsWith("/tmp")) {
        console.warn(
          `[state] Usando ${dir} (efímero). Monta un Volume Railway en /data para sobrevivir redeploys.`
        );
      } else {
        console.log(`[state] Persistencia en ${dir}`);
      }
      return resolvedDir;
    }
  }

  resolvedDir = path.join(process.env.TMPDIR || "/tmp", "radar-financiero");
  try {
    fs.mkdirSync(resolvedDir, { recursive: true });
  } catch {
    /* ignore */
  }
  return resolvedDir;
}

/** Fuerza re-resolución (tests / simulación de redeploy) */
export function resetStateDirCache(): void {
  resolvedDir = null;
}

export function stateFile(name: string): string {
  return path.join(/*turbopackIgnore: true*/ getStateDir(), name);
}

export function getStateDirInfo(): {
  dir: string;
  persistent: boolean;
  writable: boolean;
} {
  const dir = getStateDir();
  const persistent = !dir.includes("/tmp");
  return { dir, persistent, writable: canWrite(dir) };
}
