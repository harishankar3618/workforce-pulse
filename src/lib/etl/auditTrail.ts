import type {
  ParseActivityLogsResult,
  ParseEmployeesResult,
  JoinDatasetsResult,
  DataQualityReport,
  AuditEntry,
} from "../types.ts";

export function buildDataQualityReport(
  activityResult: ParseActivityLogsResult,
  employeesResult: ParseEmployeesResult,
  joinResult: JoinDatasetsResult,
): DataQualityReport {
  const auditEntries: AuditEntry[] = [];
  auditEntries.push(...(activityResult.audit ?? []));
  auditEntries.push(...(employeesResult.audit ?? []));
  auditEntries.push(...(joinResult.audit ?? []));

  const rowsDroppedByReason = activityResult.stats.rowsDroppedByReason ?? {};

  const seenEmployeeIds = new Set<string>(joinResult.rows.filter((r) => r.hasEmployeeMetadata).map((r) => r.employeeId));

  const allEmployeeIds = Array.from(employeesResult.employees.keys());
  const noActivity = allEmployeeIds.filter((id) => !seenEmployeeIds.has(id));

  const missingMetadata = unique(joinResult.excluded.filter((e) => e.reason === "missing_employee_metadata").map((e) => e.employeeId));

  const unknownEmployeeIds = unique(joinResult.excluded.filter((e) => e.reason === "unknown_employee").map((e) => e.rowNumber?.toString() ?? "?"));

  const duplicateResolved = employeesResult.conflicts.map((c) => c.employeeId || c.kept.employeeId);

  const postTermination = (joinResult.anomalies ?? [])
    .filter((a) => a.type === "post_termination_activity")
    .flatMap((a) => a.employeeIds || []);

  const uncompensated = Array.from(employeesResult.employees.values()).filter((e) => !e.hasCompensation).map((e) => e.employeeId);

  const dq: DataQualityReport = {
    rowsTotal: activityResult.stats.rowsTotal,
    rowsClean: activityResult.stats.rowsClean,
    rowsDropped: activityResult.stats.rowsDropped,
    rowsDroppedByReason,
    rowsFlagged: activityResult.stats.rowsFlagged,
    rowsFlaggedByReason: activityResult.stats.rowsFlaggedByReason ?? {},
    rowsFixed: activityResult.stats.rowsFixed ?? 0,
    rowsFixedByReason: activityResult.stats.rowsFixedByReason ?? {},
    employeeIssues: {
      missingMetadata,
      noActivity,
      duplicateResolved,
      postTermination: unique(postTermination),
      unknownEmployeeIds,
      uncompensatedEmployees: uncompensated,
    },
    auditEntries,
  };

  return dq;
}

function unique<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default buildDataQualityReport;
