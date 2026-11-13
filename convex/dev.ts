import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { addDays, daysInclusive, todayUTC } from "./lib/dates";

/**
 * Demo/QA helper, internal only (CLI or dashboard, never the browser).
 * Moves an approved loan into the past so the overdue-reminder workflow has something to do:
 *   npx convex run dev:backdateLoan '{"loanId":"<id>","daysOverdue":2}'
 */
export const backdateLoan = internalMutation({
  args: { loanId: v.id("loans"), daysOverdue: v.optional(v.number()) },
  handler: async (ctx, { loanId, daysOverdue = 2 }) => {
    const loan = await ctx.db.get("loans", loanId);
    if (!loan) throw new ConvexError("Loan not found.");
    if (loan.status !== "approved") throw new ConvexError("Only approved loans can be made overdue.");
    const length = daysInclusive(loan.startDate, loan.endDate);
    const endDate = addDays(todayUTC(), -Math.max(1, daysOverdue));
    const startDate = addDays(endDate, -(length - 1));
    await ctx.db.patch("loans", loanId, { startDate, endDate });
    return { startDate, endDate };
  },
});
