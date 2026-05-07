"use client";

import { X } from "lucide-react";

export interface MethodologyDrawerContent {
  title: string;
  formula: string;
  assumptions: string[];
  confidenceInterval: string;
  excludedRows: number;
  excludedEmployees: string[];
  rationale: string;
}

interface MethodologyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MethodologyDrawerContent;
}

export function MethodologyDrawer({ open, onOpenChange, content }: MethodologyDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close methodology drawer"
        className="absolute inset-0 cursor-default"
        onClick={() => onOpenChange(false)}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#1C1C1F] p-6 text-foreground shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Methodology</p>
            <h2 className="mt-2 text-2xl font-semibold">{content.title}</h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Formula</h3>
            <p className="mt-2 text-sm leading-6 text-foreground/90">{content.formula}</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assumptions</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground/90">
              {content.assumptions.map((assumption) => (
                <li key={assumption} className="rounded-2xl border border-white/8 bg-white/3 px-3 py-2">
                  {assumption}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Confidence interval</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{content.confidenceInterval}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Excluded rows</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{content.excludedRows}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-white/8 bg-white/3 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Excluded employees</p>
            <p className="mt-2 text-sm leading-6 text-foreground/90">
              {content.excludedEmployees.length > 0 ? content.excludedEmployees.join(", ") : "None"}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Coefficient rationale</h3>
            <p className="mt-2 text-sm leading-6 text-foreground/90">{content.rationale}</p>
          </section>
        </div>
      </aside>
    </div>
  );
}

export default MethodologyDrawer;