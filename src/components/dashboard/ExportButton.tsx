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
      className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent px-4 py-2 text-sm font-semibold text-[#141416] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Download className="h-4 w-4" />
      {isExporting ? "Exporting" : "Export PDF"}
    </button>
  );
}

export default ExportButton;