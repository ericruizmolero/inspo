// What the team did, told to each person without being a nuisance. Three ways, all from the same list of
// events (teamEvents):
//   - The bell in the Island (teamActivity, markActivitySeen): the last week, what came after the person last
//     looked is "new". Only in a team workspace.
//   - The daily digest (sendDigests, run by the morning cron): per team, one email with what the others did
//     since the person last looked. At most one email a day; none in a workspace of one, none when nothing
//     happened, none if the person has been in the app since the last thing happened (the heartbeat in
//     activity_segment says so), and after a month without opening the app it stops on its own.
//   - The instant emails (notifyReply, notifyProposalResolved): someone answered your comment or settled your
//     proposal. The only thing people expect right away. The email replies to whoever wrote it.
//
// Each kind of email is a switch on the account (user.digest_emails, user.reply_emails) and a one-click link
// at the foot of every email. The language is the recipient's (user.language), never the writer's; the
// writer's words go as written.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gt, inArray, max, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { APP_URL } from "./auth";
import { sendMail, digestMail, replyMail, proposalMail, pausedMail, unsubscribeHeaders, type DigestGroup, type DigestLine, type TeamMailFoot } from "./mail";
import { toLocale, type Locale } from "./i18n/locale";
import en from "./i18n/en";
import es from "./i18n/es";
import { SYSTEM_AREAS } from "@/types/system";

const U = schema.user;
const M = schema.member;
const O = schema.organization;

export type EmailKind = "digest" | "replies";
export const EMAIL_KINDS: readonly EmailKind[] = ["digest", "replies"];

/** How far back the bell and a digest reach: a person away longer than this gets the last week, not the backlog */
const WINDOW_DAYS = 7;
/** Without opening the app for this long, the digest stops on its own */
const PAUSE_DAYS = 30;
/** How far apart digests go by how long the person has been away: in the app these two days, one a day; away up to
 *  a week, one every three days; longer, one a week. Someone who left while the team kept going gets a handful of
 *  emails in the month before it pauses, not thirty */
const GAP_DAYS = (awayDays: number) => (awayDays < 2 ? 1 : awayDays < 7 ? 3 : 7);
/** The cron does not run at the same second each day: a gap counts as met this much early */
const GAP_SLACK = 6 * 60 * 60 * 1000;
/** Lines per group in the digest; the rest is "and N more" */
const LINES_PER_GROUP = 6;
/** Lines the bell shows at most */
const BELL_LINES = 30;
/** A quoted comment is cut here */
const QUOTE_MAX = 140;

const DAY = 24 * 60 * 60 * 1000;
const DICTS = { en, es } as const;

// ─── Links ───────────────────────────────────────────────────────────────────

/** Where links in an email point. Production knows its URL; locally the console mail links to the dev server */
export const baseUrl = (): string => APP_URL || `http://localhost:${process.env.PORT || 3000}`;

const itemPath = (id: string) => `/i/${encodeURIComponent(id)}`;
const projectPath = (id: string) => `/?in=${encodeURIComponent(id)}`;
const systemPath = (id: string) => `/?in=${encodeURIComponent(id)}&view=system`;
const libraryPath = "/?in=library";

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  // A known fallback would let anyone sign a link: production has no fallback
  if (!s && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is not set");
  return s || "dev-mail-secret";
}
const sign = (userId: string, kind: EmailKind) => createHmac("sha256", secret()).update(`unsubscribe|${kind}|${userId}`).digest("hex").slice(0, 32);

/** The one-click link to stop one kind of email: it proves who asked without a session */
export function unsubscribeUrl(userId: string, kind: EmailKind): string {
  return `${baseUrl()}/unsubscribe?u=${encodeURIComponent(userId)}&k=${kind}&s=${sign(userId, kind)}`;
}

/** Whether a stop link's signature is the one we gave that person for that kind */
export function unsubscribeValid(userId: unknown, kind: unknown, sig: unknown): kind is EmailKind {
  if (typeof userId !== "string" || !userId || typeof sig !== "string" || !EMAIL_KINDS.includes(kind as EmailKind)) return false;
  const good = Buffer.from(sign(userId, kind as EmailKind));
  const given = Buffer.from(sig);
  return good.length === given.length && timingSafeEqual(good, given);
}

