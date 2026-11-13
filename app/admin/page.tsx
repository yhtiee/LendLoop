"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { AlertTriangleIcon, ArrowRightIcon, CheckCircle2Icon } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { LoanSheet } from "@/components/app/loan-sheet";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { useViewer } from "@/components/app/use-viewer";
import { Skeleton } from "@/components/ui/skeleton";
import { displayStatus } from "@/lib/domain";
import { formatDay, timeAgo } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { cn } from "@/lib/utils";

export default function AdminOverviewPage() {
  const viewer = useViewer();
  const today = useToday();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // All of these call requireAdmin() server-side.
  const loans = useQuery(api.admin.loans, {});
  const members = useQuery(api.admin.members, {});
  const listings = useQuery(api.admin.listings, { today });
  const events = useQuery(api.admin.automationEvents, {});

  const active = loans?.filter((l) => l.status === "approved");
  const overdue = active?.filter((l) => displayStatus(l, today) === "overdue");
  const failures = events?.filter((e) => e.outcome === "failed");
  const selected = loans?.find((l) => l._id === selectedId) ?? null;

  const stats = [
    { label: "Members", value: members?.length, href: "/admin/members" },
    { label: "Listings", value: listings?.length, href: "/admin/listings" },
    { label: "Active loans", value: active?.length, href: "/admin/loans" },
    { label: "Overdue", value: overdue?.length, href: "/admin/loans", alert: !!overdue?.length },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admin overview"
        description="The health of the neighbourhood: what's overdue and what failed."
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
        <Panel title="Overdue loans" href="/admin/loans" loading={!overdue}>
          {overdue?.length === 0 ? (
            <AllClear>Nothing overdue.</AllClear>
          ) : (
            overdue?.map((loan) => (
              <li
                key={loan._id}
                onClick={() => setSelectedId(loan._id)}
                className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{loan.tool.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {loan.borrower.name} · due {formatDay(loan.endDate)}
                  </p>
                </div>
                <StatusBadge status="overdue" />
              </li>
            ))
          )}
        </Panel>

        <Panel title="Failed automations" href="/admin/automations" loading={!failures}>
          {failures?.length === 0 ? (
            <AllClear>Every workflow run succeeded.</AllClear>
          ) : (
            failures?.slice(0, 8).map((f) => (
              <li
                key={f._id}
                onClick={() => setSelectedId(f.loanId)}
                className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.toolName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {f.detail ?? "Workflow failed"} · {timeAgo(f.at)}
                  </p>
                </div>
              </li>
            ))
          )}
        </Panel>
      </div>

      <LoanSheet
        loan={selected}
        viewerId={viewer.id}
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
      />
    </div>
  );
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

function AllClear({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-8 text-sm text-muted-foreground">
      <CheckCircle2Icon className="size-4 text-success" />
      {children}
    </li>
  );
}
