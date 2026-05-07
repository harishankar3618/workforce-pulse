"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import type { DataQualityReport as DataQualityReportType } from "@/lib/types";

interface DataQualityReportProps {
  quality: DataQualityReportType;
}

function CountRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">{label}</p>
      <p className="mt-1.5 text-base font-semibold text-foreground sm:mt-2 sm:text-lg">{value}</p>
    </div>
  );
}

export function DataQualityReport({ quality }: DataQualityReportProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-3 shadow-dashboard-panel sm:p-4 md:p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
            Data quality report
          </p>
          <h2 className="text-lg font-semibold text-foreground sm:mt-1 sm:text-xl md:text-2xl">
            Audit trail and exclusions
          </h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 p-1.5 text-muted-foreground sm:p-2">
          {open ? <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
        </div>
      </button>

      {open ? (
        <div className="mt-4 space-y-4 sm:mt-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <CountRow label="Rows total" value={quality.rowsTotal} />
            <CountRow label="Rows clean" value={quality.rowsClean} />
            <CountRow label="Rows dropped" value={quality.rowsDropped} />
            <CountRow label="Rows flagged" value={quality.rowsFlagged} />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <CountRow label="Missing metadata" value={quality.employeeIssues.missingMetadata.join(", ") || "None"} />
            <CountRow label="No activity" value={quality.employeeIssues.noActivity.join(", ") || "None"} />
            <CountRow label="Duplicate resolved" value={quality.employeeIssues.duplicateResolved.join(", ") || "None"} />
            <CountRow label="Post termination" value={quality.employeeIssues.postTermination.join(", ") || "None"} />
            <CountRow label="Unknown employees" value={quality.employeeIssues.unknownEmployeeIds.join(", ") || "None"} />
            <CountRow label="Uncompensated" value={quality.employeeIssues.uncompensatedEmployees.join(", ") || "None"} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground sm:mt-4 sm:text-sm">
          {quality.rowsTotal} total rows · {quality.rowsClean} clean · {quality.rowsDropped} dropped · {quality.rowsFlagged} flagged
        </p>
      )}
    </section>
  );
}

export default DataQualityReport;