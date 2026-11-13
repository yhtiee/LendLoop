import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getViewer, requireUser } from "./lib/auth";
import {
  addDays,
  assertDay,
  daysInclusive,
  MAX_ADVANCE_DAYS,
  MAX_LOAN_DAYS,
  overlaps,
  todayUTC,
} from "./lib/dates";
import { approvedLoansFor, cleanText, toLoanView } from "./lib/model";
import { vDay } from "./validators";

// ---------------------------------------------------------------- queries

/** Loans where the viewer is the borrower ("My requests"). */
export const asBorrower = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return [];
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_borrowerId", (q) => q.eq("borrowerId", user._id))
      .order("desc")
      .take(100);
    return await Promise.all(loans.map((l) => toLoanView(ctx, l)));
  },
});

/** Loans on the viewer's tools ("Incoming"). */
export const asLender = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return [];
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_lenderId", (q) => q.eq("lenderId", user._id))
      .order("desc")
      .take(100);
    return await Promise.all(loans.map((l) => toLoanView(ctx, l)));
  },
});

// -------------------------------------------------------------- mutations

export const request = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: vDay,
    endDate: vDay,
    note: v.optional(v.string()),
  },
  handler: async (ctx, { toolId, startDate, endDate, note }) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get("tools", toolId);
    if (!tool || tool.status !== "active") throw new ConvexError("This tool is no longer listed.");
    if (tool.ownerId === user._id) throw new ConvexError("You can't borrow your own tool.");

    assertDay(startDate, "Start date");
    assertDay(endDate, "End date");
    const today = todayUTC();
    // One day of slack: the client picks dates in the user's local timezone.
    if (startDate < addDays(today, -1)) throw new ConvexError("Start date can't be in the past.");
    if (startDate > addDays(today, MAX_ADVANCE_DAYS))
      throw new ConvexError(`You can book up to ${MAX_ADVANCE_DAYS} days ahead.`);
    if (endDate < startDate) throw new ConvexError("End date must be on or after the start date.");
    if (daysInclusive(startDate, endDate) > MAX_LOAN_DAYS)
      throw new ConvexError(`Loans can be at most ${MAX_LOAN_DAYS} days.`);

    const approved = await approvedLoansFor(ctx, toolId);
    if (approved.some((l) => overlaps(startDate, endDate, l.startDate, l.endDate)))
      throw new ConvexError("The tool is already booked for some of those days.");

    const pending = await ctx.db
      .query("loans")
      .withIndex("by_toolId_and_status", (q) => q.eq("toolId", toolId).eq("status", "pending"))
      .take(100);
    if (pending.some((l) => l.borrowerId === user._id))
      throw new ConvexError("You already have a pending request for this tool.");

    const cleanNote = note ? cleanText(note, "Note", { max: 280 }) : "";
    return await ctx.db.insert("loans", {
      toolId,
      lenderId: tool.ownerId,
      borrowerId: user._id,
      startDate,
      endDate,
      status: "pending",
      ...(cleanNote ? { note: cleanNote } : {}),
    });
  },
});

/** Loads a loan and checks the viewer's side of it. */
async function loadLoanAs(
  ctx: MutationCtx,
  loanId: Doc<"loans">["_id"],
  side: "lender" | "borrower"
): Promise<{ user: Doc<"users">; loan: Doc<"loans"> }> {
  const user = await requireUser(ctx);
  const loan = await ctx.db.get("loans", loanId);
  if (!loan) throw new ConvexError("Request not found.");
  const ownerId = side === "lender" ? loan.lenderId : loan.borrowerId;
  if (ownerId !== user._id) throw new ConvexError("You can't act on this request.");
  return { user, loan };
}

export const decide = mutation({
  args: {
    loanId: v.id("loans"),
    decision: v.union(v.literal("approved"), v.literal("declined")),
  },
  handler: async (ctx, { loanId, decision }) => {
    const { loan } = await loadLoanAs(ctx, loanId, "lender");
    if (loan.status !== "pending") throw new ConvexError("This request has already been answered.");

    if (decision === "approved") {
      const tool = await ctx.db.get("tools", loan.toolId);
      if (!tool || tool.status !== "active") throw new ConvexError("This tool is no longer listed.");
      // Re-check at approval time: another request may have been approved since.
      const approved = await approvedLoansFor(ctx, loan.toolId);
      if (approved.some((l) => overlaps(loan.startDate, loan.endDate, l.startDate, l.endDate)))
        throw new ConvexError("Those dates now clash with another approved loan.");
    }
    await ctx.db.patch("loans", loanId, { status: decision, decidedAt: Date.now() });
  },
});

export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const { loan } = await loadLoanAs(ctx, loanId, "borrower");
    if (loan.status !== "pending") throw new ConvexError("Only pending requests can be cancelled.");
    await ctx.db.patch("loans", loanId, { status: "cancelled", decidedAt: Date.now() });
  },
});

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const { loan } = await loadLoanAs(ctx, loanId, "lender");
    if (loan.status !== "approved") throw new ConvexError("Only approved loans can be marked returned.");
    await ctx.db.patch("loans", loanId, { status: "returned", returnedAt: Date.now() });
  },
});
