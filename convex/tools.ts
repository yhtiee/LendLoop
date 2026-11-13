import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { audit } from "./lib/audit";
import { getViewer, requireOwnTool, requireUser } from "./lib/auth";
import { cleanText, isOnLoan, retireTool, toToolView } from "./lib/model";
import { vCategory, vCondition, vDay } from "./validators";

/**
 * Public, unauthenticated. Returns ONLY name + category of available tools:
 * no owner, no description, no condition. The projection happens here,
 * so nothing else ever leaves the backend for anonymous visitors.
 */
export const listPublic = query({
  args: { today: vDay },
  handler: async (ctx, { today }) => {
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(50);
    const out: Pick<Doc<"tools">, "_id" | "name" | "category">[] = [];
    for (const t of tools) {
      if (!(await isOnLoan(ctx, t._id, today))) out.push({ _id: t._id, name: t.name, category: t.category });
    }
    return out;
  },
});

/** Browse: every active listing, optionally by category (served from an index). */
export const list = query({
  args: { today: vDay, category: v.optional(vCategory) },
  handler: async (ctx, { today, category }) => {
    const user = await requireUser(ctx);
    const tools = category
      ? await ctx.db
          .query("tools")
          .withIndex("by_status_and_category", (q) => q.eq("status", "active").eq("category", category))
          .order("desc")
          .take(100)
      : await ctx.db
          .query("tools")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .order("desc")
          .take(100);
    return await Promise.all(tools.map((t) => toToolView(ctx, t, user._id, today)));
  },
});

export const mine = query({
  args: { today: vDay },
  handler: async (ctx, { today }) => {
    const user = await getViewer(ctx);
    if (!user) return [];
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_ownerId_and_status", (q) => q.eq("ownerId", user._id).eq("status", "active"))
      .order("desc")
      .take(100);
    return await Promise.all(
      tools.map(async (t) => {
        const returned = await ctx.db
          .query("loans")
          .withIndex("by_toolId_and_status", (q) => q.eq("toolId", t._id).eq("status", "returned"))
          .take(100);
        return { ...(await toToolView(ctx, t, user._id, today)), completedLoans: returned.length };
      })
    );
  },
});

const toolFields = {
  name: v.string(),
  category: vCategory,
  condition: vCondition,
  description: v.string(),
};

export const create = mutation({
  args: toolFields,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db.insert("tools", {
      ownerId: user._id,
      name: cleanText(args.name, "Name", { min: 2, max: 60 }),
      category: args.category,
      condition: args.condition,
      description: cleanText(args.description, "Description", { max: 500 }),
      status: "active",
    });
  },
});

export const update = mutation({
  args: { toolId: v.id("tools"), ...toolFields },
  handler: async (ctx, { toolId, ...args }) => {
    const user = await requireUser(ctx);
    await requireOwnTool(ctx, user, toolId);
    await ctx.db.patch("tools", toolId, {
      name: cleanText(args.name, "Name", { min: 2, max: 60 }),
      category: args.category,
      condition: args.condition,
      description: cleanText(args.description, "Description", { max: 500 }),
    });
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const user = await requireUser(ctx);
    const tool = await requireOwnTool(ctx, user, toolId);
    const declined = await retireTool(ctx, tool);
    await audit(ctx, user._id, "tools.remove", toolId, `declined ${declined} pending`);
    return { declined };
  },
});
