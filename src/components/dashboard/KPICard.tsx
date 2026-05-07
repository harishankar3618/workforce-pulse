"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import { MethodologyDrawer, type MethodologyDrawerContent } from "./MethodologyDrawer";

interface KPICardProps {
  label: string;
  value: string;
  subtitle: string;
  methodology: MethodologyDrawerContent;
}

export function KPICard({ label, value, subtitle, methodology }: KPICardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-dashboard-panel transition hover:border-white/15 hover:bg-card/95 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
              {label}
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:mt-3 md:text-3xl lg:text-3xl">
              {value}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-white/10 bg-white/5 p-1.5 text-muted-foreground transition hover:border-accent/40 hover:text-accent sm:p-2"
            aria-label={`Open methodology for ${label}`}
          >
            <Info className="h-4 w-4 sm:h-4 sm:w-4" />
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground sm:mt-4 sm:text-sm sm:leading-6">{subtitle}</p>
        <div className="mt-4 h-px w-full bg-gradient-to-r from-white/8 via-white/5 to-transparent" />
        <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.18em] text-accent/90 sm:mt-4 sm:text-xs">
          Auditable by design
        </div>
      </article>

      <MethodologyDrawer open={open} onOpenChange={setOpen} content={methodology} />
    </>
  );
}

export default KPICard;