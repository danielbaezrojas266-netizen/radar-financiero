/** IDs de fuentes RSS aprobadas — solo institucionales y alto impacto */
export const APPROVED_RSS_IDS = new Set([
  "fed-press",
  "fed-speeches",
  "bea-news",
  "google-macro",
  "google-gold",
  "google-markets",
  "google-btc",
  "investing-commodities",
  "sec-press",
]);

/** Usernames de X aprobados (minúsculas) */
export const APPROVED_X_USERNAMES = new Set([
  "reuters",
  "fxstreet",
  "business",
  "whale_alert",
  "sec_news",
  "federalreserve",
  "ecb",
]);

/** Fuentes on-chain — solo resumen, nunca instantáneo */
export const BLOCKCHAIN_SOURCE_IDS = new Set(["blockchain-whale"]);

export function extractXUsername(sourceName: string): string | null {
  const match = sourceName.match(/@([a-zA-Z0-9_]+)/i);
  return match ? match[1].toLowerCase() : null;
}

/** IDs Nitter fallback → equivalencia con cuentas X aprobadas */
const NITTER_USER_MAP: Record<string, string> = {
  "nitter-federalreserve": "federalreserve",
  "nitter-reuters": "reuters",
  "nitter-business": "business",
  "nitter-fxstreet": "fxstreet",
  "nitter-whale-alert": "whale_alert",
  "nitter-sec": "sec_news",
  "nitter-ecb": "ecb",
};

export function isApprovedSource(sourceId: string, sourceName: string): boolean {
  if (APPROVED_RSS_IDS.has(sourceId)) return true;
  if (BLOCKCHAIN_SOURCE_IDS.has(sourceId)) return true;

  const nitterUser = NITTER_USER_MAP[sourceId];
  if (nitterUser && APPROVED_X_USERNAMES.has(nitterUser)) return true;

  if (sourceId.startsWith("x-browser-")) {
    const user = sourceId.replace("x-browser-", "").toLowerCase();
    return APPROVED_X_USERNAMES.has(user);
  }
  if (sourceId.startsWith("x-")) {
    const user = sourceId.replace("x-", "").toLowerCase();
    return APPROVED_X_USERNAMES.has(user);
  }
  const xUser = extractXUsername(sourceName);
  if (xUser && APPROVED_X_USERNAMES.has(xUser)) return true;
  return false;
}
