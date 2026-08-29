import type { PriceSnapshot } from "@/lib/types";

export async function fetchPrices(): Promise<PriceSnapshot[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } }
    );

    if (!res.ok) throw new Error("CoinGecko unavailable");

    const data = (await res.json()) as {
      bitcoin: { usd: number; usd_24h_change: number };
    };

    const goldRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } }
    );

    let goldPrice = 2650;
    let goldChange = 0;

    if (goldRes.ok) {
      const goldData = (await goldRes.json()) as {
        "tether-gold": { usd: number; usd_24h_change: number };
      };
      goldPrice = goldData["tether-gold"]?.usd ?? goldPrice;
      goldChange = goldData["tether-gold"]?.usd_24h_change ?? 0;
    }

    const now = new Date().toISOString();

    return [
      {
        symbol: "XAU/USD",
        price: goldPrice,
        change24h: goldChange,
        updatedAt: now,
      },
      {
        symbol: "BTC/USD",
        price: data.bitcoin.usd,
        change24h: data.bitcoin.usd_24h_change,
        updatedAt: now,
      },
    ];
  } catch {
    const now = new Date().toISOString();
    return [
      { symbol: "XAU/USD", price: 2650, change24h: 0.12, updatedAt: now },
      { symbol: "BTC/USD", price: 95000, change24h: -0.45, updatedAt: now },
    ];
  }
}
