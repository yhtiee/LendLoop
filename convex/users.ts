import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { audit } from "./lib/audit";
import { getViewer } from "./lib/auth";
import { vRole } from "./validators";

/**
 * Called by the client once signed in. Creates the user row on first sign-in
 * (always as a plain "user") and keeps name/email in sync with Clerk.
 * The role is never taken from the client or from Clerk metadata.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You need to be signed in.");

    const name =
      identity.name ??
      ([identity.givenName, identity.familyName].filter(Boolean).join(" ") ||
        identity.nickname ||
        identity.email?.split("@")[0] ||
        "Neighbour");
    const email = identity.email ?? "";

    const existing = await getViewer(ctx);
    if (existing) {
      if (existing.name !== name || existing.email !== email) {
        await ctx.db.patch("users", existing._id, { name, email });
      }
      return existing._id;
    }
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name,
      email,
      role: "user",
      trustedLender: false,
    });
  },
});

/** The signed-in user as the UI needs them. `null` until `store` has run. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      role: user.role,
      trustedLender: user.trustedLender,
    };
  },
});

/**
 * Grant or revoke admin. Internal on purpose: only someone with deploy access can run it.
 *   npx convex run users:setRole '{"email":"you@example.com","role":"admin"}'
 */
export const setRole = internalMutation({
  args: { email: v.string(), role: vRole },
  handler: async (ctx, { email, role }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new ConvexError(`No user with email ${email}. Sign in once first.`);
    await ctx.db.patch("users", user._id, { role });
    await audit(ctx, user._id, "users.setRole", user._id, `role=${role} (via CLI)`);
    return { name: user.name, role };
  },
});
