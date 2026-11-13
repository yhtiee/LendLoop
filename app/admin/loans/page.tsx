"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoanTabs } from "@/components/app/loan-tabs";
import { PageHeader } from "@/components/app/page-header";
import { useViewer } from "@/components/app/use-viewer";

export default function AdminLoansPage() {
  const viewer = useViewer();
  const loans = useQuery(api.admin.loans, {});
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Loans" description="Every request and loan, read-only." />
      <LoanTabs
        loans={loans}
        perspective="admin"
        viewerId={viewer.id}
        defaultGroup="all"
        emptyCopy={{ title: "No loans in this view", description: "Try another tab." }}
      />
    </div>
  );
}
