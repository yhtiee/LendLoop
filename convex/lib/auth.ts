import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Authorization lives here, and every public function goes through it.
 * Identity is always derived from the verified JWT (tokenIdentifier),
 * never from an argument the client sends.
 */

export async function getViewer(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await getViewer(ctx);
  if (!user) throw new ConvexError("You need to be signed in.");
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== "admin") throw new ConvexError("Admins only.");
  return user;
}

/** Loads an active tool owned by the viewer, or throws. */
export async function requireOwnTool(
  ctx: QueryCtx | MutationCtx,
  user: Doc<"users">,
  toolId: Doc<"tools">["_id"]
): Promise<Doc<"tools">> {
  const tool = await ctx.db.get("tools", toolId);
  if (!tool || tool.status !== "active") throw new ConvexError("Tool not found.");
  if (tool.ownerId !== user._id) throw new ConvexError("You can only manage your own tools.");
  return tool;
}
