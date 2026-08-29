"use client";

import { cn } from "@/lib/utils/cn";
import {
  CATEGORY_LABELS,
  formatTime,
  PRIORITY_LABELS,
} from "@/lib/constants/ui";
import type { Alert } from "@/lib/types";
import { ExternalLink } from "lucide-react";

interface AlertCardProps {
  alert: Alert;
  isNew?: boolean;
}

export function AlertCard({ alert, isNew }: AlertCardProps) {
  const cat = CATEGORY_LABELS[alert.category];
  const pri = PRIORITY_LABELS[alert.priority];

  return (
    <article
      className={cn(
        "group relative rounded-xl border bg-zinc-900/70 p-4 transition-all hover:border-zinc-700",
        isNew
          ? "border-red-500/50 ring-1 ring-red-500/20"
          : "border-zinc-800",
        alert.priority === "critical" && "border-l-2 border-l-red-500"
      )}
    >
      {isNew && (
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-xs font-medium",
            cat.color
          )}
        >
          {cat.icon} {cat.label}
        </span>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            pri.color,
            pri.pulse && "animate-pulse"
          )}
        >
          {pri.label}
        </span>
        {alert.assets.map((asset) => (
          <span
            key={asset}
            className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400"
          >
            {asset}
          </span>
        ))}
        <span className="ml-auto text-xs text-zinc-600">
          {formatTime(alert.publishedAt)}
        </span>
      </div>

      <h3 className="mb-1.5 text-sm font-semibold leading-snug text-zinc-100">
        {alert.title}
      </h3>

      {alert.summary && (
        <p className="mb-3 line-clamp-2 text-sm text-zinc-400">
          {alert.summary}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-600">
          {alert.sourceName}
          {alert.source === "twitter" && " · X"}
          {alert.source === "blockchain" && " · On-chain"}
        </span>
        {alert.url && (
          <a
            href={alert.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Ver fuente
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}
