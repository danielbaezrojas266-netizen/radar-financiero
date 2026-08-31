import {
  CRYPTO_FUD_HYPE,
  NOISE_PATTERNS,
} from "@/lib/config/keywords";

/** Análisis técnico retail — siempre ruido */
const TECHNICAL_ANALYSIS_PATTERNS = [
  /\b(rsi|macd|fibonacci|fib|support level|resistance level|breakout|breakdown|head and shoulders|moving average|bollinger|ichimoku|chart pattern|technical analysis|price target)\b/i,
  /\b(oversold|overbought|golden cross|death cross|cup and handle)\b/i,
  /\b(long setup|short setup|stop loss|take profit)\b/i,
  /\b(candlestick|patrón de velas|soporte|resistencia)\b/i,
];

/** Opiniones y especulación retail */
const OPINION_PATTERNS = [
  /\b(i think|in my opinion|my take|probably|might|guess|hot take)\b/i,
  /\b(prediction|forecast|expect|likely to|price will|target price)\b/i,
  /\b(thread 🧵|unpopular opinion|guru|influencer)\b/i,
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isNoise(
  title: string,
  summary: string,
  credibility: number
): boolean {
  const text = `${title} ${summary}`.toLowerCase();

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  for (const pattern of CRYPTO_FUD_HYPE) {
    const hasData =
      /\b(\$[\d,.]+[kmb]?|\d+\s*btc|\d+\s*million|\d+\s*billion|on-chain|etf flow|inflow|outflow|wallet|address|hash|verified|sec filing|cftc|official)\b/i.test(
        text
      );
    if (pattern.test(text) && !hasData) return true;
  }

  for (const pattern of TECHNICAL_ANALYSIS_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  for (const pattern of OPINION_PATTERNS) {
    if (pattern.test(text)) {
      const hasInstitutionalContext =
        /\b(fed|federal reserve|cpi|nfp|ppi|pce|sec|cftc|etf|inflation|employment|gdp|treasury|dxy|warsh|jackson hole|rate hike|rate cut|fomc)\b/i.test(
          text
        );
      if (!(credibility >= 9 && hasInstitutionalContext)) return true;
    }
  }

  const emotionalOnly =
    /\b(bullish|bearish|super\s+bullish|buy\s+now|sell\s+now|moon|dump|fud)\b/i.test(
      text
    ) &&
    !/\b(fed|cpi|ppi|fomc|sec|etf|inflation|employment|nfp|pce|sanctions|bankruptcy|whale|transfer|inflow|outflow|dxy|yield|cot|gld)\b/i.test(
      text
    );

  if (emotionalOnly) return true;

  if (credibility < 9) return true;

  return false;
}

export function hasRelevantKeyword(text: string, terms: string[]): string[] {
  const matched: string[] = [];
  for (const term of terms) {
    const t = term.toLowerCase();
    if (t.includes(" ")) {
      if (text.toLowerCase().includes(t)) matched.push(term);
    } else {
      const re = new RegExp(`\\b${escapeRegex(t)}\\b`, "i");
      if (re.test(text)) matched.push(term);
    }
  }
  return matched;
}
