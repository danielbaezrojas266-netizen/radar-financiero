export type AlertCategory =
  | "fed"
  | "macro"
  | "geopolitics"
  | "btc_whale"
  | "btc_regulation";

export type AlertPriority = "critical" | "high" | "medium";

export type AlertSource = "rss" | "twitter" | "blockchain" | "macro_calendar";

export type VerificationStatus =
  | "confirmed_traditional"
  | "official_x"
  | "on_chain_institutional"
  | "early_signal_x"
  | "rumor_moving_market";

export type DeliveryTier = "instant" | "batch_15m" | "digest" | "dropped";

export interface MacroContextSnapshot {
  dxy: {
    level: number;
    changePct: number;
    direction: "up" | "down" | "flat";
  };
  tips10y: {
    level: number;
    changeBps: number;
    direction: "up" | "down" | "flat";
    label: string;
  };
  xauUsd?: { price: number; changePct: number };
  btcUsd?: { price: number; changePct: number };
  dxyShock: boolean;
  tipsShock: boolean;
  fetchedAt: string;
}

export interface Alert {
  id: string;
  sourceId: string;
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
  deliveryTier?: DeliveryTier;
  verificationStatus?: VerificationStatus;
  eventKey?: string;
  macroContext?: MacroContextSnapshot;
  priceReactionNote?: string;
  /** Consenso vs dato real cuando aplique */
  consensusNote?: string;
  /** Contexto de descuento para macro XAU (dato ant., consenso, mov. 5d) */
  discountContext?: DiscountContext;
}

export interface DiscountContext {
  indicator: string;
  actual?: number;
  consensus?: number;
  previous?: number;
  unit: "pct_mom" | "pct_yoy" | "k_jobs";
  surprise: "above_consensus" | "below_consensus" | "inline" | "unknown";
  xauChange5d: number | null;
  dxyChange5d: number | null;
  interpretation: string;
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
  macroContext?: MacroContextSnapshot;
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
