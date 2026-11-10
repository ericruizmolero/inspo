// Share links: a project's board for the people outside the team (/s/<token>), a deliverable they can comment on
// and choose from. Unlisted; any member makes one or turns it off. Each link says what it shows (the whole board or
// some of its references; clean, or with who saved each one and their note) and who gets in: anyone with the
// address, or only the people invited by email, each with an address of their own (share_guest).
import "server-only";
import { randomBytes } from "crypto";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { getErrors } from "./i18n";
import { log } from "./log";

const Sh = schema.systemShare;
const G = schema.shareGuest;
const P = schema.project;
const C = schema.inspoComment;
const K = schema.sharePick;
export type ShareMode = "clean" | "full";
export type ShareAccess = "link" | "invite";
export interface ShareGuestRow { id: string; email: string; name: string; token: string; lastSeenAt: string | null }
export interface ShareLink {
  id: string; token: string; mode: ShareMode; access: ShareAccess; label: string; subtitle: string;
  /** The references it shows; null: the whole board */
  itemIds: string[] | null;
  guests: ShareGuestRow[];
  /** What came back through it: comments written and references chosen */
  comments: number; picks: number;
  createdBy: string | null; createdAt: string; lastViewedAt: string | null;
}
export interface NewShare { mode: ShareMode; access: ShareAccess; label: string; subtitle?: string; itemIds: string[] | null; emails: string[] }

/** At most this many people invited to one link at once */
export const MAX_GUESTS = 30;
const token = () => randomBytes(16).toString("base64url");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The name an invited person goes by until they say theirs: what comes before the @, capitalized */
export const nameFromEmail = (email: string) => { const n = email.split("@")[0].replace(/[._-]+/g, " ").trim(); return n ? n[0].toUpperCase() + n.slice(1) : email; };

async function ownProject(organizationId: string, projectId: string) {
  const [p] = await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!p) throw new HttpError(404, (await getErrors()).projectNotFound);
}

export async function listShares(organizationId: string, projectId: string): Promise<ShareLink[]> {
  await ownProject(organizationId, projectId);
  const U = schema.user;
  const rows = await db.select({ s: Sh, by: U.name }).from(Sh).leftJoin(U, eq(U.id, Sh.createdBy))
    .where(and(eq(Sh.organizationId, organizationId), eq(Sh.projectId, projectId), isNull(Sh.revokedAt))).orderBy(desc(Sh.createdAt));
  const ids = rows.map((r) => r.s.id);
  const [guests, comments, picks] = ids.length ? await Promise.all([
    db.select().from(G).where(and(inArray(G.shareId, ids), isNull(G.revokedAt))).orderBy(G.createdAt),
    db.select({ id: C.shareId, n: count() }).from(C).where(inArray(C.shareId, ids)).groupBy(C.shareId),
    db.select({ id: K.shareId, n: count() }).from(K).where(inArray(K.shareId, ids)).groupBy(K.shareId),
  ]) : [[], [], []];
  const nOf = (list: { id: string | null; n: number }[], id: string) => Number(list.find((x) => x.id === id)?.n ?? 0);
  return rows.map(({ s, by }) => ({
    id: s.id, token: s.token, mode: s.mode as ShareMode, access: (s.access === "invite" ? "invite" : "link") as ShareAccess, label: s.label, subtitle: s.subtitle,
    itemIds: Array.isArray(s.itemIds) ? s.itemIds : null,
    guests: guests.filter((g) => g.shareId === s.id).map((g) => ({ id: g.id, email: g.email, name: g.name, token: g.token, lastSeenAt: g.lastSeenAt?.toISOString() ?? null })),
    comments: nOf(comments, s.id), picks: nOf(picks, s.id),
    createdBy: by ?? null, createdAt: s.createdAt.toISOString(), lastViewedAt: s.lastViewedAt?.toISOString() ?? null,
  }));
}

/** Only references of this project's board, in the order given, and no repeats */
async function boardIds(organizationId: string, projectId: string, ids: string[]): Promise<string[]> {
  const PI = schema.projectItem;
  const wanted = [...new Set(ids.map(String))].slice(0, 2000);
  if (!wanted.length) return [];
  const rows = await db.select({ id: PI.itemId }).from(PI)
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), inArray(PI.itemId, wanted)));
  const on = new Set(rows.map((r) => r.id));
  return wanted.filter((id) => on.has(id));
}

/** The emails to invite: well formed, lower case, each once, at most MAX_GUESTS */
export function cleanEmails(input: unknown): string[] {
  const list = Array.isArray(input) ? input : typeof input === "string" ? input.split(/[\s,;]+/) : [];
  return [...new Set(list.map((e) => String(e).trim().toLowerCase()).filter((e) => EMAIL.test(e) && e.length <= 200))].slice(0, MAX_GUESTS);
}

