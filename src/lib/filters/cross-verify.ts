import {
  CROSS_VERIFY_WINDOW_MS,
  OFFICIAL_X_USERNAMES,
  TRADITIONAL_SOURCE_IDS,
  VERIFICATION_LABELS,
} from "@/lib/config/trader-policy";
import { extractXUsername } from "@/lib/config/approved-sources";
import type { Alert, VerificationStatus } from "@/lib/types";

interface EventRecord {
  sources: Set<string>;
  hasTraditional: boolean;
  hasOfficialX: boolean;
  firstSeen: number;
}

const recentEvents = new Map<string, EventRecord>();

function pruneOldEvents(): void {
  const cutoff = Date.now() - CROSS_VERIFY_WINDOW_MS;
  for (const [key, rec] of recentEvents) {
    if (rec.firstSeen < cutoff) recentEvents.delete(key);
  }
}

export function classifyVerification(alert: Alert): VerificationStatus {
  if (alert.source === "blockchain") return "on_chain_institutional";
  if (TRADITIONAL_SOURCE_IDS.has(alert.sourceId)) {
    return "confirmed_traditional";
  }

  const xUser = extractXUsername(alert.sourceName);
  if (xUser && OFFICIAL_X_USERNAMES.has(xUser)) {
    return "official_x";
  }

  if (alert.source === "twitter") {
    return "early_signal_x";
  }

  return "confirmed_traditional";
}

export function applyCrossVerification(alerts: Alert[]): Alert[] {
  pruneOldEvents();

  return alerts.map((alert) => {
    const key = alert.eventKey ?? alert.id;
    const verification = classifyVerification(alert);
    let status = verification;

    let rec = recentEvents.get(key);
    if (!rec) {
      rec = {
        sources: new Set(),
        hasTraditional: TRADITIONAL_SOURCE_IDS.has(alert.sourceId),
        hasOfficialX: false,
        firstSeen: Date.now(),
      };
      recentEvents.set(key, rec);
    }

    rec.sources.add(alert.sourceId);
    if (TRADITIONAL_SOURCE_IDS.has(alert.sourceId)) rec.hasTraditional = true;

    const xUser = extractXUsername(alert.sourceName);
    if (xUser && OFFICIAL_X_USERNAMES.has(xUser)) rec.hasOfficialX = true;

    if (rec.hasTraditional && rec.sources.size >= 1) {
      status = "confirmed_traditional";
    } else if (rec.hasOfficialX && !rec.hasTraditional) {
      status = "official_x";
    } else if (rec.sources.size >= 2 && alert.source === "twitter") {
      status = "confirmed_traditional";
    } else if (alert.source === "twitter" && alert.priority === "critical") {
      status = "early_signal_x";
    }

    return { ...alert, verificationStatus: status };
  });
}

/** CRÍTICO solo desde X requiere cuenta oficial o corroboración */
export function canBeCriticalInstant(alert: Alert): boolean {
  if (alert.priority !== "critical") return false;

  const status = alert.verificationStatus ?? classifyVerification(alert);

  if (status === "early_signal_x") return false;
  if (status === "rumor_moving_market") return false;

  return (
    status === "confirmed_traditional" ||
    status === "official_x" ||
    status === "on_chain_institutional"
  );
}

export function verificationLabel(status: VerificationStatus): string {
  return VERIFICATION_LABELS[status] ?? status;
}

export function detectConsensusNote(text: string): string | undefined {
  const lower = text.toLowerCase();
  const hasConsensus =
    /\b(vs\.?\s*consensus|beats|misses|expected|forecast|consenso|estimado|sorprende)\b/i.test(
      lower
    );
  if (!hasConsensus) return undefined;
  return "Revisar consenso de Wall Street vs dato publicado en la fuente";
}
