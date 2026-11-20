// The plan's lifecycle: one way to change a plan (lib/plan-change.ts), the gift an access invite gives at signup, and
// the morning's warning and end of that gift. Mail is recorded, never sent.
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { accountOf, ensurePersonalWorkspace, newId } from "@/lib/workspace-core";
import { changePlan, giftWarningKey, settleGifts } from "@/lib/plan-change";
import { createInvite } from "@/lib/access";
import { auth } from "@/lib/auth";
import { reached } from "./harness";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: async (to: string | string[], m: { subject: string; text: string }) => { reached.push(["mail", { to: [to].flat(), subject: m.subject, text: m.text }]); } };
});

const tag = `pchg${randomBytes(4).toString("hex")}`;
const DAY = 24 * 60 * 60 * 1000;
const APP = "http://app.test";
const B = schema.billingAccount;
const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as { to: string[]; subject: string; text: string });
const mailsTo = (email: string) => mails().filter((m) => m.to.includes(email));

interface Person { id: string; email: string; workspaceId: string; accountId: string }
const people: Person[] = [];

/** A person with their personal space, on `plan` with a gift ending at `until` */
async function person(who: string, plan: "free" | "duo" | "studio" | "agency" = "free", until: Date | null = null): Promise<Person> {
  const id = `${tag}-${who}`, email = `${id}@example.test`, now = new Date();
  await db.insert(schema.user).values({ id, name: `${tag} ${who}`, email, emailVerified: true, createdAt: now, updatedAt: now });
  const workspaceId = await ensurePersonalWorkspace(id, `${tag} ${who}`, email, "en", plan, until);
  const p = { id, email, workspaceId, accountId: (await accountOf(workspaceId))!.id };
  people.push(p);
  return p;
}
const account = async (p: Person) => (await db.select().from(B).where(eq(B.id, p.accountId)))[0];

beforeEach(() => { reached.length = 0; });

afterAll(async () => {
  const ids = people.map((p) => p.id);
  await db.delete(schema.organization).where(inArray(schema.organization.id, people.map((p) => p.workspaceId)));
  await db.delete(B).where(inArray(B.ownerUserId, ids));
  await db.delete(schema.accessInvite).where(inArray(schema.accessInvite.email, people.map((p) => p.email)));
  await db.delete(schema.user).where(inArray(schema.user.id, ids));
});

test("a move up sets the plan, ends any gift and tells the owner it is on", async () => {
  const p = await person("up", "duo", new Date(Date.now() + 30 * DAY));
  expect(await changePlan({ accountId: p.accountId, plan: "studio", cause: "partner", appUrl: APP })).toEqual({ from: "duo", to: "studio" });
  const a = await account(p);
  expect(a.plan).toBe("studio");
  expect(a.planUntil, "a plan a partner sets has no end").toBeNull();
  expect(mailsTo(p.email).map((m) => m.subject)).toEqual(["Your plan is on: Studio"]);
});

test("a move up with an end date says the last day in the email", async () => {
  const p = await person("up-until");
  const until = new Date(Date.UTC(2027, 2, 31, 23, 59, 59));
  await changePlan({ accountId: p.accountId, plan: "duo", cause: "partner", appUrl: APP, until });
  expect((await account(p)).planUntil?.toISOString()).toBe(until.toISOString());
  const [m] = mailsTo(p.email);
  expect(m.subject).toBe("Your plan is on: Duo");
  expect(m.text).toContain("until 31 March");
  expect(m.text).toContain("goes back to Free and nothing is deleted");
});

