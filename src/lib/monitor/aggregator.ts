import { fetchWhaleAlerts } from "@/lib/fetchers/btc-whales";
import { fetchPrices } from "@/lib/fetchers/prices";
import {
  buildDxyShockAlert,
  fetchMacroContext,
} from "@/lib/fetchers/macro-context";
import { fetchAllRssAlerts } from "@/lib/fetchers/rss-fetcher";
import { fetchXBrowserAlerts } from "@/lib/fetchers/x-browser";
import {
  fetchXAlerts,
  isXApiOperational,
} from "@/lib/fetchers/x-api";
import {
  applyDeliveryRules,
  enrichWithDiscountContext,
  type AlertWithTier,
} from "@/lib/filters/delivery-rules";
import {
  attachEventKeys,
  dedupeByEvent,
  filterAlreadyAlerted,
} from "@/lib/filters/event-dedup";
import { localizeAlerts } from "@/lib/notifiers/translate-alerts";
import { FEED_SOURCES } from "@/lib/config/sources";
import type {
  Alert,
  MacroContextSnapshot,
  MonitorStatus,
  PriceSnapshot,
} from "@/lib/types";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2 };

let cachedAlerts: Alert[] = [];
let lastScanTime = "";
let lastMacro: MacroContextSnapshot | undefined;
let seenIds = new Set<string>();

function dedupeAlerts(alerts: Alert[]): Alert[] {
  return dedupeByEvent(alerts);
}

function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return (
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  });
}

export interface ScanResult {
  alerts: AlertWithTier[];
  newAlerts: AlertWithTier[];
  instantAlerts: AlertWithTier[];
  batch15mAlerts: AlertWithTier[];
  digestAlerts: AlertWithTier[];
  prices: PriceSnapshot[];
  macroContext?: MacroContextSnapshot;
  status: MonitorStatus;
}

export async function runScan(): Promise<ScanResult> {
  const [rssResult, prices] = await Promise.all([
    fetchAllRssAlerts(),
    fetchPrices(),
  ]);

  const macroContext = await fetchMacroContext(prices);
  lastMacro = macroContext;

  let xApiAlerts: Alert[] = [];
  let xApiActive: string[] = [];

  if (isXApiOperational()) {
    const api = await fetchXAlerts();
    xApiAlerts = api.alerts;
    xApiActive = api.activeAccounts;
  } else if (rssResult.xMode === "browser") {
    const browser = await fetchXBrowserAlerts();
    xApiAlerts = browser.alerts;
    xApiActive = browser.activeAccounts;
  }

  const btcPrice =
    prices.find((p) => p.symbol === "BTC/USD")?.price ?? 95000;
  const whaleAlerts = await fetchWhaleAlerts(btcPrice);

  const shock = await buildDxyShockAlert(macroContext);
  const macroShockAlerts: Alert[] = shock
    ? [
        {
          id: `macro-shock-${Date.now()}`,
          sourceId: "macro-monitor",
          category: shock.category,
          priority: shock.priority,
          title: shock.title,
          summary: shock.summary,
          source: "macro_calendar" as const,
          sourceName: "Radar Macro (DXY/Yields)",
          publishedAt: new Date().toISOString(),
          assets: ["XAU", "BTC"] as ("XAU" | "BTC")[],
          keywords: ["dxy", "yield"],
          macroContext,
        },
      ]
    : [];

  const rawAlerts = attachEventKeys(
    dedupeAlerts(
      sortAlerts([
        ...rssResult.alerts,
        ...xApiAlerts,
        ...whaleAlerts,
        ...macroShockAlerts,
      ])
    )
  );

  const filtered = applyDeliveryRules(rawAlerts, macroContext);
  const enriched = await enrichWithDiscountContext(filtered);

  const allAlerts: AlertWithTier[] = enriched;
  const newAlerts = allAlerts.filter((a) => !seenIds.has(a.id));

  const instantCandidates = filterAlreadyAlerted(
    newAlerts.filter((a) => a.deliveryTier === "instant")
  );
  const batch15mAlerts = newAlerts.filter((a) => a.deliveryTier === "batch_15m");
  const digestAlerts = newAlerts.filter((a) => a.deliveryTier === "digest");

  for (const alert of allAlerts) {
    seenIds.add(alert.id);
  }

  if (seenIds.size > 5000) {
    seenIds = new Set(Array.from(seenIds).slice(-2000));
  }

  cachedAlerts = allAlerts;
  lastScanTime = new Date().toISOString();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const alertsToday = allAlerts.filter(
    (a) => new Date(a.publishedAt) >= todayStart
  ).length;

  const enabledSources = FEED_SOURCES.filter((s) => s.enabled);
  const enabledRssCount = enabledSources.filter(
    (s) => s.type !== "twitter_rss"
  ).length;
  const enabledNitterCount = enabledSources.filter(
    (s) => s.type === "twitter_rss"
  ).length;

  const localizedAlerts = await localizeAlerts(allAlerts);

  return {
    alerts: localizedAlerts,
    newAlerts: localizedAlerts.filter((a) =>
      newAlerts.some((n) => n.id === a.id)
    ),
    instantAlerts: localizedAlerts.filter((a) =>
      instantCandidates.some((n) => n.id === a.id)
    ),
    batch15mAlerts: localizedAlerts.filter((a) =>
      batch15mAlerts.some((n) => n.id === a.id)
    ),
    digestAlerts: localizedAlerts.filter((a) =>
      digestAlerts.some((n) => n.id === a.id)
    ),
    prices,
    macroContext,
    status: {
      lastScan: lastScanTime,
      sourcesActive: rssResult.activeSources.length,
      sourcesTotal:
        enabledRssCount +
        (isXApiOperational() || rssResult.xMode === "browser"
          ? xApiActive.length
          : enabledNitterCount),
      alertsToday,
      isScanning: false,
      macroContext,
    },
  };
}

export function getCachedAlerts(): Alert[] {
  return cachedAlerts;
}

export function getLastScanTime(): string {
  return lastScanTime;
}

export function getLastMacroContext(): MacroContextSnapshot | undefined {
  return lastMacro;
}