/** Turns one kind of email on or off for a person */
export async function setEmailPref(userId: string, kind: EmailKind, on: boolean): Promise<void> {
  await db.update(U).set({ [kind === "digest" ? "digestEmails" : "replyEmails"]: on, updatedAt: new Date() }).where(eq(U.id, userId));
}

export async function emailPrefs(userId: string): Promise<Record<EmailKind, boolean>> {
  const [row] = await db.select({ digest: U.digestEmails, replies: U.replyEmails }).from(U).where(eq(U.id, userId)).limit(1);
  return { digest: row?.digest ?? true, replies: row?.replies ?? true };
}

const footOf = (userId: string, kind: EmailKind, team: string): TeamMailFoot =>
  ({ team, stopUrl: unsubscribeUrl(userId, kind), settingsUrl: `${baseUrl()}/settings/account` });

const areaName = (locale: Locale, area: string) => (DICTS[locale].system.areas as Record<string, string>)[area] ?? area;
const clip = (s: string, n = QUOTE_MAX) => { const one = s.replace(/\s+/g, " ").trim(); return one.length > n ? `${one.slice(0, n - 1)}…` : one; };

/** Runs something once the response has gone out (Next's after); outside a request, right away */
export function inBackground(job: () => Promise<void>): void {
  const run = () => job().catch((e) => console.warn("notify:", e instanceof Error ? e.message : e));
  import("next/server").then(({ after }) => { try { after(run); } catch { void run(); } }, () => { void run(); });
}

// ─── Instant: a reply to your comment ────────────────────────────────────────

interface Recipient { id: string; name: string; email: string; language: Locale; replies: boolean }

async function person(userId: string | null): Promise<Recipient | null> {
  if (!userId) return null;
  const [r] = await db.select({ id: U.id, name: U.name, email: U.email, language: U.language, replies: U.replyEmails }).from(U).where(eq(U.id, userId)).limit(1);
  return r ? { ...r, language: toLocale(r.language) } : null;
}

async function teamName(organizationId: string): Promise<string> {
  const [o] = await db.select({ name: O.name }).from(O).where(eq(O.id, organizationId)).limit(1);
  return o?.name ?? "";
}

/**
 * Someone answered a comment. `to` wrote the comment answered; `from` wrote the answer. Nothing goes out when
 * they are the same person, when the recipient turned replies off, or when the recipient is gone.
 */
export async function notifyReply(organizationId: string, input: { toUserId: string | null; fromUserId: string; fromName: string; mine: string; theirs: string; path: string }): Promise<boolean> {
  if (!input.toUserId || input.toUserId === input.fromUserId) return false;
  const [to, from, team] = await Promise.all([person(input.toUserId), person(input.fromUserId), teamName(organizationId)]);
  if (!to || !to.replies) return false;
  const foot = footOf(to.id, "replies", team);
  const m = replyMail({ who: input.fromName, mine: clip(input.mine), theirs: clip(input.theirs, 600), url: `${baseUrl()}${input.path}` }, foot, to.language);
  await sendMail(to.email, m.subject, m.html, m.text, { replyTo: from?.email, headers: unsubscribeHeaders(foot.stopUrl) });
  return true;
}

/** Someone accepted or turned down the change `to` proposed for an area */
export async function notifyProposalResolved(organizationId: string, input: { toUserId: string | null; fromUserId: string; fromName: string; accepted: boolean; area: string; projectId: string; projectName: string; decision: string }): Promise<boolean> {
  if (!input.toUserId || input.toUserId === input.fromUserId) return false;
  const [to, from, team] = await Promise.all([person(input.toUserId), person(input.fromUserId), teamName(organizationId)]);
  if (!to || !to.replies) return false;
  const foot = footOf(to.id, "replies", team);
  const m = proposalMail({ who: input.fromName, accepted: input.accepted, area: areaName(to.language, input.area), project: input.projectName, decision: clip(input.decision, 300), url: `${baseUrl()}${systemPath(input.projectId)}` }, foot, to.language);
  await sendMail(to.email, m.subject, m.html, m.text, { replyTo: from?.email, headers: unsubscribeHeaders(foot.stopUrl) });
  return true;
}

