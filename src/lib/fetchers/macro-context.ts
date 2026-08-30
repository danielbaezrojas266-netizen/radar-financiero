import type { MacroContextSnapshot, PriceSnapshot } from "@/lib/types";
import {
  DXY_SHOCK_PCT,
  TIPS_SHOCK_BPS,
} from "@/lib/config/trader-policy";

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: YahooChartMeta;
      indicators?: {
        quote?: Array<{ close?: (number | null)[] }>;
      };
    }>;
  };
}

async function fetchYahooLastTwo(
  symbol: string
): Promise<{ current: number; previous: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RadarFinanciero/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as YahooChartResponse;
    const result = data.chart?.result?.[0];
    if (!result?.meta) return null;

    const closes =
      result.indicators?.quote?.[0]?.close?.filter(
        (c): c is number => c != null && c > 0
      ) ?? [];

    const current =
      closes[closes.length - 1] ??
      result.meta.regularMarketPrice ??
      null;
    const previous =
      closes.length >= 2
        ? closes[closes.length - 2]
        : result.meta.chartPreviousClose ??
          result.meta.previousClose ??
          current;

    if (current == null || previous == null || previous === 0) return null;
    return { current, previous };
  } catch {
    return null;
  }
}

function directionFromDelta(delta: number): "up" | "down" | "flat" {
  if (delta > 0.02) return "up";
  if (delta < -0.02) return "down";
  return "flat";
}

let cachedMacro: MacroContextSnapshot | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

export async function fetchMacroContext(
  prices: PriceSnapshot[]
): Promise<MacroContextSnapshot> {
  const now = Date.now();
  if (cachedMacro && now - cachedAt < CACHE_MS) return cachedMacro;

  const [dxyData, tipsData] = await Promise.all([
    fetchYahooLastTwo("DX-Y.NYB"),
    fetchYahooLastTwo("^TNX"),
  ]);

  const dxyLevel = dxyData?.current ?? 104;
  const dxyPrev = dxyData?.previous ?? dxyLevel;
  const dxyChangePct = ((dxyLevel - dxyPrev) / dxyPrev) * 100;

  const tipsLevel = tipsData?.current ?? 4.2;
  const tipsPrev = tipsData?.previous ?? tipsLevel;
  const tipsChangeBps = (tipsLevel - tipsPrev) * 100;

  const xau = prices.find((p) => p.symbol === "XAU/USD");
  const btc = prices.find((p) => p.symbol === "BTC/USD");

  const tipsLabel =
    process.env.FRED_API_KEY
      ? "Yield real 10Y TIPS (FRED)"
      : "Yield 10Y Tesoro (proxy — nominal)";

  cachedMacro = {
    dxy: {
      level: dxyLevel,
      changePct: dxyChangePct,
      direction: directionFromDelta(dxyChangePct),
    },
    tips10y: {
      level: tipsLevel,
      changeBps: tipsChangeBps,
      direction: directionFromDelta(tipsChangeBps),
      label: tipsLabel,
    },
    xauUsd: xau
      ? { price: xau.price, changePct: xau.change24h }
      : undefined,
    btcUsd: btc
      ? { price: btc.price, changePct: btc.change24h }
      : undefined,
    dxyShock: Math.abs(dxyChangePct) >= DXY_SHOCK_PCT,
    tipsShock: Math.abs(tipsChangeBps) >= TIPS_SHOCK_BPS,
    fetchedAt: new Date().toISOString(),
  };
  cachedAt = now;
  return cachedMacro;
}

export function formatMacroForTelegram(m: MacroContextSnapshot): string {
  const dxyArrow =
    m.dxy.direction === "up" ? "↑" : m.dxy.direction === "down" ? "↓" : "→";
  const tipsArrow =
    m.tips10y.direction === "up"
      ? "↑"
      : m.tips10y.direction === "down"
        ? "↓"
        : "→";

  const lines = [
    `💵 DXY: ${m.dxy.level.toFixed(2)} (${dxyArrow} ${m.dxy.changePct >= 0 ? "+" : ""}${m.dxy.changePct.toFixed(2)}%)`,
    `📈 ${m.tips10y.label}: ${m.tips10y.level.toFixed(2)}% (${tipsArrow} ${m.tips10y.changeBps >= 0 ? "+" : ""}${m.tips10y.changeBps.toFixed(1)} bps)`,
  ];

  if (m.dxyShock || m.tipsShock) {
    lines.push(
      "⚠️ Movimiento abrupto macro sin evento obvio — revisar antes de abrir operaciones"
    );
  }

  if (m.xauUsd) {
    lines.push(
      `🥇 XAU/USD: $${m.xauUsd.price.toLocaleString("es-ES")} (${m.xauUsd.changePct >= 0 ? "+" : ""}${m.xauUsd.changePct.toFixed(2)}%)`
    );
  }
  if (m.btcUsd) {
    lines.push(
      `₿ BTC/USD: $${m.btcUsd.price.toLocaleString("es-ES")} (${m.btcUsd.changePct >= 0 ? "+" : ""}${m.btcUsd.changePct.toFixed(2)}%)`
    );
  }

  return lines.join("\n");
}

export async function buildDxyShockAlert(
  macro: MacroContextSnapshot
): Promise<{
  title: string;
  summary: string;
  category: "macro";
  priority: "high";
} | null> {
  if (!macro.dxyShock && !macro.tipsShock) return null;

  const parts: string[] = [];
  if (macro.dxyShock) {
    parts.push(
      `DXY ${macro.dxy.direction === "up" ? "sube" : "baja"} ${Math.abs(macro.dxy.changePct).toFixed(2)}% en sesión`
    );
  }
  if (macro.tipsShock) {
    parts.push(
      `${macro.tips10y.label} ${macro.tips10y.direction === "up" ? "sube" : "baja"} ${Math.abs(macro.tips10y.changeBps).toFixed(1)} bps`
    );
  }

  return {
    title: `Movimiento abrupto macro: ${parts.join(" · ")}`,
    summary:
      "Sin noticia macro obvia en fuentes monitoreadas. Posible impacto en XAU/USD vía DXY/yields. Precaución antes de operar manual o abrir EAs.",
    category: "macro",
    priority: "high",
  };
}
