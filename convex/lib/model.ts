import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { emitLoanEvent } from "./events";

type Ctx = QueryCtx | MutationCtx;

/** A tool is "on loan" when an approved loan has started and not been returned (includes overdue). */
export async function isOnLoan(ctx: Ctx, toolId: Id<"tools">, today: string): Promise<boolean> {
  const approved = await ctx.db
    .query("loans")
    .withIndex("by_toolId_and_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .take(50);
  return approved.some((l) => l.startDate <= today);
}

export async function approvedLoansFor(ctx: Ctx, toolId: Id<"tools">) {
  return await ctx.db
    .query("loans")
    .withIndex("by_toolId_and_status", (q) => q.eq("toolId", toolId).eq("status", "approved"))
    .take(50);
}

/** Shape a tool for signed-in views. Never includes the owner's email. */
export async function toToolView(ctx: Ctx, tool: Doc<"tools">, viewerId: Id<"users"> | null, today: string) {
  const owner = await ctx.db.get("users", tool.ownerId);
  return {
    _id: tool._id,
    _creationTime: tool._creationTime,
    name: tool.name,
    category: tool.category,
    condition: tool.condition,
    description: tool.description,
    available: !(await isOnLoan(ctx, tool._id, today)),
    isMine: tool.ownerId === viewerId,
    owner: {
      _id: tool.ownerId,
      name: owner?.name ?? "Former member",
      trustedLender: owner?.trustedLender ?? false,
    },
  };
}

/** Shape a loan with the context every loan list and the detail sheet need. */
export async function toLoanView(ctx: Ctx, loan: Doc<"loans">) {
  const [tool, lender, borrower, events] = await Promise.all([
    ctx.db.get("tools", loan.toolId),
    ctx.db.get("users", loan.lenderId),
    ctx.db.get("users", loan.borrowerId),
    ctx.db
      .query("automationEvents")
      .withIndex("by_loanId", (q) => q.eq("loanId", loan._id))
      .order("desc")
      .take(20),
  ]);
  return {
    _id: loan._id,
    _creationTime: loan._creationTime,
    startDate: loan.startDate,
    endDate: loan.endDate,
    status: loan.status,
    note: loan.note ?? null,
    tool: {
      _id: loan.toolId,
      name: tool?.name ?? "Removed tool",
      category: tool?.category ?? "other",
      removed: tool?.status !== "active",
    },
    lender: { _id: loan.lenderId, name: lender?.name ?? "Former member", trustedLender: lender?.trustedLender ?? false },
    borrower: { _id: loan.borrowerId, name: borrower?.name ?? "Former member" },
    events: events.map((e) => ({ _id: e._id, kind: e.kind, outcome: e.outcome, detail: e.detail ?? null, at: e.at })),
  };
}

/**
 * Take a tool out of circulation (owner or admin). Pending requests are declined;
 * approved loans are left alone so they can still be marked returned.
 */
export async function retireTool(ctx: MutationCtx, tool: Doc<"tools">) {
  await ctx.db.patch("tools", tool._id, { status: "removed" });
  const pending = await ctx.db
    .query("loans")
    .withIndex("by_toolId_and_status", (q) => q.eq("toolId", tool._id).eq("status", "pending"))
    .take(100);
  for (const loan of pending) {
    await ctx.db.patch("loans", loan._id, { status: "declined", decidedAt: Date.now() });
    await emitLoanEvent(ctx, { ...loan, status: "declined" }, "loan.declined");
  }
  return pending.length;
}

export function cleanText(value: string, label: string, { min = 0, max }: { min?: number; max: number }) {
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length < min) throw new ConvexError(`${label} is required.`);
  if (text.length > max) throw new ConvexError(`${label} must be ${max} characters or fewer.`);
  return text;
}
