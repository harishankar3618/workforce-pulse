"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import type { DataQualityReport as DataQualityReportType } from "@/lib/types";

interface DataQualityReportProps {
  quality: DataQualityReportType;
}

function CountRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function DataQualityReport({ quality }: DataQualityReportProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[24px] border border-border/70 bg-card p-5 shadow-dashboard-panel">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Data quality report</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Audit trail and exclusions</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <CountRow label="Rows total" value={quality.rowsTotal} />
            <CountRow label="Rows clean" value={quality.rowsClean} />
            <CountRow label="Rows dropped" value={quality.rowsDropped} />
            <CountRow label="Rows flagged" value={quality.rowsFlagged} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CountRow label="Missing metadata" value={quality.employeeIssues.missingMetadata.join(", ") || "None"} />
            <CountRow label="No activity" value={quality.employeeIssues.noActivity.join(", ") || "None"} />
            <CountRow label="Duplicate resolved" value={quality.employeeIssues.duplicateResolved.join(", ") || "None"} />
            <CountRow label="Post termination" value={quality.employeeIssues.postTermination.join(", ") || "None"} />
            <CountRow label="Unknown employees" value={quality.employeeIssues.unknownEmployeeIds.join(", ") || "None"} />
            <CountRow label="Uncompensated employees" value={quality.employeeIssues.uncompensatedEmployees.join(", ") || "None"} />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {quality.rowsTotal} total rows · {quality.rowsClean} clean · {quality.rowsDropped} dropped · {quality.rowsFlagged} flagged
        </p>
      )}
    </section>
  );
}

export default DataQualityReport;