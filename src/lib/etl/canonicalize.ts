import {
  APP_CANONICAL,
  BOOLEAN_FALSE_TOKENS,
  BOOLEAN_TRUE_TOKENS,
  DEPARTMENT_CANONICAL,
  DURATION_THRESHOLDS,
  MISSING_VALUE_TOKENS,
  TASK_CANONICAL,
} from "../constants.ts";
import type {
  CanonicalValueResult,
  DurationValidationResult,
  RowFlag,
  TimestampParseResult,
} from "../types.ts";

export { APP_CANONICAL, TASK_CANONICAL };

const DATE_ONLY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function cleanRawText(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return "";
  }

  return String(raw).trim();
}

export function normalizeLookupKey(raw: unknown): string {
  return cleanRawText(raw)
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isMissingValue(raw: unknown): boolean {
  return MISSING_VALUE_TOKENS.has(normalizeLookupKey(raw));
}

function titleCase(value: string): string {
  return normalizeLookupKey(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeEmployeeId(raw: unknown): string {
  return cleanRawText(raw).toUpperCase();
}

export function canonicalizeDepartment(raw: unknown): CanonicalValueResult {
  const original = cleanRawText(raw);
  const key = normalizeLookupKey(raw);

  if (isMissingValue(raw)) {
    return {
      raw: original || null,
      value: "Unknown",
      key,
      changed: true,
      flag: null,
    };
  }

  const value =
    (DEPARTMENT_CANONICAL as Readonly<Record<string, string>>)[key] ??
    titleCase(original);

  return {
    raw: original,
    value,
    key,
    changed: value !== original,
    flag: null,
  };
}

export function canonicalizeApp(raw: unknown): CanonicalValueResult {
  const original = cleanRawText(raw);
  const key = normalizeLookupKey(raw);

  if (isMissingValue(raw)) {
    return {
      raw: original || null,
      value: "Unknown App",
      key,
      changed: true,
      flag: "missing_app",
    };
  }

  const value = (APP_CANONICAL as Readonly<Record<string, string>>)[key];

  if (!value) {
    return {
      raw: original,
      value: titleCase(original),
      key,
      changed: true,
      flag: "unknown_app",
    };
  }

  return {
    raw: original,
    value,
    key,
    changed: value !== original,
    flag: value === original ? null : null,
  };
}

export function canonicalizeTask(raw: unknown): CanonicalValueResult {
  const original = cleanRawText(raw);
  const key = normalizeLookupKey(raw);

  if (isMissingValue(raw)) {
    return {
      raw: original || null,
      value: "Unknown Task",
      key,
      changed: true,
      flag: "missing_task_category",
    };
  }

  const value = (TASK_CANONICAL as Readonly<Record<string, string>>)[key];

  if (!value) {
    return {
      raw: original,
      value: titleCase(original),
      key,
      changed: true,
      flag: "unknown_task_category",
    };
  }

  return {
    raw: original,
    value,
    key,
    changed: value !== original,
    flag: null,
  };
}

export function normalizeBoolean(raw: unknown): boolean | null {
  const key = normalizeLookupKey(raw);

  if (MISSING_VALUE_TOKENS.has(key)) {
    return null;
  }

  if (BOOLEAN_TRUE_TOKENS.has(key)) {
    return true;
  }

  if (BOOLEAN_FALSE_TOKENS.has(key)) {
    return false;
  }

  return null;
}

export function validateDuration(raw: unknown): DurationValidationResult {
  const original = cleanRawText(raw);

  if (isMissingValue(original)) {
    return { value: null, flag: "missing_duration" };
  }

  const value = Number(original);

  if (!Number.isFinite(value)) {
    return { value: null, flag: "invalid_duration" };
  }

  if (value < DURATION_THRESHOLDS.minValidMinutes) {
    return { value: null, flag: "non_positive_duration" };
  }

  if (value > DURATION_THRESHOLDS.maxSingleSessionMinutes) {
    return { value: null, flag: "impossible_duration" };
  }

  if (value > DURATION_THRESHOLDS.longSessionMinutes) {
    return { value, flag: "long_duration" };
  }

  return { value, flag: null };
}

export function parseTimestamp(raw: unknown): TimestampParseResult {
  const original = cleanRawText(raw);

  if (isMissingValue(original)) {
    return emptyTimestampResult("missing_timestamp");
  }

  const ddmmyyyy = parseIndianDateTime(original);
  if (ddmmyyyy) {
    return buildTimestampResult(ddmmyyyy);
  }

  const isoLike = parseIsoLikeDateTime(original);
  if (isoLike) {
    return buildTimestampResult(isoLike);
  }

  return emptyTimestampResult("invalid_timestamp");
}

function emptyTimestampResult(
  flag: Extract<RowFlag, "missing_timestamp" | "invalid_timestamp">,
): TimestampParseResult {
  return {
    parsed: null,
    iso: null,
    date: null,
    week: null,
    weekStart: null,
    flag,
  };
}

function parseIndianDateTime(value: string): Date | null {
  const match = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    return null;
  }

  const dayRaw = match[1];
  const monthRaw = match[2];
  const yearRaw = match[3];
  const hourRaw = match[4] ?? "0";
  const minuteRaw = match[5] ?? "0";
  const secondRaw = match[6] ?? "0";

  if (!dayRaw || !monthRaw || !yearRaw) {
    return null;
  }

  return dateFromParts(yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw);
}

function parseIsoLikeDateTime(value: string): Date | null {
  const zonedDate = parseZonedIso(value);
  if (zonedDate) {
    return zonedDate;
  }

  const match = value.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    return null;
  }

  const yearRaw = match[1];
  const monthRaw = match[2];
  const dayRaw = match[3];
  const hourRaw = match[4] ?? "0";
  const minuteRaw = match[5] ?? "0";
  const secondRaw = match[6] ?? "0";

  if (!yearRaw || !monthRaw || !dayRaw) {
    return null;
  }

  return dateFromParts(yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw);
}

function parseZonedIso(value: string): Date | null {
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateFromParts(
  yearRaw: string,
  monthRaw: string,
  dayRaw: string,
  hourRaw: string,
  minuteRaw: string,
  secondRaw: string,
): Date | null {
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);

  if (
    !isIntegerInRange(year, 1900, 2100) ||
    !isIntegerInRange(month, 1, 12) ||
    !isIntegerInRange(day, 1, 31) ||
    !isIntegerInRange(hour, 0, 23) ||
    !isIntegerInRange(minute, 0, 59) ||
    !isIntegerInRange(second, 0, 59)
  ) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function buildTimestampResult(parsed: Date): TimestampParseResult {
  const weekStart = getWeekStartUtc(parsed);

  return {
    parsed,
    iso: parsed.toISOString(),
    date: DATE_ONLY_FORMATTER.format(parsed),
    week: getIsoWeekKey(parsed),
    weekStart: DATE_ONLY_FORMATTER.format(weekStart),
    flag: null,
  };
}

function getWeekStartUtc(date: Date): Date {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = start.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + mondayOffset);
  return start;
}

function getIsoWeekKey(date: Date): string {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );

  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}
