export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type EmployeeStatus = "active" | "terminated" | "unknown";
export type EmployeeSourceSchema = "v1" | "v2" | "v2_nested";
export type CompensationSource =
  | "salary_lpa"
  | "annual_ctc_inr"
  | "hourly_rate_inr"
  | "meta.compensation"
  | "missing";

export type AuditScope = "employee" | "activity" | "join" | "metric" | "system";
export type AuditAction =
  | "included"
  | "fixed"
  | "flagged"
  | "dropped"
  | "excluded"
  | "resolved";
export type AuditSeverity = "info" | "low" | "medium" | "high";
export type ConfidenceLevel = "high" | "medium" | "low";

export type RowFlag =
  | "missing_employee_id"
  | "unknown_employee"
  | "missing_employee_metadata"
  | "missing_app"
  | "unknown_app"
  | "missing_task_category"
  | "unknown_task_category"
  | "missing_timestamp"
  | "invalid_timestamp"
  | "missing_duration"
  | "invalid_duration"
  | "non_positive_duration"
  | "impossible_duration"
  | "long_duration"
  | "missing_repetitive_signal"
  | "post_termination_anomaly"
  | "uncompensated_employee";

export interface AuditEntry {
  id: string;
  scope: AuditScope;
  action: AuditAction;
  severity: AuditSeverity;
  code: string;
  message: string;
  employeeId?: string;
  rowNumber?: number;
  field?: string;
  rawValue?: string | number | boolean | null;
  normalizedValue?: string | number | boolean | null;
  metadata?: Record<string, JsonValue>;
  createdAt: string;
}

export interface WorkingHours {
  start: string | null;
  end: string | null;
  timezone: string;
  raw: string | null;
}

export interface Employee {
  employeeId: string;
  name: string;
  department: string;
  role: string;
  status: EmployeeStatus;
  annualCtcInr: number | null;
  monthlyCostInr: number | null;
  hourlyCostInr: number | null;
  hasCompensation: boolean;
  compensationSource: CompensationSource;
  tenureMonths: number | null;
  workingHours: WorkingHours | null;
  terminatedOn: string | null;
  sourceSchema: EmployeeSourceSchema;
  sourceIndex: number;
  auditRefs: string[];
}

export interface EmployeeConflictSnapshot {
  employeeId: string;
  name: string;
  department: string;
  role: string;
  status: EmployeeStatus;
  annualCtcInr: number | null;
  monthlyCostInr: number | null;
  hourlyCostInr: number | null;
  compensationSource: CompensationSource;
  tenureMonths: number | null;
  workingHours: WorkingHours | null;
  terminatedOn: string | null;
  sourceSchema: EmployeeSourceSchema;
  sourceIndex: number;
}

export interface EmployeeConflictLog {
  id: string;
  employeeId: string;
  type: "duplicate_employee";
  keptSourceIndex: number;
  discardedSourceIndex: number;
  chosenReason: string;
  fieldDiffs: Array<{
    field: keyof EmployeeConflictSnapshot;
    kept: JsonValue;
    discarded: JsonValue;
  }>;
  kept: EmployeeConflictSnapshot;
  shadow: EmployeeConflictSnapshot;
  auditRef: string;
}

export interface EmployeeParseStats {
  recordsTotal: number;
  recordsParsed: number;
  recordsDropped: number;
  employeesReturned: number;
  activeEmployees: number;
  terminatedEmployees: number;
  unknownStatusEmployees: number;
  duplicateEmployees: number;
  missingCompensation: number;
  missingWorkingHours: number;
  malformedRecords: number;
  schemaCounts: Record<EmployeeSourceSchema, number>;
}

export interface ParseEmployeesResult {
  employees: Map<string, Employee>;
  audit: AuditEntry[];
  conflicts: EmployeeConflictLog[];
  stats: EmployeeParseStats;
}

export interface ActivityRow {
  rowNumber: number;
  employeeId: string;
  department: string;
  timestampRaw: string;
  appUsedRaw: string;
  taskCategoryRaw: string;
  durationMinutesRaw: string;
  isRepetitiveRaw: string;
}

export type ActivityAnomalyTag =
  | "unknown_employee_id"
  | "long_duration"
  | "duration_outlier"
  | "missing_repetitive_signal"
  | "post_termination_activity";

