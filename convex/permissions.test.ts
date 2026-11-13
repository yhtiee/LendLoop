/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { addDays, todayUTC } from "./lib/dates";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** Three neighbours: Ada (will be admin), Ben (lender), Cy (borrower). */
async function setup() {
  const t = convexTest(schema, modules);
  const as = (name: string) =>
    t.withIdentity({ name, email: `${name.toLowerCase()}@example.com`, subject: name.toLowerCase() });
  const ada = as("Ada");
  const ben = as("Ben");
  const cy = as("Cy");
  for (const u of [ada, ben, cy]) await u.mutation(api.users.store, {});
  await t.mutation(internal.users.setRole, { email: "ada@example.com", role: "admin" });

  const drillId = await ben.mutation(api.tools.create, {
    name: "Cordless drill",
    category: "power-tools",
    condition: "good",
    description: "18V, two batteries",
  });
  return { t, ada, ben, cy, drillId };
}

const day = (n: number) => addDays(todayUTC(), n);

describe("identity & roles", () => {
  test("new users are always plain users (no self-escalation)", async () => {
    const { ben } = await setup();
    expect((await ben.query(api.users.me, {}))?.role).toBe("user");
  });

  test("signed-out callers cannot write", async () => {
    const { t } = await setup();
    await expect(
      t.mutation(api.tools.create, { name: "Saw", category: "hand-tools", condition: "good", description: "" })
    ).rejects.toThrow("signed in");
  });
});

describe("public listing", () => {
  test("exposes only name and category", async () => {
    const { t } = await setup();
    const tools = await t.query(api.tools.listPublic, { today: todayUTC() });
    expect(tools).toHaveLength(1);
    expect(Object.keys(tools[0]).sort()).toEqual(["_id", "category", "name"]);
  });
});

describe("listings are owner-only", () => {
  test("a user cannot edit or remove someone else's tool", async () => {
    const { cy, drillId } = await setup();
    await expect(
      cy.mutation(api.tools.update, {
        toolId: drillId, name: "Mine now", category: "power-tools", condition: "good", description: "",
      })
    ).rejects.toThrow("your own tools");
    await expect(cy.mutation(api.tools.remove, { toolId: drillId })).rejects.toThrow("your own tools");
  });
});

describe("borrow requests", () => {
  test("cannot borrow your own tool", async () => {
    const { ben, drillId } = await setup();
    await expect(
      ben.mutation(api.loans.request, { toolId: drillId, startDate: day(1), endDate: day(2) })
    ).rejects.toThrow("your own tool");
  });

  test("rejects past dates and loans longer than 14 days", async () => {
    const { cy, drillId } = await setup();
    await expect(
      cy.mutation(api.loans.request, { toolId: drillId, startDate: day(-5), endDate: day(-3) })
    ).rejects.toThrow("past");
    await expect(
      cy.mutation(api.loans.request, { toolId: drillId, startDate: day(1), endDate: day(20) })
    ).rejects.toThrow("at most 14 days");
  });

  test("only the lender can approve; borrower and third parties cannot", async () => {
    const { ada, ben, cy, drillId } = await setup();
    const loanId = await cy.mutation(api.loans.request, { toolId: drillId, startDate: day(1), endDate: day(3) });

    await expect(cy.mutation(api.loans.decide, { loanId, decision: "approved" })).rejects.toThrow("can't act");
    // Even an admin can't approve on someone else's behalf: admin powers are explicit, not implied.
    await expect(ada.mutation(api.loans.decide, { loanId, decision: "approved" })).rejects.toThrow("can't act");

    await ben.mutation(api.loans.decide, { loanId, decision: "approved" });
    const [loan] = await cy.query(api.loans.asBorrower, {});
    expect(loan.status).toBe("approved");
  });

  test("only the borrower can cancel, and only while pending", async () => {
    const { ben, cy, drillId } = await setup();
    const loanId = await cy.mutation(api.loans.request, { toolId: drillId, startDate: day(1), endDate: day(2) });
    await expect(ben.mutation(api.loans.cancel, { loanId })).rejects.toThrow("can't act");
    await cy.mutation(api.loans.cancel, { loanId });
    await expect(cy.mutation(api.loans.cancel, { loanId })).rejects.toThrow("Only pending");
  });

  test("overlapping approvals are blocked", async () => {
    const { ada, ben, cy, drillId } = await setup();
    const first = await cy.mutation(api.loans.request, { toolId: drillId, startDate: day(1), endDate: day(4) });
    const second = await ada.mutation(api.loans.request, { toolId: drillId, startDate: day(3), endDate: day(5) });
    await ben.mutation(api.loans.decide, { loanId: first, decision: "approved" });
    await expect(ben.mutation(api.loans.decide, { loanId: second, decision: "approved" })).rejects.toThrow("clash");
  });

  test("only the lender can mark a loan returned", async () => {
    const { ben, cy, drillId } = await setup();
    const loanId = await cy.mutation(api.loans.request, { toolId: drillId, startDate: day(0), endDate: day(1) });
    await ben.mutation(api.loans.decide, { loanId, decision: "approved" });
    await expect(cy.mutation(api.loans.markReturned, { loanId })).rejects.toThrow("can't act");
    await ben.mutation(api.loans.markReturned, { loanId });
  });
});

describe("admin", () => {
  test("non-admins are rejected by every admin function", async () => {
    const { ben, cy, drillId } = await setup();
    const benMe = await ben.query(api.users.me, {});
    await expect(cy.query(api.admin.members, {})).rejects.toThrow("Admins only");
    await expect(cy.query(api.admin.loans, {})).rejects.toThrow("Admins only");
    await expect(cy.mutation(api.admin.removeListing, { toolId: drillId })).rejects.toThrow("Admins only");
    await expect(
      cy.mutation(api.admin.setTrustedLender, { userId: benMe!._id, trusted: true })
    ).rejects.toThrow("Admins only");
  });

  test("admin can remove any listing; pending requests are declined and the action is audited", async () => {
    const { t, ada, cy, drillId } = await setup();
    await cy.mutation(api.loans.request, { toolId: drillId, startDate: day(1), endDate: day(2) });

    const { declined } = await ada.mutation(api.admin.removeListing, { toolId: drillId });
    expect(declined).toBe(1);
    expect(await t.query(api.tools.listPublic, { today: todayUTC() })).toHaveLength(0);
    const [loan] = await cy.query(api.loans.asBorrower, {});
    expect(loan.status).toBe("declined");

    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(audit.map((a) => a.action)).toContain("admin.removeListing");
  });

  test("admin can mark a Trusted Lender, and it shows on their listings", async () => {
    const { ada, ben, cy } = await setup();
    const benMe = await ben.query(api.users.me, {});
    await ada.mutation(api.admin.setTrustedLender, { userId: benMe!._id, trusted: true });
    const [tool] = await cy.query(api.tools.list, { today: todayUTC() });
    expect(tool.owner.trustedLender).toBe(true);
  });
});
