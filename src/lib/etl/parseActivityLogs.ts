import { readFile } from "node:fs/promises";
import path from "node:path";

import Papa from "papaparse";

import { DATA_SOURCE } from "../constants.ts";
import {
  canonicalizeApp,
  canonicalizeDepartment,
  canonicalizeTask,
  isMissingValue,
  normalizeBoolean,
  normalizeEmployeeId,
  parseTimestamp,
  validateDuration,
} from "./canonicalize.ts";
import type {
  ActivityAnomalyTag,
  ActivityParseStats,
  ActivityRow,
  AuditAction,
  AuditEntry,
  AuditSeverity,
  DroppedActivityRow,
  JsonPrimitive,
  JsonValue,
  ParsedActivityRow,
  ParseActivityLogsResult,
  RowFlag,
} from "../types.ts";

type RawCsvRecord = Record<string, string | undefined>;

interface AddAuditInput {
  action: AuditAction;
  severity: AuditSeverity;
  code: string;
  message: string;
  rowNumber?: number;
  employeeId?: string;
  field?: string;
  rawValue?: JsonPrimitive;
  normalizedValue?: JsonPrimitive;
  metadata?: Record<string, JsonValue>;
}

interface NormalizeResult {
  row: ParsedActivityRow | null;
  dropped: DroppedActivityRow | null;
}

const REQUIRED_HEADERS = [
  "employee_id",
  "department",
  "timestamp",
  "app_used",
  "task_category",
  "duration_minutes",
  "is_repetitive",
] as const;

const CRITICAL_DROP_PRIORITY: RowFlag[] = [
  "missing_employee_id",
  "missing_timestamp",
  "invalid_timestamp",
  "missing_duration",
  "invalid_duration",
  "non_positive_duration",
  "impossible_duration",
];

export class ActivityParseError extends Error {
  code: string;
  override cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
    this.name = "ActivityParseError";
  }
}

export async function parseActivityLogs(
  filePath = DATA_SOURCE.activityPath,
): Promise<ParseActivityLogsResult> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  let fileContents: string;

  try {
    fileContents = await readFile(absolutePath, "utf8");
  } catch (error) {
    throw new ActivityParseError(
      "ACTIVITY_FILE_READ_FAILED",
      `Unable to read activity log file at ${absolutePath}.`,
      error,
    );
  }

  return parseActivityLogsCsv(fileContents);
}

export function parseActivityLogsCsv(csv: string): ParseActivityLogsResult {
  const parsed = Papa.parse<RawCsvRecord>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new ActivityParseError(
      "ACTIVITY_CSV_PARSE_FAILED",
      "Activity CSV could not be parsed safely.",
      parsed.errors,
    );
  }

  validateHeaders(parsed.meta.fields ?? []);

  const audit: AuditEntry[] = [];
  const stats = createEmptyStats(parsed.data.length);
  const auditCreatedAt = new Date().toISOString();
  let auditSequence = 0;

  const addAudit = (input: AddAuditInput): string => {
    auditSequence += 1;

    const entry: AuditEntry = {
      id: `activity-${String(auditSequence).padStart(5, "0")}-${input.code.toLowerCase()}`,
      scope: "activity",
      action: input.action,
      severity: input.severity,
      code: input.code,
      message: input.message,
      createdAt: auditCreatedAt,
      ...(input.rowNumber ? { rowNumber: input.rowNumber } : {}),
      ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      ...(input.field ? { field: input.field } : {}),
      ...(input.rawValue !== undefined ? { rawValue: input.rawValue } : {}),
      ...(input.normalizedValue !== undefined
        ? { normalizedValue: input.normalizedValue }
        : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };

    audit.push(entry);
    return entry.id;
  };

  const rows: ParsedActivityRow[] = [];
  const dropped: DroppedActivityRow[] = [];

  parsed.data.forEach((record, index) => {
    const rowNumber = index + 2;
    const result = normalizeActivityRecord(record, rowNumber, addAudit, stats);

    if (result.row) {
      rows.push(result.row);
    }

    if (result.dropped) {
      dropped.push(result.dropped);
    }
  });

  assignWeekLabels(rows);
  finalizeStats(stats, rows, dropped);

  return {
    rows,
    dropped,
    audit,
    stats,
  };
}

