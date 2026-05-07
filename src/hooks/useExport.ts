import { useState } from "react";

import { generatePDF } from "@/lib/export/generatePDF";
import useAnalyticsStore from "@/store/analyticsStore";
import useFilterStore from "@/store/filterStore";

export function useExport() {
  const analytics = useAnalyticsStore((state) => state.data);
  const department = useFilterStore((state) => state.department);
  const taskCategory = useFilterStore((state) => state.taskCategory);
  const week = useFilterStore((state) => state.week);
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = async () => {
    if (!analytics) {
      throw new Error("Analytics data is not loaded yet.");
    }

    setIsExporting(true);

    try {
      await generatePDF({ department, taskCategory, week, employeeId: null });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportPdf,
    isExporting,
    ready: Boolean(analytics),
  };
}

export default useExport;