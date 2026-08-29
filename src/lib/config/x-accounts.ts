import type { AlertCategory } from "@/lib/types";

export interface XAccount {
  username: string;
  name: string;
  credibility: number;
  categories: AlertCategory[];
  assets: ("XAU" | "BTC")[];
}

/** Solo cuentas oficiales e institucionales de alto impacto */
export const X_ACCOUNTS: XAccount[] = [
  {
    username: "federalreserve",
    name: "X — @federalreserve",
    credibility: 10,
    categories: ["fed"],
    assets: ["XAU", "BTC"],
  },
  {
    username: "Reuters",
    name: "X — @Reuters",
    credibility: 10,
    categories: ["macro", "geopolitics", "fed"],
    assets: ["XAU", "BTC"],
  },
  {
    username: "business",
    name: "X — @business",
    credibility: 10,
    categories: ["macro", "geopolitics", "btc_regulation"],
    assets: ["XAU", "BTC"],
  },
  {
    username: "FXStreet",
    name: "X — @FXStreet",
    credibility: 9,
    categories: ["macro", "fed"],
    assets: ["XAU", "BTC"],
  },
  {
    username: "whale_alert",
    name: "X — @whale_alert",
    credibility: 9,
    categories: ["btc_whale"],
    assets: ["BTC"],
  },
  {
    username: "SEC_News",
    name: "X — @SEC_News",
    credibility: 10,
    categories: ["btc_regulation"],
    assets: ["BTC"],
  },
  {
    username: "ecb",
    name: "X — @ecb",
    credibility: 10,
    categories: ["fed", "macro"],
    assets: ["XAU", "BTC"],
  },
];
