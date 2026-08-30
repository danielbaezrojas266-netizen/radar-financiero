import fs from "fs";
import path from "path";

export type MacroIndicator = "cpi" | "core_cpi" | "ppi" | "pce" | "nfp" | "fed_rate";

export interface MacroReleaseRecord {
  indicator: MacroIndicator;
  label: string;
  value: number;
  unit: "pct_mom" | "pct_yoy" | "k_jobs";
  periodLabel?: string;
  recordedAt: string;
}

const STORE_FILE = path.join(process.cwd(), ".macro-releases.json");

/** Valores de referencia conocidos (fallback si aún no hay histórico local) */
const BASELINE_PREVIOUS: Partial<
  Record<MacroIndicator, { value: number; unit: MacroReleaseRecord["unit"]; label: string }>
> = {
  cpi: { value: 0.2, unit: "pct_mom", label: "CPI m/m (jul 2025)" },
  core_cpi: { value: 0.3, unit: "pct_mom", label: "Core CPI m/m (jul 2025)" },
  ppi: { value: 0.1, unit: "pct_mom", label: "PPI m/m" },
  pce: { value: 0.2, unit: "pct_mom", label: "Core PCE m/m" },
  nfp: { value: 73, unit: "k_jobs", label: "NFP (k empleos)" },
};

let records: MacroReleaseRecord[] = [];

function load(): void {
  try {
    if (fs.existsSync(STORE_FILE)) {
      records = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8")) as MacroReleaseRecord[];
    }
  } catch {
    records = [];
  }
}

function save(): void {
  fs.writeFileSync(STORE_FILE, JSON.stringify(records.slice(-50), null, 2));
}

load();

export function getPreviousRelease(
  indicator: MacroIndicator
): MacroReleaseRecord | null {
  const sorted = records
    .filter((r) => r.indicator === indicator)
    .sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  return sorted[0] ?? null;
}

export function getBaselinePrevious(
  indicator: MacroIndicator
): MacroReleaseRecord | null {
  const stored = getPreviousRelease(indicator);
  if (stored) return stored;

  const base = BASELINE_PREVIOUS[indicator];
  if (!base) return null;

  return {
    indicator,
    label: base.label,
    value: base.value,
    unit: base.unit,
    recordedAt: "baseline",
  };
}

export function recordRelease(record: MacroReleaseRecord): void {
  const dup = records.some(
    (r) =>
      r.indicator === record.indicator &&
      r.value === record.value &&
      Date.now() - new Date(r.recordedAt).getTime() < 24 * 60 * 60 * 1000
  );
  if (dup) return;
  records.push(record);
  save();
}

export interface ParsedMacroNumbers {
  indicator: MacroIndicator;
  indicatorLabel: string;
  actual?: number;
  consensus?: number;
  previous?: number;
  unit: MacroReleaseRecord["unit"];
}

function parsePercent(text: string): number | undefined {
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*(?:%|percent|por ciento)/i);
  return m ? parseFloat(m[1]) : undefined;
}

function parseJobs(text: string): number | undefined {
  const m = text.match(/(-?\d[\d,]*)\s*(?:k|,000)?\s*(?:jobs|empleos|payroll)/i);
  if (m) return parseFloat(m[1].replace(/,/g, ""));
  const nfp = text.match(/(?:added|gained|lost|missed)\s+(-?\d[\d,]*)/i);
  if (nfp) return parseFloat(nfp[1].replace(/,/g, ""));
  return undefined;
}

function detectIndicator(text: string): MacroIndicator | null {
  const lower = text.toLowerCase();
  if (/\bcore cpi\b/.test(lower)) return "core_cpi";
  if (/\bcpi\b|consumer price index|inflación|inflation/.test(lower)) return "cpi";
  if (/\bppi\b|producer price/.test(lower)) return "ppi";
  if (/\bcore pce\b|\bpce\b/.test(lower)) return "pce";
  if (/\bnfp\b|nonfarm|non-farm|payroll/.test(lower)) return "nfp";
  if (/\bfomc\b|fed funds|rate decision|tasa/.test(lower)) return "fed_rate";
  return null;
}

