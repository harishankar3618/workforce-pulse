import {
  INDIA_TIMEZONE,
  MONTHS_PER_YEAR,
  WORKING_HOURS_PER_YEAR,
} from "../constants.ts";
import employeesData from "@/data/employees.json";
import {
  canonicalizeDepartment,
  isMissingValue,
  normalizeEmployeeId,
  normalizeLookupKey,
} from "./canonicalize.ts";
import type {
  AuditAction,
  AuditEntry,
  AuditSeverity,
  CompensationSource,
  Employee,
  EmployeeConflictLog,
  EmployeeConflictSnapshot,
  EmployeeParseStats,
  EmployeeSourceSchema,
  EmployeeStatus,
  JsonPrimitive,
  JsonValue,
  ParseEmployeesResult,
  WorkingHours,
} from "../types.ts";

type RawEmployeeRecord = Record<string, unknown>;

interface FieldLookup {
  exists: boolean;
  path: string;
  value: unknown;
}

interface NormalizedCompensation {
  annualCtcInr: number | null;
  monthlyCostInr: number | null;
  hourlyCostInr: number | null;
  hasCompensation: boolean;
  source: CompensationSource;
  auditRefs: string[];
}

interface EmployeeCandidate {
  employee: Employee;
  richnessScore: number;
  schemaPreference: number;
}

interface AddAuditInput {
  action: AuditAction;
  severity: AuditSeverity;
  code: string;
  message: string;
  employeeId?: string;
  field?: string;
  rawValue?: JsonPrimitive;
  normalizedValue?: JsonPrimitive;
  metadata?: Record<string, JsonValue>;
}

const MAX_REASONABLE_ANNUAL_CTC_INR = 100_000_000;
const MAX_REASONABLE_HOURLY_RATE_INR = 100_000;

export class EmployeeParseError extends Error {
  code: string;
  override cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
    this.name = "EmployeeParseError";
  }
}

export async function parseEmployees(
  source: unknown = employeesData,
): Promise<ParseEmployeesResult> {
  const payload = typeof source === "string" ? employeesData : source;
  return parseEmployeesPayload(payload);
}

