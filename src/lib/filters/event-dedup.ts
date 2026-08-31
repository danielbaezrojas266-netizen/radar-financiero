import fs from "fs";
import { EVENT_FINGERPRINT_TERMS } from "@/lib/config/keywords";
import {
  GEOPOLITICAL_BACKGROUND_PATTERNS,
  GEOPOLITICAL_ESCALATION_PATTERNS,
} from "@/lib/config/trader-policy";
import { stateFile } from "@/lib/monitor/state-dir";
import type { Alert } from "@/lib/types";

const STATE_FILE = stateFile("alerted-events.json");

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGeopoliticalEscalation(alert: Alert): boolean {
  const text = `${alert.title} ${alert.summary}`;
  if (alert.category !== "geopolitics" && !/\b(iran|hormuz|missile|airstrike|strike)\b/i.test(text)) {
    // Still allow if escalation pattern matches even if categorizer put it elsewhere
  }
  const isEscalation = GEOPOLITICAL_ESCALATION_PATTERNS.some((p) => p.test(text));
  if (!isEscalation) return false;

  // Fondo/análisis sin acción nueva → no cuenta como escalada
  const isBackgroundOnly =
    GEOPOLITICAL_BACKGROUND_PATTERNS.some((p) => p.test(text)) &&
    !/\b(struck|strikes|attacked|fired|launched|closed|reopened|hit)\b/i.test(
      text
    );
  return !isBackgroundOnly;
}

export function isGeopoliticalBackground(alert: Alert): boolean {
  const text = `${alert.title} ${alert.summary}`;
  if (isGeopoliticalEscalation(alert)) return false;
  return (
    alert.category === "geopolitics" &&
    GEOPOLITICAL_BACKGROUND_PATTERNS.some((p) => p.test(text))
  );
}

function escalationActionToken(text: string): string {
  const normalized = normalizeText(text);
  const tokens = [
    "hormuz closed",
    "hormuz reopen",
    "hormuz block",
    "counterattack",
    "retaliation",
    "airstrike",
    "missile",
    "drone",
    "naval",
    "bombing",
    "strike",
    "ataque",
    "contraataque",
    "represalia",
  ];
  for (const t of tokens) {
    if (normalized.includes(t)) return t.replace(/\s+/g, "_");
  }
  return "kinetic";
}

export function buildEventKey(alert: Alert): string {
  const text = normalizeText(`${alert.title} ${alert.summary}`);

  // Cada ronda de ataque / cambio Ormuz = clave distinta (ventana 20 min)
  if (isGeopoliticalEscalation(alert)) {
    const action = escalationActionToken(`${alert.title} ${alert.summary}`);
    const bucket = Math.floor(
      new Date(alert.publishedAt).getTime() / (20 * 60 * 1000)
    );
    const parties = ["iran", "israel", "united states", "us ", "idf", "irgc"]
      .filter((p) => text.includes(p.trim()))
      .join("+");
    return `geopolitics:escalation:${action}:${parties || "na"}:${bucket}`;
  }

  // Contexto de fondo del conflicto: una sola clave → silencio entre similares
  if (isGeopoliticalBackground(alert)) {
    const conflict = text.includes("iran")
      ? "iran"
      : text.includes("hormuz")
        ? "hormuz"
        : "conflict";
    return `geopolitics:background:${conflict}`;
  }

  const hits = EVENT_FINGERPRINT_TERMS.filter((term) => {
    const t = term.toLowerCase();
    if (t.includes(" ")) return text.includes(t);
    return new RegExp(`\\b${t}\\b`, "i").test(text);
  });

  if (hits.length > 0) {
    return `${alert.category}:${[...new Set(hits)].sort().slice(0, 4).join("+")}`;
  }

  const words = text.split(" ").filter((w) => w.length > 4).slice(0, 5);
  return `${alert.category}:${words.join("+")}`;
}

