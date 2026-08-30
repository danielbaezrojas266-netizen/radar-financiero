import type { Alert } from "@/lib/types";
import { translateAlertText } from "@/lib/notifiers/translate";

const byId = new Map<string, { title: string; summary: string }>();

export function isSpanishLocale(): boolean {
  const locale = process.env.ALERTS_LOCALE ?? process.env.UI_LOCALE ?? "es";
  return locale.startsWith("es");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
  return results;
}

export async function localizeAlert(alert: Alert): Promise<Alert> {
  if (!isSpanishLocale()) return alert;

  const cached = byId.get(alert.id);
  if (cached) {
    return { ...alert, title: cached.title, summary: cached.summary };
  }

  const { title, summary } = await translateAlertText(
    alert.title,
    alert.summary ?? ""
  );

  byId.set(alert.id, { title, summary });
  if (byId.size > 2000) {
    const oldest = byId.keys().next().value;
    if (oldest) byId.delete(oldest);
  }

  return { ...alert, title, summary };
}

export async function localizeAlerts<T extends Alert>(alerts: T[]): Promise<T[]> {
  if (!isSpanishLocale()) return alerts;
  return mapWithConcurrency(alerts, (a) => localizeAlert(a) as Promise<T>, 6);
}