const INDICATOR_LABELS: Record<MacroIndicator, string> = {
  cpi: "CPI m/m",
  core_cpi: "Core CPI m/m",
  ppi: "PPI m/m",
  pce: "Core PCE m/m",
  nfp: "NFP (k empleos)",
  fed_rate: "Decisión Fed (bps)",
};

export function parseMacroFromText(
  title: string,
  summary: string
): ParsedMacroNumbers | null {
  const text = `${title} ${summary}`;
  const indicator = detectIndicator(text);
  if (!indicator) return null;

  const unit: MacroReleaseRecord["unit"] =
    indicator === "nfp" ? "k_jobs" : "pct_mom";

  let actual: number | undefined;
  let consensus: number | undefined;
  let previous: number | undefined;

  if (unit === "k_jobs") {
    actual = parseJobs(text);
  } else {
    const actualPatterns = [
      /(?:rose|increased|up|gained|subió|aumentó)\s+(?:by\s+)?(-?\d+(?:\.\d+)?)\s*(?:%|percent)/i,
      /(?:fell|decreased|down|declined|bajó)\s+(?:by\s+)?(-?\d+(?:\.\d+)?)\s*(?:%|percent)/i,
      /(?:at|en|de)\s+(-?\d+(?:\.\d+)?)\s*(?:%|percent)/i,
      /(-?\d+(?:\.\d+)?)\s*%\s*(?:m\/m|mom|month|mensual)/i,
      /(-?\d+(?:\.\d+)?)\s*(?:%|percent)\s+(?:in|en)\s+(?:august|september|october|january|february|march|april|may|june|july)/i,
    ];
    for (const p of actualPatterns) {
      const m = text.match(p);
      if (m) {
        actual = parseFloat(m[1]);
        break;
      }
    }
    if (actual == null) {
      const nums = [...text.matchAll(/(-?\d+(?:\.\d+)?)\s*(?:%|percent)/gi)].map(
        (m) => parseFloat(m[1])
      );
      if (nums.length > 0) actual = nums[0];
    }

    const consensusMatch = text.match(
      /(?:expected|forecast|consensus|estimado|esperado|vs\.?)\s*(?:of\s+)?(-?\d+(?:\.\d+)?)\s*(?:%|percent)/i
    );
    if (consensusMatch) consensus = parseFloat(consensusMatch[1]);

    const prevMatch = text.match(
      /(?:after|tras|previo|previous|anterior|from)\s+(?:rising|falling|a|de)?\s*(-?\d+(?:\.\d+)?)\s*(?:%|percent)/i
    );
    if (prevMatch) previous = parseFloat(prevMatch[1]);
  }

  const baseline = getBaselinePrevious(indicator);
  if (previous == null && baseline) {
    previous = baseline.value;
  }

  if (actual != null && indicator !== "fed_rate") {
    const isReleaseHeadline =
      /\b(consumer price index|cpi|ppi|pce|nonfarm|payroll|jobs report)\b/i.test(
        text
      ) &&
      (/\b(rose|increased|fell|decreased|unchanged|report|release|datos)\b/i.test(
        text
      ) ||
        /\b(bls|bureau of labor)\b/i.test(text));

    if (isReleaseHeadline) {
      recordRelease({
        indicator,
        label: INDICATOR_LABELS[indicator],
        value: actual,
        unit,
        recordedAt: new Date().toISOString(),
      });
    }
  }

  return {
    indicator,
    indicatorLabel: INDICATOR_LABELS[indicator],
    actual,
    consensus,
    previous,
    unit,
  };
}

export function formatValue(
  value: number | undefined,
  unit: MacroReleaseRecord["unit"]
): string {
  if (value == null) return "—";
  if (unit === "k_jobs") return `${value >= 0 ? "+" : ""}${value}k`;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
