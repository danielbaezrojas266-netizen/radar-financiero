import { categorizeItem } from "@/lib/filters/categorizer";
import type { Alert } from "@/lib/types";

const WHALE_THRESHOLD_BTC = 500;
const WHALE_THRESHOLD_SATS = WHALE_THRESHOLD_BTC * 100_000_000;
const BLOCKCHAIR_URL = `https://api.blockchair.com/bitcoin/transactions?q=output_total(${WHALE_THRESHOLD_SATS}..),time(24 hours ago..)&limit=15&sort=time:desc`;
const MEMPOOL_RECENT_URL = "https://mempool.space/api/mempool/recent";

interface BlockchairTx {
  hash: string;
  time: string;
  output_total: number;
}

interface BlockchairResponse {
  data?: BlockchairTx[];
}

interface MempoolRecentTx {
  txid: string;
  value: number;
}

const WHALE_SOURCE = {
  id: "blockchain-whale",
  name: "Blockchain — On-chain",
  url: "",
  type: "rss" as const,
  credibility: 9,
  categories: ["btc_whale" as const],
  assets: ["BTC" as const],
  enabled: true,
};

function satsToBtc(sats: number): number {
  return sats / 100_000_000;
}

function formatUsdEstimate(btc: number, btcPrice: number): string {
  const usd = btc * btcPrice;
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function buildWhaleAlert(
  hash: string,
  btcAmount: number,
  btcPrice: number,
  publishedAt: Date
): Alert {
  const usdEstimate = formatUsdEstimate(btcAmount, btcPrice);
  const title = `🐋 Transferencia masiva: ${btcAmount.toLocaleString("en-US", { maximumFractionDigits: 2 })} BTC (~${usdEstimate})`;
  const summary = `Transacción on-chain detectada por encima del umbral de ${WHALE_THRESHOLD_BTC} BTC. Hash: ${hash.slice(0, 16)}...`;

  const alerts = categorizeItem(
    {
      title,
      summary,
      url: `https://mempool.space/tx/${hash}`,
      publishedAt,
      source: WHALE_SOURCE,
    },
    "blockchain"
  );

  if (alerts.length === 0) {
    return {
      id: `whale-${hash}`,
      sourceId: "blockchain-whale",
      category: "btc_whale" as const,
      priority: btcAmount >= 1000 ? "critical" : "high",
      title,
      summary,
      url: `https://mempool.space/tx/${hash}`,
      source: "blockchain" as const,
      sourceName: "Mempool — Cadena en vivo",
      publishedAt: publishedAt.toISOString(),
      assets: ["BTC" as const],
      keywords: ["whale", "on-chain"],
    } satisfies Alert;
  }

  return alerts[0];
}

async function fetchFromBlockchair(btcPrice: number): Promise<Alert[]> {
  const res = await fetch(BLOCKCHAIR_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.warn("[Whale] Blockchair API error:", res.status);
    return [];
  }

  const json = (await res.json()) as BlockchairResponse;
  if (!json.data?.length) return [];

  return json.data.map((tx) =>
    buildWhaleAlert(tx.hash, satsToBtc(tx.output_total), btcPrice, new Date(tx.time))
  );
}

async function fetchFromMempool(btcPrice: number): Promise<Alert[]> {
  const res = await fetch(MEMPOOL_RECENT_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.warn("[Whale] Mempool API error:", res.status);
    return [];
  }

  const json = (await res.json()) as MempoolRecentTx[];
  const large = json
    .filter((tx) => tx.value >= WHALE_THRESHOLD_SATS)
    .slice(0, 10);
  if (large.length === 0) return [];

  return large.map((tx) =>
    buildWhaleAlert(tx.txid, satsToBtc(tx.value), btcPrice, new Date())
  );
}

export async function fetchWhaleAlerts(btcPrice = 95000): Promise<Alert[]> {
  try {
    const blockchair = await fetchFromBlockchair(btcPrice);
    if (blockchair.length > 0) return blockchair;
    return await fetchFromMempool(btcPrice);
  } catch (error) {
    console.error("[Whale] Fetch error:", error);
    return [];
  }
}
