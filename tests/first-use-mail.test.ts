// The nudges of the first days: on day 3 and day 7, the first step not done, with its link, once each. Runs the
// morning's sendNudges on a date years ahead, so no other account falls in its windows; mail is recorded, never sent.
import { randomBytes } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { db, pool, schema } from "@/lib/db";
import { ensurePersonalWorkspace } from "@/lib/workspace-core";
import { REFS_GOAL } from "@/lib/first-steps-core";
import { nudgeKey, nudgeWindow, sendNudges, welcomeKey, sendWelcome } from "@/lib/first-use-mail";
import { reached } from "./harness";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: async (to: string | string[], m: { subject: string; text: string }) => { reached.push(["mail", { to: [to].flat()[0], subject: m.subject, text: m.text }]); } };
});

type Sent = { to: string; subject: string; text: string };
const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as Sent);
const mailTo = (email: string) => mails().find((m) => m.to === email);

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(Date.UTC(2032, 2, 10, 4, 0));
const tag = `nudge${randomBytes(4).toString("hex")}`;
const made: { users: string[]; orgs: string[] } = { users: [], orgs: [] };

/** Someone who signed up `daysAgo` before NOW, with as much of the path walked as asked */
async function person(name: string, o: { daysAgo: number; language?: string; digest?: boolean; project?: boolean; refs?: number; polished?: boolean; exported?: boolean; hidden?: boolean }) {
  const id = `${tag}-${name}`, email = `${id}@example.test`, at = new Date(+NOW - o.daysAgo * DAY);
  await db.insert(schema.user).values({ id, name, email, language: o.language ?? "en", digestEmails: o.digest ?? true, firstStepsDoneAt: o.hidden ? at : null, createdAt: at, updatedAt: at });
  made.users.push(id);
  const ws = await ensurePersonalWorkspace(id, name, email, o.language);
  made.orgs.push(ws);
  const project = `${id}-p`;
  if (o.project !== false) await db.insert(schema.project).values({ id: project, organizationId: ws, name: `${name}'s project`, createdBy: id, createdAt: at, updatedAt: at });
  const items = Array.from({ length: o.refs ?? 0 }, (_, i) => ({ id: `${id}-r${i}`, organizationId: ws, name: `ref ${i}`, web: `https://${id}-${i}.example.com`, webKey: `${id}-${i}.example.com`, date: "2032-03-01", author: name, createdBy: id, tagStatus: "done", createdAt: at, updatedAt: at }));
  if (items.length) {
    await db.insert(schema.inspoItem).values(items);
    await db.insert(schema.projectItem).values(items.map((i) => ({ projectId: project, itemId: i.id, organizationId: ws, createdAt: at })));
  }
  if (o.polished) await db.insert(schema.polishVote).values({ projectId: project, itemId: items[0].id, userId: id, organizationId: ws, vote: "keep", updatedAt: at });
  if (o.exported) await db.insert(schema.projectSystem).values({ projectId: project, organizationId: ws, exportedAt: at, createdAt: at, updatedAt: at });
  return { id, email, ws, project };
}

let p: Record<string, Awaited<ReturnType<typeof person>>> = {};
beforeAll(async () => {
  p = {
    empty: await person("empty", { daysAgo: 3.5, project: false }),
    some: await person("some", { daysAgo: 3.5, refs: 1 }),
    ready: await person("ready", { daysAgo: 3.2, language: "es", refs: REFS_GOAL }),
    polished: await person("polished", { daysAgo: 7.5, refs: REFS_GOAL, polished: true }),
    walked: await person("walked", { daysAgo: 7.5, refs: REFS_GOAL, polished: true, exported: true }),
    hidden: await person("hidden", { daysAgo: 3.5, project: false, hidden: true }),
    quiet: await person("quiet", { daysAgo: 3.5, project: false, digest: false }),
    early: await person("early", { daysAgo: 2, project: false }),
    between: await person("between", { daysAgo: 5.5, project: false }),
  };
});

afterAll(async () => {
  await db.delete(schema.appSetting).where(like(schema.appSetting.key, `%${tag}%`));
  if (made.orgs.length) await db.delete(schema.organization).where(inArray(schema.organization.id, made.orgs));
  if (made.users.length) {
    await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, made.users));
    await db.delete(schema.user).where(inArray(schema.user.id, made.users));
  }
  await pool.end();
});

