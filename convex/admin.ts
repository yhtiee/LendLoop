import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { audit } from "./lib/audit";
import { requireAdmin } from "./lib/auth";
import { retireTool, toLoanView, toToolView } from "./lib/model";
import { vDay } from "./validators";

/** Every function here starts with requireAdmin(): the UI gate is not the security boundary. */

export const listings = query({
  args: { today: vDay },
  handler: async (ctx, { today }) => {
    const admin = await requireAdmin(ctx);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(200);
    return await Promise.all(tools.map((t) => toToolView(ctx, t, admin._id, today)));
  },
});

export const removeListing = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const admin = await requireAdmin(ctx);
    const tool = await ctx.db.get("tools", toolId);
    if (!tool || tool.status !== "active") throw new ConvexError("Listing not found.");
    const declined = await retireTool(ctx, tool);
    await audit(ctx, admin._id, "admin.removeListing", toolId, `${tool.name}; declined ${declined} pending`);
    return { declined };
  },
});

export const loans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const loans = await ctx.db.query("loans").order("desc").take(200);
    return await Promise.all(loans.map((l) => toLoanView(ctx, l)));
  },
});

export const members = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(200);
    return await Promise.all(
      users.map(async (u) => {
        const listings = await ctx.db
          .query("tools")
          .withIndex("by_ownerId_and_status", (q) => q.eq("ownerId", u._id).eq("status", "active"))
          .take(100);
        return {
          _id: u._id,
          _creationTime: u._creationTime,
          name: u.name,
          email: u.email,
          role: u.role,
          trustedLender: u.trustedLender,
          listingCount: listings.length,
        };
      })
    );
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    const admin = await requireAdmin(ctx);
    const user = await ctx.db.get("users", userId);
    if (!user) throw new ConvexError("Member not found.");
    await ctx.db.patch("users", userId, { trustedLender: trusted });
    await audit(ctx, admin._id, "admin.setTrustedLender", userId, `trusted=${trusted}`);
  },
});

export const automationEvents = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("automationEvents").order("desc").take(100);
    return await Promise.all(
      events.map(async (e) => {
        const loan = await ctx.db.get("loans", e.loanId);
        const tool = loan ? await ctx.db.get("tools", loan.toolId) : null;
        return {
          _id: e._id,
          loanId: e.loanId,
          kind: e.kind,
          outcome: e.outcome,
          detail: e.detail ?? null,
          at: e.at,
          toolName: tool?.name ?? "Removed tool",
        };
      })
    );
  },
});
