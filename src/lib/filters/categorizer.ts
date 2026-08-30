import {
  CATEGORY_KEYWORDS,
  CRITICAL_BOOST_TERMS,
} from "@/lib/config/keywords";
import { hasRelevantKeyword, isNoise } from "@/lib/filters/noise-filter";
import type {
  Alert,
  AlertCategory,
  AlertPriority,
  FeedSource,
} from "@/lib/types";

function detectCategories(
  text: string,
  sourceCategories: AlertCategory[]
): { category: AlertCategory; keywords: string[] }[] {
  const matches: { category: AlertCategory; keywords: string[] }[] = [];

  for (const category of sourceCategories) {
    const config = CATEGORY_KEYWORDS[category];
    const keywords = hasRelevantKeyword(text, config.terms);
    if (keywords.length > 0) {
      matches.push({ category, keywords });
    }
  }

  // Si la fuente es altamente creíble (Fed, BLS), aceptar su categoría nativa
  if (matches.length === 0 && sourceCategories.length === 1) {
    const fallbackKeywords = hasRelevantKeyword(
      text,
      CATEGORY_KEYWORDS[sourceCategories[0]].terms
    );
    if (fallbackKeywords.length === 0) {
      // Fuente institucional: clasificar por categoría de la fuente
      return [{ category: sourceCategories[0], keywords: ["institutional"] }];
    }
  }

  return matches;
}

function resolvePriority(
  base: AlertPriority,
  text: string,
  credibility: number
): AlertPriority {
  const lower = text.toLowerCase();

  const analystOnly =
    /\b(analyst|analista|bank forecasts|projection|outlook|price target|estimates|guidance)\b/i.test(
      lower
    ) &&
    !/\b(cpi|ppi|fomc|nfp|pce|sec|etf|bankruptcy|hack|invasion|sanctions)\b/i.test(
      lower
    );
  if (analystOnly) return "medium";

  const isCritical = CRITICAL_BOOST_TERMS.some((t) => lower.includes(t));
  if (isCritical || credibility >= 10) return "critical";
  if (base === "critical") return "critical";
  if (base === "high") return "high";
  return "medium";
}

export function categorizeItem(
  item: {
    title: string;
    summary: string;
    url?: string;
    publishedAt: Date;
    source: FeedSource;
  },
  sourceType: "rss" | "twitter" | "blockchain"
): Alert[] {
  const text = `${item.title} ${item.summary}`;

  if (isNoise(item.title, item.summary, item.source.credibility)) {
    return [];
  }

  const categoryMatches = detectCategories(text, item.source.categories);

  // Fuentes institucionales: solo pasan si hay keywords reales (sin auto-aceptar todo)
  if (categoryMatches.length === 0) {
    const allMatches: { category: AlertCategory; keywords: string[] }[] = [];
    for (const cat of Object.keys(CATEGORY_KEYWORDS) as AlertCategory[]) {
      const kw = hasRelevantKeyword(text, CATEGORY_KEYWORDS[cat].terms);
      if (kw.length > 0) allMatches.push({ category: cat, keywords: kw });
    }
    if (allMatches.length === 0) return [];
    categoryMatches.push(...allMatches);
  }

  if (categoryMatches.length === 0) return [];

  const uniqueCategories = new Map<
    AlertCategory,
    { category: AlertCategory; keywords: string[] }
  >();
  for (const m of categoryMatches) {
    const existing = uniqueCategories.get(m.category);
    if (existing) {
      existing.keywords = [...new Set([...existing.keywords, ...m.keywords])];
    } else {
      uniqueCategories.set(m.category, { ...m });
    }
  }

  return Array.from(uniqueCategories.values()).map(({ category, keywords }) => {
    const config = CATEGORY_KEYWORDS[category];
    const priority = resolvePriority(
      config.priority,
      text,
      item.source.credibility
    );

    const id = `${sourceType}-${item.source.id}-${category}-${Buffer.from(item.title).toString("base64url").slice(0, 16)}-${item.publishedAt.getTime()}`;

    return {
      id,
      sourceId: item.source.id,
      category,
      priority,
      title: item.title.trim(),
      summary: item.summary.trim().slice(0, 400),
      url: item.url,
      source: sourceType,
      sourceName: item.source.name,
      publishedAt: item.publishedAt.toISOString(),
      assets: item.source.assets,
      keywords,
    } satisfies Alert;
  });
}
