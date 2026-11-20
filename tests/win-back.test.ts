// "Your criterio is where you left it": two weeks away, alone or in a quiet team, with a project to name, the digest on,
// once in 60 days. Runs the morning's sendWinBacks on a date years ahead, so no other account falls in its window;
// mail is recorded, never sent.
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { createBillingAccount, ensurePersonalWorkspace, newId } from "@/lib/workspace-core";
import { sendWinBacks, winBackKey } from "@/lib/win-back";
import { reached } from "./harness";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: async (to: string | string[], m: { subject: string; text: string }) => { reached.push(["mail", { to: [to].flat()[0], subject: m.subject, text: m.text }]); } };
});

type Sent = { to: string; subject: string; text: string };
const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as Sent);

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(Date.UTC(2033, 4, 10, 4, 0));
const ago = (days: number, from = NOW) => new Date(+from - days * DAY);
const tag = `wb${randomBytes(4).toString("hex")}`;
const made: { users: string[]; orgs: string[] } = { users: [], orgs: [] };
let segments = 0;

async function seen(userId: string, organizationId: string, at: Date) {
  await db.insert(schema.activitySegment).values({ id: `${tag}-s${segments++}`, userId, organizationId, visitId: "v", area: "library", path: "/", startedAt: at, lastSeenAt: at });
}

/** Someone with an account since `since` days before NOW, last in the app `lastSeen` days before it */
async function person(name: string, o: { since?: number; lastSeen?: number; project?: boolean; digest?: boolean; language?: string }) {
  const id = `${tag}-${name}`, email = `${id}@example.test`, created = ago(o.since ?? 90);
  await db.insert(schema.user).values({ id, name, email, language: o.language ?? "en", digestEmails: o.digest ?? true, createdAt: created, updatedAt: created });
  made.users.push(id);
  const ws = await ensurePersonalWorkspace(id, name, email, o.language);
  made.orgs.push(ws);
  if (o.project !== false) {
    await db.insert(schema.project).values({ id: `${id}-old`, organizationId: ws, name: `${name} old`, createdBy: id, createdAt: created, updatedAt: created });
    await db.insert(schema.project).values({ id: `${id}-p`, organizationId: ws, name: `${name} landing`, createdBy: id, createdAt: created, updatedAt: ago(20) });
  }
  if (o.lastSeen !== undefined) await seen(id, ws, ago(o.lastSeen));
  return { id, email, ws, project: `${id}-p` };
}

let p: Record<string, Awaited<ReturnType<typeof person>>> = {};
beforeAll(async () => {
  p = {
    away: await person("away", { lastSeen: 15 }),
    spanish: await person("spanish", { lastSeen: 16, language: "es" }),
    recent: await person("recent", { lastSeen: 5 }),
    long: await person("long", { lastSeen: 40 }),
    empty: await person("empty", { lastSeen: 15, project: false }),
    off: await person("off", { lastSeen: 15, digest: false }),
    fresh: await person("fresh", { since: 3, project: false }),
    busy: await person("busy", { lastSeen: 15 }),
    mate: await person("mate", { lastSeen: 2 }),
    quiet: await person("quiet", { lastSeen: 15 }),
    quieter: await person("quieter", { lastSeen: 30 }),
  };
  // busy is in a team where mate was in two days ago; quiet's team has nobody in for weeks
  for (const [a, b] of [[p.busy, p.mate], [p.quiet, p.quieter]]) {
    const team = newId(), account = await createBillingAccount({ name: tag, ownerUserId: a.id });
    await db.insert(schema.organization).values({ id: team, name: `${tag} team`, slug: `${tag}-${team}`, createdAt: NOW, kind: "team", billingAccountId: account });
    await db.insert(schema.member).values([a, b].map((x) => ({ id: newId(), organizationId: team, userId: x.id, role: x === a ? "owner" : "member", createdAt: ago(60) })));
    made.orgs.push(team);
    await seen(b.id, team, b === p.mate ? ago(2) : ago(30));
  }
});

afterAll(async () => {
  await db.delete(schema.appSetting).where(inArray(schema.appSetting.key, made.users.map(winBackKey)));
  await db.delete(schema.organization).where(inArray(schema.organization.id, made.orgs));
  await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, made.users));
  await db.delete(schema.user).where(inArray(schema.user.id, made.users));
});

beforeEach(() => { reached.length = 0; });

test("two weeks away, alone or in a quiet team, names the latest project with its link", async () => {
  expect(await sendWinBacks(NOW)).toEqual({ due: 3, sent: 3 });
  expect(mails().map((m) => m.to).sort()).toEqual([p.away, p.spanish, p.quiet].map((x) => x.email).sort());
  const m = mails().find((x) => x.to === p.away.email)!;
  expect(m.subject).toBe("Your criterio is where you left it");
  expect(m.text).toContain(`away landing is where you left it:\nhttp`);
  expect(m.text).toContain(`/p/${p.away.project}?view=board`);
  expect(m.text).toContain(`/unsubscribe?u=${encodeURIComponent(p.away.id)}&k=digest&s=`);
  expect(m.text).toContain("Eric, Andoni and Alberto");
  expect(mails().find((x) => x.to === p.spanish.email)?.subject).toBe("Tu criterio sigue donde lo dejaste");
});

test("at most once in 60 days, even after coming back and leaving again", async () => {
  expect(await sendWinBacks(new Date(+NOW + DAY))).toEqual({ due: 3, sent: 0 });

  // Back on day 30, away again: two weeks later is 45 days after the first, too soon
  await seen(p.away.id, p.away.ws, new Date(+NOW + 30 * DAY));
  expect(await sendWinBacks(new Date(+NOW + 45 * DAY))).toEqual({ due: 1, sent: 0 });
  // Back on day 50: two weeks later is 65 days after the first
  await seen(p.away.id, p.away.ws, new Date(+NOW + 50 * DAY));
  expect(await sendWinBacks(new Date(+NOW + 65 * DAY))).toEqual({ due: 1, sent: 1 });
  expect(mails().map((m) => m.to)).toEqual([p.away.email]);
});

test("the digest switch stops it", async () => {
  await db.update(schema.user).set({ digestEmails: false }).where(eq(schema.user.id, p.quiet.id));
  await db.delete(schema.appSetting).where(eq(schema.appSetting.key, winBackKey(p.quiet.id)));
  expect(await sendWinBacks(NOW)).toEqual({ due: 1, sent: 0 });
  expect(mails()).toEqual([]);
});
