import { NOISE_PATTERNS } from "@/lib/config/keywords";

/** Análisis técnico repetitivo — siempre ruido */
const TECHNICAL_ANALYSIS_PATTERNS = [
  /\b(rsi|macd|fibonacci|fib|support level|resistance level|soporte|resistencia|breakout|breakdown|head and shoulders|hombro-cabeza-hombro|moving average|media móvil|bollinger|ichimoku|chart pattern|patrón gráfico|technical analysis|análisis técnico|price target|objetivo de precio)\b/i,
  /\b(oversold|overbought|sobrecompra|sobreventa|golden cross|death cross|cup and handle|triángulo|wedge|cuña)\b/i,
  /\b(long setup|short setup|entry at|stop loss|take profit|entrada en|salida en)\b/i,
];

/** Opiniones personales y especulación */
const OPINION_PATTERNS = [
  /\b(i think|creo que|in my opinion|en mi opinión|my take|mi lectura|probably|probablemente|might|podría ser|guess|supongo)\b/i,
  /\b(prediction|predicción|forecast|pronóstico|expect|espero que|likely to|probablemente suba|probablemente baje)\b/i,
  /\b(thread 🧵|hilo 🧵|unpopular opinion|opinión impopular|hot take)\b/i,
];

export function isNoise(
  title: string,
  summary: string,
  credibility: number
): boolean {
  const text = `${title} ${summary}`.toLowerCase();

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  for (const pattern of TECHNICAL_ANALYSIS_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  for (const pattern of OPINION_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  // Opiniones alcistas/bajistas sin evento duro
  const emotionalOnly =
    /\b(bullish|bearish|super\s+bullish|crash\s+incoming|buy\s+now|sell\s+now|compra ya|vende ya|moon|dump)\b/i.test(
      text
    ) &&
    !/\b(fed|cpi|ppi|fomc|sec|etf|inflation|employment|war|guerra|sanctions|bankruptcy|quiebra)\b/i.test(
      text
    );

  if (emotionalOnly) return true;

  // Cuentas de baja credibilidad siempre filtradas
  if (credibility < 9) return true;

  return false;
}

export function hasRelevantKeyword(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase()));
}
