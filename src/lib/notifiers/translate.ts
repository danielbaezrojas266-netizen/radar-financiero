const cache = new Map<string, string>();

const SPANISH_MARKERS =
  /\b(el|la|los|las|de|del|en|que|por|con|una|es|son|para|como|está|fue|han|ser|inflación|empleo|tasa|banco|reserva|guerra|conflicto|aprobación|regulación|transferencia|masiva|ballena|oro|bitcoin|fed|macro)\b/i;

function looksSpanish(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  const hits = (text.match(SPANISH_MARKERS) || []).length;
  return hits >= 2 || (words.length <= 10 && hits >= 1);
}

export async function translateToSpanish(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (looksSpanish(trimmed)) return trimmed;

  const cached = cache.get(trimmed);
  if (cached) return cached;

  try {
    const chunk = trimmed.slice(0, 480);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|es`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) return trimmed;

    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };

    const translated = data.responseData?.translatedText?.trim();
    if (translated && translated.toLowerCase() !== trimmed.toLowerCase()) {
      cache.set(trimmed, translated);
      if (cache.size > 500) {
        const first = cache.keys().next().value;
        if (first) cache.delete(first);
      }
      return translated;
    }
  } catch {
    /* fallback al original */
  }

  return trimmed;
}

export async function translateAlertText(
  title: string,
  summary: string
): Promise<{ title: string; summary: string }> {
  const [titleEs, summaryEs] = await Promise.all([
    translateToSpanish(title),
    summary ? translateToSpanish(summary) : Promise.resolve(""),
  ]);
  return { title: titleEs, summary: summaryEs };
}