function normalizeActivityRecord(
  record: RawCsvRecord,
  rowNumber: number,
  addAudit: (input: AddAuditInput) => string,
  stats: ActivityParseStats,
): NormalizeResult {
  const raw = toActivityRow(record, rowNumber);
  const rowId = `activity-${String(rowNumber).padStart(4, "0")}`;
  const flags: RowFlag[] = [];
  const anomalyTags: ActivityAnomalyTag[] = [];
  const auditRefs: string[] = [];

  const employeeId = normalizeEmployeeId(raw.employeeId);

  if (raw.employeeId.trim() === "?") {
    addFlag(flags, "unknown_employee");
    addAnomalyTag(anomalyTags, "unknown_employee_id");
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "medium",
        code: "ACTIVITY_UNKNOWN_EMPLOYEE_ID",
        message:
          "Activity row uses unknown employee id '?'; row retained for time analysis and excluded from INR after join.",
        rowNumber,
        employeeId: "?",
        field: "employee_id",
        rawValue: raw.employeeId,
      }),
    );
  } else if (!employeeId || isMissingValue(raw.employeeId)) {
    addFlag(flags, "missing_employee_id");
    auditRefs.push(
      addAudit({
        action: "dropped",
        severity: "high",
        code: "ACTIVITY_EMPLOYEE_ID_MISSING",
        message: "Activity row has no usable employee id and was dropped.",
        rowNumber,
        field: "employee_id",
        rawValue: raw.employeeId,
      }),
    );
  } else if (raw.employeeId.trim() !== employeeId) {
    incrementFixed(stats, "employee_id_normalized");
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "low",
        code: "ACTIVITY_EMPLOYEE_ID_NORMALIZED",
        message: `Activity employee id normalized to ${employeeId}.`,
        rowNumber,
        employeeId,
        field: "employee_id",
        rawValue: raw.employeeId,
        normalizedValue: employeeId,
      }),
    );
  }

  const department = canonicalizeDepartment(raw.department);
  if (isMissingValue(raw.department)) {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "low",
        code: "ACTIVITY_DEPARTMENT_MISSING",
        message: "Activity row is missing department metadata.",
        rowNumber,
        employeeId: employeeId || undefined,
        field: "department",
        rawValue: raw.department,
        normalizedValue: department.value,
      }),
    );
  } else if (department.changed) {
    incrementFixed(stats, "department_normalized");
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "low",
        code: "ACTIVITY_DEPARTMENT_NORMALIZED",
        message: `Activity department normalized to ${department.value}.`,
        rowNumber,
        employeeId: employeeId || undefined,
        field: "department",
        rawValue: raw.department,
        normalizedValue: department.value,
        metadata: { lookupKey: department.key },
      }),
    );
  }

  const timestamp = parseTimestamp(raw.timestampRaw);
  if (timestamp.flag) {
    addFlag(flags, timestamp.flag);
    auditRefs.push(
      addAudit({
        action: "dropped",
        severity: "high",
        code:
          timestamp.flag === "missing_timestamp"
            ? "ACTIVITY_TIMESTAMP_MISSING"
            : "ACTIVITY_TIMESTAMP_INVALID",
        message: "Activity row has no usable timestamp and was dropped.",
        rowNumber,
        employeeId: employeeId || undefined,
        field: "timestamp",
        rawValue: raw.timestampRaw,
      }),
    );
  } else if (timestamp.iso && raw.timestampRaw.trim() !== timestamp.iso) {
    incrementFixed(stats, "timestamp_normalized");
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "info",
        code: "ACTIVITY_TIMESTAMP_NORMALIZED",
        message: `Activity timestamp normalized to ${timestamp.iso}.`,
        rowNumber,
        employeeId: employeeId || undefined,
        field: "timestamp",
        rawValue: raw.timestampRaw,
        normalizedValue: timestamp.iso,
        metadata: {
          activityDate: timestamp.date,
          isoWeek: timestamp.week,
          weekStart: timestamp.weekStart,
        },
      }),
    );
  }

  const app = canonicalizeApp(raw.appUsedRaw);
  if (app.flag) {
    addFlag(flags, app.flag);
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: app.flag === "missing_app" ? "medium" : "low",
        code:
          app.flag === "missing_app"
            ? "ACTIVITY_APP_MISSING"
            : "ACTIVITY_APP_UNKNOWN",
        message: `Activity app normalized to ${app.value}.`,
        rowNumber,
        employeeId: employeeId || undefined,
        field: "app_used",
        rawValue: raw.appUsedRaw,
        normalizedValue: app.value,
        metadata: { lookupKey: app.key },
      }),
    );
  } else if (app.changed) {
    incrementFixed(stats, "app_normalized");
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "info",
        code: "ACTIVITY_APP_NORMALIZED",
        message: `Activity app normalized to ${app.value}.`,
        rowNumber,
        employeeId: employeeId || undefined,
        field: "app_used",
        rawValue: raw.appUsedRaw,
        normalizedValue: app.value,
        metadata: { lookupKey: app.key },
      }),
    );
  }

  const task = canonicalizeTask(raw.taskCategoryRaw);
  if (task.flag) {
    addFlag(flags, task.flag);
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: task.flag === "missing_task_category" ? "medium" : "low",
        code:
          task.flag === "missing_task_category"
            ? "ACTIVITY_TASK_MISSING"
            : "ACTIVITY_TASK_UNKNOWN",
        message: `Activity task category normalized to ${task.value}.`,
        rowNumber,
        employeeId: employeeId || undefined,
        field: "task_category",
        rawValue: raw.taskCategoryRaw,
        normalizedValue: task.value,
        metadata: { lookupKey: task.key },
      }),
    );
  } else if (task.changed) {
    incrementFixed(stats, "task_category_normalized");
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "info",
        code: "ACTIVITY_TASK_NORMALIZED",
        message: `Activity task category normalized to ${task.value}.`,
        rowNumber,
        employeeId: employeeId || undefined,
        field: "task_category",
        rawValue: raw.taskCategoryRaw,
        normalizedValue: task.value,
        metadata: { lookupKey: task.key },
      }),
    );
  }

  const duration = validateDuration(raw.durationMinutesRaw);
  if (duration.flag) {
    addFlag(flags, duration.flag);

    if (duration.flag === "long_duration") {
      addAnomalyTag(anomalyTags, "long_duration");
      auditRefs.push(
        addAudit({
          action: "flagged",
          severity: "medium",
          code: "ACTIVITY_DURATION_LONG",
          message: "Activity duration is unusually long but retained.",
          rowNumber,
          employeeId: employeeId || undefined,
          field: "duration_minutes",
          rawValue: raw.durationMinutesRaw,
          normalizedValue: duration.value,
        }),
      );
    } else {
      if (duration.flag === "impossible_duration") {
        addAnomalyTag(anomalyTags, "duration_outlier");
      }

      auditRefs.push(
        addAudit({
          action: "dropped",
          severity: duration.flag === "impossible_duration" ? "medium" : "high",
          code: durationDropCode(duration.flag),
          message: "Activity row has invalid duration and was dropped.",
          rowNumber,
          employeeId: employeeId || undefined,
          field: "duration_minutes",
          rawValue: raw.durationMinutesRaw,
        }),
      );
    }
  }

  const isRepetitive = normalizeBoolean(raw.isRepetitiveRaw);
  if (isRepetitive === null) {
    addFlag(flags, "missing_repetitive_signal");
    addAnomalyTag(anomalyTags, "missing_repetitive_signal");
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "low",
        code: "ACTIVITY_REPETITIVE_SIGNAL_MISSING",
        message:
          "Activity row has no usable repetitive signal; row retained for time analysis.",
        rowNumber,
        employeeId: employeeId || undefined,
        field: "is_repetitive",
        rawValue: raw.isRepetitiveRaw,
        normalizedValue: null,
      }),
    );
  } else if (raw.isRepetitiveRaw.trim() !== String(isRepetitive)) {
    incrementFixed(stats, "is_repetitive_normalized");
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "info",
        code: "ACTIVITY_REPETITIVE_SIGNAL_NORMALIZED",
        message: `Activity repetitive signal normalized to ${isRepetitive}.`,
        rowNumber,
        employeeId: employeeId || undefined,
        field: "is_repetitive",
        rawValue: raw.isRepetitiveRaw,
        normalizedValue: isRepetitive,
      }),
    );
  }

  const dropReason = getDropReason(flags);

  if (dropReason) {
    incrementPartial(stats.rowsDroppedByReason, dropReason);

    return {
      row: null,
      dropped: {
        rowId,
        rowNumber,
        reason: dropReason,
        flags,
        anomalyTags,
        auditRefs,
        raw,
      },
    };
  }

  if (!timestamp.iso || !timestamp.date || !timestamp.week || !timestamp.weekStart) {
    throw new ActivityParseError(
      "ACTIVITY_TIMESTAMP_STATE_INVALID",
      `Timestamp state invalid after validation for row ${rowNumber}.`,
    );
  }

  if (duration.value === null) {
    throw new ActivityParseError(
      "ACTIVITY_DURATION_STATE_INVALID",
      `Duration state invalid after validation for row ${rowNumber}.`,
    );
  }

  for (const flag of flags) {
    incrementPartial(stats.rowsFlaggedByReason, flag);
  }

  return {
    row: {
      rowId,
      rowNumber,
      employeeId: raw.employeeId.trim() === "?" ? "?" : employeeId,
      department: department.value,
      timestampIso: timestamp.iso,
      activityDate: timestamp.date,
      week: timestamp.week,
      isoWeek: timestamp.week,
      weekStart: timestamp.weekStart,
      appUsed: app.value,
      taskCategory: task.value,
      durationMinutes: duration.value,
      isRepetitive,
      anomalyTags,
      flags,
      auditRefs,
      raw,
    },
    dropped: null,
  };
}