const seenEvents = new Map<
  string,
  { alertId: string; lastSentAt: number; mentionCount: number }
>();

function loadState(): void {
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as {
      events?: Record<
        string,
        { alertId: string; lastSentAt: number; mentionCount: number }
      >;
    };
    if (raw.events) {
      for (const [k, v] of Object.entries(raw.events)) {
        seenEvents.set(k, v);
      }
    }
  } catch {
    /* fresh */
  }
}

function saveState(): void {
  try {
    const events: Record<
      string,
      { alertId: string; lastSentAt: number; mentionCount: number }
    > = {};
    for (const [k, v] of seenEvents) events[k] = v;
    fs.writeFileSync(STATE_FILE, JSON.stringify({ events }, null, 2));
  } catch {
    /* ignore disk errors on ephemeral FS */
  }
}

loadState();

/** Agrupa duplicados del mismo evento; conserva el más reciente */
export function dedupeByEvent(alerts: Alert[]): Alert[] {
  const byKey = new Map<string, Alert>();

  for (const alert of alerts) {
    const key = buildEventKey(alert);
    alert.eventKey = key;
    const existing = byKey.get(key);
    if (
      !existing ||
      new Date(alert.publishedAt) > new Date(existing.publishedAt)
    ) {
      byKey.set(key, alert);
    }
  }

  return Array.from(byKey.values());
}

/**
 * Evita re-alertar el mismo evento sin información nueva.
 * EXCEPCIÓN: escaladas geopolíticas (nuevos ataques / Ormuz) NO se silencian
 * por conflicto "ya conocido" — solo se evita el mismo envío exacto (&lt;15 min).
 */
export function filterAlreadyAlerted(alerts: Alert[]): Alert[] {
  const fresh: Alert[] = [];
  const now = Date.now();

  for (const alert of alerts) {
    const key = alert.eventKey ?? buildEventKey(alert);
    const prev = seenEvents.get(key);

    if (prev) {
      const silenceMs = isGeopoliticalEscalation(alert)
        ? 15 * 60 * 1000
        : isGeopoliticalBackground(alert)
          ? 12 * 60 * 60 * 1000
          : 4 * 60 * 60 * 1000;

      if (now - prev.lastSentAt < silenceMs) {
        continue;
      }
    }

    fresh.push(alert);
  }

  return fresh;
}

export function markEventsAlerted(alerts: Alert[]): void {
  const now = Date.now();
  for (const alert of alerts) {
    const key = alert.eventKey ?? buildEventKey(alert);
    const prev = seenEvents.get(key);
    seenEvents.set(key, {
      alertId: alert.id,
      lastSentAt: now,
      mentionCount: (prev?.mentionCount ?? 0) + 1,
    });
  }

  if (seenEvents.size > 500) {
    const sorted = [...seenEvents.entries()].sort(
      (a, b) => b[1].lastSentAt - a[1].lastSentAt
    );
    seenEvents.clear();
    for (const [k, v] of sorted.slice(0, 300)) seenEvents.set(k, v);
  }
  saveState();
}

/** Al arrancar en frío: marcar feed actual como ya visto (sin Telegram) */
export function seedSeenFromFeed(alerts: Alert[]): void {
  const now = Date.now();
  let added = 0;
  for (const alert of alerts) {
    const key = alert.eventKey ?? buildEventKey(alert);
    if (seenEvents.has(key)) continue;
    seenEvents.set(key, {
      alertId: alert.id,
      lastSentAt: now,
      mentionCount: 0,
    });
    added++;
  }
  if (added > 0) saveState();
}

export function attachEventKeys(alerts: Alert[]): Alert[] {
  return alerts.map((a) => ({
    ...a,
    eventKey: a.eventKey ?? buildEventKey(a),
  }));
}

export function isAlertFresh(alert: Alert, maxAgeMs: number): boolean {
  const age = Date.now() - new Date(alert.publishedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs;
}
