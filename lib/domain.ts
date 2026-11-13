/**
 * Domain vocabulary shared by the UI and (later) the Convex schema.
 * Keep these lists as the single source of truth for categories, conditions and statuses.
 */

export const CATEGORIES = [
  { value: "power-tools", label: "Power tools" },
  { value: "hand-tools", label: "Hand tools" },
  { value: "garden", label: "Garden" },
  { value: "ladders", label: "Ladders & access" },
  { value: "cleaning", label: "Cleaning" },
  { value: "automotive", label: "Automotive" },
  { value: "outdoor", label: "Camping & outdoor" },
  { value: "other", label: "Other" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export const CONDITIONS = [
  { value: "new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "worn", label: "Well used" },
] as const;

export type Condition = (typeof CONDITIONS)[number]["value"];

/** Stored loan status. "overdue" and "active" are derived, never stored. */
export type LoanStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled"
  | "returned";

export type DisplayLoanStatus = LoanStatus | "active" | "overdue";

export type Role = "user" | "admin";

export const categoryLabel = (value: Category) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const conditionLabel = (value: Condition) =>
  CONDITIONS.find((c) => c.value === value)?.label ?? value;

/** Dates are stored as ISO calendar days (YYYY-MM-DD) to avoid timezone drift. */
export function displayStatus(
  loan: { status: LoanStatus; startDate: string; endDate: string },
  today: string = new Date().toISOString().slice(0, 10)
): DisplayLoanStatus {
  if (loan.status !== "approved") return loan.status;
  if (loan.endDate < today) return "overdue";
  if (loan.startDate <= today) return "active";
  return "approved";
}
