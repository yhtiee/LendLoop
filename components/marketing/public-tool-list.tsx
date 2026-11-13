"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRightIcon } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryLabel } from "@/lib/domain";
import { useToday } from "@/lib/use-today";

/**
 * Read-only public listing. `tools.listPublic` projects name + category on the
 * server, so nothing else about a tool or its owner reaches anonymous visitors.
 */
export function PublicToolList() {
  const today = useToday();
  const tools = useQuery(api.tools.listPublic, { today });

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-medium">Available now</p>
        <p className="font-mono text-xs text-muted-foreground">
          {tools ? `${tools.length} ${tools.length === 1 ? "tool" : "tools"}` : "—"}
        </p>
      </div>
      <ul className="max-h-80 divide-y overflow-y-auto">
        {tools === undefined &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </li>
          ))}
        {tools?.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing listed yet. Be the first neighbour to lend something.
          </li>
        )}
        {tools?.map((tool) => (
          <li key={tool._id} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="truncate text-sm">{tool.name}</span>
            <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
              {categoryLabel(tool.category)}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/sign-in"
        className="group flex items-center justify-between border-t bg-muted/50 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-muted"
      >
        Sign in to lend or borrow
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