export function parseEmployeesPayload(payload: unknown): ParseEmployeesResult {
  if (!isRecord(payload)) {
    throw new EmployeeParseError(
      "EMPLOYEE_JSON_SHAPE_INVALID",
      "Employees payload must be a JSON object.",
    );
  }

  const rawEmployees = payload.employees;

  if (!Array.isArray(rawEmployees)) {
    throw new EmployeeParseError(
      "EMPLOYEE_ARRAY_MISSING",
      "Employees payload must include an employees array.",
    );
  }

  const audit: AuditEntry[] = [];
  const conflicts: EmployeeConflictLog[] = [];
  const stats = createEmptyStats(rawEmployees.length);
  const auditCreatedAt = new Date().toISOString();
  let auditSequence = 0;

  const addAudit = (input: AddAuditInput): string => {
    auditSequence += 1;

    const entry: AuditEntry = {
      id: `employee-${String(auditSequence).padStart(4, "0")}-${input.code.toLowerCase()}`,
      scope: "employee",
      action: input.action,
      severity: input.severity,
      code: input.code,
      message: input.message,
      createdAt: auditCreatedAt,
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

  const employees = new Map<string, Employee>();

  rawEmployees.forEach((rawRecord, index) => {
    const sourceIndex = index + 1;

    if (!isRecord(rawRecord)) {
      stats.recordsDropped += 1;
      stats.malformedRecords += 1;
      addAudit({
        action: "dropped",
        severity: "high",
        code: "EMPLOYEE_RECORD_MALFORMED",
        message: `Employee record ${sourceIndex} is not an object and was dropped.`,
        metadata: { sourceIndex, rawRecord: toJsonValue(rawRecord) },
      });
      return;
    }

    const candidate = normalizeEmployeeRecord(rawRecord, sourceIndex, addAudit);

    if (!candidate) {
      stats.recordsDropped += 1;
      return;
    }

    stats.recordsParsed += 1;
    stats.schemaCounts[candidate.employee.sourceSchema] += 1;

    const existing = employees.get(candidate.employee.employeeId);

    if (!existing) {
      employees.set(candidate.employee.employeeId, candidate.employee);
      return;
    }

    stats.duplicateEmployees += 1;

    const existingCandidate: EmployeeCandidate = {
      employee: existing,
      richnessScore: getEmployeeRichnessScore(existing),
      schemaPreference: getSchemaPreference(existing.sourceSchema),
    };
    const resolution = resolveDuplicate(
      existingCandidate,
      candidate,
      addAudit,
      conflicts,
    );

    employees.set(resolution.employee.employeeId, resolution.employee);
  });

  for (const employee of employees.values()) {
    if (employee.status === "active") {
      stats.activeEmployees += 1;
    } else if (employee.status === "terminated") {
      stats.terminatedEmployees += 1;
    } else {
      stats.unknownStatusEmployees += 1;
    }

    if (!employee.hasCompensation) {
      stats.missingCompensation += 1;
    }

    if (!employee.workingHours?.start || !employee.workingHours.end) {
      stats.missingWorkingHours += 1;
    }
  }

  stats.employeesReturned = employees.size;

  return {
    employees,
    audit,
    conflicts,
    stats,
  };
}

function normalizeEmployeeRecord(
  record: RawEmployeeRecord,
  sourceIndex: number,
  addAudit: (input: AddAuditInput) => string,
): EmployeeCandidate | null {
  const schema = detectSchema(record);
  const auditRefs: string[] = [];

  const employeeIdLookup = firstExistingPath(record, ["employee_id"], ["EmployeeID"]);
  const employeeIdRaw = employeeIdLookup.value;
  const employeeId = normalizeEmployeeId(employeeIdRaw);

  if (!employeeId || isMissingValue(employeeIdRaw)) {
    const auditId = addAudit({
      action: "dropped",
      severity: "high",
      code: "EMPLOYEE_ID_MISSING",
      message: `Employee record ${sourceIndex} has no employee id and was dropped.`,
      field: employeeIdLookup.path,
      rawValue: primitiveOrNull(employeeIdRaw),
      metadata: { sourceIndex, sourceSchema: schema },
    });
    auditRefs.push(auditId);
    return null;
  }

  if (typeof employeeIdRaw === "string" && employeeIdRaw.trim() !== employeeId) {
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "low",
        code: "EMPLOYEE_ID_NORMALIZED",
        message: `Employee id normalized to ${employeeId}.`,
        employeeId,
        field: employeeIdLookup.path,
        rawValue: employeeIdRaw,
        normalizedValue: employeeId,
        metadata: { sourceIndex },
      }),
    );
  }

  const name = normalizeRequiredTextField({
    record,
    paths: [["name"], ["Name"]],
    defaultValue: `Employee ${employeeId}`,
    fieldLabel: "name",
    employeeId,
    sourceIndex,
    addAudit,
    auditRefs,
  });

  const role = normalizeRequiredTextField({
    record,
    paths: [["role"], ["Role"], ["meta", "role"]],
    defaultValue: "Unknown Role",
    fieldLabel: "role",
    employeeId,
    sourceIndex,
    addAudit,
    auditRefs,
  });

  const department = normalizeDepartmentField(
    record,
    employeeId,
    sourceIndex,
    addAudit,
    auditRefs,
  );
  const status = normalizeStatusField(
    record,
    employeeId,
    sourceIndex,
    addAudit,
    auditRefs,
  );
  const terminatedOn = normalizeTerminatedOnField(
    record,
    status,
    employeeId,
    sourceIndex,
    addAudit,
    auditRefs,
  );
  const tenureMonths = normalizeTenureField(
    record,
    employeeId,
    sourceIndex,
    addAudit,
    auditRefs,
  );
  const compensation = normalizeCompensation(
    record,
    employeeId,
    sourceIndex,
    addAudit,
  );
  auditRefs.push(...compensation.auditRefs);

  const workingHours = normalizeWorkingHours(
    record,
    employeeId,
    sourceIndex,
    addAudit,
    auditRefs,
  );

  const employee: Employee = {
    employeeId,
    name,
    department,
    role,
    status,
    annualCtcInr: compensation.annualCtcInr,
    monthlyCostInr: compensation.monthlyCostInr,
    hourlyCostInr: compensation.hourlyCostInr,
    hasCompensation: compensation.hasCompensation,
    compensationSource: compensation.source,
    tenureMonths,
    workingHours,
    terminatedOn,
    sourceSchema: schema,
    sourceIndex,
    auditRefs,
  };

  return {
    employee,
    richnessScore: getEmployeeRichnessScore(employee),
    schemaPreference: getSchemaPreference(schema),
  };
}

