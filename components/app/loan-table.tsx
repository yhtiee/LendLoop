"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categoryLabel, displayStatus } from "@/lib/domain";
import { formatRange, timeAgo } from "@/lib/format";
import type { LoanView } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import { Person } from "./person";
import { StatusBadge } from "./status-badge";

type Perspective = "borrower" | "lender" | "admin";

/**
 * One table for every loan list. The perspective decides which person column(s)
 * show; actions are injected so each page owns its own buttons.
 */
export function LoanTable({
  loans,
  perspective,
  viewerId,
  onSelect,
  actions,
}: {
  loans: LoanView[];
  perspective: Perspective;
  viewerId: string | null;
  onSelect: (loan: LoanView) => void;
  actions?: (loan: LoanView) => React.ReactNode;
}) {
  const today = useToday();
  const showLender = perspective !== "lender";
  const showBorrower = perspective !== "borrower";

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Tool</TableHead>
            {showLender && <TableHead className="hidden md:table-cell">Lender</TableHead>}
            {showBorrower && <TableHead className="hidden md:table-cell">Borrower</TableHead>}
            <TableHead className="hidden sm:table-cell">Dates</TableHead>
            <TableHead>Status</TableHead>
            {actions && <TableHead className="pr-4 text-right"><span className="sr-only">Actions</span></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan._id} className="cursor-pointer" onClick={() => onSelect(loan)}>
              <TableCell className="pl-4">
                <button
                  type="button"
                  className="text-left font-medium outline-none focus-visible:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(loan);
                  }}
                >
                  {loan.tool.name}
                </button>
                <p className="text-xs text-muted-foreground">
                  <span className="sm:hidden">{formatRange(loan.startDate, loan.endDate)} · </span>
                  {categoryLabel(loan.tool.category)}
                  <span className="hidden lg:inline"> · {timeAgo(loan._creationTime)}</span>
                </p>
              </TableCell>
              {showLender && (
                <TableCell className="hidden md:table-cell">
                  <Person name={loan.lender.name} trusted={loan.lender.trustedLender} you={loan.lender._id === viewerId} />
                </TableCell>
              )}
              {showBorrower && (
                <TableCell className="hidden md:table-cell">
                  <Person name={loan.borrower.name} you={loan.borrower._id === viewerId} />
                </TableCell>
              )}
              <TableCell className="hidden text-sm whitespace-nowrap sm:table-cell">
                {formatRange(loan.startDate, loan.endDate)}
              </TableCell>
              <TableCell>
                <StatusBadge status={displayStatus(loan, today)} />
              </TableCell>
              {actions && (
                <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1.5">{actions(loan)}</div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
