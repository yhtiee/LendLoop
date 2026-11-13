"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/app/page-header";
import { Person } from "@/components/app/person";
import { TableSkeleton } from "@/components/app/skeletons";
import { useViewer } from "@/components/app/use-viewer";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { errorMessage } from "@/lib/errors";
import { formatDay, toISODay } from "@/lib/format";
import type { MemberView } from "@/lib/types";

export default function MembersPage() {
  const viewer = useViewer();
  const members = useQuery(api.admin.members, {});
  // Optimistic so the switch flips instantly; Convex re-checks admin rights.
  const setTrusted = useMutation(api.admin.setTrustedLender).withOptimisticUpdate((store, { userId, trusted }) => {
    const current = store.getQuery(api.admin.members, {});
    if (current)
      store.setQuery(api.admin.members, {}, current.map((m) => (m._id === userId ? { ...m, trustedLender: trusted } : m)));
  });

  async function toggle(member: MemberView, trusted: boolean) {
    try {
      await setTrusted({ userId: member._id, trusted });
      toast.success(trusted ? `${member.name} is now a Trusted Lender` : `Trusted Lender removed from ${member.name}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        description="Trusted Lenders get a badge next to their name on every listing."
      />
      {members === undefined ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Member</TableHead>
                <TableHead className="hidden md:table-cell">Role</TableHead>
                <TableHead className="hidden sm:table-cell">Listings</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead className="pr-4 text-right">Trusted Lender</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m._id}>
                  <TableCell className="pl-4">
                    <Person name={m.name} trusted={m.trustedLender} you={m._id === viewer.id} />
                    <p className="mt-0.5 pl-8 text-xs text-muted-foreground">{m.email || "No email on file"}</p>
                  </TableCell>
                  <TableCell className="hidden text-sm capitalize md:table-cell">{m.role}</TableCell>
                  <TableCell className="hidden text-sm tabular-nums sm:table-cell">{m.listingCount}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {formatDay(toISODay(new Date(m._creationTime)))}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Switch
                      checked={m.trustedLender}
                      onCheckedChange={(v) => toggle(m, v)}
                      aria-label={`Trusted Lender: ${m.name}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
