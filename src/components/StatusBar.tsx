"use client";

import { cn } from "@/lib/utils/cn";
import type { MonitorStatus } from "@/lib/types";
import { Activity, Radio, ShieldCheck } from "lucide-react";

interface StatusBarProps {
  status: MonitorStatus | null;
  connected: boolean;
  newCount: number;
}

export function StatusBar({ status, connected, newCount }: StatusBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "relative flex h-2.5 w-2.5 rounded-full",
            connected ? "bg-emerald-500" : "bg-red-500"
          )}
        >
          {connected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
        </span>
        <span className="text-sm font-medium text-zinc-300">
          {connected ? "Radar activo 24/7" : "Reconectando..."}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
        <Radio className="h-3.5 w-3.5" />
        {status
          ? `${status.sourcesActive}/${status.sourcesTotal} fuentes`
          : "— fuentes"}
      </div>

      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
        <Activity className="h-3.5 w-3.5" />
        {status?.alertsToday ?? 0} alertas hoy
      </div>

      <div className="flex items-center gap-1.5 text-sm text-zinc-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        Filtro anti-ruido activo
      </div>

      {newCount > 0 && (
        <span className="ml-auto rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/40">
          {newCount} nueva{newCount > 1 ? "s" : ""} alerta
          {newCount > 1 ? "s" : ""}
        </span>
      )}

      {status?.lastScan && (
        <span className="text-xs text-zinc-600">
          Último scan:{" "}
          {new Date(status.lastScan).toLocaleTimeString("es-ES")}
        </span>
      )}
    </div>
  );
}
