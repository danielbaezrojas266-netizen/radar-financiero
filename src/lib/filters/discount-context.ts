import {
  formatValue,
  parseMacroFromText,
  type ParsedMacroNumbers,
} from "@/lib/fetchers/macro-releases";
import {
  enrichFromCalendar,
  isCalendarConfigured,
} from "@/lib/fetchers/econ-calendar";
import {
  fetch5DayMoves,
  formatChangePct,
} from "@/lib/fetchers/price-history";
import type { Alert, DiscountContext } from "@/lib/types";

function classifySurprise(
  actual: number | undefined,
  consensus: number | undefined,
  unit: DiscountContext["unit"]
): DiscountContext["surprise"] {
  if (actual == null || consensus == null) return "unknown";
  const threshold = unit === "k_jobs" ? 15 : 0.05;
  const diff = actual - consensus;
  if (Math.abs(diff) < threshold) return "inline";
  return diff > 0 ? "above_consensus" : "below_consensus";
}

function buildInterpretation(
  parsed: ParsedMacroNumbers,
  xau5d: number | null,
  dxy5d: number | null,
  surprise: DiscountContext["surprise"]
): string {
  const hawkishSurprise =
    surprise === "above_consensus" &&
    ["cpi", "core_cpi", "ppi", "pce"].includes(parsed.indicator);
  const dovishSurprise =
    surprise === "below_consensus" &&
    ["cpi", "core_cpi", "ppi", "pce"].includes(parsed.indicator);

  const xauAlreadyDown = xau5d != null && xau5d <= -0.8;
  const xauAlreadyUp = xau5d != null && xau5d >= 0.8;
  const xauFlat = xau5d != null && Math.abs(xau5d) < 0.5;
  const dxyAlreadyUp = dxy5d != null && dxy5d >= 0.4;

  if (hawkishSurprise && xauAlreadyDown && dxyAlreadyUp) {
    return "Escenario hawkish posiblemente descontado: XAU ya débil y DXY firme en 5d antes del dato";
  }
  if (hawkishSurprise && xauFlat) {
    return "Sorpresa hawkish con XAU plano previo: reacción bajista en oro puede ser más marcada";
  }
  if (dovishSurprise && xauAlreadyUp) {
    return "Sorpresa dovish con XAU ya fuerte en 5d: ampliación alcista puede ser limitada (buy-the-rumor)";
  }
  if (dovishSurprise && xauFlat) {
    return "Sorpresa dovish con oro sin moverse antes: upside en XAU menos descontado";
  }
  if (surprise === "inline" && (xauAlreadyDown || xauAlreadyUp)) {
    return "Dato en línea con consenso Wall Street; movimiento previo de XAU sugiere parte del escenario ya en precio";
  }
  if (surprise === "unknown") {
    if (isCalendarConfigured()) {
      return "Sin consenso en calendario para este evento — revisar titular manualmente";
    }
    return "Añade FINNHUB_API_KEY en Railway para consenso automático del calendario";
  }
  return "Evaluar si el movimiento 5d de XAU/DXY es coherente con la sorpresa vs consenso Wall Street";
}

async function mergeWithCalendar(
  parsed: ParsedMacroNumbers,
  publishedAt: string
): Promise<{
  actual?: number;
  consensus?: number;
  previous?: number;
  consensusSource?: DiscountContext["consensusSource"];
  calendarEventName?: string;
}> {
  let actual = parsed.actual;
  let consensus = parsed.consensus;
  let previous = parsed.previous;
  let consensusSource: DiscountContext["consensusSource"] | undefined;
  let calendarEventName: string | undefined;

  const hadHeadlineConsensus = parsed.consensus != null;

  const cal = await enrichFromCalendar(parsed.indicator, publishedAt);
  if (cal) {
    calendarEventName = cal.eventName;
    if (consensus == null && cal.estimate != null) {
      consensus = cal.estimate;
      consensusSource = "calendar";
    }
    if (previous == null && cal.previous != null) {
      previous = cal.previous;
    }
    if (actual == null && cal.actual != null) {
      actual = cal.actual;
    }
    if (hadHeadlineConsensus && cal.estimate != null) {
      consensusSource = "calendar+headline";
    }
  } else if (hadHeadlineConsensus) {
    consensusSource = "headline";
  }

  return {
    actual,
    consensus,
    previous,
    consensusSource,
    calendarEventName,
  };
}

export function isXauMacroAlert(alert: Alert): boolean {
  if (!alert.assets.includes("XAU")) return false;
  if (alert.category !== "macro" && alert.category !== "fed") return false;
  if (alert.priority === "medium") return false;
  const text = `${alert.title} ${alert.summary}`.toLowerCase();
  return /\b(cpi|ppi|pce|nfp|nonfarm|fomc|inflation|inflación|employment|empleo|fed funds|rate decision)\b/i.test(
    text
  );
}

export async function buildDiscountContext(
  alert: Alert
): Promise<DiscountContext | null> {
  if (!isXauMacroAlert(alert)) return null;

  const parsed = parseMacroFromText(alert.title, alert.summary);
  if (!parsed) return null;

  const merged = await mergeWithCalendar(parsed, alert.publishedAt);
  const { xau, dxy } = await fetch5DayMoves();

  const actual = merged.actual ?? parsed.actual;
  const consensus = merged.consensus ?? parsed.consensus;
  const previous = merged.previous ?? parsed.previous;

  const surprise = classifySurprise(actual, consensus, parsed.unit);

  return {
    indicator: parsed.indicatorLabel,
    actual,
    consensus,
    previous,
    unit: parsed.unit,
    surprise,
    xauChange5d: xau?.changePct ?? null,
    dxyChange5d: dxy?.changePct ?? null,
    interpretation: buildInterpretation(
      parsed,
      xau?.changePct ?? null,
      dxy?.changePct ?? null,
      surprise
    ),
    consensusSource: merged.consensusSource,
    calendarEventName: merged.calendarEventName,
  };
}

export function formatDiscountForTelegram(ctx: DiscountContext): string {
  const lines = ["<b>📊 Contexto de descuento (XAU)</b>"];

  if (ctx.calendarEventName) {
    lines.push(`· Evento calendario: ${ctx.calendarEventName}`);
  }

  const actual = formatValue(ctx.actual, ctx.unit);
  const previous = formatValue(ctx.previous, ctx.unit);
  const consensus = formatValue(ctx.consensus, ctx.unit);

  const sourceLabel = {
    calendar: " (consenso Wall Street · calendario)",
    headline: " (consenso en titular)",
    "calendar+headline": " (consenso calendario + titular)",
  }[ctx.consensusSource ?? "calendar"];

  lines.push(
    `· ${ctx.indicator}: ${actual} (ant. ${previous}) vs consenso ${consensus}${ctx.consensusSource ? sourceLabel : ""}`
  );

  if (ctx.xauChange5d != null) {
    lines.push(`· XAU/USD 5d: ${formatChangePct(ctx.xauChange5d)}`);
  }
  if (ctx.dxyChange5d != null) {
    lines.push(`· DXY 5d: ${formatChangePct(ctx.dxyChange5d)}`);
  }

  const surpriseEs = {
    above_consensus: "por encima del consenso Wall Street",
    below_consensus: "por debajo del consenso Wall Street",
    inline: "en línea con consenso Wall Street",
    unknown: "sorpresa no calculada",
  }[ctx.surprise];

  lines.push(`· Sorpresa: ${surpriseEs}`);
  lines.push(`· <i>${ctx.interpretation}</i>`);

  return lines.join("\n");
}