function normalizeDepartmentField(
  record: RawEmployeeRecord,
  employeeId: string,
  sourceIndex: number,
  addAudit: (input: AddAuditInput) => string,
  auditRefs: string[],
): string {
  const lookup = firstExistingPath(record, ["department"], ["Dept"]);

  if (!lookup.exists || isMissingValue(lookup.value)) {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "medium",
        code: "EMPLOYEE_DEPARTMENT_MISSING",
        message: `Employee ${employeeId} is missing department metadata.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        normalizedValue: "Unknown",
        metadata: { sourceIndex },
      }),
    );
    return "Unknown";
  }

  const canonical = canonicalizeDepartment(lookup.value);

  if (canonical.changed) {
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "low",
        code: "EMPLOYEE_DEPARTMENT_NORMALIZED",
        message: `Employee ${employeeId} department normalized to ${canonical.value}.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        normalizedValue: canonical.value,
        metadata: { sourceIndex, lookupKey: canonical.key },
      }),
    );
  }

  return canonical.value;
}

function normalizeStatusField(
  record: RawEmployeeRecord,
  employeeId: string,
  sourceIndex: number,
  addAudit: (input: AddAuditInput) => string,
  auditRefs: string[],
): EmployeeStatus {
  const lookup = firstExistingPath(record, ["status"], ["Status"]);
  const key = normalizeLookupKey(lookup.value);

  if (!lookup.exists || isMissingValue(lookup.value)) {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "medium",
        code: "EMPLOYEE_STATUS_MISSING",
        message: `Employee ${employeeId} has no status and was marked unknown.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        normalizedValue: "unknown",
        metadata: { sourceIndex },
      }),
    );
    return "unknown";
  }

  const normalized: EmployeeStatus =
    key === "active" ? "active" : key === "terminated" ? "terminated" : "unknown";

  if (normalized === "unknown") {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "medium",
        code: "EMPLOYEE_STATUS_UNKNOWN",
        message: `Employee ${employeeId} has unrecognized status and was marked unknown.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        normalizedValue: "unknown",
        metadata: { sourceIndex },
      }),
    );
  } else if (typeof lookup.value === "string" && lookup.value.trim() !== normalized) {
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "low",
        code: "EMPLOYEE_STATUS_NORMALIZED",
        message: `Employee ${employeeId} status normalized to ${normalized}.`,
        employeeId,
        field: lookup.path,
        rawValue: lookup.value,
        normalizedValue: normalized,
        metadata: { sourceIndex },
      }),
    );
  }

  return normalized;
}

