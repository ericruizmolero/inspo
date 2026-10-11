// The floor under AI spend (#33): past the day's alert the team gets one email, at the cap every model call stops,
// and an account past its fair-use searches is told once a month and never cut off.
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { newId } from "@/lib/workspace-core";
import { totalCostSince } from "@/lib/usage";
import { assertSpendRoom, SpendCapError } from "@/lib/spend";
import { assertQuota } from "@/lib/quota";
import { fixedAdmins } from "@/lib/activity";
import { reached } from "./harness";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: async (to: unknown, m: { subject: string }) => { reached.push(["mail", { to, subject: m.subject }]); } };
});

const midnight = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; };
const day = midnight().toISOString().slice(0, 10);
const spendKeys = [`spend_alert:${day}`, `spend_cap:${day}`];
const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as { to: string[]; subject: string });
let team: Team;

const spend = (usd: number) => db.insert(schema.aiUsage).values({
  id: newId(), organizationId: team.ws.id, action: "design_md", model: "test", costMicros: Math.round(usd * 1e6), createdAt: new Date(),
});

beforeAll(async () => {
  team = await seedTeam();
  await db.delete(schema.appSetting).where(inArray(schema.appSetting.key, spendKeys));
});

afterAll(async () => {
  delete process.env.AI_DAILY_ALERT_USD;
  delete process.env.AI_DAILY_CAP_USD;
  await db.delete(schema.appSetting).where(inArray(schema.appSetting.key, spendKeys));
  await db.delete(schema.appSetting).where(like(schema.appSetting.key, `fair_use:${team.ws.billingAccountId}:%`));
  await cleanupTeam(team);
});

test("the team hears once past the alert, and every model call stops at the cap", async () => {
  const before = await totalCostSince(midnight());
  process.env.AI_DAILY_ALERT_USD = String(before + 1);
  process.env.AI_DAILY_CAP_USD = String(before + 3);
  reached.length = 0;

  await assertSpendRoom();
  expect(mails()).toEqual([]);

  await spend(2);
  await assertSpendRoom();
  await assertSpendRoom();
  expect(mails()).toHaveLength(1);
  expect(mails()[0].to).toEqual(fixedAdmins());
  expect(mails()[0].subject).toMatch(/past the \$\d+\.\d\d alert/);

  await spend(2);
  await expect(assertSpendRoom()).rejects.toBeInstanceOf(SpendCapError);
  await expect(assertSpendRoom()).rejects.toBeInstanceOf(SpendCapError);
  expect(mails()).toHaveLength(2);
  expect(mails()[1].subject).toMatch(/^AI is off until 00:00 UTC/);
});

test("past the fair-use ceiling the search goes through, and the team and the owner hear once a month", async () => {
  await db.update(schema.billingAccount).set({ plan: "personal" }).where(eq(schema.billingAccount.id, team.ws.billingAccountId));
  const ws = { ...team.ws, plan: "personal" as const };
  const ceiling = 3000;
  const rows = Array.from({ length: ceiling }, (_, i) => ({ id: newId(), organizationId: ws.id, action: "jev_search", model: "jev", ref: `query ${i}`, createdAt: new Date() }));
  await db.insert(schema.aiUsage).values(rows.slice(0, ceiling - 1));
  reached.length = 0;

  await assertQuota(ws, "jev_search");
  expect(mails()).toEqual([]);

  await db.insert(schema.aiUsage).values(rows.slice(ceiling - 1));
  await assertQuota(ws, "jev_search");
  await assertQuota(ws, "jev_search");
  expect(mails().map((m) => m.to)).toEqual([fixedAdmins(), [team.user.email]]);
  expect(mails()[1].subject).toBe(`${team.ws.name} has passed 3,000 searches this month`);
});
