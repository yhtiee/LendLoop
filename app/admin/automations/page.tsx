"use client";

import { useQuery } from "convex/react";
import { ActivityIcon, AlertTriangleIcon, CalendarClockIcon, ShieldAlertIcon, WebhookIcon } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { TableSkeleton } from "@/components/app/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { timeAgo } from "@/lib/format";
import type { AutomationEventView } from "@/lib/types";
import { cn } from "@/lib/utils";

const workflows = [
  { icon: WebhookIcon, name: "Request notifications", trigger: "Webhook · HMAC-signed", note: "On request created or status change" },
  { icon: CalendarClockIcon, name: "Overdue reminders", trigger: "Schedule · daily", note: "Fetches overdue loans, writes back reminder status" },
  { icon: ShieldAlertIcon, name: "Error handler", trigger: "Error trigger", note: "Alerts and reports any failed run" },
];

const kindLabel: Record<AutomationEventView["kind"], string> = {
  request_notification: "Request notification",
  status_notification: "Status notification",
  overdue_reminder: "Overdue reminder",
};

export default function AutomationsPage() {
  const events = useQuery(api.admin.automationEvents, {});
  const failed = events?.filter((e) => e.outcome === "failed").length;
  const rate = events && events.length ? Math.round(((events.length - (failed ?? 0)) / events.length) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Automations" description="n8n workflow runs reported back to LendLoop." />

      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border">
        {[
          { label: "Runs", value: events?.length },
          { label: "Failed", value: failed, alert: !!failed },
          { label: "Success rate", value: events ? (rate === null ? "—" : `${rate}%`) : undefined },
        ].map((s) => (
          <div key={s.label} className="bg-card p-4">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className={cn("text-2xl font-semibold tabular-nums tracking-tight", s.alert && "text-destructive")}>
              {s.value ?? <Skeleton className="mt-1 h-7 w-10" />}
            </dd>
          </div>
        ))}
      </dl>

      <section className="grid gap-3 md:grid-cols-3">
        {workflows.map((w) => (
          <div key={w.name} className="flex gap-3 rounded-lg border p-4">
            <w.icon className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{w.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{w.trigger}</p>
              <p className="mt-1 text-xs text-muted-foreground">{w.note}</p>
            </div>
          </div>
        ))}
      </section>

      {events === undefined ? (
        <TableSkeleton />
      ) : events.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No workflow runs yet"
          description="Runs appear here once n8n reports back after a request or a reminder."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Event</TableHead>
                <TableHead className="hidden sm:table-cell">Tool</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="pr-4 text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => {
                const isFailed = e.outcome === "failed";
                return (
                  <TableRow key={e._id} className={cn(isFailed && "bg-destructive/5 hover:bg-destructive/10")}>
                    <TableCell className="pl-4">
                      <p className="text-sm">{kindLabel[e.kind]}</p>
                      {isFailed && e.detail && <p className="text-xs text-destructive">{e.detail}</p>}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{e.toolName}</TableCell>
                    <TableCell>
                      {isFailed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
                          <AlertTriangleIcon className="size-3.5" /> Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-success" /> Sent
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right text-xs whitespace-nowrap text-muted-foreground">
                      {timeAgo(e.at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
