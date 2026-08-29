"use client";

import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/constants/ui";
import type { PriceSnapshot } from "@/lib/types";
import { TrendingDown, TrendingUp } from "lucide-react";

interface PriceTickerProps {
  prices: PriceSnapshot[];
}

export function PriceTicker({ prices }: PriceTickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {prices.map((p) => {
        const isUp = p.change24h >= 0;
        return (
          <div
            key={p.symbol}
            className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {p.symbol}
            </span>
            <span className="font-mono text-lg font-semibold text-zinc-100">
              ${formatPrice(p.price)}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                isUp ? "text-emerald-400" : "text-red-400"
              )}
            >
              {isUp ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {isUp ? "+" : ""}
              {p.change24h.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