export interface ParsedActivityRow {
  rowId: string;
  rowNumber: number;
  employeeId: string;
  department: string;
  timestampIso: string;
  activityDate: string;
  week: string;
  isoWeek: string;
  weekStart: string;
  appUsed: string;
  taskCategory: string;
  durationMinutes: number;
  isRepetitive: boolean | null;
  anomalyTags: ActivityAnomalyTag[];
  flags: RowFlag[];
  auditRefs: string[];
  raw: ActivityRow;
}

export interface DroppedActivityRow {
  rowId: string;
  rowNumber: number;
  reason: RowFlag;
  flags: RowFlag[];
  anomalyTags: ActivityAnomalyTag[];
  auditRefs: string[];
  raw: ActivityRow;
}

export interface ActivityParseStats {
  rowsTotal: number;
  rowsParsed: number;
  rowsClean: number;
  rowsDropped: number;
  rowsFlagged: number;
  rowsFixed: number;
  rowsDroppedByReason: Partial<Record<RowFlag, number>>;
  rowsFlaggedByReason: Partial<Record<RowFlag, number>>;
  rowsFixedByReason: Record<string, number>;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  weekLabels: string[];
  anomalyCounts: Partial<Record<ActivityAnomalyTag, number>>;
}

export interface ParseActivityLogsResult {
  rows: ParsedActivityRow[];
  dropped: DroppedActivityRow[];
  audit: AuditEntry[];
  stats: ActivityParseStats;
}

export type JoinExclusionReason =
  | "unknown_employee"
  | "missing_employee_metadata"
  | "uncompensated_employee"
  | "post_termination_anomaly"
  | "orphan_employee";

export type MetricExclusionTarget = "time" | "inr" | "automation" | "operational";

export interface ExcludedJoinedRow {
  id: string;
  rowId?: string;
  rowNumber?: number;
  employeeId: string;
  reason: JoinExclusionReason;
  affects: MetricExclusionTarget[];
  detail: string;
  auditRef: string;
}

export interface JoinDatasetsStats {
  activityRowsInput: number;
  rowsJoined: number;
  rowsExcludedFromTimeMetrics: number;
  rowsExcludedFromInrMetrics: number;
  rowsExcludedFromAutomationMetrics: number;
  unknownEmployeeRows: number;
  missingMetadataRows: number;
  compensationExcludedRows: number;
  postTerminationRows: number;
  orphanEmployees: number;
  anomaliesCreated: number;
  auditEntries: number;
  employeeCoveragePct: number;
  compensationCoveragePct: number;
}

export interface JoinDatasetsResult {
  rows: CleanRow[];
  excluded: ExcludedJoinedRow[];
  anomalies: Anomaly[];
  audit: AuditEntry[];
  stats: JoinDatasetsStats;
}

export interface CleanRow {
  rowId: string;
  rowNumber: number;
  employeeId: string;
  department: string;
  timestampIso: string;
  activityDate: string;
  week: string;
  weekStart: string;
  appUsed: string;
  taskCategory: string;
  durationMinutes: number;
  isRepetitive: boolean | null;
  employeeName: string | null;
  role: string | null;
  status: EmployeeStatus | null;
  hourlyCostInr: number | null;
  annualCtcInr: number | null;
  monthlyCostInr: number | null;
  tenureMonths: number | null;
  workingHours: WorkingHours | null;
  hasEmployeeMetadata: boolean;
  hasCompensation: boolean;
  compensationSource: CompensationSource | null;
  includeInTimeMetrics: boolean;
  includeInInrMetrics: boolean;
  includeInAutomationMetrics: boolean;
  postTerminationAnomaly: boolean;
  anomalyTags: ActivityAnomalyTag[];
  flags: RowFlag[];
  auditRefs: string[];
}

export interface CanonicalValueResult {
  raw: string | null;
  value: string;
  key: string;
  changed: boolean;
  flag: RowFlag | null;
}

export interface DurationValidationResult {
  value: number | null;
  flag: Extract<
    RowFlag,
    | "missing_duration"
    | "invalid_duration"
    | "non_positive_duration"
    | "impossible_duration"
    | "long_duration"
  > | null;
}

