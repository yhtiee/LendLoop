"use client";

import { createContext, use, useEffect, useRef } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Role } from "@/lib/domain";

export type Viewer = {
  /** False until we know who the viewer is (or that they're signed out). */
  isLoaded: boolean;
  id: Id<"users"> | null;
  name: string | null;
  role: Role;
  isAdmin: boolean;
};

const ViewerContext = createContext<Viewer | null>(null);

/**
 * Ensures the signed-in Clerk user has a Convex `users` row (via users.store),
 * then exposes it. The role comes from Convex; UI role checks only decide
 * what to *show*. Every permission is enforced again inside Convex functions.
 */
export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.store);
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const stored = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      stored.current = false;
      return;
    }
    if (stored.current) return;
    stored.current = true;
    store().catch((err) => {
      stored.current = false;
      console.error("Could not set up your account", err);
    });
  }, [isAuthenticated, store]);

  const viewer: Viewer =
    isAuthenticated && me
      ? { isLoaded: true, id: me._id, name: me.name, role: me.role, isAdmin: me.role === "admin" }
      : {
          isLoaded: !isLoading && !isAuthenticated,
          id: null,
          name: null,
          role: "user",
          isAdmin: false,
        };

  return <ViewerContext value={viewer}>{children}</ViewerContext>;
}

export function useViewer(): Viewer {
  const viewer = use(ViewerContext);
  if (!viewer) throw new Error("useViewer must be used inside <ViewerProvider>");
  return viewer;
}
