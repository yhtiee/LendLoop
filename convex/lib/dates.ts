import { ConvexError } from "convex/values";

/** Loans are stored as ISO calendar days ("YYYY-MM-DD") so string comparison == date comparison. */

export const MAX_LOAN_DAYS = 14;
export const MAX_ADVANCE_DAYS = 90;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function isDay(value: string): boolean {
  if (!DAY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export function assertDay(value: string, label: string) {
  if (!isDay(value)) throw new ConvexError(`${label} must be a valid date.`);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysInclusive(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1;
}

/** Only call from mutations/actions (queries must not read the clock). */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
