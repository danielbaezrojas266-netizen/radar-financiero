import { NOISE_PATTERNS } from "@/lib/config/keywords";

const MIN_CREDIBILITY_WITHOUT_KEYWORD = 9;

export function isNoise(
  title: string,
  summary: string,
  credibility: number
): boolean {
  const text = `${title} ${summary}`.toLowerCase();

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  // Opiniones emocionales sin sustancia
  const emotionalOnly =
    /\b(bullish|bearish|super\s+bullish|crash\s+incoming|buy\s+now|sell\s+now)\b/i.test(
      text
    ) &&
    !/\b(fed|cpi|fomc|sec|etf|inflation|employment|war|sanctions)\b/i.test(
      text
    );

  if (emotionalOnly && credibility < MIN_CREDIBILITY_WITHOUT_KEYWORD) {
    return true;
  }

  return false;
}

export function hasRelevantKeyword(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase()));
}
