// A plan limit filling up emails the billing account's owner (lib/limit-mail.ts): at 80% once per limit and month, and
// once more the first time the plan refuses for it, through the same checks the app runs (assertQuota, assertRoom,
// addMany). What the app answers does not change.
import { eq, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { assertQuota, assertRoom } from "@/lib/quota";
import { fillStage } from "@/lib/plans";
import { limitKey } from "@/lib/limit-mail";
import { addMany } from "@/lib/add-many";
import { QuotaError, newId } from "@/lib/workspace-core";
import { fmtGiftDay } from "@/lib/i18n/format";
import type { Mail } from "@/lib/mail-templates";
import { reached } from "./harness";
import { addItems, cleanupTeam, seedTeam, type Team } from "./library/seed";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached, checkedMail } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: async (to: unknown, m: Mail) => { reached.push(["mail", { to, ...checkedMail(m) }]); } };
});

// After the response: here, collected so the test can wait for it
const later = vi.hoisted(() => [] as Promise<unknown>[]);
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<object>()), after: (job: () => unknown) => { later.push(Promise.resolve().then(job)); } }));

async function settle() {
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setImmediate(r));
    await Promise.all(later.splice(0));
  }
}

const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as Mail & { to: string[] });
let team: Team;
const nextMonthDay = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); };

const useAi = (n: number) => db.insert(schema.aiUsage).values(Array.from({ length: n }, () => ({
  id: newId(), organizationId: team.ws.id, action: "polish", model: "test", createdAt: new Date(),
})));
const search = (from: number, n: number) => db.insert(schema.aiUsage).values(Array.from({ length: n }, (_, i) => ({
  id: newId(), organizationId: team.ws.id, action: "jev_search", model: "jev", ref: `query ${from + i}`, createdAt: new Date(),
})));

beforeAll(async () => {
  team = await seedTeam();
  await db.update(schema.billingAccount).set({ plan: "free" }).where(eq(schema.billingAccount.id, team.ws.billingAccountId));
  team.ws = { ...team.ws, plan: "free" };
  // An admin of the workspace who does not pay for it: never written to
  const now = new Date();
  await db.insert(schema.user).values({ id: `${team.tag}-admin`, name: "Admin", email: `${team.tag}-admin@example.test`, emailVerified: true, createdAt: now, updatedAt: now });
  await db.insert(schema.member).values({ id: `${team.tag}-m2`, organizationId: team.ws.id, userId: `${team.tag}-admin`, role: "admin", createdAt: now });
});

beforeEach(() => { reached.length = 0; });

afterAll(async () => {
  await settle();
  await db.delete(schema.appSetting).where(like(schema.appSetting.key, `limit-%:${team.ws.billingAccountId}:%`));
  await cleanupTeam(team);
});

test("near is from 80%: 79 of 100 says nothing, 80 does, and a refusal is reached", () => {
  expect(fillStage({ used: 79, max: 100, refused: false })).toBeNull();
  expect(fillStage({ used: 80, max: 100, refused: false })).toBe("near");
  expect(fillStage({ used: 3, max: 100, refused: true })).toBe("reached");
  expect(limitKey("near", "acc", "ai", new Date("2026-12-31T23:59:59Z"))).not.toBe(limitKey("near", "acc", "ai", new Date("2027-01-01T00:00:00Z")));
});

test("AI actions: the owner hears once at 80% and once when the 31st is refused, with the month's numbers", async () => {
  await useAi(23);
  await assertQuota(team.ws, "ai");
  await settle();
  expect(mails()).toEqual([]);

  await useAi(1);
  await assertQuota(team.ws, "ai");
  await assertQuota(team.ws, "ai");
  await settle();
  expect(mails()).toHaveLength(1);
  expect(mails()[0].to).toEqual([team.user.email]);
  expect(mails()[0]).toMatchObject({
    template: "limit-near-monthly", locale: "en",
    vars: { RESOURCE: "AI actions", USED: "24", LIMIT: "30", PLAN: "Free", UPGRADE: "Duo", RESETS: fmtGiftDay(nextMonthDay(), "en"), URL: expect.stringMatching(/\/settings\/plan$/) },
  });

  await useAi(6);
  const refusal = await assertQuota(team.ws, "ai").catch((e) => e);
  expect(refusal).toBeInstanceOf(QuotaError);
  expect(refusal).toMatchObject({ status: 402, upgrade: "duo", message: "You have used 30 of 30 AI actions this month on the Free plan." });
  await expect(assertQuota(team.ws, "ai")).rejects.toBeInstanceOf(QuotaError);
  await settle();
  expect(mails()).toHaveLength(2);
  expect(mails()[1].to).toEqual([team.user.email]);
  expect(mails()[1]).toMatchObject({ template: "limit-reached-monthly", vars: { RESOURCE: "AI actions", USED: "30", LIMIT: "30", PLAN: "Free", UPGRADE: "Duo" } });
});

