"use client";

import { AlertCard } from "@/components/AlertCard";
import type { Alert, AlertCategory } from "@/lib/types";
import { Loader2, Radar } from "lucide-react";

interface AlertFeedProps {
  alerts: Alert[];
  newAlertIds: Set<string>;
  loading: boolean;
  category: AlertCategory | "all";
}

export function AlertFeed({
  alerts,
  newAlertIds,
  loading,
  category,
}: AlertFeedProps) {
  const filtered =
    category === "all"
      ? alerts
      : alerts.filter((a) => a.category === category);

  if (loading && alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Escaneando fuentes financieras...</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-500">
        <Radar className="h-10 w-10 opacity-40" />
        <p className="text-sm">Sin alertas en esta categoría</p>
        <p className="text-xs text-zinc-600">
          El radar sigue activo — se notificará ante eventos críticos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          isNew={newAlertIds.has(alert.id)}
        />
      ))}
    </div>
  );
}
