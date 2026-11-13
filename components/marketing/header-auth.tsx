"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Client-side so the landing page stays fully static (no request-time auth read). */
export function HeaderAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <Skeleton className="h-8 w-36" />;

  if (isSignedIn) {
    return (
      <Button asChild size="sm">
        <Link href="/dashboard">Open dashboard</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="ghost" size="sm">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/sign-up">Get started</Link>
      </Button>
    </div>
  );
}