function toActivityRow(record: RawCsvRecord, rowNumber: number): ActivityRow {
  return {
    rowNumber,
    employeeId: readCsvField(record, "employee_id"),
    department: readCsvField(record, "department"),
    timestampRaw: readCsvField(record, "timestamp"),
    appUsedRaw: readCsvField(record, "app_used"),
    taskCategoryRaw: readCsvField(record, "task_category"),
    durationMinutesRaw: readCsvField(record, "duration_minutes"),
    isRepetitiveRaw: readCsvField(record, "is_repetitive"),
  };
}

function readCsvField(record: RawCsvRecord, field: (typeof REQUIRED_HEADERS)[number]) {
  return record[field] ?? "";
}

function validateHeaders(headers: string[]) {
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (missing.length > 0) {
    throw new ActivityParseError(
      "ACTIVITY_CSV_HEADERS_INVALID",
      `Activity CSV is missing required headers: ${missing.join(", ")}.`,
    );
  }
}

function assignWeekLabels(rows: ParsedActivityRow[]) {
  const weekStarts = Array.from(new Set(rows.map((row) => row.weekStart))).sort();
  const weekLabels = new Map(
    weekStarts.map((weekStart, index) => [weekStart, `W${index + 1}`] as const),
  );

  rows.forEach((row) => {
    row.week = weekLabels.get(row.weekStart) ?? row.isoWeek;
  });
}

