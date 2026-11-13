import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function audit(
  ctx: MutationCtx,
  actorId: Id<"users">,
  action: string,
  targetId: string,
  detail?: string
) {
  await ctx.db.insert("auditLog", { actorId, action, targetId, detail });
}
