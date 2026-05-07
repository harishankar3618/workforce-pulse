import type {
  AnalyticsResult,
  AppMetrics,
  DeptMetrics,
  EmployeeMetrics,
  Filters,
  TaskMetrics,
  WeekMetrics,
  Anomaly,
} from "../types.ts";
import { formatHours, formatINR } from "../utils.ts";

export interface FilteredAnalyticsView {
  analytics: AnalyticsResult;
  filters: Filters;
  tasks: TaskMetrics[];
  departments: DeptMetrics[];
  employees: EmployeeMetrics[];
  apps: AppMetrics[];
  weekly: WeekMetrics[];
  anomalies: Anomaly[];
  scopeNotes: string[];
}

export interface ExportPayload {
  generatedAt: string;
  dateRange: string;
  activeFilters: Filters;
  headline: {
    recoverableHoursMonth: number;
    recoverableInrMonth: number;
    avgRepSharePct: number;
  };
  topTasks: Array<{
    rank: number;
    task: string;
    aps: number;
    inrMonth: number;
    confidence: TaskMetrics["confidence"];
  }>;
  summaryLine: string;
}

export function applyAnalyticsFilters(
  analytics: AnalyticsResult,
  filters: Filters,
): FilteredAnalyticsView {
  const normalizedFilters: Filters = {
    department: filters.department?.trim() || null,
    taskCategory: filters.taskCategory?.trim() || null,
    week: filters.week?.trim() || null,
    employeeId: filters.employeeId?.trim() || null,
  };

  const employeeMatches = analytics.employees.filter((employee) => {
    if (normalizedFilters.department && employee.department !== normalizedFilters.department) {
      return false;
    }

    if (normalizedFilters.taskCategory) {
      const hasTask = employee.topTasks.some(
        (task) => task.taskCategory === normalizedFilters.taskCategory,
      );

      if (!hasTask) {
        return false;
      }
    }

    return true;
  });

  const departmentNames = new Set(employeeMatches.map((employee) => employee.department));
  const taskNames = new Set(
    employeeMatches.flatMap((employee) => employee.topTasks.map((task) => task.taskCategory)),
  );
  const activeEmployeeIds = new Set(employeeMatches.map((employee) => employee.employeeId));

  const tasks = normalizedFilters.taskCategory
    ? analytics.tasks.filter((task) => task.taskCategory === normalizedFilters.taskCategory)
    : analytics.tasks.filter((task) => {
        if (!normalizedFilters.department) {
          return true;
        }

        return taskNames.has(task.taskCategory);
      });

  const departments = normalizedFilters.department
    ? analytics.departments.filter((department) => department.department === normalizedFilters.department)
    : analytics.departments.filter((department) => departmentNames.size === 0 || departmentNames.has(department.department));

  const apps = normalizedFilters.department || normalizedFilters.taskCategory
    ? analytics.apps
    : analytics.apps;

  const weekly = normalizedFilters.week
    ? analytics.weekly.filter((entry) => entry.week === normalizedFilters.week)
    : analytics.weekly;

  const anomalies = analytics.anomalies.filter((anomaly) => {
    if (normalizedFilters.department || normalizedFilters.taskCategory) {
      return anomaly.employeeIds.some((employeeId) => activeEmployeeIds.has(employeeId));
    }

    return true;
  });

  const scopeNotes: string[] = [];

  if (normalizedFilters.department) {
    scopeNotes.push(`Department filter applied: ${normalizedFilters.department}.`);
  }

  if (normalizedFilters.taskCategory) {
    scopeNotes.push(`Task filter applied: ${normalizedFilters.taskCategory}.`);
  }

  if (normalizedFilters.week) {
    scopeNotes.push(`Week filter applied: ${normalizedFilters.week}.`);
  }

  if (scopeNotes.length === 0) {
    scopeNotes.push("No active filters; context reflects the full analytics dataset.");
  }

  return {
    analytics,
    filters: normalizedFilters,
    tasks,
    departments,
    employees: employeeMatches,
    apps,
    weekly,
    anomalies,
    scopeNotes,
  };
}