function finalizeStats(
  stats: ActivityParseStats,
  rows: ParsedActivityRow[],
  dropped: DroppedActivityRow[],
) {
  const dates = rows.map((row) => row.activityDate).sort();

  stats.rowsClean = rows.length;
  stats.rowsDropped = dropped.length;
  stats.rowsParsed = rows.length + dropped.length;
  stats.rowsFlagged = rows.filter((row) => row.flags.length > 0).length;
  stats.weekLabels = Array.from(new Set(rows.map((row) => row.week))).sort(
    compareWeekLabels,
  );
  stats.dateRange = {
    start: dates[0] ?? null,
    end: dates.at(-1) ?? null,
  };
  stats.anomalyCounts = {};

  [...rows, ...dropped].forEach((row) => {
    row.anomalyTags.forEach((tag) => {
      incrementPartial(stats.anomalyCounts, tag);
    });
  });
}

function durationDropCode(flag: RowFlag) {
  switch (flag) {
    case "missing_duration":
      return "ACTIVITY_DURATION_MISSING";
    case "invalid_duration":
      return "ACTIVITY_DURATION_INVALID";
    case "non_positive_duration":
      return "ACTIVITY_DURATION_NON_POSITIVE";
    case "impossible_duration":
      return "ACTIVITY_DURATION_IMPOSSIBLE";
    default:
      return "ACTIVITY_DURATION_INVALID";
  }
}

function getDropReason(flags: RowFlag[]): RowFlag | null {
  return CRITICAL_DROP_PRIORITY.find((flag) => flags.includes(flag)) ?? null;
}

function addFlag(flags: RowFlag[], flag: RowFlag) {
  if (!flags.includes(flag)) {
    flags.push(flag);
  }
}

function addAnomalyTag(tags: ActivityAnomalyTag[], tag: ActivityAnomalyTag) {
  if (!tags.includes(tag)) {
    tags.push(tag);
  }
}

function incrementFixed(stats: ActivityParseStats, reason: string) {
  stats.rowsFixed += 1;
  stats.rowsFixedByReason[reason] = (stats.rowsFixedByReason[reason] ?? 0) + 1;
}

function incrementPartial<T extends string>(
  record: Partial<Record<T, number>>,
  key: T,
) {
  record[key] = (record[key] ?? 0) + 1;
}

function createEmptyStats(rowsTotal: number): ActivityParseStats {
  return {
    rowsTotal,
    rowsParsed: 0,
    rowsClean: 0,
    rowsDropped: 0,
    rowsFlagged: 0,
    rowsFixed: 0,
    rowsDroppedByReason: {},
    rowsFlaggedByReason: {},
    rowsFixedByReason: {},
    dateRange: {
      start: null,
      end: null,
    },
    weekLabels: [],
    anomalyCounts: {},
  };
}

function compareWeekLabels(left: string, right: string) {
  const leftNumber = Number(left.replace(/^W/, ""));
  const rightNumber = Number(right.replace(/^W/, ""));

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right);
}
