"use client";

import { cn } from "@/lib/utils/cn";
import { CATEGORY_LABELS } from "@/lib/constants/ui";
import type { AlertCategory } from "@/lib/types";

interface CategoryFilterProps {
  selected: AlertCategory | "all";
  onChange: (category: AlertCategory | "all") => void;
  counts: Record<AlertCategory | "all", number>;
}

const CATEGORIES: (AlertCategory | "all")[] = [
  "all",
  "fed",
  "macro",
  "geopolitics",
  "btc_whale",
  "btc_regulation",
];

export function CategoryFilter({
  selected,
  onChange,
  counts,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const isAll = cat === "all";
        const label = isAll ? "Todas" : CATEGORY_LABELS[cat].label;
        const icon = isAll ? "📡" : CATEGORY_LABELS[cat].icon;
        const isActive = selected === cat;

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all",
              isActive
                ? "border-zinc-500 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
            )}
          >
            <span>{icon}</span>
            <span>{label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs",
                isActive ? "bg-zinc-700" : "bg-zinc-800"
              )}
            >
              {counts[cat]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
