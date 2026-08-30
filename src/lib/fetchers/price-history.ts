interface YahooRangeResult {
  changePct: number;
  fromPrice: number;
  toPrice: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }>;
  };
}

async function fetchYahooRangeChange(
  symbol: string,
  range: "5d" | "1mo" = "5d"
): Promise<YahooRangeResult | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RadarFinanciero/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as YahooChartResponse;
    const closes =
      data.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(
        (c): c is number => c != null && c > 0
      ) ?? [];

    if (closes.length < 2) return null;

    const fromPrice = closes[0];
    const toPrice = closes[closes.length - 1];
    const changePct = ((toPrice - fromPrice) / fromPrice) * 100;

    return { changePct, fromPrice, toPrice };
  } catch {
    return null;
  }
}

let cached5d: {
  xau?: YahooRangeResult;
  dxy?: YahooRangeResult;
  at: number;
} = { at: 0 };

const CACHE_MS = 5 * 60_000;

export async function fetch5DayMoves(): Promise<{
  xau: YahooRangeResult | null;
  dxy: YahooRangeResult | null;
}> {
  const now = Date.now();
  if (now - cached5d.at < CACHE_MS && cached5d.xau && cached5d.dxy) {
    return { xau: cached5d.xau, dxy: cached5d.dxy };
  }

  const [xau, dxy] = await Promise.all([
    fetchYahooRangeChange("GC=F"),
    fetchYahooRangeChange("DX-Y.NYB"),
  ]);

  if (xau) cached5d.xau = xau;
  if (dxy) cached5d.dxy = dxy;
  cached5d.at = now;

  return { xau, dxy };
}

export function formatChangePct(changePct: number): string {
  return `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
}
