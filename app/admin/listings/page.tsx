"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { SearchIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageHeader } from "@/components/app/page-header";
import { Person } from "@/components/app/person";
import { TableSkeleton } from "@/components/app/skeletons";
import { AvailabilityBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categoryLabel } from "@/lib/domain";
import { errorMessage } from "@/lib/errors";
import { formatDay, toISODay } from "@/lib/format";
import type { ToolView } from "@/lib/types";
import { useToday } from "@/lib/use-today";

export default function AdminListingsPage() {
  const today = useToday();
  const tools = useQuery(api.admin.listings, { today });
  const removeListing = useMutation(api.admin.removeListing);
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState<ToolView | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools?.filter(
      (t) => !q || t.name.toLowerCase().includes(q) || t.owner.name.toLowerCase().includes(q)
    );
  }, [tools, query]);

  async function confirmRemove() {
    if (!removing) return;
    try {
      await removeListing({ toolId: removing._id });
      toast("Listing removed", { description: `${removing.name} · recorded in the audit log` });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Listings"
        description={tools ? `${tools.length} tools across the neighbourhood.` : "Every active listing."}
      />

      <div className="relative sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by tool or owner"
          aria-label="Search listings"
          className="pl-8"
        />
      </div>

      {rows === undefined ? (
        <TableSkeleton />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Tool</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Listed</TableHead>
                <TableHead className="pr-4"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No listings found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((tool) => (
                <TableRow key={tool._id}>
                  <TableCell className="pl-4">
                    <p className="font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabel(tool.category)}
                      <span className="md:hidden"> · {tool.owner.name}</span>
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Person name={tool.owner.name} trusted={tool.owner.trustedLender} you={tool.isMine} />
                  </TableCell>
                  <TableCell><AvailabilityBadge available={tool.available} /></TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {formatDay(toISODay(new Date(tool._creationTime)))}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${tool.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setRemoving(tool)}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name ?? "listing"}?`}
        description="The tool is hidden from everyone and its pending requests are declined. Loan history is kept, and the action is recorded in the audit log."
        confirmLabel="Remove listing"
        onConfirm={confirmRemove}
      />
    </div>
  );
}
