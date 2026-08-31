/**
 * Política de monitoreo — trader XAU/USD + BTC/USD (manual + EAs MT4).
 * Derivada del prompt operativo del usuario.
 */

export const TRADER_TIMEZONE = "Etc/GMT+6"; // Costa Rica UTC-6

/**
 * COBERTURA CONTINUA — SIN PAUSA POR DÍA DE LA SEMANA.
 * Forex (apertura domingo noche) y BTC 24/7; geopolítica no respeta horario de oficina.
 * No hay gate por fin de semana ni feriado en scan, Telegram ni digests.
 */
export const CONTINUOUS_COVERAGE_7D = true;

/** Máximo de alertas instantáneas por hora (fuera de resúmenes) */
export const MAX_INSTANT_ALERTS_PER_HOUR = 3;

/** Solo alertas publicadas en las últimas N horas pueden ir a Telegram instantáneo */
export const MAX_INSTANT_AGE_MS = 3 * 60 * 60 * 1000;

/** Prioridad alta (batch 15m): máximo 12 horas de antigüedad */
export const MAX_BATCH_AGE_MS = 12 * 60 * 60 * 1000;

/** Ventana de agrupación para prioridad ALTA (ms) */
export const HIGH_PRIORITY_BATCH_MS = 15 * 60 * 1000;

/** Ventana para verificación cruzada entre fuentes (ms) */
export const CROSS_VERIFY_WINDOW_MS = 45 * 60 * 1000;

/** Umbral movimiento abrupto DXY (%) en sesión */
export const DXY_SHOCK_PCT = 0.5;

/** Umbral movimiento abrupto yield real 10Y (bps en sesión) */
export const TIPS_SHOCK_BPS = 5;

/**
 * Escaladas geopolíticas — cada ronda es evento CRÍTICO independiente.
 * La regla de silencio entre eventos similares NO aplica a estos.
 * Solo el análisis/contexto de fondo del conflicto se considera "ya cubierto".
 */
export const GEOPOLITICAL_ESCALATION_PATTERNS: RegExp[] = [
  /\b(military\s+strike|air\s*strike|airstrike|missile\s+strike|missile\s+attack)\b/i,
  /\b(counter\s*-?\s*attack|counterattack|retaliation|retaliatory)\b/i,
  /\b(bombing|naval\s+strike|drone\s+strike|ballistic\s+missile)\b/i,
  /\b(strait\s+of\s+hormuz|hormuz).{0,40}(clos|reopen|block|seal|transit|disrupt)/i,
  /\b(clos|reopen|block|seal).{0,40}(strait\s+of\s+hormuz|hormuz)\b/i,
  /\b(hormuz).{0,30}(cerrad|reapert|bloque|tr[aá]nsito)/i,
  /\b(ataque\s+militar|ataque\s+a[eé]reo|misil|contraataque|represalia)\b/i,
  /\b(new\s+round|fresh\s+attack|direct\s+response|kinetic\s+strike)\b/i,
  /\b(iran|tehran|irgc).{0,50}(strike|attack|missile|bomb|retaliat)/i,
  /\b(u\.?s\.?|united\s+states|israel|idf).{0,50}(strike|attack|missile|bomb).{0,40}(iran|tehran|irgc)/i,
];

/** Análisis o contexto de fondo del conflicto — sí se silencia entre similares */
export const GEOPOLITICAL_BACKGROUND_PATTERNS: RegExp[] = [
  /\b(what\s+to\s+know|explainer|background|outlook|analysis|commentary)\b/i,
  /\b(tensions?\s+(remain|continue|persist)|conflict\s+continues|ongoing\s+conflict)\b/i,
  /\b(c[oó]mo\s+afecta|contexto|an[aá]lisis|perspectiva|qu[eé]\s+saber)\b/i,
  /\b(markets?\s+watch|investors?\s+weigh|implications?\s+for\s+gold)\b/i,
];

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
  "google-macro",
  "google-gold",
  "google-markets",
  "google-btc",
  "google-geopolitics",
  "investing-commodities",
]);

export const VERIFICATION_LABELS: Record<string, string> = {
  confirmed_traditional: "Fuente tradicional confirmada",
  official_x: "Oficial en X",
  on_chain_institutional: "Dato on-chain / institucional",
  early_signal_x: "Señal temprana en X — no confirmada",
  rumor_moving_market: "Rumor moviendo mercado — pendiente confirmación",
};
