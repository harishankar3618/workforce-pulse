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
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#1C1C1F] p-4 text-foreground shadow-2xl sm:top-auto sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent sm:text-xs">
              Methodology
            </p>
            <h2 className="mt-1.5 text-lg font-semibold leading-tight sm:mt-2 sm:text-2xl">
              {content.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground transition hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 sm:mt-6 sm:space-y-6">
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
              Formula
            </h3>
            <p className="mt-1.5 text-sm leading-5 text-foreground/90 sm:mt-2 sm:text-base sm:leading-6">
              {content.formula}
            </p>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
              Assumptions
            </h3>
            <ul className="mt-2.5 space-y-1.5 text-sm leading-5 text-foreground/90 sm:mt-3 sm:space-y-2 sm:text-base">
              {content.assumptions.map((assumption) => (
                <li
                  key={assumption}
                  className="rounded-xl border border-white/8 bg-white/3 px-2.5 py-2 text-xs sm:rounded-2xl sm:px-3 sm:py-2.5"
                >
                  {assumption}
                </li>
              ))}
            </ul>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-xl border border-white/8 bg-white/3 p-3 sm:rounded-2xl sm:p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                Confidence interval
              </p>
              <p className="mt-1.5 text-base font-semibold text-foreground sm:mt-2 sm:text-lg">
                {content.confidenceInterval}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/3 p-3 sm:rounded-2xl sm:p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
                Excluded rows
              </p>
              <p className="mt-1.5 text-base font-semibold text-foreground sm:mt-2 sm:text-lg">
                {content.excludedRows}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-white/8 bg-white/3 p-3 sm:rounded-2xl sm:p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
              Excluded employees
            </p>
            <p className="mt-1.5 text-sm leading-5 text-foreground/90 sm:mt-2 sm:text-base">
              {content.excludedEmployees.length > 0 ? content.excludedEmployees.join(", ") : "None"}
            </p>
          </section>

          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
              Coefficient rationale
            </h3>
            <p className="mt-1.5 text-sm leading-5 text-foreground/90 sm:mt-2 sm:text-base sm:leading-6">
              {content.rationale}
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}

export default MethodologyDrawer;