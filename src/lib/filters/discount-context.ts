import {
  formatValue,
  parseMacroFromText,
  type ParsedMacroNumbers,
} from "@/lib/fetchers/macro-releases";
import {
  fetch5DayMoves,
  formatChangePct,
} from "@/lib/fetchers/price-history";
import type { Alert, DiscountContext } from "@/lib/types";

function classifySurprise(parsed: ParsedMacroNumbers): DiscountContext["surprise"] {
  if (parsed.actual == null || parsed.consensus == null) return "unknown";
  const diff = parsed.actual - parsed.consensus;
  if (Math.abs(diff) < 0.05) return "inline";
  return diff > 0 ? "above_consensus" : "below_consensus";
}

function buildInterpretation(
  parsed: ParsedMacroNumbers,
  xau5d: number | null,
  dxy5d: number | null,
  surprise: DiscountContext["surprise"]
): string {
  const parts: string[] = [];

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
  const dxyAlreadyDown = dxy5d != null && dxy5d <= -0.4;

  if (hawkishSurprise && xauAlreadyDown && dxyAlreadyUp) {
    parts.push(
      "Escenario hawkish posiblemente descontado: XAU ya débil y DXY firme en 5d antes del dato"
    );
  } else if (hawkishSurprise && xauFlat) {
    parts.push(
      "Sorpresa hawkish con XAU plano previo: reacción bajista en oro puede ser más marcada"
    );
  } else if (dovishSurprise && xauAlreadyUp) {
    parts.push(
      "Sorpresa dovish con XAU ya fuerte en 5d: ampliación alcista puede ser limitada (buy-the-rumor)"
    );
  } else if (dovishSurprise && xauFlat) {
    parts.push(
      "Sorpresa dovish con oro sin moverse antes: upside en XAU menos descontado"
    );
  } else if (surprise === "inline" && (xauAlreadyDown || xauAlreadyUp)) {
    parts.push(
      "Dato en línea con consenso; movimiento previo de XAU sugiere parte del escenario ya en precio"
    );
  } else if (surprise === "unknown") {
    parts.push(
      "Consenso no detectado en titular — comparar manualmente con calendario económico"
    );
  } else {
    parts.push(
      "Evaluar si el movimiento 5d de XAU/DXY es coherente con la sorpresa del dato"
    );
  }

  return parts.join(" ");
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

  const { xau, dxy } = await fetch5DayMoves();
  const surprise = classifySurprise(parsed);

  return {
    indicator: parsed.indicatorLabel,
    actual: parsed.actual,
    consensus: parsed.consensus,
    previous: parsed.previous,
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
  };
}

export function formatDiscountForTelegram(ctx: DiscountContext): string {
  const lines = ["<b>📊 Contexto de descuento (XAU)</b>"];

  const actual = formatValue(ctx.actual, ctx.unit);
  const previous = formatValue(ctx.previous, ctx.unit);
  const consensus = formatValue(ctx.consensus, ctx.unit);

  lines.push(`· ${ctx.indicator}: ${actual} (ant. ${previous}) vs consenso ${consensus}`);

  if (ctx.xauChange5d != null) {
    lines.push(`· XAU/USD 5d: ${formatChangePct(ctx.xauChange5d)}`);
  }
  if (ctx.dxyChange5d != null) {
    lines.push(`· DXY 5d: ${formatChangePct(ctx.dxyChange5d)}`);
  }

  const surpriseEs = {
    above_consensus: "por encima del consenso",
    below_consensus: "por debajo del consenso",
    inline: "en línea con consenso",
    unknown: "sorpresa no calculada",
  }[ctx.surprise];

  lines.push(`· Sorpresa: ${surpriseEs}`);
  lines.push(`· <i>${ctx.interpretation}</i>`);

  return lines.join("\n");
}