/** Makes a link. Returns the list, the new one first, and the people it has to write to (lib/share-mail.ts) */
export async function createShare(organizationId: string, projectId: string, input: NewShare, userId: string): Promise<{ links: ShareLink[]; invited: ShareGuestRow[] }> {
  await ownProject(organizationId, projectId);
  const errors = await getErrors();
  const itemIds = input.itemIds ? await boardIds(organizationId, projectId, input.itemIds) : null;
  if (itemIds && !itemIds.length) throw new HttpError(400, errors.shareNothingPicked);
  const emails = input.access === "invite" ? cleanEmails(input.emails) : [];
  if (input.access === "invite" && !emails.length) throw new HttpError(400, errors.shareNoGuests);
  const id = newId();
  const now = new Date();
  await db.insert(Sh).values({ id, token: token(), projectId, organizationId, mode: input.mode === "full" ? "full" : "clean", access: input.access === "invite" ? "invite" : "link", itemIds, label: input.label.trim().slice(0, 80), subtitle: (input.subtitle ?? "").replace(/\s+/g, " ").trim().slice(0, 200), createdBy: userId, createdAt: now });
  const invited = emails.map((email) => ({ id: newId(), email, name: nameFromEmail(email), token: token(), lastSeenAt: null }));
  if (invited.length) await db.insert(G).values(invited.map((g) => ({ ...g, shareId: id, organizationId, createdAt: now })));
  return { links: await listShares(organizationId, projectId), invited };
}

/** More people for a link that already exists. Someone already on it is not invited twice */
export async function inviteToShare(organizationId: string, projectId: string, shareId: string, input: unknown): Promise<{ links: ShareLink[]; invited: ShareGuestRow[] }> {
  await ownProject(organizationId, projectId);
  const [share] = await db.select({ id: Sh.id }).from(Sh).where(and(eq(Sh.organizationId, organizationId), eq(Sh.projectId, projectId), eq(Sh.id, shareId), isNull(Sh.revokedAt))).limit(1);
  if (!share) throw new HttpError(404, (await getErrors()).shareGone);
  const have = new Set((await db.select({ email: G.email }).from(G).where(and(eq(G.shareId, shareId), isNull(G.revokedAt)))).map((g) => g.email));
  const emails = cleanEmails(input).filter((e) => !have.has(e)).slice(0, Math.max(0, MAX_GUESTS - have.size));
  const invited = emails.map((email) => ({ id: newId(), email, name: nameFromEmail(email), token: token(), lastSeenAt: null }));
  if (invited.length) await db.insert(G).values(invited.map((g) => ({ ...g, shareId, organizationId, createdAt: new Date() })));
  return { links: await listShares(organizationId, projectId), invited };
}

export async function uninviteFromShare(organizationId: string, projectId: string, guestId: string): Promise<ShareLink[]> {
  await db.update(G).set({ revokedAt: new Date() }).where(and(eq(G.organizationId, organizationId), eq(G.id, guestId)));
  return listShares(organizationId, projectId);
}

export async function revokeShare(organizationId: string, projectId: string, id: string): Promise<ShareLink[]> {
  await db.update(Sh).set({ revokedAt: new Date() }).where(and(eq(Sh.organizationId, organizationId), eq(Sh.projectId, projectId), eq(Sh.id, id)));
  return listShares(organizationId, projectId);
}

export interface ResolvedShare {
  id: string; organizationId: string; projectId: string; mode: ShareMode; itemIds: string[] | null; subtitle: string;
  /** Who is in, when the address is an invited person's own: their key on what they write, and their name */
  guest: { id: string; key: string; name: string } | null;
}

/** The live link behind an address, or null (unknown, turned off, its project gone, or a link for invited people
 *  opened by its general address). The address is the link's own, or one invited person's */
export async function resolveShare(token: string): Promise<ResolvedShare | null> {
  if (!/^[\w-]{16,64}$/.test(token)) return null;
  const cols = { id: Sh.id, organizationId: Sh.organizationId, projectId: Sh.projectId, mode: Sh.mode, itemIds: Sh.itemIds, access: Sh.access, subtitle: Sh.subtitle };
  const [r] = await db.select(cols).from(Sh).where(and(eq(Sh.token, token), isNull(Sh.revokedAt))).limit(1);
  if (r) return r.access === "invite" ? null : { ...r, mode: r.mode as ShareMode, itemIds: Array.isArray(r.itemIds) ? r.itemIds : null, guest: null };
  const [g] = await db.select({ ...cols, guestId: G.id, guestName: G.name }).from(G).innerJoin(Sh, eq(Sh.id, G.shareId))
    .where(and(eq(G.token, token), isNull(G.revokedAt), isNull(Sh.revokedAt))).limit(1);
  if (!g) return null;
  return { id: g.id, organizationId: g.organizationId, projectId: g.projectId, mode: g.mode as ShareMode, subtitle: g.subtitle, itemIds: Array.isArray(g.itemIds) ? g.itemIds : null, guest: { id: g.guestId, key: `inv:${g.guestId}`, name: g.guestName } };
}

export async function markViewed(share: ResolvedShare): Promise<void> {
  const now = new Date();
  await Promise.all([
    db.update(Sh).set({ lastViewedAt: now }).where(eq(Sh.id, share.id)),
    share.guest ? db.update(G).set({ lastSeenAt: now }).where(eq(G.id, share.guest.id)) : null,
  ]).catch((err) => log.warn("share.view_not_marked", { ref: share.id, err }));
}
