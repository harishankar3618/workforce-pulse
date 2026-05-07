"use client";

import { AlertTriangle, X } from "lucide-react";
import { useMemo, useState } from "react";

import type { Anomaly } from "@/lib/types";

interface AnomalyBannerProps {
  anomalies: Anomaly[];
}

export function AnomalyBanner({ anomalies }: AnomalyBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const topAnomalies = useMemo(() => anomalies.slice(0, 2), [anomalies]);

  if (dismissed || anomalies.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[24px] border border-amber-500/30 bg-[#2A2010] px-5 py-4 text-foreground shadow-dashboard-panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 rounded-full bg-amber-500/15 p-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Active anomalies</p>
            {topAnomalies.map((anomaly) => (
              <p key={anomaly.id} className="max-w-4xl text-sm leading-6 text-foreground/90">
                <span className="font-semibold text-foreground">{anomaly.title}.</span> {anomaly.detail}
              </p>
            ))}
            <p className="text-xs text-amber-200/80">{anomalies.length} anomaly{anomalies.length === 1 ? "" : "ies"} surfaced from the cleaned dataset.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/20 bg-black/10 text-amber-100 transition hover:border-amber-400/40 hover:bg-black/20"
          aria-label="Dismiss anomaly banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

export default AnomalyBanner;