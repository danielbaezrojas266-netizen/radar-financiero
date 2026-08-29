import { fetchWhaleAlerts } from "@/lib/fetchers/btc-whales";
import { fetchPrices } from "@/lib/fetchers/prices";
import { fetchAllRssAlerts } from "@/lib/fetchers/rss-fetcher";
import { fetchXAlerts, isXConfigured } from "@/lib/fetchers/x-api";
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
  alerts: Alert[];
  newAlerts: Alert[];
  prices: PriceSnapshot[];
  status: MonitorStatus;
}

export async function runScan(): Promise<ScanResult> {
  const [rssResult, prices, xResult] = await Promise.all([
    fetchAllRssAlerts(),
    fetchPrices(),
    fetchXAlerts(),
  ]);

  const btcPrice =
    prices.find((p) => p.symbol === "BTC/USD")?.price ?? 95000;
  const whaleAlerts = await fetchWhaleAlerts(btcPrice);

  const allAlerts = dedupeAlerts(
    sortAlerts([...rssResult.alerts, ...xResult.alerts, ...whaleAlerts])
  );

  const newAlerts = allAlerts.filter((a) => !seenIds.has(a.id));
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

  const xSourceCount = isXConfigured() ? xResult.activeAccounts.length : 0;
  const rssActive = rssResult.activeSources.filter(
    (id) => !id.includes("-twitter") || !isXConfigured()
  ).length;

  return {
    alerts: allAlerts,
    newAlerts,
    prices,
    status: {
      lastScan: lastScanTime,
      sourcesActive: rssActive + xSourceCount,
      sourcesTotal:
        FEED_SOURCES.filter(
          (s) => s.enabled && (!s.id.includes("-twitter") || !isXConfigured())
        ).length + (isXConfigured() ? xResult.activeAccounts.length : 0),
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
