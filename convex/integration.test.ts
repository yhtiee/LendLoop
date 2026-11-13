/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { addDays, todayUTC } from "./lib/dates";
import { signBody, verifySignedRequest } from "./lib/hmac";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const CALLBACK_SECRET = "test-callback-secret";

beforeEach(() => {
  vi.stubEnv("N8N_WEBHOOK_SECRET", "test-webhook-secret");
  vi.stubEnv("N8N_CALLBACK_SECRET", CALLBACK_SECRET);
  vi.stubEnv("APP_URL", "https://lendloop.test");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function setup() {
  const t = convexTest(schema, modules);
  const as = (name: string) =>
    t.withIdentity({ name: `${name} Example`, email: `${name.toLowerCase()}@example.com`, subject: name });
  const ben = as("Ben");
  const cy = as("Cy");
  await ben.mutation(api.users.store, {});
  await cy.mutation(api.users.store, {});
  const toolId = await ben.mutation(api.tools.create, {
    name: "Ladder", category: "ladders", condition: "good", description: "",
  });
  return { t, ben, cy, toolId };
}

async function signedFetch(t: ReturnType<typeof convexTest>, path: string, body: unknown, secret = CALLBACK_SECRET) {
  const raw = JSON.stringify(body);
  const { timestamp, signature } = await signBody(secret, raw);
  return t.fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-lendloop-timestamp": timestamp, "x-lendloop-signature": signature },
    body: raw,
  });
}

describe("HMAC", () => {
  test("accepts a valid signature and rejects tampering, wrong keys and stale timestamps", async () => {
    const body = JSON.stringify({ hello: "world" });
    const { timestamp, signature } = await signBody("k", body);
    const req = (b: string, sig = signature, ts = timestamp) =>
      new Request("https://x", { method: "POST", body: b, headers: { "x-lendloop-timestamp": ts, "x-lendloop-signature": sig } });

    expect((await verifySignedRequest(req(body), "k")).ok).toBe(true);
    expect((await verifySignedRequest(req(body + " "), "k")).ok).toBe(false);
    expect((await verifySignedRequest(req(body), "other-key")).ok).toBe(false);
    const old = await signBody("k", body, Date.now() - 10 * 60_000);
    expect((await verifySignedRequest(req(body, old.signature, old.timestamp), "k")).ok).toBe(false);
  });
});

describe("outbox", () => {
  test("a borrow request queues one minimal webhook for the lender", async () => {
    const { t, cy, toolId } = await setup();
    await cy.mutation(api.loans.request, {
      toolId, startDate: addDays(todayUTC(), 1), endDate: addDays(todayUTC(), 2), note: "private note",
    });
    const [delivery] = await t.run((ctx) => ctx.db.query("webhookDeliveries").collect());
    expect(delivery.type).toBe("loan.requested");
    expect(delivery.status).toBe("pending");
    expect(delivery.data.recipient).toEqual({ firstName: "Ben", email: "ben@example.com" });
    expect(delivery.data.counterpartFirstName).toBe("Cy");
    expect(delivery.data.url).toBe("https://lendloop.test/dashboard/incoming");
    // Data minimisation: no note, no borrower email, no user ids.
    expect(JSON.stringify(delivery.data)).not.toContain("private note");
    expect(JSON.stringify(delivery.data)).not.toContain("cy@example.com");
  });

  test("approval notifies the borrower", async () => {
    const { t, ben, cy, toolId } = await setup();
    const loanId = await cy.mutation(api.loans.request, {
      toolId, startDate: addDays(todayUTC(), 1), endDate: addDays(todayUTC(), 2),
    });
    await ben.mutation(api.loans.decide, { loanId, decision: "approved" });
    const deliveries = await t.run((ctx) => ctx.db.query("webhookDeliveries").collect());
    expect(deliveries.map((d) => d.type)).toEqual(["loan.requested", "loan.approved"]);
    expect(deliveries[1].data.recipient.email).toBe("cy@example.com");
  });

  test("a permanent delivery failure is recorded on the loan, not dropped", async () => {
    const { t, cy, toolId } = await setup();
    const loanId = await cy.mutation(api.loans.request, {
      toolId, startDate: addDays(todayUTC(), 1), endDate: addDays(todayUTC(), 2),
    });
    const [delivery] = await t.run((ctx) => ctx.db.query("webhookDeliveries").collect());
    await t.mutation(internal.webhooks.recordAttempt, { deliveryId: delivery._id, error: "n8n responded 401", retryable: false });
    const [loan] = await cy.query(api.loans.asBorrower, {});
    expect(loan._id).toBe(loanId);
    expect(loan.events[0]).toMatchObject({ outcome: "failed", kind: "request_notification" });
  });
});

describe("n8n endpoints", () => {
  test("rejects unsigned and wrongly signed calls", async () => {
    const { t } = await setup();
    const unsigned = await t.fetch("/n8n/overdue", { method: "POST", body: "{}" });
    expect(unsigned.status).toBe(401);
    expect((await signedFetch(t, "/n8n/overdue", {}, "wrong-secret")).status).toBe(401);
  });

  test("write-backs are idempotent and a later success upgrades a failure", async () => {
    const { t, cy, toolId } = await setup();
    const loanId = await cy.mutation(api.loans.request, {
      toolId, startDate: addDays(todayUTC(), 1), endDate: addDays(todayUTC(), 2),
    });
    const payload = { idempotencyKey: "evt-1", loanId, kind: "request_notification", outcome: "failed", detail: "SMTP down" };
    expect(await (await signedFetch(t, "/n8n/events", payload)).json()).toEqual({ status: "recorded" });
    expect(await (await signedFetch(t, "/n8n/events", payload)).json()).toEqual({ status: "duplicate" });
    expect(await (await signedFetch(t, "/n8n/events", { ...payload, outcome: "sent", detail: undefined })).json())
      .toEqual({ status: "updated" });

    const events = await t.run((ctx) => ctx.db.query("automationEvents").collect());
    const writeBacks = events.filter((e) => e.idempotencyKey === "evt-1");
    expect(writeBacks).toHaveLength(1);
    expect(writeBacks[0].outcome).toBe("sent");
    // The test env has no N8N_WEBHOOK_URL, so the scheduled delivery fails loudly too: never silently.
    expect(events.some((e) => e.detail?.includes("N8N_WEBHOOK_URL is not configured"))).toBe(true);
  });

  test("overdue list skips loans already reminded today", async () => {
    const { t, cy, toolId } = await setup();
    // Insert an approved loan that ended two days ago directly (requests can't be backdated).
    const loanId = await t.run(async (ctx) => {
      const tool = (await ctx.db.get("tools", toolId))!;
      const borrower = (await ctx.db.query("users").collect()).find((u) => u.email === "cy@example.com")!;
      return ctx.db.insert("loans", {
        toolId, lenderId: tool.ownerId, borrowerId: borrower._id,
        startDate: addDays(todayUTC(), -5), endDate: addDays(todayUTC(), -2), status: "approved",
      });
    });

    const first = await (await signedFetch(t, "/n8n/overdue", {})).json();
    expect(first.loans).toHaveLength(1);
    expect(first.loans[0]).toMatchObject({ loanId, daysOverdue: 2, borrower: { firstName: "Cy", email: "cy@example.com" } });

    await signedFetch(t, "/n8n/events", {
      idempotencyKey: first.loans[0].idempotencyKey, loanId, kind: "overdue_reminder", outcome: "sent",
    });
    const second = await (await signedFetch(t, "/n8n/overdue", {})).json();
    expect(second.loans).toHaveLength(0);
    void cy;
  });
});
