import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { daysInclusive } from "./lib/dates";
import { vAutomationKind, vDay } from "./validators";

/**
 * Internal functions behind the signed /n8n/* HTTP endpoints (see http.ts).
 * Nothing here is callable from the browser.
 */

/** Idempotent write-back: the same idempotencyKey is only ever recorded once. */
export const recordEvent = internalMutation({
  args: {
    idempotencyKey: v.string(),
    loanId: v.string(),
    kind: vAutomationKind,
    outcome: v.union(v.literal("sent"), v.literal("failed")),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const loanId = ctx.db.normalizeId("loans", args.loanId);
    if (!loanId || !(await ctx.db.get("loans", loanId))) return { status: "unknown_loan" as const };

    const existing = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .first();
    if (existing) {
      // A retry that succeeds after a recorded failure upgrades the record; anything else is a no-op.
      if (existing.outcome === "failed" && args.outcome === "sent") {
        await ctx.db.patch("automationEvents", existing._id, { outcome: "sent", detail: args.detail, at: Date.now() });
        return { status: "updated" as const };
      }
      return { status: "duplicate" as const };
    }

    await ctx.db.insert("automationEvents", {
      loanId,
      kind: args.kind,
      outcome: args.outcome,
      detail: args.detail?.slice(0, 300),
      idempotencyKey: args.idempotencyKey,
      at: Date.now(),
    });
    return { status: "recorded" as const };
  },
});

export const reminderKey = (loanId: string, today: string) => `overdue:${loanId}:${today}`;

/**
 * Approved loans past their end date that haven't had a reminder *today*.
 * The per-day idempotency key means re-running the workflow can't send duplicates.
 */
export const overdueLoans = internalQuery({
  args: { today: vDay },
  handler: async (ctx, { today }) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_and_endDate", (q) => q.eq("status", "approved").lt("endDate", today))
      .take(200);

    const out = [];
    for (const loan of loans) {
      const key = reminderKey(loan._id, today);
      const already = await ctx.db
        .query("automationEvents")
        .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", key))
        .first();
      if (already?.outcome === "sent") continue;

      const [tool, borrower, lender] = await Promise.all([
        ctx.db.get("tools", loan.toolId),
        ctx.db.get("users", loan.borrowerId),
        ctx.db.get("users", loan.lenderId),
      ]);
      out.push({
        loanId: loan._id,
        idempotencyKey: key,
        toolName: tool?.name ?? "a tool",
        endDate: loan.endDate,
        daysOverdue: daysInclusive(loan.endDate, today) - 1,
        borrower: { firstName: borrower?.name.split(" ")[0] ?? "there", email: borrower?.email ?? "" },
        lenderFirstName: lender?.name.split(" ")[0] ?? "the owner",
      });
    }
    return out;
  },
});

export const recordWorkflowError = internalMutation({
  args: {
    workflow: v.string(),
    executionId: v.optional(v.string()),
    node: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const idempotencyKey = `${args.workflow}:${args.executionId ?? "unknown"}:${args.node ?? ""}`;
    const existing = await ctx.db
      .query("workflowErrors")
      .withIndex("by_idempotencyKey", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();
    if (existing) return { status: "duplicate" as const };
    await ctx.db.insert("workflowErrors", {
      idempotencyKey,
      workflow: args.workflow.slice(0, 100),
      executionId: args.executionId?.slice(0, 100),
      node: args.node?.slice(0, 100),
      message: args.message.slice(0, 500),
      at: Date.now(),
    });
    return { status: "recorded" as const };
  },
});