function normalizeTerminatedOnField(
  record: RawEmployeeRecord,
  status: EmployeeStatus,
  employeeId: string,
  sourceIndex: number,
  addAudit: (input: AddAuditInput) => string,
  auditRefs: string[],
): string | null {
  const lookup = firstExistingPath(record, ["terminated_on"], ["terminatedOn"]);

  if (!lookup.exists || isMissingValue(lookup.value)) {
    if (status === "terminated") {
      auditRefs.push(
        addAudit({
          action: "flagged",
          severity: "high",
          code: "EMPLOYEE_TERMINATION_DATE_MISSING",
          message: `Terminated employee ${employeeId} has no termination date.`,
          employeeId,
          field: lookup.path,
          rawValue: primitiveOrNull(lookup.value),
          metadata: { sourceIndex },
        }),
      );
    }
    return null;
  }

  if (typeof lookup.value !== "string") {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "high",
        code: "EMPLOYEE_TERMINATION_DATE_INVALID",
        message: `Employee ${employeeId} termination date is not a string.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        metadata: { sourceIndex },
      }),
    );
    return null;
  }

  const normalized = normalizeDateOnly(lookup.value);

  if (!normalized) {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "high",
        code: "EMPLOYEE_TERMINATION_DATE_INVALID",
        message: `Employee ${employeeId} termination date could not be parsed.`,
        employeeId,
        field: lookup.path,
        rawValue: lookup.value,
        metadata: { sourceIndex },
      }),
    );
    return null;
  }

  if (lookup.value.trim() !== normalized) {
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "low",
        code: "EMPLOYEE_TERMINATION_DATE_NORMALIZED",
        message: `Employee ${employeeId} termination date normalized to ${normalized}.`,
        employeeId,
        field: lookup.path,
        rawValue: lookup.value,
        normalizedValue: normalized,
        metadata: { sourceIndex },
      }),
    );
  }

  return normalized;
}

function normalizeTenureField(
  record: RawEmployeeRecord,
  employeeId: string,
  sourceIndex: number,
  addAudit: (input: AddAuditInput) => string,
  auditRefs: string[],
): number | null {
  const lookup = firstExistingPath(
    record,
    ["tenure_months"],
    ["tenureMonths"],
    ["meta", "tenure_months"],
  );

  if (!lookup.exists || isMissingValue(lookup.value)) {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "medium",
        code: "EMPLOYEE_TENURE_MISSING",
        message: `Employee ${employeeId} is missing tenure metadata.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        metadata: { sourceIndex },
      }),
    );
    return null;
  }

  const tenure = Number(lookup.value);

  if (!Number.isFinite(tenure) || tenure < 0) {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "medium",
        code: "EMPLOYEE_TENURE_INVALID",
        message: `Employee ${employeeId} has invalid tenure metadata.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        metadata: { sourceIndex },
      }),
    );
    return null;
  }

  const normalized = Math.round(tenure);

  if (normalized !== tenure) {
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "low",
        code: "EMPLOYEE_TENURE_NORMALIZED",
        message: `Employee ${employeeId} tenure rounded to ${normalized} months.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        normalizedValue: normalized,
        metadata: { sourceIndex },
      }),
    );
  }

  return normalized;
}

