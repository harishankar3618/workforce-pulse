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
      <article className="relative overflow-hidden rounded-[24px] border border-border/70 bg-card p-5 shadow-dashboard-panel transition hover:border-white/15 hover:bg-card/95">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</h3>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground transition hover:border-accent/40 hover:text-accent"
            aria-label={`Open methodology for ${label}`}
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{subtitle}</p>
        <div className="mt-5 h-px w-full bg-gradient-to-r from-white/8 via-white/5 to-transparent" />
        <div className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-accent/90">Auditable by design</div>
      </article>

      <MethodologyDrawer open={open} onOpenChange={setOpen} content={methodology} />
    </>
  );
}

export default KPICard;