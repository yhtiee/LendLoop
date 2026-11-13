"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { ArrowRightIcon, InboxIcon, PlusIcon, SearchIcon } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LoanSheet } from "@/components/app/loan-sheet";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { ToolFormDialog } from "@/components/app/tool-form-dialog";
import { useLoanActions } from "@/components/app/use-loan-actions";
import { useViewer } from "@/components/app/use-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { displayStatus } from "@/lib/domain";
import { formatDay, formatRange } from "@/lib/format";
import type { LoanView } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import { cn } from "@/lib/utils";

export default function OverviewPage() {
  const viewer = useViewer();
  const today = useToday();
  const actions = useLoanActions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const ready = viewer.id ? {} : "skip";
  const asLender = useQuery(api.loans.asLender, ready);
  const asBorrower = useQuery(api.loans.asBorrower, ready);
  const myTools = useQuery(api.tools.mine, viewer.id ? { today } : "skip");

  const incoming = asLender?.filter((l) => l.status === "pending");
  const borrowing = asBorrower?.filter((l) => l.status === "approved");
  const overdue = borrowing?.filter((l) => displayStatus(l, today) === "overdue");
  const selected = [...(asLender ?? []), ...(asBorrower ?? [])].find((l) => l._id === selectedId) ?? null;

  const stats = [
    { label: "Waiting on you", value: incoming?.length, href: "/dashboard/incoming" },
    { label: "Borrowing", value: borrowing?.length, href: "/dashboard/requests" },
    { label: "Overdue", value: overdue?.length, href: "/dashboard/requests", alert: !!overdue?.length },
    { label: "Your listings", value: myTools?.length, href: "/dashboard/listings" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="What needs a decision, and what's due back."
        actions={
          <>
            <Button variant="outline" onClick={() => setListOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              List a tool
            </Button>
            <Button asChild>
              <Link href="/dashboard/tools">
                <SearchIcon data-icon="inline-start" />
                Browse
              </Link>
            </Button>
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="flex flex-col gap-1 bg-card p-4 transition-colors hover:bg-muted/40">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className={cn("text-2xl font-semibold tabular-nums tracking-tight", s.alert && "text-destructive")}>
              {s.value ?? <Skeleton className="mt-1 h-7 w-8" />}
            </dd>
          </Link>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Needs your decision" href="/dashboard/incoming" loading={!incoming}>
          {incoming?.length === 0 ? (
            <PanelEmpty>No requests waiting. You&apos;re all caught up.</PanelEmpty>
          ) : (
            incoming?.map((loan) => (
              <Row key={loan._id} onClick={() => setSelectedId(loan._id)} title={loan.tool.name}
                meta={`${loan.borrower.name} · ${formatRange(loan.startDate, loan.endDate)}`}>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); actions.decline(loan); }}>
                  Decline
                </Button>
                <Button size="sm" onClick={(e) => { e.stopPropagation(); actions.approve(loan); }}>
                  Approve
                </Button>
              </Row>
            ))
          )}
        </Panel>

        <Panel title="Borrowing" href="/dashboard/requests" loading={!borrowing}>
          {borrowing?.length === 0 ? (
            <PanelEmpty>Nothing borrowed right now.</PanelEmpty>
          ) : (
            borrowing?.map((loan) => (
              <Row key={loan._id} onClick={() => setSelectedId(loan._id)} title={loan.tool.name}
                meta={`From ${loan.lender.name} · due ${formatDay(loan.endDate)}`}>
                <StatusBadge status={displayStatus(loan, today)} />
              </Row>
            ))
          )}
        </Panel>
      </div>

      <LoanSheet
        loan={selected}
        viewerId={viewer.id}
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
        footer={selected ? <SheetActions loan={selected} viewerId={viewer.id} /> : undefined}
      />
      <ToolFormDialog open={listOpen} onOpenChange={setListOpen} />
    </div>
  );
}

function SheetActions({ loan, viewerId }: { loan: LoanView; viewerId: string | null }) {
  const actions = useLoanActions();
  if (loan.borrower._id === viewerId)
    return loan.status === "pending" ? (
      <Button variant="outline" className="flex-1" onClick={() => actions.cancel(loan)}>Cancel request</Button>
    ) : null;
  if (loan.lender._id !== viewerId) return null;
  if (loan.status === "pending")
    return (
      <>
        <Button variant="outline" className="flex-1" onClick={() => actions.decline(loan)}>Decline</Button>
        <Button className="flex-1" onClick={() => actions.approve(loan)}>Approve</Button>
      </>
    );
  if (loan.status === "approved")
    return <Button variant="outline" className="flex-1" onClick={() => actions.markReturned(loan)}>Mark returned</Button>;
  return null;
}

function Panel({ title, href, loading, children }: {
  title: string; href: string; loading: boolean; children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border">
      <div className="flex h-11 items-center justify-between border-b bg-muted/50 px-4">
        <h2 className="text-sm font-medium">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          View all <ArrowRightIcon className="size-3" />
        </Link>
      </div>
      <ul className="divide-y">
        {loading ? (
          <li className="space-y-2 px-4 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </li>
        ) : (
          children
        )}
      </ul>
    </section>
  );
}

function Row({ title, meta, onClick, children }: {
  title: string; meta: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <li onClick={onClick} className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </li>
  );
}

function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-8 text-sm text-muted-foreground">
      <InboxIcon className="size-4" />
      {children}
    </li>
  );
}
