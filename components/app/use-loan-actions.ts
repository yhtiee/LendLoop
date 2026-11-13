"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/errors";
import type { LoanView } from "@/lib/types";

/** Loan mutations with consistent success/error toasts. Permissions are checked in Convex. */
export function useLoanActions() {
  const decide = useMutation(api.loans.decide);
  const cancelMutation = useMutation(api.loans.cancel);
  const returnMutation = useMutation(api.loans.markReturned);

  async function run(action: () => Promise<unknown>, success: string, description?: string) {
    try {
      await action();
      toast.success(success, { description });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return {
    approve: (loan: LoanView) =>
      run(() => decide({ loanId: loan._id, decision: "approved" }), "Request approved", `${loan.borrower.name} will be notified.`),
    decline: (loan: LoanView) =>
      run(() => decide({ loanId: loan._id, decision: "declined" }), "Request declined"),
    cancel: (loan: LoanView) => run(() => cancelMutation({ loanId: loan._id }), "Request cancelled"),
    markReturned: (loan: LoanView) =>
      run(() => returnMutation({ loanId: loan._id }), "Marked as returned", loan.tool.name),
  };
}
