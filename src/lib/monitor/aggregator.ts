import { fetchWhaleAlerts } from "@/lib/fetchers/btc-whales";
import { fetchPrices } from "@/lib/fetchers/prices";
import { fetchAllRssAlerts } from "@/lib/fetchers/rss-fetcher";
import { fetchXBrowserAlerts } from "@/lib/fetchers/x-browser";
import { fetchXAlerts, isXApiOperational, isXConfigured } from "@/lib/fetchers/x-api";
import { applyDeliveryRules, type AlertWithTier } from "@/lib/filters/delivery-rules";
import { localizeAlerts } from "@/lib/notifiers/translate-alerts";
import { FEED_SOURCES } from "@/lib/config/sources";
import type { Alert, MonitorStatus, PriceSnapshot } from "@/lib/types";

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2 };

let cachedAlerts: Alert[] = [];
let lastScanTime = "";
let seenIds = new Set<string>();

function dedupeAlerts(alerts: Alert[]): Alert[] {
  const map = new Map<string, Alert>();
  for (const alert of alerts) {
    const key = `${alert.category}-${alert.title.slice(0, 80)}`;
    const existing = map.get(key);
    if (
      !existing ||
      new Date(alert.publishedAt) > new Date(existing.publishedAt)
    ) {
      map.set(key, alert);
    }
  }
  return Array.from(map.values());
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
  digestAlerts: AlertWithTier[];
  prices: PriceSnapshot[];
  status: MonitorStatus;
}

export async function runScan(): Promise<ScanResult> {
  const [rssResult, prices] = await Promise.all([
    fetchAllRssAlerts(),
    fetchPrices(),
  ]);

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

  const filtered = applyDeliveryRules(
    dedupeAlerts(
      sortAlerts([...rssResult.alerts, ...xApiAlerts, ...whaleAlerts])
    )
  );

  const allAlerts: AlertWithTier[] = filtered;
  const newAlerts = allAlerts.filter((a) => !seenIds.has(a.id));
  const instantAlerts = newAlerts.filter((a) => a.deliveryTier === "instant");
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

  const xSourceCount = isXApiOperational()
    ? xApiActive.length
    : rssResult.xMode === "browser"
      ? xApiActive.length
      : rssResult.activeSources.filter((id) => id.startsWith("nitter-")).length;

  const rssOnlyCount = FEED_SOURCES.filter(
    (s) => s.enabled && s.type !== "twitter_rss"
  ).length;
  const nitterCount = FEED_SOURCES.filter(
    (s) => s.enabled && s.type === "twitter_rss"
  ).length;

  const localizedAlerts = await localizeAlerts(allAlerts);

  return {
    alerts: localizedAlerts,
    newAlerts: localizedAlerts.filter((a) => newAlerts.some((n) => n.id === a.id)),
    instantAlerts: localizedAlerts.filter((a) =>
      instantAlerts.some((n) => n.id === a.id)
    ),
    digestAlerts: localizedAlerts.filter((a) =>
      digestAlerts.some((n) => n.id === a.id)
    ),
    prices,
    status: {
      lastScan: lastScanTime,
      sourcesActive: rssResult.activeSources.length + xSourceCount,
      sourcesTotal:
        rssOnlyCount +
        (isXApiOperational()
          ? xApiActive.length
          : rssResult.xMode !== "browser"
            ? nitterCount
            : xApiActive.length),
      alertsToday,
      isScanning: false,
    },
  };
}

export function getCachedAlerts(): Alert[] {
  return cachedAlerts;
}

export function getLastScanTime(): string {
  return lastScanTime;
}
