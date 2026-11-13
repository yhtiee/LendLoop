"use client";

import {
  AlertTriangleIcon,
  BellIcon,
  CheckIcon,
  MailIcon,
  SendIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { categoryLabel, displayStatus } from "@/lib/domain";
import { daysInRange, formatDay, timeAgo } from "@/lib/format";
import type { LoanEvent, LoanView } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import { cn } from "@/lib/utils";
import { Person } from "./person";
import { StatusBadge } from "./status-badge";

const eventCopy: Record<LoanEvent["kind"], { label: string; icon: typeof MailIcon }> = {
  request_notification: { label: "Owner notified of request", icon: SendIcon },
  status_notification: { label: "Borrower notified", icon: MailIcon },
  overdue_reminder: { label: "Overdue reminder sent", icon: BellIcon },
};

export function LoanSheet({
  loan,
  viewerId,
  open,
  onOpenChange,
  footer,
}: {
  loan: LoanView | null;
  viewerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: React.ReactNode;
}) {
  const today = useToday();
  if (!loan) return null;
  const status = displayStatus(loan, today);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-2">
            <SheetTitle>{loan.tool.name}</SheetTitle>
            <StatusBadge status={status} />
          </div>
          <SheetDescription>
            {categoryLabel(loan.tool.category)} · requested {timeAgo(loan._creationTime)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 p-4 text-sm">
            <dt className="text-muted-foreground">Lender</dt>
            <dd>
              <Person name={loan.lender.name} trusted={loan.lender.trustedLender} you={loan.lender._id === viewerId} />
            </dd>
            <dt className="text-muted-foreground">Borrower</dt>
            <dd>
              <Person name={loan.borrower.name} you={loan.borrower._id === viewerId} />
            </dd>
            <dt className="text-muted-foreground">Dates</dt>
            <dd>
              {formatDay(loan.startDate)} → {formatDay(loan.endDate)}
              <span className="text-muted-foreground">
                {" "}· {daysInRange(loan.startDate, loan.endDate)} days
              </span>
            </dd>
            {loan.note && (
              <>
                <dt className="text-muted-foreground">Note</dt>
                <dd className="text-pretty">{loan.note}</dd>
              </>
            )}
          </dl>

          <Separator />

          <section className="p-4">
            <h3 className="mb-3 text-sm font-medium">Automation activity</h3>
            <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
              {loan.events.map((e) => {
                const failed = e.outcome === "failed";
                const { label, icon: Icon } = eventCopy[e.kind];
                return (
                  <li key={e._id} className="relative flex gap-3">
                    <span
                      className={cn(
                        "z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background",
                        failed && "border-destructive/40 text-destructive"
                      )}
                    >
                      {failed ? <AlertTriangleIcon className="size-3" /> : <Icon className="size-3 text-muted-foreground" />}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className={cn("text-sm", failed && "text-destructive")}>
                        {failed ? `${label}: failed` : label}
                        {e.detail && !failed && <span className="text-muted-foreground"> · {e.detail}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(e.at)}
                        {failed && e.detail && ` · ${e.detail}`}
                      </p>
                    </div>
                  </li>
                );
              })}
              <li className="relative flex gap-3">
                <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
                  <CheckIcon className="size-3 text-muted-foreground" />
                </span>
                <div className="pt-0.5">
                  <p className="text-sm">Request created</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(loan._creationTime)}</p>
                </div>
              </li>
            </ol>
          </section>
        </div>

        {footer && <div className="flex gap-2 border-t p-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
