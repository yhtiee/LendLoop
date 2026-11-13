import type { Infer } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { env, type MutationCtx } from "../_generated/server";
import type { vLoanEventType } from "../validators";

type LoanEventType = Infer<typeof vLoanEventType>;

/** Who gets told about each event. */
const RECIPIENT: Record<LoanEventType, "lender" | "borrower"> = {
  "loan.requested": "lender",
  "loan.cancelled": "lender",
  "loan.approved": "borrower",
  "loan.declined": "borrower",
  "loan.returned": "borrower",
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

/**
 * Queue a webhook for a loan change, in the same transaction as the change itself
 * (transactional outbox): if the mutation commits, the event exists; if it rolls back, it doesn't.
 * Delivery happens in a scheduled action so the user's request never waits on n8n.
 */
export async function emitLoanEvent(ctx: MutationCtx, loan: Doc<"loans">, type: LoanEventType) {
  const [tool, lender, borrower] = await Promise.all([
    ctx.db.get("tools", loan.toolId),
    ctx.db.get("users", loan.lenderId),
    ctx.db.get("users", loan.borrowerId),
  ]);
  const side = RECIPIENT[type];
  const recipient = side === "lender" ? lender : borrower;
  const counterpart = side === "lender" ? borrower : lender;
  const kind = type === "loan.requested" ? "request_notification" : "status_notification";

  // No address means nothing to send. Record that visibly instead of failing silently.
  if (!recipient?.email) {
    await ctx.db.insert("automationEvents", {
      loanId: loan._id,
      kind,
      outcome: "failed",
      detail: "Recipient has no email on file",
      idempotencyKey: `${loan._id}:${type}:${loan.status}:no-email`,
      at: Date.now(),
    });
    return;
  }

  const appUrl = (env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const deliveryId = await ctx.db.insert("webhookDeliveries", {
    loanId: loan._id,
    type,
    kind,
    status: "pending",
    attempts: 0,
    data: {
      loanId: loan._id,
      toolName: tool?.name ?? "a tool",
      startDate: loan.startDate,
      endDate: loan.endDate,
      status: loan.status,
      recipient: { firstName: firstName(recipient.name), email: recipient.email },
      counterpartFirstName: firstName(counterpart?.name ?? "A neighbour"),
      url: `${appUrl}${side === "lender" ? "/dashboard/incoming" : "/dashboard/requests"}`,
    },
  });
  await ctx.scheduler.runAfter(0, internal.webhooks.deliver, { deliveryId });
}
