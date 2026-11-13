"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoanTabs } from "@/components/app/loan-tabs";
import { PageHeader } from "@/components/app/page-header";
import { useLoanActions } from "@/components/app/use-loan-actions";
import { useViewer } from "@/components/app/use-viewer";
import { Button } from "@/components/ui/button";
import type { LoanView } from "@/lib/types";

export default function IncomingPage() {
  const viewer = useViewer();
  const actions = useLoanActions();
  const incoming = useQuery(api.loans.asLender, viewer.id ? {} : "skip");

  const rowActions = (loan: LoanView) => {
    if (loan.status === "pending")
      return (
        <>
          <Button size="sm" variant="outline" onClick={() => actions.decline(loan)}>Decline</Button>
          <Button size="sm" onClick={() => actions.approve(loan)}>Approve</Button>
        </>
      );
    if (loan.status === "approved")
      return (
        <Button size="sm" variant="outline" onClick={() => actions.markReturned(loan)}>
          Mark returned
        </Button>
      );
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Incoming requests" description="Neighbours asking to borrow your tools." />
      <LoanTabs
        loans={incoming}
        perspective="lender"
        viewerId={viewer.id}
        actions={rowActions}
        sheetFooter={(loan) =>
          loan.status === "pending" ? (
            <>
              <Button variant="outline" className="flex-1" onClick={() => actions.decline(loan)}>Decline</Button>
              <Button className="flex-1" onClick={() => actions.approve(loan)}>Approve</Button>
            </>
          ) : loan.status === "approved" ? (
            <Button variant="outline" className="flex-1" onClick={() => actions.markReturned(loan)}>
              Mark returned
            </Button>
          ) : undefined
        }
        emptyCopy={{
          title: "No requests in this view",
          description: "When someone asks to borrow one of your tools, it lands here.",
        }}
      />
    </div>
  );
}