test("a move down tells the owner what it means, and the teams left over their seats", async () => {
  const p = await person("down", "studio");
  // Three people in a space whose new plan allows two
  const now = new Date();
  const mates = ["m1", "m2"].map((m) => ({ id: `${tag}-${m}`, name: m, email: `${tag}-${m}@example.test`, emailVerified: true, createdAt: now, updatedAt: now }));
  await db.insert(schema.user).values(mates);
  people.push(...mates.map((m) => ({ id: m.id, email: m.email, workspaceId: p.workspaceId, accountId: p.accountId })));
  await db.insert(schema.member).values(mates.map((m) => ({ id: newId(), organizationId: p.workspaceId, userId: m.id, role: "member", createdAt: now })));

  await changePlan({ accountId: p.accountId, plan: "duo", cause: "partner", appUrl: APP });
  expect((await account(p)).plan).toBe("duo");
  const told = mailsTo(p.email);
  const down = told.find((m) => m.subject === "Your plan is now Duo");
  expect(down, "the owner hears the plan is smaller").toBeTruthy();
  expect(down!.text).toContain("Nothing is deleted");
  expect(down!.text).toContain("adding more is refused");
  expect(down!.text, "Duo keeps the whole Vault").not.toContain("Vault");
  expect(down!.text).toContain(`${APP}/settings/plan`);
  expect(told.some((m) => /has 3 people and the Duo plan allows 2/.test(m.subject)), "the over-seats email goes out").toBe(true);
  expect(mails().filter((m) => m.to.some((to) => mates.some((x) => x.email === to))), "members are not told").toEqual([]);

  reached.length = 0;
  await changePlan({ accountId: p.accountId, plan: "free", cause: "partner", appUrl: APP });
  expect(mailsTo(p.email).find((m) => m.subject === "Your plan is now Free")?.text, "a move to free locks the paid Vault").toContain("The Vault pieces of the paid plans lock again.");
});

test("setting the plan an account is already on only ends its gift, with no email", async () => {
  const p = await person("same", "studio", new Date(Date.now() + 3 * DAY));
  expect(await changePlan({ accountId: p.accountId, plan: "studio", cause: "partner", appUrl: APP })).toEqual({ from: "studio", to: "studio" });
  expect((await account(p)).planUntil).toBeNull();
  expect(mails()).toEqual([]);
});

test("a gift that has not ended is not ended, whoever asks", async () => {
  const p = await person("early", "studio", new Date(Date.now() + DAY));
  expect(await changePlan({ accountId: p.accountId, plan: "free", cause: "giftEnded", appUrl: APP })).toBeNull();
  expect((await account(p)).plan).toBe("studio");
  expect(mails()).toEqual([]);
});

test("an access invite with a plan and an end date gives the new account that gift", async () => {
  const email = `${tag}-signup@example.test`;
  const until = new Date(Date.UTC(2027, 0, 15));
  await createInvite({ email, grantsPlan: "studio", grantsUntil: until });
  const ctx = await auth.$context;
  const u = await ctx.internalAdapter.createUser({ email, name: `${tag} signup`, emailVerified: true }, { method: "magic-link" });
  const [ws] = await db.select({ id: schema.organization.id }).from(schema.member)
    .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId)).where(eq(schema.member.userId, u.id));
  const p = { id: u.id, email, workspaceId: ws.id, accountId: (await accountOf(ws.id))!.id };
  people.push(p);
  const a = await account(p);
  expect([a.plan, a.planUntil?.toISOString()]).toEqual(["studio", until.toISOString()]);
});

test("the morning warns once a week ahead, and ends a gift that has passed once", async () => {
  const soon = new Date(Date.now() + 3 * DAY), later = new Date(Date.now() + 10 * DAY), past = new Date(Date.now() - DAY);
  const warned = await person("soon", "studio", soon);
  const notYet = await person("later", "studio", later);
  const ended = await person("past", "agency", past);

  await settleGifts(APP);
  const day = soon.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
  const warning = mailsTo(warned.email);
  expect(warning.map((m) => m.subject)).toEqual([`Your gift ends on ${day}`]);
  expect(warning[0].text).toContain(`${APP}/settings/plan`);
  expect(warning[0].text).toContain("Studio plan");
  expect(await account(warned)).toMatchObject({ plan: "studio", planUntil: soon });

  expect(mailsTo(notYet.email), "ten days ahead is too early").toEqual([]);
  expect((await account(notYet)).plan).toBe("studio");

  expect(await account(ended)).toMatchObject({ plan: "free", planUntil: null });
  const back = mailsTo(ended.email);
  expect(back.map((m) => m.subject)).toEqual(["Back on Free"]);
  expect(back[0].text).toContain("The Agency plan we gave");
  expect(back[0].text).toContain("The Vault pieces of the paid plans lock again.");

  reached.length = 0;
  await settleGifts(APP);
  expect(mails().filter((m) => [warned, notYet, ended].some((p) => m.to.includes(p.email))), "a second morning sends nothing").toEqual([]);
  expect((await account(ended)).plan).toBe("free");

  await db.delete(schema.appSetting).where(eq(schema.appSetting.key, giftWarningKey(warned.accountId, soon)));
});