function compactFilters(filters: Filters): string {
  return JSON.stringify(
    {
      department: filters.department,
      taskCategory: filters.taskCategory,
      week: filters.week,
    },
    null,
    0,
  );
}

function formatDateRange(analytics: AnalyticsResult): string {
  const start = analytics.dateRange.start ?? "unknown";
  const end = analytics.dateRange.end ?? "unknown";

  return `${start} to ${end}`;
}

function formatTaskLine(task: TaskMetrics, index: number): string {
  return [
    `${index + 1}. ${task.taskCategory}`,
    `APS ${task.aps.toFixed(1)}`,
    `Volume ${formatHours(task.totalMinutes / 60, 0)}h`,
    `Rep ${Math.round(task.repRate * 100)}%`,
    `Employees ${task.employeeCount}`,
    `INR ${formatINR(task.inrImpactMonth)}/month`,
    `Confidence ${task.confidence.toUpperCase()}`,
  ].join(" | ");
}

function formatDepartmentLine(department: DeptMetrics): string {
  return [
    department.department,
    `${formatHours(department.totalMinutes / 60, 0)}h logged`,
    `${Math.round(department.repRate * 100)}% repetitive`,
    `${formatINR(department.inrImpactMonth)}/month`,
    `${department.employeeCount} employees`,
  ].join(" | ");
}

function formatEmployeeLine(employee: EmployeeMetrics): string {
  return [
    employee.employeeId,
    employee.department,
    employee.role ?? "Unknown role",
    `${formatHours(employee.totalMinutes / 60, 1)}h`,
    `${Math.round(employee.repetitiveShare * 100)}% repetitive`,
    `Top task ${employee.topTasks[0]?.taskCategory ?? "None"}`,
  ].join(" | ");
}

export function buildContext(
  analytics: AnalyticsResult,
  filters: Filters,
): string {
  const filtered = applyAnalyticsFilters(analytics, filters);

  const taskLines = filtered.tasks.slice(0, 10).map(formatTaskLine).join("\n");
  const departmentLines = filtered.departments.map(formatDepartmentLine).join("\n");
  const employeeLines = filtered.employees.slice(0, 10).map(formatEmployeeLine).join("\n");
  const weeklyLines = filtered.weekly
    .map((entry) => `${entry.week} | ${Math.round(entry.repShare * 100)}% repetitive | Top ${entry.topCategory ?? "n/a"}`)
    .join("\n");
  const anomalyLines = filtered.anomalies.length
    ? filtered.anomalies
        .map((anomaly) => `${anomaly.type} | ${anomaly.severity.toUpperCase()} | ${anomaly.detail}`)
        .join("\n")
    : "None";

  return [
    "WORKFORCE PULSE ANALYTICS CONTEXT",
    `Active filters: ${compactFilters(filtered.filters)}`,
    ...filtered.scopeNotes,
    `Date range: ${formatDateRange(analytics)} (${analytics.dateRange.weeksObserved} weeks observed)`,
    `Rows total: ${analytics.quality.rowsTotal}`,
    `Rows clean: ${analytics.quality.rowsClean}`,
    `Rows dropped: ${analytics.quality.rowsDropped}`,
    `Rows flagged: ${analytics.quality.rowsFlagged}`,
    `Headline recoverable hours/month: ${analytics.headline.recoverableHoursMonth}`,
    `Headline recoverable INR/month: ${analytics.headline.recoverableInrMonth}`,
    `Average repetitive share: ${analytics.headline.avgRepSharePct}%`,
    "TOP AUTOMATION OPPORTUNITIES",
    taskLines || "None",
    "DEPARTMENT BREAKDOWN",
    departmentLines || "None",
    "EMPLOYEE SUMMARY",
    employeeLines || "None",
    "WEEKLY RHYTHM",
    weeklyLines || "None",
    "ANOMALIES",
    anomalyLines,
    "DATA QUALITY",
    `Missing metadata employees: ${analytics.quality.employeeIssues.missingMetadata.join(", ") || "None"}`,
    `No-activity employees: ${analytics.quality.employeeIssues.noActivity.join(", ") || "None"}`,
    `Duplicate resolved: ${analytics.quality.employeeIssues.duplicateResolved.join(", ") || "None"}`,
    `Post-termination activity: ${analytics.quality.employeeIssues.postTermination.join(", ") || "None"}`,
    `Unknown employee ids: ${analytics.quality.employeeIssues.unknownEmployeeIds.join(", ") || "None"}`,
    `Uncompensated employees: ${analytics.quality.employeeIssues.uncompensatedEmployees.join(", ") || "None"}`,
    "HARD RULES: cite only numbers present above, cite the row counts and date range when answering, and refuse any predictive request.",
  ].join("\n");
}

