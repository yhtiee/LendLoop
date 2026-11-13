import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  vAutomationKind,
  vCategory,
  vCondition,
  vDay,
  vLoanStatus,
  vRole,
} from "./validators";

export default defineSchema({
  /**
   * One row per Clerk identity. Data minimisation: only what the app needs
   * (a display name, and an email so n8n can notify). No profile data, no phone.
   */
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    role: vRole,
    trustedLender: v.boolean(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: vCategory,
    condition: vCondition,
    description: v.string(),
    /** Soft delete so loan history stays intact. */
    status: v.union(v.literal("active"), v.literal("removed")),
  })
    .index("by_status", ["status"])
    .index("by_status_and_category", ["status", "category"])
    .index("by_ownerId_and_status", ["ownerId", "status"]),

  loans: defineTable({
    toolId: v.id("tools"),
    lenderId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: vDay,
    endDate: vDay,
    status: vLoanStatus,
    note: v.optional(v.string()),
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_borrowerId", ["borrowerId"])
    .index("by_lenderId", ["lenderId"])
    .index("by_toolId_and_status", ["toolId", "status"])
    // Overdue scan: status = approved AND endDate < today
    .index("by_status_and_endDate", ["status", "endDate"]),

  /** Written back by n8n (idempotently) and shown on each loan's timeline. */
  automationEvents: defineTable({
    loanId: v.id("loans"),
    kind: vAutomationKind,
    outcome: v.union(v.literal("sent"), v.literal("failed")),
    detail: v.optional(v.string()),
    idempotencyKey: v.string(),
    at: v.number(),
  })
    .index("by_loanId", ["loanId"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  /** Who did what, for admin actions and other sensitive changes. */
  auditLog: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetId: v.string(),
    detail: v.optional(v.string()),
  }),
});