function normalizeCompensation(
  record: RawEmployeeRecord,
  employeeId: string,
  sourceIndex: number,
  addAudit: (input: AddAuditInput) => string,
): NormalizedCompensation {
  const auditRefs: string[] = [];
  const sources: Array<{
    source: Exclude<CompensationSource, "missing">;
    path: string[];
    kind: "annual" | "lpa" | "hourly";
  }> = [
    { source: "annual_ctc_inr", path: ["annual_ctc_inr"], kind: "annual" },
    { source: "salary_lpa", path: ["salary_LPA"], kind: "lpa" },
    { source: "hourly_rate_inr", path: ["hourly_rate_inr"], kind: "hourly" },
    {
      source: "meta.compensation",
      path: ["meta", "compensation", "annual"],
      kind: "annual",
    },
  ];

  for (const source of sources) {
    const lookup = getPath(record, source.path);

    if (!lookup.exists || isMissingValue(lookup.value)) {
      continue;
    }

    if (source.source === "meta.compensation") {
      const currency = getPath(record, ["meta", "compensation", "currency"]);
      const currencyCode =
        typeof currency.value === "string" ? currency.value.trim().toUpperCase() : "INR";

      if (currency.exists && currencyCode !== "INR") {
        auditRefs.push(
          addAudit({
            action: "excluded",
            severity: "high",
            code: "EMPLOYEE_COMPENSATION_UNSUPPORTED_CURRENCY",
            message: `Employee ${employeeId} compensation ignored because currency is ${currencyCode}.`,
            employeeId,
            field: currency.path,
            rawValue: primitiveOrNull(currency.value),
            metadata: { sourceIndex, source: source.source },
          }),
        );
        continue;
      }
    }

    const numericValue = Number(lookup.value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      auditRefs.push(
        addAudit({
          action: "flagged",
          severity: "high",
          code: "EMPLOYEE_COMPENSATION_INVALID",
          message: `Employee ${employeeId} has invalid compensation in ${lookup.path}.`,
          employeeId,
          field: lookup.path,
          rawValue: primitiveOrNull(lookup.value),
          metadata: { sourceIndex, source: source.source },
        }),
      );
      continue;
    }

    const annualCtcInr = annualizeCompensation(numericValue, source.kind);

    if (!annualCtcInr) {
      auditRefs.push(
        addAudit({
          action: "flagged",
          severity: "high",
          code: "EMPLOYEE_COMPENSATION_OUT_OF_RANGE",
          message: `Employee ${employeeId} compensation in ${lookup.path} is outside accepted bounds.`,
          employeeId,
          field: lookup.path,
          rawValue: primitiveOrNull(lookup.value),
          metadata: { sourceIndex, source: source.source },
        }),
      );
      continue;
    }

    const monthlyCostInr = roundCurrency(annualCtcInr / MONTHS_PER_YEAR);
    const hourlyCostInr =
      source.kind === "hourly"
        ? roundCurrency(numericValue)
        : roundCurrency(annualCtcInr / WORKING_HOURS_PER_YEAR);

    auditRefs.push(
      addAudit({
        action: source.source === "annual_ctc_inr" ? "included" : "fixed",
        severity: "info",
        code: "EMPLOYEE_COMPENSATION_NORMALIZED",
        message: `Employee ${employeeId} compensation normalized from ${source.source}.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        normalizedValue: annualCtcInr,
        metadata: {
          sourceIndex,
          source: source.source,
          annualCtcInr,
          monthlyCostInr,
          hourlyCostInr,
          workingHoursPerYear: WORKING_HOURS_PER_YEAR,
        },
      }),
    );

    return {
      annualCtcInr,
      monthlyCostInr,
      hourlyCostInr,
      hasCompensation: true,
      source: source.source,
      auditRefs,
    };
  }

  auditRefs.push(
    addAudit({
      action: "flagged",
      severity: "high",
      code: "EMPLOYEE_COMPENSATION_MISSING",
      message: `Employee ${employeeId} has no usable compensation metadata.`,
      employeeId,
      field: "compensation",
      metadata: { sourceIndex },
    }),
  );

  return {
    annualCtcInr: null,
    monthlyCostInr: null,
    hourlyCostInr: null,
    hasCompensation: false,
    source: "missing",
    auditRefs,
  };
}

function normalizeWorkingHours(
  record: RawEmployeeRecord,
  employeeId: string,
  sourceIndex: number,
  addAudit: (input: AddAuditInput) => string,
  auditRefs: string[],
): WorkingHours {
  const lookup = firstExistingPath(
    record,
    ["working_hours"],
    ["workingHours"],
    ["meta", "working_hours"],
  );

  if (!lookup.exists || lookup.value === null || isMissingValue(lookup.value)) {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "low",
        code: "EMPLOYEE_WORKING_HOURS_MISSING",
        message: `Employee ${employeeId} has no working-hours metadata.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        metadata: { sourceIndex, timezone: INDIA_TIMEZONE },
      }),
    );

    return {
      start: null,
      end: null,
      timezone: INDIA_TIMEZONE,
      raw: null,
    };
  }

  if (typeof lookup.value === "string") {
    const parsed = parseWorkingHoursRange(lookup.value);

    if (!parsed) {
      auditRefs.push(
        addAudit({
          action: "flagged",
          severity: "medium",
          code: "EMPLOYEE_WORKING_HOURS_INVALID",
          message: `Employee ${employeeId} has invalid working-hours string.`,
          employeeId,
          field: lookup.path,
          rawValue: lookup.value,
          metadata: { sourceIndex, timezone: INDIA_TIMEZONE },
        }),
      );

      return {
        start: null,
        end: null,
        timezone: INDIA_TIMEZONE,
        raw: lookup.value,
      };
    }

    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "info",
        code: "EMPLOYEE_WORKING_HOURS_NORMALIZED",
        message: `Employee ${employeeId} working hours normalized to ${parsed.start}-${parsed.end}.`,
        employeeId,
        field: lookup.path,
        rawValue: lookup.value,
        normalizedValue: `${parsed.start}-${parsed.end}`,
        metadata: { sourceIndex, timezone: INDIA_TIMEZONE },
      }),
    );

    return {
      start: parsed.start,
      end: parsed.end,
      timezone: INDIA_TIMEZONE,
      raw: lookup.value,
    };
  }

  if (!isRecord(lookup.value)) {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "medium",
        code: "EMPLOYEE_WORKING_HOURS_INVALID",
        message: `Employee ${employeeId} working-hours value has unsupported shape.`,
        employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        metadata: { sourceIndex, rawWorkingHours: toJsonValue(lookup.value) },
      }),
    );

    return {
      start: null,
      end: null,
      timezone: INDIA_TIMEZONE,
      raw: stringifyForAudit(lookup.value),
    };
  }

  const startLookup = getPath(lookup.value, ["start"]);
  const endLookup = getPath(lookup.value, ["end"]);
  const timezoneLookup = getPath(lookup.value, ["timezone"]);
  const start = normalizeTime(startLookup.value);
  const end = normalizeTime(endLookup.value);
  const timezone =
    typeof timezoneLookup.value === "string" && !isMissingValue(timezoneLookup.value)
      ? timezoneLookup.value.trim()
      : INDIA_TIMEZONE;
  const raw = stringifyForAudit(lookup.value);

  if (!start || !end || !isStartBeforeEnd(start, end)) {
    auditRefs.push(
      addAudit({
        action: "flagged",
        severity: "medium",
        code: "EMPLOYEE_WORKING_HOURS_INVALID",
        message: `Employee ${employeeId} working-hours object has invalid start or end.`,
        employeeId,
        field: lookup.path,
        metadata: {
          sourceIndex,
          rawWorkingHours: toJsonValue(lookup.value),
          timezone,
        },
      }),
    );

    return {
      start: null,
      end: null,
      timezone,
      raw,
    };
  }

  if (
    start !== startLookup.value ||
    end !== endLookup.value ||
    timezone !== timezoneLookup.value
  ) {
    auditRefs.push(
      addAudit({
        action: "fixed",
        severity: "info",
        code: "EMPLOYEE_WORKING_HOURS_NORMALIZED",
        message: `Employee ${employeeId} working-hours object normalized.`,
        employeeId,
        field: lookup.path,
        normalizedValue: `${start}-${end}`,
        metadata: {
          sourceIndex,
          rawWorkingHours: toJsonValue(lookup.value),
          timezone,
        },
      }),
    );
  }

  return {
    start,
    end,
    timezone,
    raw,
  };
}

