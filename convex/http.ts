import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { env, httpAction, type ActionCtx } from "./_generated/server";
import { todayUTC } from "./lib/dates";
import { verifySignedRequest } from "./lib/hmac";

/**
 * Endpoints n8n calls back into. Every request must carry a valid HMAC signature
 * made with N8N_CALLBACK_SECRET (see lib/hmac.ts); bodies are validated field by field.
 *   POST /n8n/overdue   → overdue loans needing a reminder today
 *   POST /n8n/events    → idempotent write-back of a notification/reminder outcome
 *   POST /n8n/failures  → error-workflow report
 */
const http = httpRouter();

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

/** Verify the signature, parse JSON, then hand the object to `handle`. */
function signedRoute(handle: (ctx: ActionCtx, body: Record<string, unknown>) => Promise<Response>) {
  return httpAction(async (ctx, req) => {
    const verified = await verifySignedRequest(req, env.N8N_CALLBACK_SECRET);
    if (!verified.ok) return json({ error: verified.error }, verified.status);
    let body: unknown;
    try {
      body = verified.body ? JSON.parse(verified.body) : {};
    } catch {
      return json({ error: "Body must be JSON" }, 400);
    }
    if (typeof body !== "object" || body === null || Array.isArray(body))
      return json({ error: "Body must be a JSON object" }, 400);
    return handle(ctx, body as Record<string, unknown>);
  });
}

const str = (v: unknown, max = 500) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);
const optStr = (v: unknown, max = 500) => (v === undefined || v === null ? undefined : str(v, max) ?? null);

http.route({
  path: "/n8n/overdue",
  method: "POST",
  handler: signedRoute(async (ctx) => {
    const today = todayUTC();
    const loans = await ctx.runQuery(internal.automation.overdueLoans, { today });
    const url = `${(env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/dashboard/requests`;
    return json({ today, count: loans.length, loans: loans.map((l) => ({ ...l, url })) });
  }),
});

const KINDS = ["request_notification", "status_notification", "overdue_reminder"] as const;
const OUTCOMES = ["sent", "failed"] as const;

http.route({
  path: "/n8n/events",
  method: "POST",
  handler: signedRoute(async (ctx, b) => {
    const idempotencyKey = str(b.idempotencyKey, 200);
    const loanId = str(b.loanId, 64);
    const kind = KINDS.find((k) => k === b.kind);
    const outcome = OUTCOMES.find((o) => o === b.outcome);
    const detail = optStr(b.detail);
    if (!idempotencyKey || !loanId || !kind || !outcome || detail === null)
      return json({ error: "Expected { idempotencyKey, loanId, kind, outcome, detail? }" }, 400);

    const result = await ctx.runMutation(internal.automation.recordEvent, {
      idempotencyKey, loanId, kind, outcome, detail,
    });
    if (result.status === "unknown_loan") return json({ error: "Unknown loan" }, 404);
    return json(result);
  }),
});

http.route({
  path: "/n8n/failures",
  method: "POST",
  handler: signedRoute(async (ctx, b) => {
    const workflow = str(b.workflow, 200);
    const message = str(b.message, 2000)?.slice(0, 500) ?? null;
    const executionId = optStr(b.executionId === undefined ? undefined : String(b.executionId), 100);
    const node = optStr(b.node, 200);
    if (!workflow || !message || executionId === null || node === null)
      return json({ error: "Expected { workflow, message, executionId?, node? }" }, 400);
    return json(await ctx.runMutation(internal.automation.recordWorkflowError, { workflow, message, executionId, node }));
  }),
});

export default http;
