"use client";

import { Download } from "lucide-react";

import { useExport } from "@/hooks/useExport";

export function ExportButton() {
  const { exportPdf, isExporting, ready } = useExport();

  return (
    <button
      type="button"
      onClick={() => void exportPdf()}
      disabled={!ready || isExporting}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-accent/30 bg-accent px-3 py-1.5 text-xs font-semibold text-[#141416] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-2 sm:text-sm"
    >
      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <span>{isExporting ? "Exporting" : "Export PDF"}</span>
    </button>
  );
}

export default ExportButton;