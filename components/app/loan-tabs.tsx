"use client";

import { useState } from "react";
import { InboxIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LoanView } from "@/lib/types";
import { EmptyState } from "./empty-state";
import { LoanSheet } from "./loan-sheet";
import { LoanTable } from "./loan-table";
import { TableSkeleton } from "./skeletons";

const groups = {
  pending: (l: LoanView) => l.status === "pending",
  active: (l: LoanView) => l.status === "approved",
  past: (l: LoanView) => ["returned", "declined", "cancelled"].includes(l.status),
  all: () => true,
} as const;

type Group = keyof typeof groups;

/** GitHub-style filter tabs above a loan table, plus the detail sheet. */
export function LoanTabs({
  loans,
  perspective,
  viewerId,
  actions,
  sheetFooter,
  emptyCopy,
  defaultGroup = "pending",
}: {
  /** `undefined` while loading. */
  loans: LoanView[] | undefined;
  perspective: "borrower" | "lender" | "admin";
  viewerId: string | null;
  actions?: (loan: LoanView) => React.ReactNode;
  sheetFooter?: (loan: LoanView) => React.ReactNode;
  emptyCopy: { title: string; description: string };
  defaultGroup?: Group;
}) {
  const [group, setGroup] = useState<Group>(defaultGroup);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const all = loans ?? [];
  const visible = all.filter(groups[group]);
  const count = (g: Group) => all.filter(groups[g]).length;
  // Look the selection up in live data so the sheet updates after an action.
  const selected = all.find((l) => l._id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={group} onValueChange={(v) => setGroup(v as Group)}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b">
          {(["pending", "active", "past", "all"] as const).map((g) => (
            <TabsTrigger key={g} value={g} className="flex-none px-3 capitalize">
              {g}
              {loans && (
                <span className="rounded-full bg-muted px-1.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                  {count(g)}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loans === undefined ? (
        <TableSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState icon={InboxIcon} {...emptyCopy} />
      ) : (
        <LoanTable
          loans={visible}
          perspective={perspective}
          viewerId={viewerId}
          onSelect={(l) => setSelectedId(l._id)}
          actions={actions}
        />
      )}

      <LoanSheet
        loan={selected}
        viewerId={viewerId}
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
        footer={selected && sheetFooter ? sheetFooter(selected) : undefined}
      />
    </div>
  );
}
