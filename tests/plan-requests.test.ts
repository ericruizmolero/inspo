// The way up from a limit: the account's owner asks for a plan from Settings, Plan, and a partner sets it or declines
// it from /admin/plans. Runs the actions as the people who click them; mail is recorded, never sent.
import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { accountOf, ensurePersonalWorkspace, newId } from "@/lib/workspace-core";
import { requestPlan } from "@/app/actions/billing";
import { declinePlanRequest, setRequestedPlan } from "@/app/actions/plans-admin";
import { listOpenPlanRequests } from "@/lib/plan-requests";
import { actAs, reached, type Actor } from "./harness";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: async (to: string | string[], m: { subject: string }) => { reached.push(["mail", { to: [to].flat(), subject: m.subject }]); } };
});

const tag = `preq${randomBytes(4).toString("hex")}`;
const person = (who: string): Actor => ({ id: `${tag}-${who}`, name: `${tag} ${who}`, email: `${tag}-${who}@example.test`, workspaceId: "" });
const owner = person("owner"), teammate = person("mate"), partner = person("partner");
const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as { to: string[]; subject: string });
let accountId = "";

const openRows = () => db.select().from(schema.planRequest).where(and(eq(schema.planRequest.billingAccountId, accountId), eq(schema.planRequest.status, "open")));

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values([owner, teammate, partner].map((a) => ({ id: a.id, name: a.name, email: a.email, emailVerified: true, createdAt: now, updatedAt: now })));
  owner.workspaceId = await ensurePersonalWorkspace(owner.id, owner.name, owner.email, "en");
  // The teammate manages the owner's workspace but does not pay for it
  await db.insert(schema.member).values({ id: newId(), organizationId: owner.workspaceId, userId: teammate.id, role: "admin", createdAt: now });
  teammate.workspaceId = owner.workspaceId;
  partner.workspaceId = await ensurePersonalWorkspace(partner.id, partner.name, partner.email, "en");
  await db.insert(schema.appAdmin).values({ email: partner.email, createdAt: now });
  accountId = (await accountOf(owner.workspaceId))!.id;
});

beforeEach(() => { reached.length = 0; });

afterAll(async () => {
  actAs(null);
  const ids = [owner.id, teammate.id, partner.id];
  await db.delete(schema.organization).where(inArray(schema.organization.id, [owner.workspaceId, partner.workspaceId]));
  await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, ids));
  await db.delete(schema.appAdmin).where(eq(schema.appAdmin.email, partner.email));
  await db.delete(schema.user).where(inArray(schema.user.id, ids));
});

test("only the account's owner can ask for a plan, and nothing is written for anyone else", async () => {
  actAs(teammate);
  const r = await requestPlan("duo", "month");
  expect(r.ok, "an admin who does not pay is refused").toBe(false);
  expect(await openRows()).toEqual([]);
  expect(mails(), "no email goes out").toEqual([]);
});

test("a plan not above the account's, or an unknown period, is refused", async () => {
  actAs(owner);
  expect((await requestPlan("free", "month")).ok, "the plan it is already on").toBe(false);
  expect((await requestPlan("duo", "weekly")).ok, "a period that does not exist").toBe(false);
  expect((await requestPlan("platinum", "month")).ok, "a plan that does not exist").toBe(false);
  expect(await openRows()).toEqual([]);
});

test("the owner's request emails the partners and the owner, and asking again replaces it", async () => {
  actAs(owner);
  const first = await requestPlan("duo", "month");
  expect(first).toMatchObject({ ok: true, data: { plan: "duo", period: "month" } });
  const sent = mails();
  expect(sent.find((m) => m.to.includes(partner.email))?.subject, "the partners hear of it").toMatch(/^New plan request: .* asks for Duo, monthly$/);
  expect(sent.find((m) => m.to.includes(owner.email))?.subject, "the owner is told it arrived").toBe("We got your request");

  const again = await requestPlan("studio", "year");
  expect(again).toMatchObject({ ok: true, data: { plan: "studio", period: "year" } });
  const open = await openRows();
  expect(open.map((r) => [r.plan, r.period, r.requestedBy]), "one open request per account, the latest").toEqual([["studio", "year", owner.id]]);
});

test("/admin/plans lists the request; only a partner sets it, which switches the plan on and emails the owner", async () => {
  const [row] = (await listOpenPlanRequests()).filter((r) => r.ownerEmail === owner.email);
  expect(row).toMatchObject({ accountName: owner.name, now: "free", plan: "studio", period: "year", workspaces: [owner.name] });

  actAs(owner);
  expect((await setRequestedPlan(row.id)).ok, "the owner cannot set their own plan").toBe(false);
  expect((await accountOf(owner.workspaceId))!.plan).toBe("free");

  actAs(partner);
  const r = await setRequestedPlan(row.id);
  expect(r).toMatchObject({ ok: true, data: { plan: "studio" } });
  expect((await accountOf(owner.workspaceId))!.plan, "the account is on the plan asked for").toBe("studio");
  const [done] = await db.select().from(schema.planRequest).where(eq(schema.planRequest.id, row.id));
  expect(done.status).toBe("done");
  expect(done.decidedBy).toBe(partner.id);
  expect(done.decidedAt).toBeInstanceOf(Date);
  expect(mails().filter((m) => m.to.includes(owner.email)).map((m) => m.subject), "the owner is told it is on").toEqual(["Your plan is on: Studio"]);

  expect((await setRequestedPlan(row.id)).ok, "a second click finds nothing open").toBe(false);
});

test("declining closes the request and leaves the plan as it was, with no email", async () => {
  actAs(owner);
  expect((await requestPlan("agency", "month")).ok).toBe(true);
  reached.length = 0;
  const [open] = await openRows();

  actAs(partner);
  expect((await declinePlanRequest(open.id)).ok).toBe(true);
  expect((await accountOf(owner.workspaceId))!.plan).toBe("studio");
  expect(await openRows()).toEqual([]);
  const [closed] = await db.select().from(schema.planRequest).where(eq(schema.planRequest.id, open.id));
  expect(closed.status).toBe("declined");
  expect(mails()).toEqual([]);
});
