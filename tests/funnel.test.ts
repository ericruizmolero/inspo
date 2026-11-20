// The activation funnel: the counting on fixed data, the steps read from the tables, and the partners' Monday email,
// once a week. The people sign up in March 2032, so nobody else falls in their weeks; mail is recorded, never sent.
import { randomBytes } from "node:crypto";
import { inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { ensurePersonalWorkspace, newId } from "@/lib/workspace-core";
import { fixedAdmins } from "@/lib/activity";
import { conversion, funnelOf, weekStart, type FunnelPerson } from "@/lib/funnel-core";
import { funnelMailKey, funnelPeople, sendWeeklyFunnel } from "@/lib/funnel";
import { reached } from "./harness";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: async (to: string | string[], m: { subject: string; text: string }) => { reached.push(["mail", { to: [to].flat(), subject: m.subject, text: m.text }]); } };
});

const at = (iso: string) => new Date(iso);
const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as { to: string[]; subject: string; text: string });

beforeEach(() => { reached.length = 0; });

test("a week starts on Monday at 00:00 UTC", () => {
  expect(weekStart(at("2032-03-15T00:00:00Z"))).toEqual(at("2032-03-15T00:00:00Z"));
  expect(weekStart(at("2032-03-21T23:59:59Z")), "Sunday night is still that week").toEqual(at("2032-03-15T00:00:00Z"));
  expect(weekStart(at("2032-03-22T00:00:00Z"))).toEqual(at("2032-03-22T00:00:00Z"));
});

test("each week's cohort counts who reached each step, and the empty weeks show", () => {
  const p = (iso: string, steps: Partial<FunnelPerson> = {}): FunnelPerson => ({ signedUpAt: at(iso), firstRef: false, out: false, requested: false, paid: false, ...steps });
  const people = [
    p("2032-03-01T09:00:00Z", { firstRef: true, out: true, requested: true, paid: true }),
    p("2032-03-02T09:00:00Z", { firstRef: true, out: true }),
    p("2032-03-07T23:00:00Z", { firstRef: true }),
    p("2032-03-03T09:00:00Z"),
    // Paid without a reference: a step counts whoever reached it
    p("2032-03-16T09:00:00Z", { paid: true }),
    p("2032-02-20T09:00:00Z", { firstRef: true }),
  ];
  const f = funnelOf(people, at("2032-03-02T00:00:00Z"), at("2032-03-17T00:00:00Z"));
  expect(f.weeks.map((w) => w.week), "newest first, from the week `since` falls in").toEqual(["2032-03-15", "2032-03-08", "2032-03-01"]);
  expect(f.weeks[2].counts).toEqual({ signedUp: 4, firstRef: 3, out: 2, requested: 1, paid: 1 });
  expect(f.weeks[1].counts, "nobody signed up that week").toEqual({ signedUp: 0, firstRef: 0, out: 0, requested: 0, paid: 0 });
  expect(f.weeks[0].counts).toEqual({ signedUp: 1, firstRef: 0, out: 0, requested: 0, paid: 1 });
  expect(f.total, "the February sign-up is outside the weeks").toEqual({ signedUp: 5, firstRef: 3, out: 2, requested: 1, paid: 2 });

  expect(conversion(f.total, "signedUp")).toBeNull();
  expect(conversion(f.total, "firstRef")).toBeCloseTo(3 / 5);
  expect(conversion(f.total, "requested")).toBeCloseTo(1 / 2);
  expect(conversion(f.weeks[0].counts, "out"), "nobody reached the step before").toBeNull();
});

const tag = `fnl${randomBytes(4).toString("hex")}`;
const made: { users: string[]; orgs: string[] } = { users: [], orgs: [] };