function computeFilteredHeadline(
  analytics: AnalyticsResult,
  filteredView: FilteredAnalyticsView,
): {
  recoverableHoursMonth: number;
  recoverableHoursCi: [number, number];
  recoverableInrMonth: number;
  recoverableInrCi: [number, number];
  avgRepSharePct: number;
} {
  // If no filters applied, return original headline
  if (
    !filteredView.filters.department &&
    !filteredView.filters.taskCategory &&
    !filteredView.filters.week &&
    !filteredView.filters.employeeId
  ) {
    return {
      recoverableHoursMonth: analytics.headline.recoverableHoursMonth,
      recoverableHoursCi: analytics.headline.recoverableHoursCi,
      recoverableInrMonth: analytics.headline.recoverableInrMonth,
      recoverableInrCi: analytics.headline.recoverableInrCi,
      avgRepSharePct: analytics.headline.avgRepSharePct,
    };
  }

  // Compute from filtered employees
  const filteredEmployees = filteredView.employees;

  if (filteredEmployees.length === 0) {
    return {
      recoverableHoursMonth: 0,
      recoverableHoursCi: [0, 0],
      recoverableInrMonth: 0,
      recoverableInrCi: [0, 0],
      avgRepSharePct: 0,
    };
  }

  // Aggregate metrics from filtered employees
  let totalRecoverableHours = 0;
  let totalRecoverableINR = 0;
  let totalLoggedMinutes = 0;
  let totalRepetitiveMinutes = 0;

  for (const employee of filteredEmployees) {
    totalRecoverableHours += employee.recoverableHoursMonth ?? 0;
    totalRecoverableINR += employee.inrCostMonth ?? 0;
    totalLoggedMinutes += employee.totalMinutes ?? 0;
    totalRepetitiveMinutes += employee.repetitiveMinutes ?? 0;
  }

  // Apply conservative confidence intervals: ±15% from the computed value
  const hourCi: [number, number] = [
    Math.round(totalRecoverableHours * 0.85),
    Math.round(totalRecoverableHours * 1.15),
  ];
  const inrCi: [number, number] = [
    Math.round(totalRecoverableINR * 0.85),
    Math.round(totalRecoverableINR * 1.15),
  ];

  const avgRepSharePct = totalLoggedMinutes > 0 ? Math.round((totalRepetitiveMinutes / totalLoggedMinutes) * 1000) / 10 : 0;

  return {
    recoverableHoursMonth: Math.round(totalRecoverableHours),
    recoverableHoursCi: hourCi,
    recoverableInrMonth: Math.round(totalRecoverableINR),
    recoverableInrCi: inrCi,
    avgRepSharePct,
  };
}

export function buildExportPayload(
  analytics: AnalyticsResult,
  filters: Filters,
): ExportPayload {
  const filtered = applyAnalyticsFilters(analytics, filters);
  const filteredHeadline = computeFilteredHeadline(analytics, filtered);

  return {
    generatedAt: analytics.generatedAt,
    dateRange: formatDateRange(analytics),
    activeFilters: filtered.filters,
    headline: {
      recoverableHoursMonth: filteredHeadline.recoverableHoursMonth,
      recoverableInrMonth: filteredHeadline.recoverableInrMonth,
      avgRepSharePct: filteredHeadline.avgRepSharePct,
    },
    topTasks: filtered.tasks.slice(0, 5).map((task) => ({
      rank: task.rank,
      task: task.taskCategory,
      aps: task.aps,
      inrMonth: task.inrImpactMonth,
      confidence: task.confidence,
    })),
    summaryLine: `Workforce Pulse Analysis | ${formatDateRange(analytics)}`,
  };
}

export { computeFilteredHeadline };

export default buildContext;