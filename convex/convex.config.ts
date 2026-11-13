import { defineApp } from "convex/server";
import { v } from "convex/values";

/**
 * Typed environment for the n8n integration. Set with `npx convex env set NAME value`.
 * Two secrets, one per direction, so a leak on one side can't forge the other.
 */
const app = defineApp({
  env: {
    /** HMAC key Convex uses to sign outbound webhooks to n8n. */
    N8N_WEBHOOK_SECRET: v.string(),
    /** HMAC key n8n uses to sign calls back into Convex (/n8n/*). */
    N8N_CALLBACK_SECRET: v.string(),
    /** n8n "LendLoop webhook" production URL. Unset = deliveries fail loudly, never silently. */
    N8N_WEBHOOK_URL: v.optional(v.string()),
    /** Where email links point. */
    APP_URL: v.optional(v.string()),
  },
});

export default app;
