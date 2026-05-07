import type {
  ParseActivityLogsResult,
  ParseEmployeesResult,
  JoinDatasetsResult,
  CleanRow,
  ExcludedJoinedRow,
  Anomaly,
  AuditEntry,
} from "../types.ts";
// constants not required here

function makeAuditEntry(entry: Partial<AuditEntry>): AuditEntry {
  return {
    id: entry.id ?? `join-${Math.random().toString(36).slice(2, 9)}`,
    scope: entry.scope ?? "join",
    action: entry.action ?? "flagged",
    severity: entry.severity ?? "info",
    code: entry.code ?? "JOIN_LOG",
    message: entry.message ?? "Join event",
    ...(entry.employeeId ? { employeeId: entry.employeeId } : {}),
    ...(entry.rowNumber ? { rowNumber: entry.rowNumber } : {}),
    ...(entry.field ? { field: entry.field } : {}),
    ...(entry.rawValue !== undefined ? { rawValue: entry.rawValue } : {}),
    ...(entry.normalizedValue !== undefined ? { normalizedValue: entry.normalizedValue } : {}),
    ...(entry.metadata ? { metadata: entry.metadata } : {}),
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
}

export function joinDatasets(
  activityResult: ParseActivityLogsResult,
  employeesResult: ParseEmployeesResult,
): JoinDatasetsResult {
  const audit: AuditEntry[] = [...activityResult.audit, ...employeesResult.audit];

  const employees = employeesResult.employees;
  const rowsOut: CleanRow[] = [];
  const excluded: ExcludedJoinedRow[] = [];

  const postTerminationMap = new Map<string, number[]>();
  const missingMetadataMap = new Map<string, number[]>();
  const unknownEmployeeRows: number[] = [];
  const compensationExcludedRows: number[] = [];

  let rowsJoined = 0;
  let unknownEmployeeRowsCount = 0;
  let missingMetadataRowsCount = 0;
  let compensationExcludedRowsCount = 0;
  let postTerminationRowsCount = 0;

  const seenEmployeeIds = new Set<string>();

  for (const r of activityResult.rows.sort((a, b) => a.rowNumber - b.rowNumber)) {
    
    const empId = r.employeeId;
    const employee = empId === "?" ? undefined : employees.get(empId);

    const base: CleanRow = {
      rowId: r.rowId,
      rowNumber: r.rowNumber,
      employeeId: r.employeeId,
      department: r.department,
      timestampIso: r.timestampIso,
      activityDate: r.activityDate,
      week: r.week,
      weekStart: r.weekStart,
      appUsed: r.appUsed,
      taskCategory: r.taskCategory,
      durationMinutes: r.durationMinutes,
      isRepetitive: r.isRepetitive,
      employeeName: employee?.name ?? null,
      role: employee?.role ?? null,
      status: employee?.status ?? null,
      hourlyCostInr: employee?.hourlyCostInr ?? null,
      annualCtcInr: employee?.annualCtcInr ?? null,
      monthlyCostInr: employee?.monthlyCostInr ?? null,
      tenureMonths: employee?.tenureMonths ?? null,
      workingHours: employee?.workingHours ?? null,
      hasEmployeeMetadata: !!employee,
      hasCompensation: !!employee?.hasCompensation,
      compensationSource: employee?.compensationSource ?? null,
      includeInTimeMetrics: true,
      includeInInrMetrics: true,
      includeInAutomationMetrics: true,
      postTerminationAnomaly: false,
      anomalyTags: r.anomalyTags.slice(),
      flags: r.flags.slice(),
      auditRefs: r.auditRefs.slice(),
    };

    // Mark seen employee for orphan detection
    if (employee) {
      seenEmployeeIds.add(employee.employeeId);
    }

    // Unknown employee id ('?') — retain for time analytics, exclude from INR
    if (empId === "?") {
      unknownEmployeeRowsCount += 1;
      unknownEmployeeRows.push(r.rowNumber);
      base.includeInInrMetrics = false;
      base.includeInAutomationMetrics = true;
      excluded.push({
        id: `excl-unknown-${r.rowNumber}`,
        rowId: r.rowId,
        rowNumber: r.rowNumber,
        employeeId: empId,
        reason: "unknown_employee",
        affects: ["inr"],
        detail: "Unknown employee id ('?') — retained for time analytics, excluded from INR.",
        auditRef: makeAuditEntry({
          code: "JOIN_UNKNOWN_EMPLOYEE",
          message: `Row ${r.rowNumber} uses unknown employee id '?'.`,
          rowNumber: r.rowNumber,
        }).id,
      });
      // keep the row as-is for time analysis
    } else if (!employee) {
      // Missing employee metadata (E013-like) — retain for time, exclude from INR
      missingMetadataRowsCount += 1;
      base.includeInInrMetrics = false;
      missingMetadataMap.set(empId, (missingMetadataMap.get(empId) ?? []).concat(r.rowNumber));
      excluded.push({
        id: `excl-missingmeta-${r.rowNumber}`,
        rowId: r.rowId,
        rowNumber: r.rowNumber,
        employeeId: empId,
        reason: "missing_employee_metadata",
        affects: ["inr"],
        detail: `Employee ${empId} missing metadata — retained for time analytics, excluded from INR.`,
        auditRef: makeAuditEntry({
          code: "JOIN_MISSING_EMPLOYEE_METADATA",
          message: `Row ${r.rowNumber} references ${empId} with no employee metadata.`,
          rowNumber: r.rowNumber,
        }).id,
      });
    } else {
      // Employee exists — check termination and compensation eligibility
      // Post-termination: flag rows where activity date is after termination date
      if (employee.terminatedOn) {
        try {
          // lexical YYYY-MM-DD comparison is safe for ISO date strings
          if (r.activityDate > employee.terminatedOn) {
            base.postTerminationAnomaly = true;
            base.includeInTimeMetrics = false;
            base.includeInAutomationMetrics = false;
            base.includeInInrMetrics = false;
            postTerminationRowsCount += 1;
            postTerminationMap.set(employee.employeeId, (postTerminationMap.get(employee.employeeId) ?? []).concat(r.rowNumber));
            excluded.push({
              id: `excl-postterm-${r.rowNumber}`,
              rowId: r.rowId,
              rowNumber: r.rowNumber,
              employeeId: employee.employeeId,
              reason: "post_termination_anomaly",
              affects: ["time", "inr", "automation", "operational"],
              detail: `Activity on ${r.activityDate} after termination date ${employee.terminatedOn}.`,
              auditRef: makeAuditEntry({
                code: "JOIN_POST_TERMINATION",
                message: `Row ${r.rowNumber} is after termination for ${employee.employeeId}.`,
                employeeId: employee.employeeId,
                rowNumber: r.rowNumber,
              }).id,
            });
          }
        } catch {
          // if comparison fails, be conservative and do not mark as post-termination
        }
      }

      // Compensation exclusion
      if (!employee.hasCompensation) {
        compensationExcludedRowsCount += 1;
        base.includeInInrMetrics = false;
        compensationExcludedRows.push(r.rowNumber);
        excluded.push({
          id: `excl-uncomp-${r.rowNumber}`,
          rowId: r.rowId,
          rowNumber: r.rowNumber,
          employeeId: employee.employeeId,
          reason: "uncompensated_employee",
          affects: ["inr"],
          detail: `Employee ${employee.employeeId} has no compensation data; excluded from INR calculations.`,
          auditRef: makeAuditEntry({
            code: "JOIN_UNCOMPENSATED",
            message: `Row ${r.rowNumber} excluded from INR: ${employee.employeeId} uncompensated.`,
            employeeId: employee.employeeId,
            rowNumber: r.rowNumber,
          }).id,
        });
      }
    }

    rowsOut.push(base);
    rowsJoined += 1;
  }

  // Build anomalies: post-termination per employee
  const anomalies: Anomaly[] = [];

  for (const [employeeId, rowNumbers] of postTerminationMap.entries()) {
    const id = `anomaly-postterm-${employeeId}`;
    anomalies.push({
      id,
      type: "post_termination_activity",
      severity: "high",
      title: "Post-termination activity detected",
      detail: `Activity rows ${rowNumbers.join(", ")} recorded after termination for ${employeeId}.`,
      recommendation: "Review offboarding processes and revoke access immediately.",
      employeeIds: [employeeId],
      rowNumbers,
    });
  }

  // Missing metadata anomaly
  if (missingMetadataMap.size > 0) {
    const employeeIds = Array.from(missingMetadataMap.keys());
    const rowNumbers = Array.from(missingMetadataMap.values()).flat();
    anomalies.push({
      id: `anomaly-missing-metadata-${employeeIds.join("-")}`,
      type: "missing_metadata",
      severity: "medium",
      title: "Missing employee metadata",
      detail: `Activity rows for ${employeeIds.join(", ")} have no employee metadata and were excluded from INR calculations.`,
      recommendation: "Add missing employee records or reconcile HR export.",
      employeeIds,
      rowNumbers,
    });
  }

  // Unknown employee rows anomaly
  if (unknownEmployeeRows.length > 0) {
    anomalies.push({
      id: `anomaly-unknown-rows`,
      type: "missing_metadata",
      severity: "low",
      title: "Unknown employee ids present",
      detail: `Activity rows ${unknownEmployeeRows.join(", ")} reference unknown employee id '?'.`,
      recommendation: "If these are known users, add employee metadata; otherwise accept as orphan activity.",
      employeeIds: [],
      rowNumbers: unknownEmployeeRows,
    });
  }

  // Orphan employees: those in employees map but never seen in activity rows
  const orphanEmployees = Array.from(employees.keys()).filter((id) => !seenEmployeeIds.has(id));

  const stats = {
    activityRowsInput: activityResult.stats.rowsTotal,
    rowsJoined,
    rowsExcludedFromTimeMetrics: postTerminationRowsCount,
    rowsExcludedFromInrMetrics: unknownEmployeeRowsCount + missingMetadataRowsCount + compensationExcludedRowsCount + postTerminationRowsCount,
    rowsExcludedFromAutomationMetrics: postTerminationRowsCount,
    unknownEmployeeRows: unknownEmployeeRowsCount,
    missingMetadataRows: missingMetadataRowsCount,
    compensationExcludedRows: compensationExcludedRowsCount,
    postTerminationRows: postTerminationRowsCount,
    orphanEmployees: orphanEmployees.length,
    anomaliesCreated: anomalies.length,
    auditEntries: audit.length,
    employeeCoveragePct:
      employees.size === 0 ? 0 : Math.round((seenEmployeeIds.size / employees.size) * 10000) / 100,
    compensationCoveragePct:
      employees.size === 0
        ? 0
        : Math.round((Array.from(employees.values()).filter((e) => e.hasCompensation).length / employees.size) * 10000) / 100,
  };

  // Append join-level audit summaries
  audit.push(
    makeAuditEntry({ code: "JOIN_SUMMARY", message: `Joined ${rowsJoined} activity rows to ${employees.size} employees.` }),
  );

  return {
    rows: rowsOut,
    excluded,
    anomalies,
    audit,
    stats,
  } as JoinDatasetsResult;
}

export default joinDatasets;
