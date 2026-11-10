// The people a share link lets in, with no account: they comment on its references and choose among them (Eric,
// 10-11: "que cualquiera que entre se le ponga un avatar random y pueda comentar sobre las fichas", "elegir entre
// variantes"). Someone with the general address is a browser holding a random secret (its key is the secret's hash,
// so the key can be shown and the secret never is); an invited person is their own address (share_guest).
// What they write goes in the reference's own thread (inspo_comment, with guest_key and share_id), so the team reads
// it where it reads its own. On the link a guest sees what was written through that link and the team's answers to
// it, never the team's own conversation.
import "server-only";
import { createHash } from "crypto";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { getErrors } from "./i18n";
import { allow } from "./rate-limit";
import { groupReactions } from "./reactions";
import type { ResolvedShare } from "./share";
import type { InspoComment } from "@/types/inspo";

const C = schema.inspoComment;
const K = schema.sharePick;
const G = schema.shareGuest;
const PI = schema.projectItem;

export interface SharePick { itemId: string; key: string; name: string }
export interface ShareActivity { comments: InspoComment[]; picks: SharePick[] }

/** Who is writing: the invited person the address belongs to, or the browser's secret, hashed */
export function guestKeyOf(share: ResolvedShare, secret: unknown): string {
  if (share.guest) return share.guest.key;
  if (typeof secret !== "string" || !/^[\w-]{20,64}$/.test(secret)) throw new HttpError(400, "bad guest");
  return `anon:${createHash("sha256").update(secret).digest("base64url").slice(0, 24)}`;
}

export const cleanName = (name: unknown, fallback: string) => (typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 40) : "") || fallback;

/** The references the link shows, the archived ones out (lib/share-board.ts reads them the same way) */
async function onLink(share: ResolvedShare): Promise<Set<string>> {
  const rows = await db.select({ id: PI.itemId }).from(PI)
    .where(and(eq(PI.organizationId, share.organizationId), eq(PI.projectId, share.projectId), isNull(PI.archivedAt)));
  const live = rows.map((r) => r.id);
  return new Set(share.itemIds ? share.itemIds.filter((id) => live.includes(id)) : live);
}

async function mustBeOn(share: ResolvedShare, itemId: string) {
  if (!(await onLink(share)).has(itemId)) throw new HttpError(400, (await getErrors()).shareNotOnBoard);
}

/** What was said and chosen through this link: its comments, the team's answers to them, and the picks */
export async function shareActivity(share: ResolvedShare): Promise<ShareActivity> {
  const ids = [...(await onLink(share))];
  if (!ids.length) return { comments: [], picks: [] };
  const rows = await db.select({ id: C.id, itemId: C.itemId, authorId: C.authorId, authorName: C.authorName, body: C.body, createdAt: C.createdAt, parentId: C.parentId, reactions: C.reactions, guestKey: C.guestKey, shareId: C.shareId })
    .from(C).where(and(eq(C.organizationId, share.organizationId), inArray(C.itemId, ids))).orderBy(asc(C.createdAt));
  const ours = new Set(rows.filter((r) => r.shareId === share.id).map((r) => r.id));
  const comments: InspoComment[] = rows.filter((r) => ours.has(r.id) || (r.parentId && ours.has(r.parentId))).map((r) => ({
    id: r.id, itemId: r.itemId,
    // A guest by their key (the hash, never the secret); a member by nothing of theirs: no id, no picture from afar
    authorId: r.guestKey ?? "team", authorName: r.authorName, authorImage: null, body: r.body, attachments: [],
    ...(r.parentId ? { parentId: r.parentId } : {}),
    ...(Array.isArray(r.reactions) && r.reactions.length ? { reactions: groupReactions(r.reactions) } : {}),
    ...(r.guestKey ? { guest: true } : {}),
    createdAt: r.createdAt.toISOString(),
  }));
  const picks = await db.select({ itemId: K.itemId, key: K.guestKey, name: K.name }).from(K).where(eq(K.shareId, share.id)).orderBy(asc(K.createdAt));
  return { comments, picks: picks.filter((p) => ids.includes(p.itemId)) };
}

async function limited(share: ResolvedShare, key: string) {
  // A link is public: thirty messages or picks in ten minutes per person, three hundred per link
  const ok = (await allow(`share:${share.id}:${key}`, 30, 600_000)) && (await allow(`share:${share.id}`, 300, 600_000));
  if (!ok) throw new HttpError(429, (await getErrors()).shareTooMany);
}

export async function postGuestComment(share: ResolvedShare, secret: unknown, input: { itemId: string; body: string; parentId?: string | null; name: unknown }): Promise<void> {
  const errors = await getErrors();
  const key = guestKeyOf(share, secret);
  const body = String(input.body ?? "").trim().slice(0, 4000);
  if (!body) throw new HttpError(400, errors.emptyComment);
  await mustBeOn(share, input.itemId);
  await limited(share, key);
  let parentId: string | null = null;
  if (input.parentId) {
    // An answer goes under a comment of this link on the same reference
    const [parent] = await db.select({ id: C.id, parentId: C.parentId }).from(C)
      .where(and(eq(C.id, String(input.parentId)), eq(C.itemId, input.itemId), eq(C.shareId, share.id))).limit(1);
    if (!parent || parent.parentId) throw new HttpError(400, errors.replyGone);
    parentId = parent.id;
  }
  const name = share.guest ? share.guest.name : cleanName(input.name, "Guest");
  await db.insert(C).values({ id: newId(), organizationId: share.organizationId, itemId: input.itemId, authorId: null, authorName: name, body, attachments: [], reactions: [], parentId, guestKey: key, shareId: share.id, createdAt: new Date(), editedAt: null });
}

/** A guest takes back what they wrote, and the answers under it go with it */
export async function deleteGuestComment(share: ResolvedShare, secret: unknown, id: string): Promise<void> {
  const key = guestKeyOf(share, secret);
  await db.delete(C).where(and(eq(C.id, String(id)), eq(C.shareId, share.id), eq(C.guestKey, key)));
}

/** Chooses a reference, or takes the choice back */
export async function toggleGuestPick(share: ResolvedShare, secret: unknown, itemId: string, name: unknown): Promise<void> {
  const key = guestKeyOf(share, secret);
  await mustBeOn(share, itemId);
  await limited(share, key);
  const where = and(eq(K.shareId, share.id), eq(K.guestKey, key), eq(K.itemId, itemId));
  const [had] = await db.select({ itemId: K.itemId }).from(K).where(where).limit(1);
  if (had) await db.delete(K).where(where);
  else await db.insert(K).values({ shareId: share.id, itemId, guestKey: key, name: share.guest ? share.guest.name : cleanName(name, "Guest"), createdAt: new Date() }).onConflictDoNothing();
}

/** A guest says their name: from now on it signs what they write and choose, and their picks take it too */
export async function renameGuest(share: ResolvedShare, secret: unknown, name: unknown): Promise<string> {
  const key = guestKeyOf(share, secret);
  const clean = cleanName(name, share.guest?.name ?? "Guest");
  if (share.guest) await db.update(G).set({ name: clean }).where(eq(G.id, share.guest.id));
  await db.update(K).set({ name: clean }).where(and(eq(K.shareId, share.id), eq(K.guestKey, key)));
  // What they already wrote keeps the name it was written with, as a member's comment does
  return clean;
}
