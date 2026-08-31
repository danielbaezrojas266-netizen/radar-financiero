import fs from "fs";
import type { AlertWithTier } from "@/lib/filters/delivery-rules";
import {
  HIGH_PRIORITY_BATCH_MS,
  MAX_INSTANT_ALERTS_PER_HOUR,
  TRADER_TIMEZONE,
} from "@/lib/config/trader-policy";
import { stateFile } from "@/lib/monitor/state-dir";

function getDigestStatePath(): string {
  return stateFile("digest-queue.json");
}

interface QueueState {
  digestPending: AlertWithTier[];
  batch15mPending: AlertWithTier[];
  lastSentMorning: string | null;
  lastSentAfternoon: string | null;
  lastBatch15mSent: number;
  instantSentAt: number[];
}

let state: QueueState = {
  digestPending: [],
  batch15mPending: [],
  lastSentMorning: null,
  lastSentAfternoon: null,
  lastBatch15mSent: 0,
  instantSentAt: [],
};

function loadState(): void {
  try {
    const file = getDigestStatePath();
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as Partial<QueueState> & {
        pending?: AlertWithTier[];
      };
      state = {
        digestPending: raw.digestPending ?? raw.pending ?? [],
        batch15mPending: raw.batch15mPending ?? [],
        lastSentMorning: raw.lastSentMorning ?? null,
        lastSentAfternoon: raw.lastSentAfternoon ?? null,
        lastBatch15mSent: raw.lastBatch15mSent ?? 0,
        instantSentAt: raw.instantSentAt ?? [],
      };
    }
  } catch {
    /* fresh state */
  }
}

function saveState(): void {
  try {
    fs.writeFileSync(getDigestStatePath(), JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("[digest-queue] No se pudo guardar estado:", error);
  }
}

loadState();

/** Recarga desde disco (simula proceso nuevo tras redeploy) */
export function reloadDigestStateFromDisk(): void {
  state = {
    digestPending: [],
    batch15mPending: [],
    lastSentMorning: null,
    lastSentAfternoon: null,
    lastBatch15mSent: 0,
    instantSentAt: [],
  };
  loadState();
}

export function peekDigestPending(): AlertWithTier[] {
  return [...state.digestPending];
}

function dedupeEnqueue(
  queue: AlertWithTier[],
  alerts: AlertWithTier[]
): AlertWithTier[] {
  const ids = new Set(queue.map((a) => a.id));
  const next = [...queue];
  for (const alert of alerts) {
    if (!ids.has(alert.id)) {
      next.push(alert);
      ids.add(alert.id);
    }
  }
  return next.slice(-200);
}

export function enqueueForDigest(alerts: AlertWithTier[]): void {
  state.digestPending = dedupeEnqueue(state.digestPending, alerts);
  saveState();
}

export function enqueueForBatch15m(alerts: AlertWithTier[]): void {
  state.batch15mPending = dedupeEnqueue(state.batch15mPending, alerts);
  saveState();
}

export function flushDigestQueue(): AlertWithTier[] {
  const items = [...state.digestPending];
  state.digestPending = [];
  saveState();
  return items;
}

export function flushBatch15mQueue(): AlertWithTier[] {
  const items = [...state.batch15mPending];
  state.batch15mPending = [];
  state.lastBatch15mSent = Date.now();
  saveState();
  return items;
}

export function getDigestQueueSize(): number {
  return state.digestPending.length + state.batch15mPending.length;
}

export function getTimezone(): string {
  return process.env.TELEGRAM_TIMEZONE || TRADER_TIMEZONE;
}

export function getLocalDateKey(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getLocalTimeMinutes(timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10
  );
  const h = hour === 24 ? 0 : hour;
  return h * 60 + minute;
}

export function formatCostaRicaTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("es-CR", {
    timeZone: getTimezone(),
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

/**
 * Ventanas con catch-up: si Railway dormía a las 7:00 / 16:30,
 * el resumen se envía en el primer scan después de esa hora (mismo día).
 * - Mañana: desde 7:00 hasta antes de las 16:30
 * - Tarde: desde 16:30 hasta 23:59
 */
export function shouldSendDigest(): "morning" | "afternoon" | null {
  const tz = getTimezone();
  const nowMinutes = getLocalTimeMinutes(tz);
  const today = getLocalDateKey(tz);

  const morningStart = 7 * 60;
  const afternoonStart = 16 * 60 + 30;

  if (
    nowMinutes >= morningStart &&
    nowMinutes < afternoonStart &&
    state.lastSentMorning !== today
  ) {
    return "morning";
  }

  if (nowMinutes >= afternoonStart && state.lastSentAfternoon !== today) {
    return "afternoon";
  }

  return null;
}

export function markDigestSent(slot: "morning" | "afternoon"): void {
  const today = getLocalDateKey(getTimezone());
  if (slot === "morning") state.lastSentMorning = today;
  else state.lastSentAfternoon = today;
  saveState();
}

export function shouldFlushBatch15m(): boolean {
  return Date.now() - state.lastBatch15mSent >= HIGH_PRIORITY_BATCH_MS;
}

export function pruneInstantRateLimit(): void {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  state.instantSentAt = state.instantSentAt.filter((t) => t > hourAgo);
}

export function canSendInstant(): boolean {
  pruneInstantRateLimit();
  return state.instantSentAt.length < MAX_INSTANT_ALERTS_PER_HOUR;
}

export function recordInstantSent(count = 1): void {
  pruneInstantRateLimit();
  for (let i = 0; i < count; i++) {
    state.instantSentAt.push(Date.now());
  }
  saveState();
}

export function remainingInstantSlots(): number {
  pruneInstantRateLimit();
  return Math.max(0, MAX_INSTANT_ALERTS_PER_HOUR - state.instantSentAt.length);
}
