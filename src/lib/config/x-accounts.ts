import type { AlertCategory } from "@/lib/types";

export interface XAccount {
  username: string;
  name: string;
  credibility: number;
  categories: AlertCategory[];
  assets: ("XAU" | "BTC")[];
}

/** Cuentas institucionales en X — sin influencers ni ruido */
export const X_ACCOUNTS: XAccount[] = [
  {
    username: "federalreserve",
    name: "X — @federalreserve",
    credibility: 10,
    categories: ["fed"],
    assets: ["XAU", "BTC"],
  },
  {
    username: "JeromeHPowell",
    name: "X — @JeromeHPowell",
    credibility: 10,
    categories: ["fed"],
    assets: ["XAU", "BTC"],
  },
  {
    username: "ecb",
    name: "X — @ecb",
    credibility: 9,
    categories: ["fed", "macro"],
    assets: ["XAU", "BTC"],
  },
  {
    username: "FirstSquawk",
    name: "X — @FirstSquawk",
    credibility: 8,
    categories: ["macro", "fed"],
    assets: ["XAU", "BTC"],
  },
  {
    username: "whale_alert",
    name: "X — @whale_alert",
    credibility: 8,
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
];
