/**
 * Política de monitoreo — trader XAU/USD + BTC/USD (manual + EAs MT4).
 * Derivada del prompt operativo del usuario.
 */

export const TRADER_TIMEZONE = "Etc/GMT+6"; // Costa Rica UTC-6

/** Máximo de alertas instantáneas por hora (fuera de resúmenes) */
export const MAX_INSTANT_ALERTS_PER_HOUR = 3;

/** Ventana de agrupación para prioridad ALTA (ms) */
export const HIGH_PRIORITY_BATCH_MS = 15 * 60 * 1000;

/** Ventana para verificación cruzada entre fuentes (ms) */
export const CROSS_VERIFY_WINDOW_MS = 45 * 60 * 1000;

/** Umbral movimiento abrupto DXY (%) en sesión */
export const DXY_SHOCK_PCT = 0.5;

/** Umbral movimiento abrupto yield real 10Y (bps en sesión) */
export const TIPS_SHOCK_BPS = 5;

/** Cuentas X oficiales — pueden elevar a confirmado sin RSS */
export const OFFICIAL_X_USERNAMES = new Set([
  "federalreserve",
  "ecb",
  "sec_news",
  "reuters",
  "business",
]);

/** Fuentes tradicionales confirmadas */
export const TRADITIONAL_SOURCE_IDS = new Set([
  "fed-press",
  "fed-speeches",
  "bls-news",
  "bea-news",
  "reuters-markets",
  "reuters-business",
  "sec-press",
  "cftc-press",
]);

export const VERIFICATION_LABELS: Record<string, string> = {
  confirmed_traditional: "Fuente tradicional confirmada",
  official_x: "Oficial en X",
  on_chain_institutional: "Dato on-chain / institucional",
  early_signal_x: "Señal temprana en X — no confirmada",
  rumor_moving_market: "Rumor moviendo mercado — pendiente confirmación",
};
