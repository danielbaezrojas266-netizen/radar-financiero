import fs from "fs";
import path from "path";

/**
 * Railway (y contenedores similares) suelen tener el directorio de la app
 * en solo lectura. El estado mutable va a /tmp.
 */
export function getStateDir(): string {
  const dir =
    process.env.RADAR_STATE_DIR ||
    path.join(process.env.TMPDIR || "/tmp", "radar-financiero");
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
  return dir;
}

export function stateFile(name: string): string {
  return path.join(getStateDir(), name);
}
