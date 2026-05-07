import type {
  JoinDatasetsResult,
  TaskMetrics,
  DeptMetrics,
  EmployeeMetrics,
  AppMetrics,
  WeekMetrics,
  Anomaly,
  AnalyticsResult,
  CleanRow,
  Employee,
} from "../types.ts";
import {
  WORKING_HOURS_PER_YEAR,
  AUTOMATION_RECOVERY_COEFFICIENT,
  WEEKS_PER_MONTH,
  APS_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  RECOVERABLE_HOURS_CI,
  RECOVERABLE_INR_CI,
  REPETITIVE_CONCENTRATION_THRESHOLD,
} from "../constants.ts";

export interface ComputeMetricsResult {
  headline: AnalyticsResult["headline"];
  tasks: TaskMetrics[];
  departments: DeptMetrics[];
  employees: EmployeeMetrics[];
  apps: AppMetrics[];
  weekly: WeekMetrics[];
  anomalies: Anomaly[];
  methodology: AnalyticsResult["methodology"];
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export function computeMetrics(
  joined: JoinDatasetsResult,
  employeesMap: Map<string, Employee>,
): ComputeMetricsResult {
  const rows = joined.rows.slice();

  const weeks = unique(rows.map((r) => r.week).filter(Boolean));
  const weeksObserved = Math.max(1, weeks.length);

  // Helper groupers
  const byTask = new Map<string, CleanRow[]>();
  const byDept = new Map<string, CleanRow[]>();
  const byApp = new Map<string, CleanRow[]>();
  const byWeek = new Map<string, CleanRow[]>();
  const byEmployee = new Map<string, CleanRow[]>();

  for (const r of rows) {
    if (r.includeInTimeMetrics) {
      const t = r.taskCategory || "(unknown)";
      byTask.set(t, (byTask.get(t) ?? []).concat(r));

      const d = r.department || "(unknown)";
      byDept.set(d, (byDept.get(d) ?? []).concat(r));

      const a = r.appUsed || "(unknown)";
      byApp.set(a, (byApp.get(a) ?? []).concat(r));

      const w = r.week || "(unknown)";
      byWeek.set(w, (byWeek.get(w) ?? []).concat(r));

      const e = r.employeeId || "(unknown)";
      byEmployee.set(e, (byEmployee.get(e) ?? []).concat(r));
    }
  }

  // TASK METRICS
  const tasks: TaskMetrics[] = [];

  for (const [task, rs] of Array.from(byTask.entries())) {
    const totalMinutes = rs.reduce((s, x) => s + (x.durationMinutes || 0), 0);
    const repetitiveMinutes = rs.reduce((s, x) => s + ((x.isRepetitive && x.durationMinutes) || 0), 0);
    const rowCount = rs.length;
    const employeeSet = unique(rs.map((r) => r.employeeId));
    const employeeCount = employeeSet.length;

    // INR impact: consider only rows included in INR metrics
    let inrImpactMonth = 0;
    const compensatedEmployees = new Set<string>();

    for (const r of rs) {
      if (!r.includeInInrMetrics) continue;
      if (!r.hourlyCostInr) continue;
      compensatedEmployees.add(r.employeeId);
      const perRowRecoverable = (r.durationMinutes / 60) * r.hourlyCostInr * AUTOMATION_RECOVERY_COEFFICIENT * (WEEKS_PER_MONTH / weeksObserved);
      inrImpactMonth += perRowRecoverable;
    }

    const repRate = totalMinutes === 0 ? 0 : repetitiveMinutes / totalMinutes;

    tasks.push({
      taskCategory: task,
      rank: 0,
      totalMinutes,
      totalHours: +(totalMinutes / 60).toFixed(2),
      repetitiveMinutes,
      repetitiveHours: +(repetitiveMinutes / 60).toFixed(2),
      repRate,
      rowCount,
      employeeCount,
      compensatedEmployeeCount: compensatedEmployees.size,
      employeeConcentrationScore: employeeCount, // placeholder normalized later
      inrImpactMonth: Math.round(inrImpactMonth),
      aps: 0,
      confidence: "low",
      normalized: { volume: 0, repRate: 0, employeeConcentration: 0, inrImpact: 0 },
    });
  }

  // Normalization helpers for APS
  const vals = {
    volume: tasks.map((t) => t.totalMinutes),
    repRate: tasks.map((t) => t.repRate),
    employeeConcentration: tasks.map((t) => t.employeeCount),
    inrImpact: tasks.map((t) => t.inrImpactMonth),
  };

  function normalizeArray(arr: number[]) {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    if (max === min) return arr.map(() => 0);
    return arr.map((v) => (v - min) / (max - min));
  }

  const normVolume = normalizeArray(vals.volume);
  const normRepRate = normalizeArray(vals.repRate);
  const normEmpConc = normalizeArray(vals.employeeConcentration);
  const normInr = normalizeArray(vals.inrImpact);

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i]!;
    t.normalized.volume = +(normVolume[i] ?? 0);
    t.normalized.repRate = +(normRepRate[i] ?? 0);
    t.normalized.employeeConcentration = +(normEmpConc[i] ?? 0);
    t.normalized.inrImpact = +(normInr[i] ?? 0);

