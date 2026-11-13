"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { MoreHorizontalIcon, PackageIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { TableSkeleton } from "@/components/app/skeletons";
import { AvailabilityBadge } from "@/components/app/status-badge";
import { ToolFormDialog } from "@/components/app/tool-form-dialog";
import { useViewer } from "@/components/app/use-viewer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categoryLabel, conditionLabel } from "@/lib/domain";
import { errorMessage } from "@/lib/errors";
import { formatDay, toISODay } from "@/lib/format";
import type { MyToolView } from "@/lib/types";
import { useToday } from "@/lib/use-today";

export default function MyListingsPage() {
  const viewer = useViewer();
  const today = useToday();
  const mine = useQuery(api.tools.mine, viewer.id ? { today } : "skip");
  const remove = useMutation(api.tools.remove);
  const [editing, setEditing] = useState<MyToolView | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [removing, setRemoving] = useState<MyToolView | null>(null);

  function openForm(tool: MyToolView | null) {
    setEditing(tool);
    setFormOpen(true);
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      const { declined } = await remove({ toolId: removing._id });
      toast("Listing removed", {
        description: declined ? `${declined} pending request(s) were declined.` : removing.name,
      });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My listings"
        description="Tools you've offered to the neighbourhood."
        actions={
          <Button onClick={() => openForm(null)}>
            <PlusIcon data-icon="inline-start" />
            List a tool
          </Button>
        }
      />

      {mine === undefined ? (
        <TableSkeleton />
      ) : mine.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="You haven't listed anything yet"
          description="A ladder, a drill, a tent: whatever's gathering dust could help a neighbour."
          action={<Button onClick={() => openForm(null)}>List your first tool</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Tool</TableHead>
                <TableHead className="hidden md:table-cell">Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Loans</TableHead>
                <TableHead className="hidden lg:table-cell">Listed</TableHead>
                <TableHead className="pr-4"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mine.map((tool) => (
                <TableRow key={tool._id}>
                  <TableCell className="pl-4">
                    <p className="font-medium">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabel(tool.category)}</p>
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{conditionLabel(tool.condition)}</TableCell>
                  <TableCell><AvailabilityBadge available={tool.available} /></TableCell>
                  <TableCell className="hidden text-sm tabular-nums sm:table-cell">{tool.completedLoans}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {formatDay(toISODay(new Date(tool._creationTime)))}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${tool.name}`}>
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openForm(tool)}>
                          <PencilIcon /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(tool)}>
                          <Trash2Icon /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ToolFormDialog tool={editing} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.name ?? "listing"}?`}
        description="It disappears from Browse immediately. Pending requests for it are declined automatically."
        confirmLabel="Remove listing"
        onConfirm={confirmRemove}
      />
    </div>
  );
}
