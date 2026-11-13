"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { PlusIcon, SearchIcon, SearchXIcon } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Person } from "@/components/app/person";
import { RequestDialog } from "@/components/app/request-dialog";
import { CardGridSkeleton } from "@/components/app/skeletons";
import { AvailabilityBadge } from "@/components/app/status-badge";
import { ToolFormDialog } from "@/components/app/tool-form-dialog";
import { useViewer } from "@/components/app/use-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CATEGORIES, categoryLabel, conditionLabel, type Category } from "@/lib/domain";
import type { ToolView } from "@/lib/types";
import { useToday } from "@/lib/use-today";

const chip =
  "rounded-full px-3 data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-accent-foreground";

export default function BrowseToolsPage() {
  const viewer = useViewer();
  const today = useToday();
  const [category, setCategory] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const [requesting, setRequesting] = useState<ToolView | null>(null);
  const [listOpen, setListOpen] = useState(false);

  // Category filtering runs on a Convex index; name search is client-side over the result.
  const tools = useQuery(
    api.tools.list,
    viewer.id ? { today, ...(category === "all" ? {} : { category }) } : "skip"
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools?.filter((t) => !q || t.name.toLowerCase().includes(q));
  }, [tools, query]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Browse tools"
        description="Everything your neighbours are happy to lend."
        actions={
          <Button onClick={() => setListOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            List a tool
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="relative sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools"
            aria-label="Search tools"
            className="pl-8"
          />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={1}
            value={category}
            onValueChange={(v) => setCategory((v || "all") as Category | "all")}
            aria-label="Filter by category"
            className="w-max"
          >
            <ToggleGroupItem value="all" className={chip}>All</ToggleGroupItem>
            {CATEGORIES.map((c) => (
              <ToggleGroupItem key={c.value} value={c.value} className={chip}>
                {c.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {visible === undefined ? (
        <CardGridSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title="No tools match"
          description="Try another category, or be the first to list one."
          action={<Button variant="outline" onClick={() => setListOpen(true)}>List a tool</Button>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((tool) => (
            <li
              key={tool._id}
              className="flex flex-col rounded-lg border bg-card transition-colors hover:border-ink-300 dark:hover:border-ink-700"
            >
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{tool.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {categoryLabel(tool.category)} · {conditionLabel(tool.condition)}
                    </p>
                  </div>
                  <AvailabilityBadge available={tool.available} />
                </div>
                {tool.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{tool.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
                <Person name={tool.owner.name} trusted={tool.owner.trustedLender} you={tool.isMine} />
                {tool.isMine ? (
                  <span className="text-xs text-muted-foreground">Your listing</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setRequesting(tool)}>
                    Request
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <RequestDialog tool={requesting} open={!!requesting} onOpenChange={(o) => !o && setRequesting(null)} />
      <ToolFormDialog open={listOpen} onOpenChange={setListOpen} />
    </div>
  );
}
