// A client's comments on a share link reach the team by email, gathered (lib/client-comments.ts), and the digest
// leaves out what that email told; the invitations to a link go one by one; the paused digest keeps its stop link.
// Guests write through the real share actions; mail and the queue are recorded, never sent.
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { createBillingAccount, ensurePersonalWorkspace, newId } from "@/lib/workspace-core";
import { guestComment, inviteMore, makeShare } from "@/app/actions/share";
import { clientCommented, clientCommentsKey, nextTellAt, tellClientComments, CLIENT_MAIL_EVERY } from "@/lib/client-comments";
import { sendDigests } from "@/lib/notify";
import { actAs, reached, type Actor } from "./harness";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached } = await import("./harness");
  return {
    ...(await importOriginal<object>()),
    sendMail: async (to: string | string[], m: { subject: string; text: string }) => {
      const first = [to].flat()[0];
      if (first.startsWith("fail")) throw new Error("Resend 500");
      reached.push(["mail", { to: first, subject: m.subject, text: m.text }]);
    },
  };
});

vi.mock("@/lib/jobs", async (importOriginal) => {
  const { reached } = await import("./harness");
  return { ...(await importOriginal<object>()), enqueue: async (jobs: unknown, opts: unknown) => { reached.push(["queue", { jobs, opts }]); }, scheduleSweep: async () => {} };
});

type Sent = { to: string; subject: string; text: string };
const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as Sent);
const mailsTo = (p: { email: string }) => mails().filter((m) => m.to === p.email);
const queued = () => reached.filter(([what]) => what === "queue").map(([, q]) => q as { jobs: { kind: string; shareId: string }; opts: { delaySeconds: number; idempotencyKey: string } });

const MIN = 60_000, DAY = 24 * 60 * MIN;
/** So a comment written after a tell carries a later time than it */
const tick = () => new Promise((r) => setTimeout(r, 5));
const tag = `cc${randomBytes(4).toString("hex")}`;
const actor = (who: string): Actor => ({ id: `${tag}-${who}`, name: `${tag} ${who}`, email: `${tag}-${who}@example.test`, workspaceId: "" });
const maker = actor("maker"), mate = actor("mate"), away = actor("away"), solo = actor("solo");
const people = [maker, mate, away, solo];
let team = "", solos = "";
const shares: Record<string, { id: string; token: string }> = {};

async function board(ws: string, name: string) {
  const now = new Date(), project = `${tag}-${name}`, item = `${tag}-${name}-ref`;
  await db.insert(schema.project).values({ id: project, organizationId: ws, name: `${name} site`, createdAt: now, updatedAt: now });
  await db.insert(schema.inspoItem).values({ id: item, organizationId: ws, name: "Linear", web: `https://${item}.example.com`, webKey: `${item}.example.com`, date: "2026-11-20", author: "x", tagStatus: "done", createdAt: now, updatedAt: now });
  await db.insert(schema.projectItem).values({ projectId: project, itemId: item, organizationId: ws, createdAt: now });
  return { project, item };
}

async function share(as: Actor, project: string, label: string) {
  actAs(as);
  const r = await makeShare(project, { mode: "clean", access: "link", label, itemIds: null, emails: [] });
  if (!r.ok) throw new Error(r.error);
  const l = r.data.links.find((x) => x.label === label)!;
  return { id: l.id, token: l.token };
}

