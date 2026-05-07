import { parseEmployees } from "./parseEmployees.ts";
import { parseActivityLogs } from "./parseActivityLogs.ts";
import joinDatasets from "./joinDatasets.ts";
import computeMetrics from "./computeMetrics.ts";
import buildDataQualityReport from "./auditTrail.ts";
import { DATA_SOURCE } from "../constants.ts";
import type { AnalyticsResult } from "../types.ts";

let cachedAnalytics: AnalyticsResult | null = null;

export async function runETL(): Promise<AnalyticsResult> {
  const employeesResult = await parseEmployees(DATA_SOURCE.employeesPath);
  const activityResult = await parseActivityLogs(DATA_SOURCE.activityPath);

  const joinResult = joinDatasets(activityResult, employeesResult);

  const metrics = computeMetrics(joinResult, employeesResult.employees);

  const quality = buildDataQualityReport(activityResult, employeesResult, joinResult);

  const filtersAvailable = {
    departments: Array.from(new Set(joinResult.rows.map((r) => r.department).filter(Boolean))).sort(),
    taskCategories: Array.from(new Set(joinResult.rows.map((r) => r.taskCategory).filter(Boolean))).sort(),
    weeks: Array.from(new Set(joinResult.rows.map((r) => r.week).filter(Boolean))).sort(),
    employees: Array.from(new Set(joinResult.rows.map((r) => r.employeeId).filter(Boolean))).sort(),
  };

  const analytics: AnalyticsResult = {
    generatedAt: new Date().toISOString(),
    source: {
      employeesPath: DATA_SOURCE.employeesPath,
      activityPath: DATA_SOURCE.activityPath,
      sourceSystem: null,
      generatedAt: null,
    },
    dateRange: {
      start: activityResult.stats.dateRange.start,
      end: activityResult.stats.dateRange.end,
      weeksObserved: (activityResult.stats.weekLabels || []).length,
    },
    headline: metrics.headline,
    tasks: metrics.tasks,
    departments: metrics.departments,
    employees: metrics.employees,
    apps: metrics.apps,
    weekly: metrics.weekly,
    anomalies: metrics.anomalies,
    quality,
    filtersAvailable,
    methodology: metrics.methodology,
  };

  return analytics;
}

export async function getAnalytics(forceRefresh = false): Promise<AnalyticsResult> {
  if (cachedAnalytics && !forceRefresh) return cachedAnalytics;
  const res = await runETL();
  cachedAnalytics = res;
  return res;
}

export function clearAnalyticsCache() {
  cachedAnalytics = null;
}

export default getAnalytics;