export interface TimestampParseResult {
  parsed: Date | null;
  iso: string | null;
  date: string | null;
  week: string | null;
  weekStart: string | null;
  flag: Extract<RowFlag, "missing_timestamp" | "invalid_timestamp"> | null;
}

export interface TaskMetrics {
  taskCategory: string;
  rank: number;
  totalMinutes: number;
  totalHours: number;
  repetitiveMinutes: number;
  repetitiveHours: number;
  repRate: number;
  rowCount: number;
  employeeCount: number;
  compensatedEmployeeCount: number;
  employeeConcentrationScore: number;
  inrImpactMonth: number;
  aps: number;
  confidence: ConfidenceLevel;
  normalized: {
    volume: number;
    repRate: number;
    employeeConcentration: number;
    inrImpact: number;
  };
}

export interface DeptMetrics {
  department: string;
  totalMinutes: number;
  totalHours: number;
  repetitiveMinutes: number;
  repetitiveHours: number;
  repRate: number;
  employeeCount: number;
  inrImpactMonth: number;
  topTaskCategory: string | null;
}

export interface WeekMetrics {
  week: string;
  weekStart: string;
  totalMinutes: number;
  repetitiveMinutes: number;
  repShare: number;
  topCategory: string | null;
  categoryBreakdown: Array<{
    taskCategory: string;
    totalMinutes: number;
    repetitiveMinutes: number;
  }>;
}

export interface AppMetrics {
  appUsed: string;
  totalMinutes: number;
  repetitiveMinutes: number;
  repRate: number;
  rowCount: number;
}

export interface EmployeeMetrics {
  employeeId: string;
  employeeName: string | null;
  department: string;
  role: string | null;
  status: EmployeeStatus | null;
  totalMinutes: number;
  repetitiveMinutes: number;
  repetitiveShare: number;
  recoverableHoursMonth: number;
  inrCostMonth: number | null;
  rws: number;
  topTasks: Array<{
    taskCategory: string;
    totalMinutes: number;
    repetitiveMinutes: number;
  }>;
  flags: RowFlag[];
}

export interface Anomaly {
  id: string;
  type:
    | "post_termination_activity"
    | "impossible_duration"
    | "high_repetitive_concentration"
    | "missing_metadata";
  severity: AuditSeverity;
  title: string;
  detail: string;
  recommendation: string;
  employeeIds: string[];
  rowNumbers: number[];
}

export interface DataQualityReport {
  rowsTotal: number;
  rowsClean: number;
  rowsDropped: number;
  rowsDroppedByReason: Partial<Record<RowFlag, number>>;
  rowsFlagged: number;
  rowsFlaggedByReason: Partial<Record<RowFlag, number>>;
  rowsFixed: number;
  rowsFixedByReason: Record<string, number>;
  employeeIssues: {
    missingMetadata: string[];
    noActivity: string[];
    duplicateResolved: string[];
    postTermination: string[];
    unknownEmployeeIds: string[];
    uncompensatedEmployees: string[];
  };
  auditEntries: AuditEntry[];
}

export interface Filters {
  department: string | null;
  taskCategory: string | null;
  week: string | null;
  employeeId: string | null;
}

export interface AnalyticsResult {
  generatedAt: string;
  source: {
    employeesPath: string;
    activityPath: string;
    sourceSystem: string | null;
    generatedAt: string | null;
  };
  dateRange: {
    start: string | null;
    end: string | null;
    weeksObserved: number;
  };
  headline: {
    recoverableHoursMonth: number;
    recoverableHoursCi: [number, number];
    recoverableInrMonth: number;
    recoverableInrCi: [number, number];
    avgRepSharePct: number;
  };
  tasks: TaskMetrics[];
  departments: DeptMetrics[];
  employees: EmployeeMetrics[];
  apps: AppMetrics[];
  weekly: WeekMetrics[];
  anomalies: Anomaly[];
  quality: DataQualityReport;
  filtersAvailable: {
    departments: string[];
    taskCategories: string[];
    weeks: string[];
    employees: string[];
  };
  methodology: {
    workingHoursPerYear: number;
    automationRecoveryCoefficient: number;
    weeksPerMonth: number;
    apsWeights: {
      volume: number;
      repRate: number;
      employeeConcentration: number;
      inrImpact: number;
    };
  };
}
