import fs from "fs";
import path from "path";
import type { AlertWithTier } from "@/lib/filters/delivery-rules";

const QUEUE_FILE = path.join(process.cwd(), ".digest-queue.json");

interface DigestQueueState {
  pending: AlertWithTier[];
  lastSentMorning: string | null;
  lastSentAfternoon: string | null;
}

let state: DigestQueueState = {
  pending: [],
  lastSentMorning: null,
  lastSentAfternoon: null,
};

function loadState(): void {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      state = JSON.parse(fs.readFileSync(QUEUE_FILE, "utf-8")) as DigestQueueState;
    }
  } catch {
    state = { pending: [], lastSentMorning: null, lastSentAfternoon: null };
  }
}

function saveState(): void {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(state, null, 2));
}

loadState();

export function enqueueForDigest(alerts: AlertWithTier[]): void {
  const existingIds = new Set(state.pending.map((a) => a.id));
  for (const alert of alerts) {
    if (!existingIds.has(alert.id)) {
      state.pending.push(alert);
      existingIds.add(alert.id);
    }
  }
  if (state.pending.length > 200) {
    state.pending = state.pending.slice(-200);
  }
  saveState();
}

export function flushDigestQueue(): AlertWithTier[] {
  const items = [...state.pending];
  state.pending = [];
  saveState();
  return items;
}

export function getDigestQueueSize(): number {
  return state.pending.length;
}

export function getTimezone(): string {
  return process.env.TELEGRAM_TIMEZONE || "Europe/Madrid";
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
  return hour * 60 + minute;
}

/** Ventanas: 7:30 AM y 4:30 PM hora local */
const DIGEST_SLOTS = [
  { key: "morning" as const, hour: 7, minute: 30 },
  { key: "afternoon" as const, hour: 16, minute: 30 },
];

export function shouldSendDigest(): "morning" | "afternoon" | null {
  const tz = getTimezone();
  const nowMinutes = getLocalTimeMinutes(tz);
  const today = getLocalDateKey(tz);

  for (const slot of DIGEST_SLOTS) {
    const slotMinutes = slot.hour * 60 + slot.minute;
    const diff = nowMinutes - slotMinutes;
    // Ventana de 3 minutos tras la hora programada
    if (diff >= 0 && diff <= 3) {
      if (slot.key === "morning" && state.lastSentMorning !== today) {
        return "morning";
      }
      if (slot.key === "afternoon" && state.lastSentAfternoon !== today) {
        return "afternoon";
      }
    }
  }
  return null;
}

export function markDigestSent(slot: "morning" | "afternoon"): void {
  const today = getLocalDateKey(getTimezone());
  if (slot === "morning") state.lastSentMorning = today;
  else state.lastSentAfternoon = today;
  saveState();
}
