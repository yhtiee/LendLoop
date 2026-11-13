"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoanTabs } from "@/components/app/loan-tabs";
import { PageHeader } from "@/components/app/page-header";
import { useLoanActions } from "@/components/app/use-loan-actions";
import { useViewer } from "@/components/app/use-viewer";
import { Button } from "@/components/ui/button";

export default function MyRequestsPage() {
  const viewer = useViewer();
  const actions = useLoanActions();
  const mine = useQuery(api.loans.asBorrower, viewer.id ? {} : "skip");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My requests"
        description="Things you've asked to borrow, and where each request stands."
      />
      <LoanTabs
        loans={mine}
        perspective="borrower"
        viewerId={viewer.id}
        actions={(loan) =>
          loan.status === "pending" ? (
            <Button size="sm" variant="ghost" onClick={() => actions.cancel(loan)}>Cancel</Button>
          ) : null
        }
        sheetFooter={(loan) =>
          loan.status === "pending" ? (
            <Button variant="outline" className="flex-1" onClick={() => actions.cancel(loan)}>
              Cancel request
            </Button>
          ) : undefined
        }
        emptyCopy={{
          title: "Nothing here",
          description: "Requests you make from Browse tools show up here.",
        }}
      />
    </div>
  );
}
