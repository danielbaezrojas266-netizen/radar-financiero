import type { AlertCategory, AlertPriority } from "@/lib/types";

export const CATEGORY_LABELS: Record<
  AlertCategory,
  { label: string; icon: string; color: string }
> = {
  fed: {
    label: "Fed / Tasas",
    icon: "🏛️",
    color: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
  macro: {
    label: "Macro (CPI/PPI/Empleo)",
    icon: "📊",
    color: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  geopolitics: {
    label: "Geopolítica / Oro",
    icon: "🌍",
    color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  btc_whale: {
    label: "Ballenas BTC",
    icon: "🐋",
    color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  btc_regulation: {
    label: "Regulación BTC",
    icon: "⚖️",
    color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
};

export const PRIORITY_LABELS: Record<
  AlertPriority,
  { label: string; color: string; pulse: boolean }
> = {
  critical: {
    label: "CRÍTICO",
    color: "bg-red-500 text-white",
    pulse: true,
  },
  high: {
    label: "ALTO",
    color: "bg-orange-500/90 text-white",
    pulse: false,
  },
  medium: {
    label: "MEDIO",
    color: "bg-slate-600 text-slate-200",
    pulse: false,
  },
};

export function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toFixed(2);
}
