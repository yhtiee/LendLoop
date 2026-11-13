import { v, type Infer } from "convex/values";
import type { Category, Condition, LoanStatus, Role } from "../lib/domain";

export const vRole = v.union(v.literal("user"), v.literal("admin"));

export const vCategory = v.union(
  v.literal("power-tools"),
  v.literal("hand-tools"),
  v.literal("garden"),
  v.literal("ladders"),
  v.literal("cleaning"),
  v.literal("automotive"),
  v.literal("outdoor"),
  v.literal("other")
);

export const vCondition = v.union(
  v.literal("new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("worn")
);

export const vLoanStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned")
);

export const vAutomationKind = v.union(
  v.literal("request_notification"),
  v.literal("status_notification"),
  v.literal("overdue_reminder")
);

/** ISO calendar day, e.g. "2026-11-13". Validated further in lib/dates.ts. */
export const vDay = v.string();

// Compile-time guard: Convex validators and the UI's domain types must stay in sync.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const _sync: [
  Same<Infer<typeof vCategory>, Category>,
  Same<Infer<typeof vCondition>, Condition>,
  Same<Infer<typeof vLoanStatus>, LoanStatus>,
  Same<Infer<typeof vRole>, Role>,
] = [true, true, true, true];
void _sync;
