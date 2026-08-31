import type { FeedSource } from "@/lib/types";

const GOOGLE_NEWS = "https://news.google.com/rss/search";

function googleNewsQuery(query: string): string {
  return `${GOOGLE_NEWS}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

/** Solo fuentes institucionales verificadas + agregadores de noticias confiables */
export const FEED_SOURCES: FeedSource[] = [
  {
    id: "fed-press",
    name: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    type: "rss",
    credibility: 10,
    categories: ["fed"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "fed-speeches",
    name: "Fed — Discursos",
    url: "https://www.federalreserve.gov/feeds/speeches.xml",
    type: "rss",
    credibility: 10,
    categories: ["fed"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "bea-news",
    name: "BEA — Datos macro",
    url: "https://www.bea.gov/news/rss",
    type: "rss",
    credibility: 10,
    categories: ["macro"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "google-macro",
    name: "Google News — Macro (CPI/NFP/PCE)",
    url: googleNewsQuery(
      "(CPI OR PPI OR PCE OR NFP OR payroll OR inflation OR GDP) (Federal Reserve OR BLS OR BEA) when:3d"
    ),
    type: "rss",
    credibility: 9,
    categories: ["macro", "fed"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "google-gold",
    name: "Google News — Oro / XAU",
    url: googleNewsQuery(
      "(gold OR XAU OR bullion OR \"safe haven\") (Federal Reserve OR Fed OR inflation OR DXY OR yield) when:2d"
    ),
    type: "rss",
    credibility: 9,
    categories: ["fed", "macro", "geopolitics"],
    assets: ["XAU"],
    enabled: true,
  },
  {
    id: "google-markets",
    name: "Google News — Mercados institucionales",
    url: googleNewsQuery(
      "(site:reuters.com OR site:bloomberg.com OR site:wsj.com OR site:ft.com) (gold OR bitcoin OR Federal Reserve OR CPI) when:2d"
    ),
    type: "rss",
    credibility: 9,
    categories: ["fed", "macro", "geopolitics"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "google-btc",
    name: "Google News — BTC / Regulación",
    url: googleNewsQuery(
      "(bitcoin OR BTC OR \"spot etf\" OR SEC OR CFTC OR crypto regulation) when:2d"
    ),
    type: "rss",
    credibility: 9,
    categories: ["btc_regulation", "macro"],
    assets: ["BTC"],
    enabled: true,
  },
  {
    id: "investing-commodities",
    name: "Investing.com — Commodities",
    url: "https://www.investing.com/rss/news_301.rss",
    type: "rss",
    credibility: 9,
    categories: ["macro", "fed"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "sec-press",
    name: "SEC — Comunicados",
    url: "https://www.sec.gov/news/pressreleases.rss",
    type: "rss",
    credibility: 10,
    categories: ["btc_regulation"],
    assets: ["BTC"],
    enabled: true,
  },
  // Fallback Nitter — solo activo si el navegador de X no tiene sesión
  {
    id: "nitter-federalreserve",
    name: "X — @federalreserve",
    url: "https://nitter.cz/federalreserve/rss",
    type: "twitter_rss",
    credibility: 10,
    categories: ["fed"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "nitter-reuters",
    name: "X — @Reuters",
    url: "https://nitter.cz/Reuters/rss",
    type: "twitter_rss",
    credibility: 10,
    categories: ["macro", "geopolitics", "fed"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "nitter-business",
    name: "X — @business",
    url: "https://nitter.cz/business/rss",
    type: "twitter_rss",
    credibility: 10,
    categories: ["macro", "geopolitics", "btc_regulation"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "nitter-fxstreet",
    name: "X — @FXStreet",
    url: "https://nitter.cz/FXStreet/rss",
    type: "twitter_rss",
    credibility: 9,
    categories: ["macro", "fed"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
  {
    id: "nitter-whale-alert",
    name: "X — @whale_alert",
    url: "https://nitter.cz/whale_alert/rss",
    type: "twitter_rss",
    credibility: 9,
    categories: ["btc_whale"],
    assets: ["BTC"],
    enabled: true,
  },
  {
    id: "nitter-sec",
    name: "X — @SEC_News",
    url: "https://nitter.cz/SEC_News/rss",
    type: "twitter_rss",
    credibility: 10,
    categories: ["btc_regulation"],
    assets: ["BTC"],
    enabled: true,
  },
  {
    id: "nitter-ecb",
    name: "X — @ecb",
    url: "https://nitter.cz/ecb/rss",
    type: "twitter_rss",
    credibility: 10,
    categories: ["fed", "macro"],
    assets: ["XAU", "BTC"],
    enabled: true,
  },
];