// ─── What happened ───────────────────────────────────────────────────────────

/** One thing someone did in a workspace. `by` is who did it (null when that account is gone) */
export interface TeamEvent {
  at: Date;
  by: string | null;
  byName: string;
  /** Their photo (user.image), when they have one and an account */
  byImage: string | null;
  /** Where it files: a project, or the library */
  projectId: string | null;
  kind: "ref" | "project" | "comment" | "areaTalk" | "proposal" | "decision" | "vote" | "polishClosed";
  /** Where the line goes, inside the app */
  path: string;
  /** The reference's or project's name, the area's key */
  what: string;
  /** The comment's or decision's words */
  quote?: string;
}

/** Everything that happened in a workspace after `since`, oldest first. One query per table */
export async function teamEvents(organizationId: string, since: Date): Promise<TeamEvent[]> {
  const I = schema.inspoItem, P = schema.project, PI = schema.projectItem, C = schema.inspoComment, A = schema.systemAreaComment, R = schema.systemAreaRevision, V = schema.polishVote;
  const [items, projects, filed, comments, talk, revisions, votes] = await Promise.all([
    db.select({ id: I.id, name: I.name, at: I.createdAt, by: I.createdBy, byName: I.author }).from(I).where(and(eq(I.organizationId, organizationId), gt(I.createdAt, since))),
    db.select({ id: P.id, name: P.name, at: P.createdAt, by: P.createdBy, template: P.template }).from(P).where(and(eq(P.organizationId, organizationId), gt(P.createdAt, since))),
    db.select({ itemId: PI.itemId, projectId: PI.projectId }).from(PI).where(and(eq(PI.organizationId, organizationId), gt(PI.createdAt, since))),
    db.select({ itemId: C.itemId, at: C.createdAt, by: C.authorId, byName: C.authorName, body: C.body, name: I.name }).from(C).innerJoin(I, eq(I.id, C.itemId)).where(and(eq(C.organizationId, organizationId), gt(C.createdAt, since))),
    db.select({ projectId: A.projectId, area: A.area, at: A.createdAt, by: A.authorId, byName: A.authorName, body: A.body, about: A.about }).from(A).where(and(eq(A.organizationId, organizationId), gt(A.createdAt, since))),
    db.select({ projectId: R.projectId, area: R.area, at: R.createdAt, by: R.authorId, byName: R.authorName, decision: R.decision }).from(R).where(and(eq(R.organizationId, organizationId), eq(R.source, "team"), gt(R.createdAt, since))),
    db.select({ projectId: V.projectId, by: V.userId, at: V.updatedAt, closedAt: V.closedAt, closedBy: V.closedBy }).from(V).where(and(eq(V.organizationId, organizationId), sql`greatest(${V.updatedAt}, coalesce(${V.closedAt}, ${V.updatedAt})) > ${since}`)),
  ]);
  // Who did each thing, looked up once: their photo, and their name where the row carries none (votes, projects)
  // or a legacy label ("Both" on an old reference)
  const people = new Map<string, { name: string; image: string | null }>();
  const ids = [...new Set([items, projects, comments, talk, revisions, votes].flatMap((rows) => rows.map((r) => r.by)).concat(votes.map((v) => v.closedBy)).filter((x): x is string => !!x))];
  if (ids.length) for (const u of await db.select({ id: U.id, name: U.name, image: U.image }).from(U).where(inArray(U.id, ids))) people.set(u.id, { name: u.name, image: u.image ?? null });
  const nameOf = (id: string | null) => (id && people.get(id)?.name) || "";
  const imageOf = (id: string | null) => (id && people.get(id)?.image) || null;

  // A reference files under the project it went into (the first, if several at once)
  const projectOf = new Map<string, string>();
  for (const f of filed) if (!projectOf.has(f.itemId)) projectOf.set(f.itemId, f.projectId);

  const out: TeamEvent[] = [];
  for (const i of items) out.push({ at: i.at, by: i.by, byName: nameOf(i.by) || i.byName, byImage: imageOf(i.by), projectId: projectOf.get(i.id) ?? null, kind: "ref", path: itemPath(i.id), what: i.name });
  for (const p of projects) if (!p.template) out.push({ at: p.at, by: p.by, byName: nameOf(p.by), byImage: imageOf(p.by), projectId: p.id, kind: "project", path: projectPath(p.id), what: p.name });
  for (const c of comments) if (c.body.trim()) out.push({ at: c.at, by: c.by, byName: c.byName, byImage: imageOf(c.by), projectId: projectOf.get(c.itemId) ?? null, kind: "comment", path: itemPath(c.itemId), what: c.name, quote: c.body });
  for (const a of talk) {
    const about = a.about && typeof a.about === "object" ? (a.about as Record<string, unknown>) : null;
    const area = (SYSTEM_AREAS as readonly string[]).includes(a.area) ? a.area : a.area.replace(/^meta:/, "");
    out.push({ at: a.at, by: a.by, byName: a.byName, byImage: imageOf(a.by), projectId: a.projectId, kind: about && "proposal" in about ? "proposal" : "areaTalk", path: systemPath(a.projectId), what: area, quote: a.body });
  }
  for (const r of revisions) out.push({ at: r.at, by: r.by, byName: r.byName, byImage: imageOf(r.by), projectId: r.projectId, kind: "decision", path: systemPath(r.projectId), what: r.area, quote: r.decision });
  for (const v of votes) {
    if (v.at > since) out.push({ at: v.at, by: v.by, byName: nameOf(v.by), byImage: imageOf(v.by), projectId: v.projectId, kind: "vote", path: projectPath(v.projectId), what: "" });
    if (v.closedAt && v.closedAt > since) out.push({ at: v.closedAt, by: v.closedBy, byName: nameOf(v.closedBy), byImage: imageOf(v.closedBy), projectId: v.projectId, kind: "polishClosed", path: projectPath(v.projectId), what: "" });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** A line as the bell and the digest show it: the words, where it goes, and the comment quoted */
export interface ActivityLine { text: string; path: string; quote?: string; at: string; who: string; image: string | null; projectId: string | null }

/**
 * Events turned into lines, oldest first. Several references added or votes cast by one person in one project fold
 * into one line ("Alberto added 4 references"), so an import is one line, not forty.
 */
export function activityLines(events: TeamEvent[], locale: Locale): ActivityLine[] {
  const t = DICTS[locale].teamActivity.line;
  const lines: ActivityLine[] = [];
  const folded = new Map<string, { line: ActivityLine; n: number }>();
  for (const e of events) {
    const who = e.byName;
    const base = { path: e.path, at: e.at.toISOString(), who, image: e.byImage, projectId: e.projectId };
    switch (e.kind) {
      case "ref": case "vote": {
        const key = `${e.kind}|${e.projectId ?? ""}|${e.by ?? who}`;
        const f = folded.get(key);
        if (f) {
          f.n++;
          f.line.at = base.at;
          // Several: the line opens the project (or the library), not one reference
          f.line.path = e.kind === "ref" ? (e.projectId ? projectPath(e.projectId) : libraryPath) : e.path;
          f.line.text = e.kind === "ref" ? t.added(who, f.n) : t.voted(who, f.n);
        } else {
          const line = { ...base, text: e.kind === "ref" ? t.added(who, 1) : t.voted(who, 1) };
          folded.set(key, { line, n: 1 });
          lines.push(line);
        }
        break;
      }
      case "project": lines.push({ ...base, text: t.createdProject(who, e.what) }); break;
      case "comment": lines.push({ ...base, text: t.commented(who, e.what), quote: clip(e.quote ?? "") }); break;
      case "areaTalk": lines.push({ ...base, text: t.talked(who, areaName(locale, e.what)), quote: clip(e.quote ?? "") }); break;
      case "proposal": lines.push({ ...base, text: t.proposed(who, areaName(locale, e.what)), quote: clip(e.quote ?? "") }); break;
      case "decision": lines.push({ ...base, text: t.decided(who, areaName(locale, e.what)), quote: clip(e.quote ?? "") }); break;
      case "polishClosed": lines.push({ ...base, text: t.closedPolish(who) }); break;
    }
  }
  return lines;
}

const projectNamesOf = async (organizationId: string) =>
  new Map((await db.select({ id: schema.project.id, name: schema.project.name }).from(schema.project).where(eq(schema.project.organizationId, organizationId))).map((p) => [p.id, p.name]));

// ─── The bell ────────────────────────────────────────────────────────────────

export interface TeamActivity {
  /** Newest first, the person's own doings left out */
  lines: (ActivityLine & { project: string | null; fresh: boolean })[];
  /** Lines after the person last opened the bell */
  unseen: number;
}

/** The last week of the team for one person: what the others did, and how much of it came after they last looked */
export async function teamActivity(organizationId: string, userId: string, locale: Locale, now = new Date()): Promise<TeamActivity> {
  const [m] = await db.select({ seenAt: M.activitySeenAt, joinedAt: M.createdAt }).from(M).where(and(eq(M.organizationId, organizationId), eq(M.userId, userId))).limit(1);
  if (!m) return { lines: [], unseen: 0 };
  const since = new Date(now.getTime() - WINDOW_DAYS * DAY);
  const seenAt = m.seenAt ?? m.joinedAt;
  const [events, projectNames] = await Promise.all([teamEvents(organizationId, since), projectNamesOf(organizationId)]);
  const lines = activityLines(events.filter((e) => e.by !== userId), locale)
    .map((l) => ({ ...l, project: l.projectId ? projectNames.get(l.projectId) ?? null : null, fresh: new Date(l.at) > seenAt }))
    .reverse().slice(0, BELL_LINES);
  return { lines, unseen: lines.filter((l) => l.fresh).length };
}

/** The bell was opened: everything so far is seen */
export async function markActivitySeen(organizationId: string, userId: string, now = new Date()): Promise<void> {
  await db.update(M).set({ activitySeenAt: now }).where(and(eq(M.organizationId, organizationId), eq(M.userId, userId)));
}

// ─── The daily digest ────────────────────────────────────────────────────────

/** The counts for the subject line, in order of weight */
export function digestSummary(events: TeamEvent[], locale: Locale): string {
  const t = DICTS[locale].mail.digest.count;
  const n = (...kinds: TeamEvent["kind"][]) => events.filter((e) => kinds.includes(e.kind)).length;
  const parts = [
    [n("comment", "areaTalk"), t.comments], [n("ref"), t.refs], [n("decision"), t.decisions], [n("proposal"), t.proposals],
    [n("vote", "polishClosed"), t.votes], [n("project"), t.projects],
  ] as const;
  return parts.filter(([c]) => c > 0).map(([c, f]) => f(c)).join(", ");
}

/** The email's body: one group per project (and one for the library), projects first, links absolute */
export function digestGroups(events: TeamEvent[], locale: Locale, projectNames: Map<string, string>): DigestGroup[] {
  const library = DICTS[locale].teamActivity.library;
  const byProject = new Map<string | null, ActivityLine[]>();
  for (const l of activityLines(events, locale)) (byProject.get(l.projectId) ?? byProject.set(l.projectId, []).get(l.projectId)!).push(l);
  const groups: DigestGroup[] = [];
  for (const [projectId, lines] of byProject) {
    const shown: DigestLine[] = lines.slice(0, LINES_PER_GROUP).map((l) => ({ text: l.text, url: `${baseUrl()}${l.path}`, ...(l.quote ? { quote: l.quote } : {}) }));
    groups.push({
      title: projectId ? projectNames.get(projectId) ?? "" : library,
      url: `${baseUrl()}${projectId ? projectPath(projectId) : libraryPath}`,
      lines: shown,
      more: Math.max(0, lines.length - LINES_PER_GROUP),
    });
  }
  // The library last: projects are where the work is
  return groups.sort((a, b) => (a.title === library ? 1 : 0) - (b.title === library ? 1 : 0));
}

export interface DigestRun { teams: number; sent: number; paused: number; skipped: number; /** Held for another day: too soon since their last one for how long they have been away */ spaced: number; mails: { to: string; subject: string; text: string; html: string }[] }

/**
 * The morning run. For every team with more than one person: the events since the earliest member's window,
 * then one email per member with what the others did since that member's own window started.
 * `dryRun` builds every email and sends none, and moves no marker (check:notifications).
 */
export async function sendDigests(now = new Date(), dryRun = false): Promise<DigestRun> {
  const run: DigestRun = { teams: 0, sent: 0, paused: 0, skipped: 0, spaced: 0, mails: [] };
  const S = schema.activitySegment;
  const teams = await db.select({ id: O.id, name: O.name }).from(O).where(eq(O.kind, "team"));
  const floor = new Date(now.getTime() - WINDOW_DAYS * DAY);
  const pauseBefore = new Date(now.getTime() - PAUSE_DAYS * DAY);

  for (const team of teams) {
    const members = await db.select({ memberId: M.id, userId: U.id, name: U.name, email: U.email, language: U.language, digest: U.digestEmails, joinedAt: M.createdAt, coveredAt: M.digestSentAt, userCreatedAt: U.createdAt })
      .from(M).innerJoin(U, eq(U.id, M.userId)).where(eq(M.organizationId, team.id));
    if (members.length < 2) continue;
    run.teams++;
    const userIds = members.map((m) => m.userId);
    // When each person was last in this team, and last in the app at all
    const [seenHere, seenAnywhere] = await Promise.all([
      db.select({ userId: S.userId, at: max(S.lastSeenAt) }).from(S).where(and(eq(S.organizationId, team.id), inArray(S.userId, userIds))).groupBy(S.userId),
      db.select({ userId: S.userId, at: max(S.lastSeenAt) }).from(S).where(inArray(S.userId, userIds)).groupBy(S.userId),
    ]);
    const here = new Map(seenHere.map((r) => [r.userId, r.at]));
    const anywhere = new Map(seenAnywhere.map((r) => [r.userId, r.at]));
    // What the person has not seen: after the last digest (the first one covers yesterday only, never a backlog),
    // after their last visit to this team, within the week
    const windowOf = (m: (typeof members)[number]) => new Date(Math.max(floor.getTime(), (m.coveredAt ?? new Date(Math.max(m.joinedAt.getTime(), now.getTime() - DAY))).getTime(), here.get(m.userId)?.getTime() ?? 0));

    const earliest = members.reduce((d, m) => Math.min(d, windowOf(m).getTime()), now.getTime());
    const [events, projectNames] = earliest < now.getTime() ? await Promise.all([teamEvents(team.id, new Date(earliest)), projectNamesOf(team.id)]) : [[], new Map<string, string>()];

    for (const m of members) {
      const cover = async () => { if (!dryRun) await db.update(M).set({ digestSentAt: now }).where(eq(M.id, m.memberId)); };
      if (!m.digest) { await cover(); run.skipped++; continue; }
      const since = windowOf(m);
      const theirs = events.filter((e) => e.at > since && e.by !== m.userId);
      if (!theirs.length) { await cover(); run.skipped++; continue; }
      const locale = toLocale(m.language);
      const lastOpened = anywhere.get(m.userId) ?? m.userCreatedAt;
      // Too soon for someone who has been away: held, and not covered, so what happened waits for the next one
      const gap = GAP_DAYS((now.getTime() - lastOpened.getTime()) / DAY) * DAY - GAP_SLACK;
      if (m.coveredAt && now.getTime() - m.coveredAt.getTime() < gap) { run.spaced++; continue; }
      if (lastOpened < pauseBefore) {
        // A month away: the digest stops on its own, with one email that says so and how to turn it back on
        const p = pausedMail(`${baseUrl()}/settings/account`, locale);
        run.mails.push({ to: m.email, subject: p.subject, text: p.text, html: p.html });
        if (!dryRun) { await setEmailPref(m.userId, "digest", false); await sendMail(m.email, p.subject, p.html, p.text); }
        await cover(); run.paused++;
        continue;
      }
      const groups = digestGroups(theirs, locale, projectNames);
      if (!groups.length) { await cover(); run.skipped++; continue; }
      const foot = footOf(m.userId, "digest", team.name);
      // The button opens where most happened: the first group
      const d = digestMail({ summary: digestSummary(theirs, locale), url: groups[0].url, groups }, foot, locale);
      run.mails.push({ to: m.email, subject: d.subject, text: d.text, html: d.html });
      if (!dryRun) await sendMail(m.email, d.subject, d.html, d.text, { headers: unsubscribeHeaders(foot.stopUrl) });
      await cover(); run.sent++;
    }
  }
  return run;
}