/** Someone who signed up at `iso`, with the steps asked for */
async function person(name: string, iso: string, o: { ref?: boolean; exported?: boolean; requested?: boolean; plan?: "duo"; gift?: boolean } = {}) {
  const id = `${tag}-${name}`, email = `${id}@example.test`, when = at(iso);
  await db.insert(schema.user).values({ id, name, email, emailVerified: true, createdAt: when, updatedAt: when });
  made.users.push(id);
  const ws = await ensurePersonalWorkspace(id, name, email, "en", o.plan ?? "free", o.gift ? at("2033-01-01T00:00:00Z") : null);
  made.orgs.push(ws);
  if (o.ref) {
    await db.insert(schema.inspoItem).values({ id: `${id}-r`, organizationId: ws, name: "ref", web: `https://${id}.example.com`, webKey: `${id}.example.com`, date: "2032-03-01", author: name, createdBy: id, tagStatus: "done", createdAt: when, updatedAt: when });
  }
  if (o.exported) {
    await db.insert(schema.project).values({ id: `${id}-p`, organizationId: ws, name: "p", createdBy: id, createdAt: when, updatedAt: when });
    await db.insert(schema.projectSystem).values({ projectId: `${id}-p`, organizationId: ws, exportedAt: when, createdAt: when, updatedAt: when });
  }
  if (o.requested) {
    const [{ billingAccountId }] = await db.select({ billingAccountId: schema.organization.billingAccountId }).from(schema.organization).where(inArray(schema.organization.id, [ws]));
    await db.insert(schema.planRequest).values({ id: newId(), billingAccountId, requestedBy: id, plan: "studio", period: "month", createdAt: when });
  }
  return id;
}

beforeAll(async () => {
  // The week of 1 March: four people, walked to different depths
  await person("all", "2032-03-01T10:00:00Z", { ref: true, exported: true, requested: true, plan: "duo" });
  await person("out", "2032-03-02T10:00:00Z", { ref: true, exported: true });
  await person("ref", "2032-03-03T10:00:00Z", { ref: true });
  await person("gift", "2032-03-04T10:00:00Z", { plan: "duo", gift: true });
  // The week of 8 March: two
  await person("asked", "2032-03-09T10:00:00Z", { ref: true, requested: true });
  await person("none", "2032-03-14T23:00:00Z");
});

afterAll(async () => {
  await db.delete(schema.appSetting).where(like(schema.appSetting.key, "funnel-week:2032-%"));
  if (made.orgs.length) await db.delete(schema.organization).where(inArray(schema.organization.id, made.orgs));
  if (made.users.length) {
    await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, made.users));
    await db.delete(schema.user).where(inArray(schema.user.id, made.users));
  }
});

test("the steps are read from what each person did; a gifted plan is not paying", async () => {
  const people = await funnelPeople(at("2032-03-01T00:00:00Z"), at("2032-03-15T00:00:00Z"));
  const f = funnelOf(people, at("2032-03-01T00:00:00Z"), at("2032-03-14T23:59:59Z"));
  expect(f.weeks).toEqual([
    { week: "2032-03-08", counts: { signedUp: 2, firstRef: 1, out: 0, requested: 1, paid: 0 } },
    { week: "2032-03-01", counts: { signedUp: 4, firstRef: 3, out: 2, requested: 1, paid: 1 } },
  ]);
});

test("Monday's email goes to the partners once a week, last week against the one before", async () => {
  const monday = at("2032-03-15T06:30:00Z");
  expect(await sendWeeklyFunnel("http://app.test", monday)).toBe(true);
  const [mail] = mails();
  expect(mail.to).toEqual(fixedAdmins());
  expect(mail.subject).toBe("Funnel, week of 8 Mar: 2 sign-ups (4 the week before)");
  expect(mail.text).toContain("First reference saved: 1, 50% of the step before (week before: 3, 75% of the step before)");
  expect(mail.text).toContain("On a paid plan now: 0, 0% of the step before (week before: 1, 100% of the step before)");
  expect(mail.text).toContain("http://app.test/admin/funnel");

  reached.length = 0;
  expect(await sendWeeklyFunnel("http://app.test", at("2032-03-17T06:30:00Z")), "the rest of the week sends nothing").toBe(false);
  expect(mails()).toEqual([]);

  expect(await sendWeeklyFunnel("http://app.test", at("2032-03-22T06:30:00Z")), "the next Monday sends the next week").toBe(true);
  expect(mails().map((m) => m.subject)).toEqual(["Funnel, week of 15 Mar: 0 sign-ups (2 the week before)"]);
  expect((await db.select().from(schema.appSetting).where(like(schema.appSetting.key, "funnel-week:2032-%"))).map((r) => r.key).sort())
    .toEqual([funnelMailKey("2032-03-08"), funnelMailKey("2032-03-15")]);
});
