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
    <section className="min-w-0 rounded-2xl border border-amber-500/30 bg-[#2A2010] px-4 py-3 text-foreground shadow-dashboard-panel sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-2.5 sm:gap-3">
          <div className="mt-0.5 rounded-full bg-amber-500/15 p-1.5 text-amber-400 sm:p-2">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300 sm:text-xs">
              Active anomalies
            </p>
            {topAnomalies.map((anomaly) => (
              <p
                key={anomaly.id}
                className="max-w-4xl text-xs leading-5 text-foreground/90 sm:text-sm sm:leading-6"
              >
                <span className="font-semibold text-foreground">{anomaly.title}.</span>{" "}
                {anomaly.detail}
              </p>
            ))}
            <p className="text-[10px] text-amber-200/80 sm:text-xs">
              {anomalies.length} anomaly{anomalies.length === 1 ? "" : "ies"} surfaced from the cleaned dataset.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-black/10 text-amber-100 transition hover:border-amber-400/40 hover:bg-black/20 sm:h-9 sm:w-9"
          aria-label="Dismiss anomaly banner"
        >
          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </div>
    </section>
  );
}

export default AnomalyBanner;