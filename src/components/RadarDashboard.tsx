"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertFeed } from "@/components/AlertFeed";
import { CategoryFilter } from "@/components/CategoryFilter";
import { PriceTicker } from "@/components/PriceTicker";
import { StatusBar } from "@/components/StatusBar";
import type {
  Alert,
  AlertCategory,
  MonitorStatus,
  PriceSnapshot,
} from "@/lib/types";

export function RadarDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [prices, setPrices] = useState<PriceSnapshot[]>([]);
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<AlertCategory | "all">("all");
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAlertSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77+efTRAMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBlou+/nn00QDFCn4/C2YxwGOJHX8sx5LAUkd8fw3ZBAC"
        );
      }
      audioRef.current.play().catch(() => {});
    } catch {
      /* audio not available */
    }
  }, []);

  const counts = useMemo(() => {
    const c: Record<AlertCategory | "all", number> = {
      all: alerts.length,
      fed: 0,
      macro: 0,
      geopolitics: 0,
      btc_whale: 0,
      btc_regulation: 0,
    };
    for (const a of alerts) {
      c[a.category]++;
    }
    return c;
  }, [alerts]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      eventSource = new EventSource("/api/stream");

      eventSource.addEventListener("connected", () => {
        setConnected(true);
        setLoading(false);
      });

      eventSource.addEventListener("scan", (e) => {
        const data = JSON.parse(e.data) as {
          alerts: Alert[];
          prices: PriceSnapshot[];
          status: MonitorStatus;
          newAlerts: Alert[];
        };
        setAlerts(data.alerts);
        setPrices(data.prices);
        setStatus(data.status);
        setLoading(false);
      });

      eventSource.addEventListener("new_alerts", (e) => {
        const newAlerts = JSON.parse(e.data) as Alert[];
        const critical = newAlerts.some((a) => a.priority === "critical");
        if (critical) playAlertSound();

        setNewAlertIds((prev) => {
          const next = new Set(prev);
          for (const a of newAlerts) next.add(a.id);
          return next;
        });

        setTimeout(() => {
          setNewAlertIds((prev) => {
            const next = new Set(prev);
            for (const a of newAlerts) next.delete(a.id);
            return next;
          });
        }, 30_000);
      });

      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimer);
    };
  }, [playAlertSound]);

  return (
    <div className="space-y-6">
      <StatusBar
        status={status}
        connected={connected}
        newCount={newAlertIds.size}
      />
      <PriceTicker prices={prices} />
      <CategoryFilter
        selected={category}
        onChange={setCategory}
        counts={counts}
      />
      <AlertFeed
        alerts={alerts}
        newAlertIds={newAlertIds}
        loading={loading}
        category={category}
      />
    </div>
  );
}