beforeEach(() => { reached.length = 0; });

test("each window is one whole UTC day, day 3 and day 7 back", () => {
  expect(nudgeWindow(NOW, 3)).toEqual({ from: new Date(Date.UTC(2032, 2, 6)), to: new Date(Date.UTC(2032, 2, 7)) });
  expect(nudgeWindow(NOW, 7)).toEqual({ from: new Date(Date.UTC(2032, 2, 2)), to: new Date(Date.UTC(2032, 2, 3)) });
  expect(nudgeWindow(new Date(+NOW + DAY), 3).from).toEqual(nudgeWindow(NOW, 3).to);
});

test("a nudge names the first step not done, with its link, on day 3 and day 7", async () => {
  expect(await sendNudges(NOW)).toEqual({ due: 4, sent: 4 });
  expect(mails().map((m) => m.to).sort()).toEqual([p.empty, p.some, p.ready, p.polished].map((x) => x.email).sort());

  expect(mailTo(p.empty.email)?.subject).toBe("Your Criterio account has no project yet");
  expect(mailTo(p.empty.email)?.text).toContain("/?in=home");
  expect(mailTo(p.some.email)?.subject).toBe(`Your project has 1 of its first ${REFS_GOAL} references`);
  expect(mailTo(p.some.email)?.text).toContain(`/?in=${p.some.project}\n`);
  // In the recipient's language
  expect(mailTo(p.ready.email)?.subject).toBe("Tu tablón está listo para pulir");
  expect(mailTo(p.ready.email)?.text).toContain(`/?in=${p.ready.project}&view=polish`);
  expect(mailTo(p.polished.email)?.subject).toBe("Connect your AI to your references");
  // Every nudge keeps the digest's stop link
  expect(mails().filter((m) => !/k=digest/.test(m.text))).toEqual([]);

  const keys = (await db.select({ key: schema.appSetting.key }).from(schema.appSetting).where(like(schema.appSetting.key, `%${tag}%`))).map((r) => r.key).sort();
  expect(keys).toEqual([nudgeKey(3, p.empty.id), nudgeKey(3, p.some.id), nudgeKey(3, p.ready.id), nudgeKey(7, p.polished.id)].sort());

  // Walking the whole path hides the list, and with it every nudge
  const [walked] = await db.select({ at: schema.user.firstStepsDoneAt }).from(schema.user).where(eq(schema.user.id, p.walked.id));
  expect(walked.at).not.toBeNull();
});

test("each day's nudge goes once, and day 7 names the step still to do then", async () => {
  expect(await sendNudges(NOW)).toEqual({ due: 4, sent: 0 });
  expect(mails()).toEqual([]);

  // Four days on, day 3's people are on day 7: the one who made a project since hears of references instead
  await db.insert(schema.project).values({ id: `${p.empty.id}-p`, organizationId: p.empty.ws, name: "made since", createdBy: p.empty.id, createdAt: NOW, updatedAt: NOW });
  const later = new Date(+NOW + 4 * DAY);
  expect(await sendNudges(later)).toEqual({ due: 3, sent: 3 });
  expect(mailTo(p.empty.email)?.subject).toBe("Your project is still empty");
  expect(await sendNudges(later)).toEqual({ due: 3, sent: 0 });
});

test("the welcome lists the first steps in the app's order, in the person's language", async () => {
  expect(await sendWelcome({ id: p.some.id, email: p.some.email, language: "en" })).toBe(true);
  expect(await sendWelcome({ id: p.some.id, email: p.some.email, language: "en" })).toBe(false);
  const text = mailTo(p.some.email)!.text;
  expect(text.match(/^\d\. .+$/gm)?.map((l) => l.split(".")[1].trim())).toEqual(["Create a project", `Save ${REFS_GOAL} references to it`, "Polish the board", "Connect your AI"]);
  expect(await sendWelcome({ id: p.ready.id, email: p.ready.email, language: "es" })).toBe(true);
  expect(mailTo(p.ready.email)!.subject).toBe("Por dónde empezar en Criterio");
  await db.delete(schema.appSetting).where(inArray(schema.appSetting.key, [welcomeKey(p.some.id), welcomeKey(p.ready.id)]));
});