function resolveDuplicate(
  existing: EmployeeCandidate,
  incoming: EmployeeCandidate,
  addAudit: (input: AddAuditInput) => string,
  conflicts: EmployeeConflictLog[],
): EmployeeCandidate {
  const decision = chooseDuplicateWinner(existing, incoming);
  const kept = decision.keep.employee;
  const shadow = decision.discard.employee;
  const keptSnapshot = toConflictSnapshot(kept);
  const shadowSnapshot = toConflictSnapshot(shadow);
  const fieldDiffs = getConflictFieldDiffs(keptSnapshot, shadowSnapshot);

  const auditRef = addAudit({
    action: "resolved",
    severity: "medium",
    code: "EMPLOYEE_DUPLICATE_RESOLVED",
    message: `Duplicate employee ${kept.employeeId} resolved. ${decision.reason}`,
    employeeId: kept.employeeId,
    field: "employee_id",
    metadata: {
      keptSourceIndex: kept.sourceIndex,
      discardedSourceIndex: shadow.sourceIndex,
      chosenReason: decision.reason,
      fieldDiffs: toJsonValue(fieldDiffs),
    },
  });

  kept.auditRefs.push(auditRef);

  conflicts.push({
    id: `employee-conflict-${kept.employeeId.toLowerCase()}-${conflicts.length + 1}`,
    employeeId: kept.employeeId,
    type: "duplicate_employee",
    keptSourceIndex: kept.sourceIndex,
    discardedSourceIndex: shadow.sourceIndex,
    chosenReason: decision.reason,
    fieldDiffs,
    kept: keptSnapshot,
    shadow: shadowSnapshot,
    auditRef,
  });

  return decision.keep;
}