test("searches have their own once a month, in the owner's language", async () => {
  await db.update(schema.user).set({ language: "es" }).where(eq(schema.user.id, team.user.id));
  await search(0, 24);
  await assertQuota(team.ws, "jev_search");
  await assertQuota(team.ws, "jev_search");
  await settle();
  expect(mails()).toHaveLength(1);
  expect(mails()[0]).toMatchObject({ template: "limit-near-monthly", locale: "es", vars: { RESOURCE: "búsquedas IA", USED: "24", LIMIT: "30", PLAN: "Gratis", UPGRADE: "Duo", RESETS: fmtGiftDay(nextMonthDay(), "es") } });
  await db.update(schema.user).set({ language: "en" }).where(eq(schema.user.id, team.user.id));
});

test("references: near at 10 of 12, reached when the 13th does not fit, and a later near is not sent after it", async () => {
  await addItems(team, 9);
  await assertRoom(team.ws, { items: 1 });
  await settle();
  expect(mails()).toEqual([]);

  await addItems(team, 1, { from: 9 });
  await assertRoom(team.ws, { items: 1 });
  await assertRoom(team.ws, { items: 1 });
  await settle();
  expect(mails()).toHaveLength(1);
  expect(mails()[0]).toMatchObject({ template: "limit-near", vars: { RESOURCE: "references", USED: "10", LIMIT: "12", PLAN: "Free", UPGRADE: "Duo" } });
  expect("RESETS" in mails()[0].vars).toBe(false);

  await addItems(team, 2, { from: 10 });
  await expect(assertRoom(team.ws, { items: 1 })).rejects.toBeInstanceOf(QuotaError);
  await expect(assertRoom(team.ws, { items: 1 })).rejects.toBeInstanceOf(QuotaError);
  await settle();
  expect(mails()).toHaveLength(2);
  expect(mails()[1]).toMatchObject({ template: "limit-reached", to: [team.user.email], vars: { RESOURCE: "references", USED: "12", LIMIT: "12" } });

  // Room again (one reference deleted) and its near key cleared: with the month's reached sent, near stays quiet
  await db.delete(schema.appSetting).where(eq(schema.appSetting.key, limitKey("near", team.ws.billingAccountId, "items")));
  await db.delete(schema.inspoItem).where(eq(schema.inspoItem.id, `${team.tag}-11`));
  await assertRoom(team.ws, { items: 1 });
  await settle();
  expect(mails()).toHaveLength(2);
});

test("a batch that runs out of references counts as reached once, and storage near comes in GB", async () => {
  await db.delete(schema.appSetting).where(like(schema.appSetting.key, `limit-%:${team.ws.billingAccountId}:items:%`));
  await addItems(team, 1, { from: 11 });
  const r = await addMany({ workspaceId: team.ws.id, user: team.user }, [{ url: "https://a.example.com" }, { url: "https://b.example.com" }], { source: "test" });
  expect(r.results.map((x) => x.status)).toEqual(["full", "full"]);
  await settle();
  expect(mails().map((m) => m.template)).toEqual(["limit-reached"]);

  await db.insert(schema.storedFile).values({ key: `inspo/${team.ws.id}/big`, organizationId: team.ws.id, bytes: Math.round(0.9 * 1024 ** 3) });
  await assertRoom(team.ws, { bytes: 10 });
  await settle();
  expect(mails()).toHaveLength(2);
  expect(mails()[1]).toMatchObject({ template: "limit-near", vars: { RESOURCE: "storage", USED: "0.9 GB", LIMIT: "1 GB" } });
});
