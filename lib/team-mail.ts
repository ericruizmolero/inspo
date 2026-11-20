// The emails that tell a person their place in a team changed: someone joined (to whoever invited them and the
// owner), an invitation ends tomorrow (to the invitee, from the morning job), a new role, being removed, being handed
// the team, and the team deleted. Each goes to the person it changes and never to whoever did it to themselves. A
// send that fails is logged and never undoes what happened. Text in lib/i18n/<locale>/mail.ts (`membership`), in
// each recipient's language. lib/auth.ts imports this file lazily: it reaches lib/notify.ts, which imports lib/auth.ts.
import "server-only";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db, schema } from "./db";
import { localeForEmail, membershipMail, sendMail, type MembershipNews } from "./mail";
import { mailOnce } from "./mail-once";
import { baseUrl } from "./notify";
import { toLocale } from "./i18n/locale";
import { log } from "./log";

const U = schema.user, M = schema.member, I = schema.invitation, O = schema.organization;
const DAY = 24 * 60 * 60 * 1000;

interface Person { id: string; name: string; email: string; language: string | null }

const nameOf = (p: { name: string; email: string }) => p.name || p.email;
const isOwner = (role: string) => role.split(",").includes("owner");

async function people(ids: string[]): Promise<Person[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  return db.select({ id: U.id, name: U.name, email: U.email, language: U.language }).from(U).where(inArray(U.id, unique));
}

async function person(id: string): Promise<Person | null> {
  return (await people([id]))[0] ?? null;
}

async function teamName(organizationId: string): Promise<string> {
  const [row] = await db.select({ name: O.name }).from(O).where(eq(O.id, organizationId));
  return row?.name ?? "";
}

/** One email each, in each one's language. A failure is logged and the rest still go */
async function tell(to: Person[], news: MembershipNews): Promise<void> {
  for (const p of to) {
    try {
      await sendMail(p.email, membershipMail(news, toLocale(p.language)));
    } catch (err) {
      log.warn("team_mail.not_sent", { kind: news.kind, userId: p.id, err });
    }
  }
}

/** Never lets a lookup that fails reach the action that called it: the change already happened */
async function quietly(what: string, run: () => Promise<void>): Promise<void> {
  try { await run(); } catch (err) { log.warn("team_mail.failed", { what, err }); }
}

/** Someone accepted an invitation: whoever invited them and the owner hear it, once each, if still in the team */
export function tellJoined(j: { organizationId: string; team: string; inviterId: string; joinerId: string }): Promise<void> {
  return quietly("joined", async () => {
    const rows = await db.select({ userId: M.userId, role: M.role }).from(M).where(eq(M.organizationId, j.organizationId));
    const ids = rows.filter((m) => m.userId !== j.joinerId && (m.userId === j.inviterId || isOwner(m.role))).map((m) => m.userId);
    const joiner = await person(j.joinerId);
    if (!joiner) return;
    await tell(await people(ids), { kind: "joined", team: j.team, who: nameOf(joiner), url: baseUrl() });
  });
}

/** What someone did to another member's place in a team: a new role, or out. Nothing when they did it to themselves */
export type MemberChange = { kind: "role"; role: string } | { kind: "removed" };

export function tellMemberChanged(c: { organizationId: string; actorId: string; userId: string; change: MemberChange }): Promise<void> {
  return quietly(c.change.kind, async () => {
    if (c.actorId === c.userId) return;
    const [actor, member] = await Promise.all([person(c.actorId), person(c.userId)]);
    if (!actor || !member) return;
    const team = await teamName(c.organizationId);
    const who = nameOf(actor);
    if (c.change.kind === "removed") return tell([member], { kind: "removed", team, who });
    // Owner changes hands only through handOverTeam, which says so in its own words
    const role = c.change.role;
    if (role !== "admin" && role !== "member") return;
    await tell([member], { kind: "role", team, who, role, url: baseUrl() });
  });
}

/** The team is now `userId`'s, handed over by `actorId` */
export function tellOwner(o: { organizationId: string; actorId: string; userId: string }): Promise<void> {
  return quietly("owner", async () => {
    const [actor, owner] = await Promise.all([person(o.actorId), person(o.userId)]);
    if (!actor || !owner) return;
    await tell([owner], { kind: "owner", team: await teamName(o.organizationId), who: nameOf(actor), url: baseUrl() });
  });
}

/** Every member but `actorId` hears the team is gone. Called while its rows are still there to say who was in it */
export function tellDeleted(d: { organizationId: string; actorId: string }): Promise<void> {
  return quietly("deleted", async () => {
    const rows = await db.select({ userId: M.userId }).from(M).where(eq(M.organizationId, d.organizationId));
    const actor = await person(d.actorId);
    if (!actor) return;
    const to = await people(rows.map((m) => m.userId).filter((id) => id !== d.actorId));
    await tell(to, { kind: "deleted", team: await teamName(d.organizationId), who: nameOf(actor) });
  });
}

/**
 * The pending invitations the morning of `now` reminds: those that end on the next UTC day. The morning job runs once
 * a day, on the same UTC day as its date, so each invitation falls in exactly one morning's window, the day before it
 * ends. Better Auth gives an invitation seven days (lib/auth.ts), so every one gets its day.
 */
export function endingWindow(now: Date): { from: Date; to: Date } {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return { from: new Date(today + DAY), to: new Date(today + 2 * DAY) };
}

export const endingKey = (invitationId: string) => `invite-ending:${invitationId}`;

/** "Your invitation ends tomorrow", once per invitation (mailOnce), in the invitee's language or else the inviter's */
export async function sendInvitationReminders(now = new Date()): Promise<{ ending: number; sent: number }> {
  const { from, to } = endingWindow(now);
  const rows = await db.select({ id: I.id, email: I.email, team: O.name, inviter: U.name, inviterEmail: U.email, inviterLanguage: U.language })
    .from(I).innerJoin(O, eq(O.id, I.organizationId)).innerJoin(U, eq(U.id, I.inviterId))
    .where(and(eq(I.status, "pending"), gte(I.expiresAt, from), lt(I.expiresAt, to)));
  let sent = 0;
  for (const r of rows) {
    const locale = await localeForEmail(r.email, toLocale(r.inviterLanguage));
    const mail = membershipMail({
      kind: "ending", team: r.team, who: nameOf({ name: r.inviter, email: r.inviterEmail }), invitee: r.email,
      url: `${baseUrl()}/invite/${r.id}?lang=${locale}`,
    }, locale);
    if (await mailOnce(endingKey(r.id), [r.email], mail)) sent++;
  }
  return { ending: rows.length, sent };
}