function chooseDuplicateWinner(
  existing: EmployeeCandidate,
  incoming: EmployeeCandidate,
): {
  keep: EmployeeCandidate;
  discard: EmployeeCandidate;
  reason: string;
} {
  if (existing.schemaPreference !== incoming.schemaPreference) {
    const keep = existing.schemaPreference > incoming.schemaPreference ? existing : incoming;
    const discard = keep === existing ? incoming : existing;

    return {
      keep,
      discard,
      reason: `Preferred ${keep.employee.sourceSchema} lowercase HRMS schema over ${discard.employee.sourceSchema}.`,
    };
  }

  if (existing.richnessScore !== incoming.richnessScore) {
    const keep = existing.richnessScore > incoming.richnessScore ? existing : incoming;
    const discard = keep === existing ? incoming : existing;

    return {
      keep,
      discard,
      reason: `Preferred richer record with ${keep.richnessScore} populated fields over ${discard.richnessScore}.`,
    };
  }

  const keep = existing.employee.sourceIndex > incoming.employee.sourceIndex ? existing : incoming;
  const discard = keep === existing ? incoming : existing;

  return {
    keep,
    discard,
    reason: "Preferred later HRMS export row after equivalent schema and richness.",
  };
}

function normalizeRequiredTextField(input: {
  record: RawEmployeeRecord;
  paths: string[][];
  defaultValue: string;
  fieldLabel: "name" | "role";
  employeeId: string;
  sourceIndex: number;
  addAudit: (input: AddAuditInput) => string;
  auditRefs: string[];
}): string {
  const lookup = firstExistingPath(input.record, ...input.paths);

  if (!lookup.exists || isMissingValue(lookup.value)) {
    input.auditRefs.push(
      input.addAudit({
        action: "flagged",
        severity: "medium",
        code: `EMPLOYEE_${input.fieldLabel.toUpperCase()}_MISSING`,
        message: `Employee ${input.employeeId} is missing ${input.fieldLabel}.`,
        employeeId: input.employeeId,
        field: lookup.path,
        rawValue: primitiveOrNull(lookup.value),
        normalizedValue: input.defaultValue,
        metadata: { sourceIndex: input.sourceIndex },
      }),
    );
    return input.defaultValue;
  }

  const normalized = String(lookup.value).trim();

  if (typeof lookup.value === "string" && lookup.value !== normalized) {
    input.auditRefs.push(
      input.addAudit({
        action: "fixed",
        severity: "low",
        code: `EMPLOYEE_${input.fieldLabel.toUpperCase()}_NORMALIZED`,
        message: `Employee ${input.employeeId} ${input.fieldLabel} trimmed.`,
        employeeId: input.employeeId,
        field: lookup.path,
        rawValue: lookup.value,
        normalizedValue: normalized,
        metadata: { sourceIndex: input.sourceIndex },
      }),
    );
  }

  return normalized;
}

function detectSchema(record: RawEmployeeRecord): EmployeeSourceSchema {
  if (isRecord(record.meta)) {
    return "v2_nested";
  }

  if (
    hasOwn(record, "EmployeeID") ||
    hasOwn(record, "salary_LPA") ||
    hasOwn(record, "Dept")
  ) {
    return "v1";
  }

  return "v2";
}

function getSchemaPreference(schema: EmployeeSourceSchema): number {
  return schema === "v1" ? 1 : 2;
}

function getEmployeeRichnessScore(employee: Employee): number {
  return [
    employee.name,
    employee.department !== "Unknown" ? employee.department : null,
    employee.role !== "Unknown Role" ? employee.role : null,
    employee.status !== "unknown" ? employee.status : null,
    employee.annualCtcInr,
    employee.monthlyCostInr,
    employee.hourlyCostInr,
    employee.tenureMonths,
    employee.workingHours?.start,
    employee.workingHours?.end,
    employee.terminatedOn,
  ].filter((value) => value !== null && value !== undefined && value !== "").length;
}

function annualizeCompensation(value: number, kind: "annual" | "lpa" | "hourly") {
  const annual =
    kind === "lpa"
      ? value * 100_000
      : kind === "hourly"
        ? value * WORKING_HOURS_PER_YEAR
        : value;

  if (
    !Number.isFinite(annual) ||
    annual <= 0 ||
    annual > MAX_REASONABLE_ANNUAL_CTC_INR
  ) {
    return null;
  }

  if (kind === "hourly" && value > MAX_REASONABLE_HOURLY_RATE_INR) {
    return null;
  }

  return roundCurrency(annual);
}

function parseWorkingHoursRange(value: string): { start: string; end: string } | null {
  const parts = value.split(/\s*-\s*/);

  if (parts.length !== 2) {
    return null;
  }

  const start = normalizeTime(parts[0]);
  const end = normalizeTime(parts[1]);

  if (!start || !end || !isStartBeforeEnd(start, end)) {
    return null;
  }

  return { start, end };
}