/** A guest writes through the link, as the shared page does */
async function comment(link: { token: string }, body: string, name = "Ana", secret = `${tag}-guest-secret-0001`) {
  const r = await guestComment(link.token, secret, { itemId: items[link.token], body, name });
  if (!r.ok) throw new Error(r.error);
}
const items: Record<string, string> = {};

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values(people.map((p) => ({ id: p.id, name: p.name, email: p.email, emailVerified: true, language: "en", createdAt: now, updatedAt: now })));
  const account = await createBillingAccount({ name: tag, ownerUserId: maker.id, plan: "agency" });
  team = newId();
  await db.insert(schema.organization).values({ id: team, name: `${tag} Studio`, slug: `${tag}-team`, createdAt: now, kind: "team", billingAccountId: account });
  await db.insert(schema.member).values([maker, mate, away].map((p, i) => ({ id: newId(), organizationId: team, userId: p.id, role: i ? "member" : "owner", createdAt: now })));
  for (const p of [maker, mate, away]) p.workspaceId = team;
  solos = await ensurePersonalWorkspace(solo.id, solo.name, solo.email, "en");
  solo.workspaceId = solos;
  // A month and more away: the digest pauses for them
  await db.insert(schema.activitySegment).values({ id: `${tag}-seg`, userId: away.id, organizationId: team, visitId: "v", area: "library", path: "/", startedAt: new Date(+now - 40 * DAY), lastSeenAt: new Date(+now - 40 * DAY) });

  const t = await board(team, "team"), s = await board(solos, "solo");
  shares.team = await share(maker, t.project, "For Andoni");
  shares.gone = await share(maker, t.project, "Old link");
  shares.solo = await share(solo, s.project, "");
  items[shares.team.token] = items[shares.gone.token] = t.item;
  items[shares.solo.token] = s.item;
  // Whoever made this one has left the team
  await db.update(schema.systemShare).set({ createdBy: null }).where(eq(schema.systemShare.id, shares.gone.id));
});

afterAll(async () => {
  actAs(null);
  const ids = people.map((p) => p.id);
  await db.delete(schema.appSetting).where(inArray(schema.appSetting.key, Object.values(shares).map((s) => clientCommentsKey(s.id))));
  const spaces = await db.select({ id: schema.member.organizationId }).from(schema.member).where(inArray(schema.member.userId, ids));
  await db.delete(schema.organization).where(inArray(schema.organization.id, [team, solos, ...spaces.map((s) => s.id)]));
  await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, ids));
  await db.delete(schema.user).where(inArray(schema.user.id, ids));
});

beforeEach(() => { reached.length = 0; });

test("a burst of comments asks for one email, on the five-minute grid, and the next waits an hour after the last", async () => {
  const at = new Date(Date.UTC(2032, 0, 1, 10, 0, 30));
  await clientCommented(shares.team.id, at);
  await clientCommented(shares.team.id, new Date(+at + 2 * MIN));
  await clientCommented(shares.team.id, new Date(+at + 4 * MIN));
  const keys = new Set(queued().map((q) => q.opts.idempotencyKey));
  expect(keys).toEqual(new Set([`${clientCommentsKey(shares.team.id)}:2032-01-01T10:10:00.000Z`]));
  expect(queued().map((q) => q.jobs)).toContainEqual({ kind: "clientComments", shareId: shares.team.id });

  expect(nextTellAt(at, new Date(+at - 10 * MIN))).toEqual(new Date(Date.UTC(2032, 0, 1, 10, 55)));
  expect(nextTellAt(at, new Date(+at - 2 * CLIENT_MAIL_EVERY))).toEqual(new Date(Date.UTC(2032, 0, 1, 10, 10)));
});

test("the link's maker gets one email with every comment, at most one an hour", async () => {
  await comment(shares.team, "Love the type here");
  await comment(shares.team, "Too dark  \n for us", "Luis", `${tag}-guest-secret-0002`);
  // Writing through the link asked for its email
  expect(queued().some((q) => q.jobs.shareId === shares.team.id)).toBe(true);

  const now = new Date();
  expect(await tellClientComments(shares.team.id, now)).toBe(1);
  expect(mailsTo(mate)).toEqual([]);
  const [m] = mailsTo(maker);
  expect(m.subject).toBe("Your client commented on team site");
  expect(m.text).toContain('through the link "For Andoni"');
  expect(m.text).toContain("Ana on Linear: Love the type here");
  expect(m.text).toContain("Luis on Linear: Too dark for us");
  expect(m.text).toContain(`/p/${tag}-team?view=board`);
  expect(m.text).toContain(`/unsubscribe?u=${encodeURIComponent(maker.id)}&k=replies`);
  expect(m.text).toContain("Eric, Andoni and Alberto");

  // Delivered twice: nothing new
  expect(await tellClientComments(shares.team.id, now)).toBe(0);

  reached.length = 0;
  await tick();
  await comment(shares.team, "And the footer?");
  const soon = new Date(+now + 10 * MIN);
  expect(await tellClientComments(shares.team.id, soon)).toBe(0);
  expect(mails()).toEqual([]);
  // Held: the email goes an hour after the last one
  expect(queued().map((q) => q.opts.idempotencyKey)).toContain(`${clientCommentsKey(shares.team.id)}:${nextTellAt(soon, now).toISOString()}`);

  expect(await tellClientComments(shares.team.id, new Date(+now + CLIENT_MAIL_EVERY + MIN))).toBe(1);
  expect(mailsTo(maker)).toHaveLength(1);
  expect(mailsTo(maker)[0].text).toContain("And the footer?");
  expect(mailsTo(maker)[0].text).not.toContain("Love the type");
});

