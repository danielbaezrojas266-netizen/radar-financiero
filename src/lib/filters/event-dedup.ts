import { EVENT_FINGERPRINT_TERMS } from "@/lib/config/keywords";
import type { Alert } from "@/lib/types";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildEventKey(alert: Alert): string {
  const text = normalizeText(`${alert.title} ${alert.summary}`);
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

/** Evita re-alertar el mismo evento sin información nueva */
export function filterAlreadyAlerted(alerts: Alert[]): Alert[] {
  const fresh: Alert[] = [];
  const now = Date.now();

  for (const alert of alerts) {
    const key = alert.eventKey ?? buildEventKey(alert);
    const prev = seenEvents.get(key);

    if (prev && now - prev.lastSentAt < 4 * 60 * 60 * 1000) {
      continue;
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
}

export function attachEventKeys(alerts: Alert[]): Alert[] {
  return alerts.map((a) => ({
    ...a,
    eventKey: a.eventKey ?? buildEventKey(a),
  }));
}
