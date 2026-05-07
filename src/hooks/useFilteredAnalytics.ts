import { useMemo } from "react";

import { applyAnalyticsFilters } from "@/lib/ai/buildContext";
import useAnalyticsStore from "@/store/analyticsStore";
import useFilterStore from "@/store/filterStore";

export function useFilteredAnalytics() {
  const analytics = useAnalyticsStore((state) => state.data);
  const loading = useAnalyticsStore((state) => state.loading);
  const error = useAnalyticsStore((state) => state.error);
  const department = useFilterStore((state) => state.department);
  const taskCategory = useFilterStore((state) => state.taskCategory);
  const week = useFilterStore((state) => state.week);

  const filtered = useMemo(() => {
    if (!analytics) {
      return null;
    }

    return applyAnalyticsFilters(analytics, {
      department,
      taskCategory,
      week,
      employeeId: null,
    });
  }, [analytics, department, taskCategory, week]);

  return {
    analytics,
    filtered,
    loading,
    error,
    filters: {
      department,
      taskCategory,
      week,
      employeeId: null,
    },
    hasActiveFilters: Boolean(department || taskCategory || week),
  };
}

export default useFilteredAnalytics;