test("once the link's maker is gone, the whole team hears; with replies off, nobody does", async () => {
  await comment(shares.gone, "Who made this?");
  expect(await tellClientComments(shares.gone.id, new Date())).toBe(3);
  expect([maker, mate, away].map((p) => mailsTo(p).length)).toEqual([1, 1, 1]);

  reached.length = 0;
  await db.update(schema.user).set({ replyEmails: false }).where(eq(schema.user.id, solo.id));
  await comment(shares.solo, "Nice board");
  expect(await tellClientComments(shares.solo.id, new Date())).toBe(0);
  expect(mails()).toEqual([]);
  await db.update(schema.user).set({ replyEmails: true }).where(eq(schema.user.id, solo.id));
});

test("a workspace of one hears of its client too", async () => {
  await tick();
  await comment(shares.solo, "Can we see more?", "Marta", `${tag}-guest-secret-0003`);
  expect(await tellClientComments(shares.solo.id, new Date(Date.now() + CLIENT_MAIL_EVERY + MIN))).toBe(1);
  expect(mailsTo(solo)[0].text).toContain("Marta on Linear: Can we see more?");
  expect(mailsTo(solo)[0].text).not.toContain("Nice board");
});

test("the digest leaves out a client's comment for those its email reached, and the paused one keeps its stop link", async () => {
  const run = await sendDigests(new Date(), true);
  const digestOf = (p: Actor) => run.mails.find((m) => m.to === p.email);
  // The maker heard of both links by email; the rest of the team, only of the one whose maker is gone
  expect(digestOf(maker)?.text).not.toMatch(/Love the type|Who made this/);
  expect(digestOf(mate)?.text).toContain("Love the type here");
  expect(digestOf(mate)?.text).not.toContain("Who made this?");

  const paused = digestOf(away)!;
  expect(paused.subject).toBe("We have paused your team summaries");
  expect(paused.text).toContain(`You get this because you are in ${tag} Studio on criterio.design.`);
  expect(paused.text).toContain(`/unsubscribe?u=${encodeURIComponent(away.id)}&k=digest&s=`);
});

test("a client's comment that no email has covered yet stays in the digest", async () => {
  await tick();
  // After the last email of the link whose maker is gone: it reached nobody yet, so the digest still carries it
  await comment(shares.gone, "Still there?", "Pia", `${tag}-guest-secret-0004`);
  const run = await sendDigests(new Date(), true);
  expect(run.mails.find((m) => m.to === mate.email)?.text).toContain("Still there?");
});

test("each invitation goes on its own: one that fails is reported, the rest still go", async () => {
  actAs(maker);
  const fail = `fail-${tag}@example.test`, ok1 = `${tag}-ok1@example.test`, ok2 = `${tag}-ok2@example.test`;
  const r = await makeShare(`${tag}-team`, { mode: "clean", access: "invite", label: "Invited", itemIds: null, emails: [ok1, fail, ok2] });
  expect(r.ok && r.data.notSent).toEqual([fail]);
  expect(mails().map((m) => m.to).sort()).toEqual([ok1, ok2].sort());

  reached.length = 0;
  const link = r.ok ? r.data.links.find((l) => l.label === "Invited")! : null;
  const more = await inviteMore(`${tag}-team`, link!.id, [`fail2-${tag}@example.test`, `${tag}-ok3@example.test`]);
  expect(more.ok && more.data.notSent).toEqual([`fail2-${tag}@example.test`]);
  expect(mails().map((m) => m.to)).toEqual([`${tag}-ok3@example.test`]);
});
