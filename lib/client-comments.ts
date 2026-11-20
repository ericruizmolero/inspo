// A client's comments on a share link (lib/share-guests.ts) reach the team by email soon after they are written, not
// only in the morning digest, which a workspace of one never gets. Who: clientReaders in lib/notify.ts, whoever made
// the link or, once they are gone, everyone in the workspace, with replies on; the digest leaves the comment out for them.
//
// Gathered, so a burst is one email: a comment asks for the link's email on a five-minute grid (a client writing
// several notes in a row lands in one), and a link sends at most one an hour (a client who keeps going all afternoon
// sends a handful, not forty). Each email covers what came since the last one, whose time is the claim on
// `client-comments:<shareId>` in app_setting (lib/mail-once.ts), so two deliveries of the job send once.
import "server-only";
import { and, asc, eq, gt, isNotNull, lte, type SQL } from "drizzle-orm";
import { db, schema } from "./db";
import { enqueue } from "./jobs";
import { claimEvery, giveBack, lastSent } from "./mail-once";
import { clientCommentsMail, sendMail } from "./mail";
import { baseUrl, clientCommentsKey, clientReaders, clip, mailPath, projectPath, unsubscribeUrl } from "./notify";
import { toLocale } from "./i18n/locale";
import { log } from "./log";

const C = schema.inspoComment, S = schema.systemShare, I = schema.inspoItem, M = schema.member, U = schema.user, O = schema.organization, P = schema.project;

/** How long a comment waits for the ones after it, and the grid its email lands on */
const GATHER = 5 * 60 * 1000;
/** At most one email per link this often */
export const CLIENT_MAIL_EVERY = 60 * 60 * 1000;
/** A link's first email reaches back this far at most: comments from before these emails existed are not news */
const FIRST_REACH = 24 * 60 * 60 * 1000;

export { clientCommentsKey };

/** When the link's next email goes: past the gather and an hour after the last one, on the gather's grid */
export function nextTellAt(now: Date, told: Date | null): Date {
  const at = Math.max(now.getTime() + GATHER, told ? told.getTime() + CLIENT_MAIL_EVERY : 0);
  return new Date(Math.ceil(at / GATHER) * GATHER);
}

/** The link's email at `at`: one message per link and time, so every comment of a burst asks for the same one */
function schedule(shareId: string, at: Date, now: Date): Promise<void> {
  return enqueue({ kind: "clientComments", shareId }, { delaySeconds: Math.ceil((at.getTime() - now.getTime()) / 1000), idempotencyKey: `${clientCommentsKey(shareId)}:${at.toISOString()}` });
}

/** A guest wrote through the link: its email is on its way */
export async function clientCommented(shareId: string, now = new Date()): Promise<void> {
  await schedule(shareId, nextTellAt(now, await lastSent(clientCommentsKey(shareId))), now);
}

/** The job: emails the link's readers what its guests wrote since its last email. Says how many emails went */
export async function tellClientComments(shareId: string, now = new Date()): Promise<number> {
  const [link] = await db.select({ organizationId: S.organizationId, projectId: S.projectId, label: S.label, by: S.createdBy }).from(S).where(eq(S.id, shareId)).limit(1);
  if (!link) return 0;
  const key = clientCommentsKey(shareId);
  const told = await lastSent(key);
  const fromGuests: SQL = and(eq(C.shareId, shareId), isNotNull(C.guestKey), gt(C.createdAt, told ?? new Date(now.getTime() - FIRST_REACH)), lte(C.createdAt, now))!;
  const [waiting] = await db.select({ id: C.id }).from(C).where(fromGuests).limit(1);
  if (!waiting) return 0;
  // Too soon after the last one: the link's next email takes these too
  if (told && now.getTime() - told.getTime() < CLIENT_MAIL_EVERY) { await schedule(shareId, nextTellAt(now, told), now); return 0; }
  if (!(await claimEvery(key, CLIENT_MAIL_EVERY, now))) return 0;

  const [comments, members, [project], [team]] = await Promise.all([
    db.select({ who: C.authorName, body: C.body, reference: I.name }).from(C).innerJoin(I, eq(I.id, C.itemId)).where(fromGuests).orderBy(asc(C.createdAt)),
    db.select({ userId: U.id, email: U.email, language: U.language, replies: U.replyEmails }).from(M).innerJoin(U, eq(U.id, M.userId)).where(eq(M.organizationId, link.organizationId)),
    db.select({ name: P.name }).from(P).where(eq(P.id, link.projectId)).limit(1),
    db.select({ name: O.name }).from(O).where(eq(O.id, link.organizationId)).limit(1),
  ]);
  const readers = clientReaders(link.by, members);
  if (!project || !readers.length) return 0;
  const url = `${baseUrl()}${mailPath(projectPath(link.projectId))}`;
  const said = comments.map((c) => ({ who: c.who, reference: c.reference, body: clip(c.body, 600) }));
  const sent = await Promise.all(readers.map(async (r) => {
    const foot = { team: team?.name ?? "", stopUrl: unsubscribeUrl(r.userId, "replies") };
    try {
      await sendMail(r.email, clientCommentsMail({ project: project.name, link: link.label, comments: said, url }, foot, toLocale(r.language)));
      return true;
    } catch (err) {
      log.warn("client_comments.not_sent", { ref: shareId, err });
      return false;
    }
  }));
  const n = sent.filter(Boolean).length;
  // Nobody got it: the claim goes back and the queue delivers the job again
  if (!n) { await giveBack(key, told, now); throw new Error("client comments: no email went"); }
  return n;
}