    const apsRaw =
      APS_WEIGHTS.volume * t.normalized.volume +
      APS_WEIGHTS.repRate * t.normalized.repRate +
      APS_WEIGHTS.employeeConcentration * t.normalized.employeeConcentration +
      APS_WEIGHTS.inrImpact * t.normalized.inrImpact;

    t.aps = Math.round(apsRaw * 1000) / 10; // one decimal

    // confidence
    if (t.rowCount >= CONFIDENCE_THRESHOLDS.highRows && t.compensatedEmployeeCount / Math.max(1, t.employeeCount) >= CONFIDENCE_THRESHOLDS.highCompCoverage) {
      t.confidence = "high";
    } else if (t.rowCount >= CONFIDENCE_THRESHOLDS.mediumRows && t.compensatedEmployeeCount / Math.max(1, t.employeeCount) >= CONFIDENCE_THRESHOLDS.mediumCompCoverage) {
      t.confidence = "medium";
    } else {
      t.confidence = "low";
    }
  }

  // rank tasks
  tasks.sort((a, b) => b.aps - a.aps || b.totalMinutes - a.totalMinutes);
  tasks.forEach((t, idx) => (t.rank = idx + 1));

  // DEPARTMENT METRICS
  const departments: DeptMetrics[] = [];
  for (const [dept, rs] of Array.from(byDept.entries())) {
    const totalMinutes = rs.reduce((s, x) => s + (x.durationMinutes || 0), 0);
    const repetitiveMinutes = rs.reduce((s, x) => s + ((x.isRepetitive && x.durationMinutes) || 0), 0);
    const employeeCount = unique(rs.map((r) => r.employeeId)).length;
    let inrImpactMonth = 0;
    for (const r of rs) {
      if (!r.includeInInrMetrics || !r.hourlyCostInr) continue;
      inrImpactMonth += (r.durationMinutes / 60) * r.hourlyCostInr * AUTOMATION_RECOVERY_COEFFICIENT * (WEEKS_PER_MONTH / weeksObserved);
    }
    departments.push({
      department: dept,
      totalMinutes,
      totalHours: +(totalMinutes / 60).toFixed(2),
      repetitiveMinutes,
      repetitiveHours: +(repetitiveMinutes / 60).toFixed(2),
      repRate: totalMinutes === 0 ? 0 : repetitiveMinutes / totalMinutes,
      employeeCount,
      inrImpactMonth: Math.round(inrImpactMonth),
      topTaskCategory: null,
    });
  }

  // APPS
  const apps: AppMetrics[] = [];
  for (const [app, rs] of Array.from(byApp.entries())) {
    const totalMinutes = rs.reduce((s, x) => s + (x.durationMinutes || 0), 0);
    const repetitiveMinutes = rs.reduce((s, x) => s + ((x.isRepetitive && x.durationMinutes) || 0), 0);
    apps.push({
      appUsed: app,
      totalMinutes,
      repetitiveMinutes,
      repRate: totalMinutes === 0 ? 0 : repetitiveMinutes / totalMinutes,
      rowCount: rs.length,
    });
  }

  // WEEKS
  const weekly: WeekMetrics[] = [];
  for (const [week, rs] of Array.from(byWeek.entries())) {
    const totalMinutes = rs.reduce((s, x) => s + (x.durationMinutes || 0), 0);
    const repetitiveMinutes = rs.reduce((s, x) => s + ((x.isRepetitive && x.durationMinutes) || 0), 0);
    const breakdownMap = new Map<string, { taskCategory: string; totalMinutes: number; repetitiveMinutes: number }>();
    for (const r of rs) {
      const key = r.taskCategory || "(unknown)";
      const cur = breakdownMap.get(key) ?? { taskCategory: key, totalMinutes: 0, repetitiveMinutes: 0 };
      cur.totalMinutes += r.durationMinutes || 0;
      cur.repetitiveMinutes += (r.isRepetitive && r.durationMinutes) || 0;
      breakdownMap.set(key, cur);
    }
    const categoryBreakdown = Array.from(breakdownMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
    weekly.push({
      week,
      weekStart: rs[0]?.weekStart ?? "",
      totalMinutes,
      repetitiveMinutes,
      repShare: totalMinutes === 0 ? 0 : repetitiveMinutes / totalMinutes,
      topCategory: categoryBreakdown[0]?.taskCategory ?? null,
      categoryBreakdown,
    });
  }

  // EMPLOYEES
  const employeesOut: EmployeeMetrics[] = [];
  for (const [employeeId, rs] of Array.from(byEmployee.entries())) {
    const totalMinutes = rs.reduce((s, x) => s + (x.durationMinutes || 0), 0);
    const repetitiveMinutes = rs.reduce((s, x) => s + ((x.isRepetitive && x.durationMinutes) || 0), 0);
    const repetitiveShare = totalMinutes === 0 ? 0 : repetitiveMinutes / totalMinutes;
    const topTasksMap = new Map<string, { taskCategory: string; totalMinutes: number; repetitiveMinutes: number }>();
    for (const r of rs) {
      const key = r.taskCategory || "(unknown)";
      const cur = topTasksMap.get(key) ?? { taskCategory: key, totalMinutes: 0, repetitiveMinutes: 0 };
      cur.totalMinutes += r.durationMinutes || 0;
      cur.repetitiveMinutes += (r.isRepetitive && r.durationMinutes) || 0;
      topTasksMap.set(key, cur);
    }
    const topTasks = Array.from(topTasksMap.values()).sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 5);

    // INRs
    const hourly = employeesMap.get(employeeId)?.hourlyCostInr ?? null;
    const recoverableHoursMonth = (repetitiveMinutes * AUTOMATION_RECOVERY_COEFFICIENT) / 60 / Math.max(1, weeksObserved) * WEEKS_PER_MONTH;
    const inrCostMonth = hourly ? Math.round((repetitiveMinutes / 60) * hourly * AUTOMATION_RECOVERY_COEFFICIENT * (WEEKS_PER_MONTH / weeksObserved)) : null;

    employeesOut.push({
      employeeId,
      employeeName: employeesMap.get(employeeId)?.name ?? null,
      department: employeesMap.get(employeeId)?.department ?? rs[0]?.department ?? "(unknown)",
      role: employeesMap.get(employeeId)?.role ?? null,
      status: employeesMap.get(employeeId)?.status ?? null,
      totalMinutes,
      repetitiveMinutes,
      repetitiveShare,
      recoverableHoursMonth: Math.round(recoverableHoursMonth),
      inrCostMonth,
      rws: repetitiveShare,
      topTasks,
      flags: unique(rs.flatMap((r) => r.flags)),
    });
  }

  // Headline KPIs
  const totalRepetitiveMinutes = rows.reduce((s, r) => s + ((r.includeInTimeMetrics && r.isRepetitive && r.durationMinutes) || 0), 0);
  const recoverableHoursMonth = (totalRepetitiveMinutes * AUTOMATION_RECOVERY_COEFFICIENT) / 60 / Math.max(1, weeksObserved) * WEEKS_PER_MONTH;

  // Recoverable INR: sum per-employee where compensation exists
  const recoverableInrMonth = employeesOut.reduce((s, e) => s + (e.inrCostMonth ?? 0), 0);

  // add high repetitive concentration anomalies
  const anomalies: Anomaly[] = (joined.anomalies ?? []).slice();
  for (const e of employeesOut) {
    if (e.repetitiveShare >= REPETITIVE_CONCENTRATION_THRESHOLD.share && e.totalMinutes >= REPETITIVE_CONCENTRATION_THRESHOLD.minMinutes) {
      anomalies.push({
        id: `anomaly-high-rep-${e.employeeId}`,
        type: "high_repetitive_concentration",
        severity: "medium",
        title: "High repetitive concentration",
        detail: `${e.employeeId} has ${(e.repetitiveShare * 100).toFixed(0)}% repetitive share across ${e.totalMinutes} minutes.`,
        recommendation: "Review role for automation candidacy.",
        employeeIds: [e.employeeId],
        rowNumbers: [],
      });
    }
  }

  const headline = {
    recoverableHoursMonth: Math.round(recoverableHoursMonth),
    recoverableHoursCi: [
      Math.round(recoverableHoursMonth * (1 - RECOVERABLE_HOURS_CI)),
      Math.round(recoverableHoursMonth * (1 + RECOVERABLE_HOURS_CI)),
    ] as [number, number],
    recoverableInrMonth: Math.round(recoverableInrMonth),
    recoverableInrCi: [
      Math.round(recoverableInrMonth * (1 - RECOVERABLE_INR_CI)),
      Math.round(recoverableInrMonth * (1 + RECOVERABLE_INR_CI)),
    ] as [number, number],
    avgRepSharePct:
      Math.round(
        (rows.length === 0
          ? 0
          : (rows.reduce((s, r) => s + ((r.isRepetitive && r.durationMinutes) || 0), 0) /
              Math.max(1, rows.reduce((s, r) => s + (r.durationMinutes || 0), 0))) *
            100) *
          10,
      ) / 10,
  };

  const methodology = {
    workingHoursPerYear: WORKING_HOURS_PER_YEAR,
    automationRecoveryCoefficient: AUTOMATION_RECOVERY_COEFFICIENT,
    weeksPerMonth: WEEKS_PER_MONTH,
    apsWeights: APS_WEIGHTS,
  } as const;

  return {
    headline,
    tasks,
    departments,
    employees: employeesOut,
    apps,
    weekly,
    anomalies,
    methodology,
  };
}

export default computeMetrics;
