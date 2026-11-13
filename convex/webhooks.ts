import { v } from "convex/values";
import { internal } from "./_generated/api";
import { env, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { signBody } from "./lib/hmac";

/** Attempt 1 is immediate; then 10s, 1m, 5m, 15m. */
const BACKOFF_MS = [10_000, 60_000, 300_000, 900_000];
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

export const getDelivery = internalQuery({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, { deliveryId }) => await ctx.db.get("webhookDeliveries", deliveryId),
});

/** POSTs one signed event to n8n. Never throws: every outcome is recorded. */
export const deliver = internalAction({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.runQuery(internal.webhooks.getDelivery, { deliveryId });
    if (!delivery || delivery.status !== "pending") return null;

    // The delivery id doubles as the event id, so n8n's write-back is idempotent per event.
    const body = JSON.stringify({
      id: delivery._id,
      type: delivery.type,
      kind: delivery.kind,
      createdAt: new Date(delivery._creationTime).toISOString(),
      data: delivery.data,
    });

    let error: string | null = null;
    let retryable = true;
    const url = env.N8N_WEBHOOK_URL;
    if (!url) {
      error = "N8N_WEBHOOK_URL is not configured";
      retryable = false;
    } else {
      try {
        const { timestamp, signature } = await signBody(env.N8N_WEBHOOK_SECRET, body);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-lendloop-event": delivery.type,
            "x-lendloop-event-id": delivery._id,
            "x-lendloop-timestamp": timestamp,
            "x-lendloop-signature": signature,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
          error = `n8n responded ${res.status}`;
          // 4xx (except 408/429) means the request itself is wrong, so retrying won't help.
          retryable = res.status >= 500 || res.status === 408 || res.status === 429;
        }
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
    }

    await ctx.runMutation(internal.webhooks.recordAttempt, { deliveryId, error, retryable });
    return null;
  },
});

export const recordAttempt = internalMutation({
  args: {
    deliveryId: v.id("webhookDeliveries"),
    error: v.union(v.string(), v.null()),
    retryable: v.boolean(),
  },
  handler: async (ctx, { deliveryId, error, retryable }) => {
    const delivery = await ctx.db.get("webhookDeliveries", deliveryId);
    if (!delivery || delivery.status !== "pending") return;
    const attempts = delivery.attempts + 1;

    if (!error) {
      await ctx.db.patch("webhookDeliveries", deliveryId, { status: "delivered", attempts, deliveredAt: Date.now() });
      return;
    }

    if (retryable && attempts < MAX_ATTEMPTS) {
      await ctx.db.patch("webhookDeliveries", deliveryId, { attempts, lastError: error });
      await ctx.scheduler.runAfter(BACKOFF_MS[attempts - 1], internal.webhooks.deliver, { deliveryId });
      return;
    }

    // Out of retries (or not retryable): fail loudly on the loan's timeline and the admin console.
    await ctx.db.patch("webhookDeliveries", deliveryId, { status: "failed", attempts, lastError: error });
    await ctx.db.insert("automationEvents", {
      loanId: delivery.loanId,
      kind: delivery.kind,
      outcome: "failed",
      detail: `Couldn't reach n8n after ${attempts} attempt${attempts === 1 ? "" : "s"}: ${error}`,
      idempotencyKey: `${deliveryId}:delivery-failed`,
      at: Date.now(),
    });
  },
});
