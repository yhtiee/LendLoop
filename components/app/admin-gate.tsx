"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewer } from "./use-viewer";

/**
 * Keeps non-admins out of the admin console entirely (no admin chrome flashes):
 * they are sent back to /dashboard.
 * Presentation only: every admin query/mutation calls requireAdmin() in Convex.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isAdmin } = useViewer();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isAdmin) router.replace("/dashboard");
  }, [isLoaded, isAdmin, router]);

  if (!isLoaded || !isAdmin) {
    return (
      <div className="flex min-h-svh" aria-busy="true" aria-label="Loading">
        <Skeleton className="hidden w-64 rounded-none md:block" />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  return children;
}