function normalizeTime(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") {
    return null;
  }

  const value = String(raw).trim();
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?$/);

  if (!match) {
    return null;
  }

  const hourRaw = match[1];
  const minuteRaw = match[2] ?? "00";

  if (!hourRaw) {
    return null;
  }

  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isStartBeforeEnd(start: string, end: string): boolean {
  return timeToMinutes(start) < timeToMinutes(end);
}

function timeToMinutes(value: string): number {
  const [hourRaw, minuteRaw] = value.split(":");
  return Number(hourRaw ?? 0) * 60 + Number(minuteRaw ?? 0);
}

function normalizeDateOnly(value: string): string | null {
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (!match) {
    return null;
  }

  const yearRaw = match[1];
  const monthRaw = match[2];
  const dayRaw = match[3];

  if (!yearRaw || !monthRaw || !dayRaw) {
    return null;
  }

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1900 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toConflictSnapshot(employee: Employee): EmployeeConflictSnapshot {
  return {
    employeeId: employee.employeeId,
    name: employee.name,
    department: employee.department,
    role: employee.role,
    status: employee.status,
    annualCtcInr: employee.annualCtcInr,
    monthlyCostInr: employee.monthlyCostInr,
    hourlyCostInr: employee.hourlyCostInr,
    compensationSource: employee.compensationSource,
    tenureMonths: employee.tenureMonths,
    workingHours: employee.workingHours,
    terminatedOn: employee.terminatedOn,
    sourceSchema: employee.sourceSchema,
    sourceIndex: employee.sourceIndex,
  };
}

function getConflictFieldDiffs(
  kept: EmployeeConflictSnapshot,
  discarded: EmployeeConflictSnapshot,
): EmployeeConflictLog["fieldDiffs"] {
  const fields: Array<keyof EmployeeConflictSnapshot> = [
    "name",
    "department",
    "role",
    "status",
    "annualCtcInr",
    "monthlyCostInr",
    "hourlyCostInr",
    "compensationSource",
    "tenureMonths",
    "workingHours",
    "terminatedOn",
    "sourceSchema",
  ];

  return fields.flatMap((field) => {
    const keptValue = kept[field];
    const discardedValue = discarded[field];

    if (JSON.stringify(keptValue) === JSON.stringify(discardedValue)) {
      return [];
    }

    return [
      {
        field,
        kept: toJsonValue(keptValue),
        discarded: toJsonValue(discardedValue),
      },
    ];
  });
}

function firstExistingPath(record: RawEmployeeRecord, ...paths: string[][]): FieldLookup {
  for (const candidatePath of paths) {
    const lookup = getPath(record, candidatePath);

    if (lookup.exists) {
      return lookup;
    }
  }

  return {
    exists: false,
    path: paths[0]?.join(".") ?? "unknown",
    value: undefined,
  };
}

function getPath(record: unknown, pathSegments: string[]): FieldLookup {
  let cursor = record;

  for (const segment of pathSegments) {
    if (!isRecord(cursor) || !hasOwn(cursor, segment)) {
      return {
        exists: false,
        path: pathSegments.join("."),
        value: undefined,
      };
    }

    cursor = cursor[segment];
  }

  return {
    exists: true,
    path: pathSegments.join("."),
    value: cursor,
  };
}

function createEmptyStats(recordsTotal: number): EmployeeParseStats {
  return {
    recordsTotal,
    recordsParsed: 0,
    recordsDropped: 0,
    employeesReturned: 0,
    activeEmployees: 0,
    terminatedEmployees: 0,
    unknownStatusEmployees: 0,
    duplicateEmployees: 0,
    missingCompensation: 0,
    missingWorkingHours: 0,
    malformedRecords: 0,
    schemaCounts: {
      v1: 0,
      v2: 0,
      v2_nested: 0,
    },
  };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function primitiveOrNull(value: unknown): JsonPrimitive {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  return null;
}

function toJsonValue(value: unknown): JsonValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]),
    );
  }

  return String(value);
}

function stringifyForAudit(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(toJsonValue(value));
  } catch {
    return String(value);
  }
}

function isRecord(value: unknown): value is RawEmployeeRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: RawEmployeeRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
