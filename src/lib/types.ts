export type AlertCategory =
  | "fed"
  | "macro"
  | "geopolitics"
  | "btc_whale"
  | "btc_regulation";

export type AlertPriority = "critical" | "high" | "medium";

export type AlertSource = "rss" | "twitter" | "blockchain" | "macro_calendar";

export interface Alert {
  id: string;
  category: AlertCategory;
  priority: AlertPriority;
  title: string;
  summary: string;
  url?: string;
  source: AlertSource;
  sourceName: string;
  publishedAt: string;
  assets: ("XAU" | "BTC")[];
  keywords: string[];
}

export interface PriceSnapshot {
  symbol: string;
  price: number;
  change24h: number;
  updatedAt: string;
}

export interface MonitorStatus {
  lastScan: string;
  sourcesActive: number;
  sourcesTotal: number;
  alertsToday: number;
  isScanning: boolean;
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  type: "rss" | "twitter_rss";
  credibility: number;
  categories: AlertCategory[];
  assets: ("XAU" | "BTC")[];
  enabled: boolean;
}
