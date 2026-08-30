import type { MacroIndicator } from "@/lib/fetchers/macro-releases";
import { formatValue } from "@/lib/fetchers/macro-releases";

export interface CalendarMacroEvent {
  indicator: MacroIndicator;
  eventName: string;
  time: string;
  country: string;
  impact: string;
  estimate: number | null;
  previous: number | null;
  actual: number | null;
  unit: "pct_mom" | "k_jobs";
}

interface FinnhubEconomicEvent {
  event?: string;
  time?: string;
  country?: string;
  impact?: string;
  estimate?: number | null;
  prev?: number | null;
  actual?: number | null;
  unit?: string;
}

interface FinnhubCalendarResponse {
  economicCalendar?: FinnhubEconomicEvent[];
}

const EVENT_PATTERNS: Array<{
  indicator: MacroIndicator;
  patterns: RegExp[];
  unit: "pct_mom" | "k_jobs";
}> = [
  {
    indicator: "core_cpi",
    patterns: [/core cpi/i, /cpi.*excl.*food/i],
    unit: "pct_mom",
  },
  {
    indicator: "cpi",
    patterns: [
      /^cpi$/i,
      /consumer price index/i,
      /cpi m\/m/i,
      /inflation rate/i,
    ],
    unit: "pct_mom",
  },
  {
    indicator: "ppi",
    patterns: [/producer price index/i, /^ppi$/i, /ppi m\/m/i],
    unit: "pct_mom",
  },
  {
    indicator: "pce",
    patterns: [/pce price index/i, /core pce/i, /^pce$/i],
    unit: "pct_mom",
  },
  {
    indicator: "nfp",
    patterns: [
      /non.?farm payrolls/i,
      /nonfarm payrolls/i,
      /non-farm payrolls/i,
      /employment change/i,
    ],
    unit: "k_jobs",
  },
];

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function matchIndicator(eventName: string): {
  indicator: MacroIndicator;
  unit: "pct_mom" | "k_jobs";
} | null {
  for (const row of EVENT_PATTERNS) {
    if (row.indicator === "cpi" && /core/i.test(eventName)) continue;
    for (const p of row.patterns) {
      if (p.test(eventName)) {
        return { indicator: row.indicator, unit: row.unit };
      }
    }
  }
  return null;
}

function normalizeEvent(e: FinnhubEconomicEvent): CalendarMacroEvent | null {
  if (!e.event || e.country !== "US") return null;
  if (e.impact && !/high|medium/i.test(e.impact)) return null;

  const match = matchIndicator(e.event);
  if (!match) return null;

  return {
    indicator: match.indicator,
    eventName: e.event,
    time: e.time ?? "",
    country: e.country,
    impact: e.impact ?? "medium",
    estimate: e.estimate ?? null,
    previous: e.prev ?? null,
    actual: e.actual ?? null,
    unit: match.unit,
  };
}

let cachedEvents: CalendarMacroEvent[] = [];
let cachedRange = "";
let cachedAt = 0;
const CACHE_MS = 60 * 60 * 1000;

export function isCalendarConfigured(): boolean {
  return Boolean(process.env.FINNHUB_API_KEY);
}

async function fetchFinnhubCalendar(
  from: string,
  to: string
): Promise<CalendarMacroEvent[]> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return [];

  const rangeKey = `${from}_${to}`;
  if (cachedRange === rangeKey && Date.now() - cachedAt < CACHE_MS) {
    return cachedEvents;
  }

  try {
    const url = `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${token}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) {
      console.warn("[Calendar] Finnhub error:", res.status);
      return cachedEvents;
    }

    const data = (await res.json()) as FinnhubCalendarResponse;
    const events = (data.economicCalendar ?? [])
      .map(normalizeEvent)
      .filter((e): e is CalendarMacroEvent => e != null);

    cachedEvents = events;
    cachedRange = rangeKey;
    cachedAt = Date.now();
    return events;
  } catch (error) {
    console.warn("[Calendar] Fetch failed:", error);
    return cachedEvents;
  }
}

export async function getCalendarWindow(
  centerDate: Date,
  daysBefore = 2,
  daysAfter = 1
): Promise<CalendarMacroEvent[]> {
  const from = dateKey(addDays(centerDate, -daysBefore));
  const to = dateKey(addDays(centerDate, daysAfter));
  return fetchFinnhubCalendar(from, to);
}

export async function lookupCalendarForIndicator(
  indicator: MacroIndicator,
  publishedAt: string
): Promise<CalendarMacroEvent | null> {
  const events = await getCalendarWindow(new Date(publishedAt));
  const day = dateKey(new Date(publishedAt));

  const sameDay = events.filter(
    (e) => e.indicator === indicator && e.time.startsWith(day)
  );
  if (sameDay.length === 1) return sameDay[0];

  if (sameDay.length > 1) {
    return (
      sameDay.find((e) => e.actual != null) ??
      sameDay.find((e) => e.estimate != null) ??
      sameDay[0]
    );
  }

  const nearby = events.filter((e) => e.indicator === indicator);
  return nearby[0] ?? null;
}

export async function getUpcomingMacroEvents(
  daysAhead = 3
): Promise<CalendarMacroEvent[]> {
  const now = new Date();
  const events = await getCalendarWindow(now, 0, daysAhead);
  const today = dateKey(now);

  return events
    .filter((e) => e.time.slice(0, 10) >= today && e.actual == null)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 8);
}

export function formatCalendarEventLine(e: CalendarMacroEvent): string {
  const timeCr = new Intl.DateTimeFormat("es-CR", {
    timeZone: process.env.TELEGRAM_TIMEZONE || "Etc/GMT+6",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(e.time));

  const est = formatValue(e.estimate ?? undefined, e.unit);
  const prev = formatValue(e.previous ?? undefined, e.unit);
  const impact = e.impact === "high" ? "🔴" : "🟠";

  return `${impact} ${timeCr} · ${e.eventName} · consenso ${est} · ant. ${prev}`;
}

export interface CalendarEnrichment {
  estimate: number | null;
  previous: number | null;
  actual: number | null;
  eventName: string;
  source: "finnhub";
}

export async function enrichFromCalendar(
  indicator: MacroIndicator,
  publishedAt: string
): Promise<CalendarEnrichment | null> {
  const hit = await lookupCalendarForIndicator(indicator, publishedAt);
  if (!hit) return null;
  return {
    estimate: hit.estimate,
    previous: hit.previous,
    actual: hit.actual,
    eventName: hit.eventName,
    source: "finnhub",
  };
}
