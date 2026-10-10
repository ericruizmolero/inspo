// The open board's one request (POST /api/pulse): what changed in its workspace since it last looked, and whether
// the bell has news. Deleted rows come from library_tombstone, which triggers fill on every delete.
import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { bellOf, boardState, itemsChangedSince, readStamp, STAMP_PARTS } from "./library";
import { commentsSince } from "./comments";
import type { Pulse } from "@/types/inspo";
import type { SessionUser, Workspace } from "./workspace-core";

/** How long a deleted row is remembered. A board whose last look is older reloads its library */
export const TOMBSTONE_DAYS = 7;
/** A write is stamped when its transaction starts and seen when it commits: a look reaches this far behind `since`,
 *  so a transaction that commits after a later one is not missed. A row seen twice merges to the same state */
export const OVERLAP_MS = 5_000;

const DAY = 24 * 60 * 60 * 1000;

/** What the board sent back from its last answer */
export interface PulseAsk { stamp?: unknown; since?: unknown; bell?: unknown }

export async function pulse(user: SessionUser, ws: Workspace, ask: PulseAsk): Promise<Pulse> {
  const [head, bell] = await Promise.all([readStamp(ws.id), bellOf(ws, user.id)]);
  const out: Pulse = { ...head };
  if (bell !== ask.bell) out.bell = bell;
  if (head.stamp === ask.stamp) return out;
  const from = typeof ask.since === "string" ? Date.parse(ask.since) : NaN;
  if (!Number.isFinite(from) || Date.now() - from > TOMBSTONE_DAYS * DAY) return { ...out, reload: true };

  const after = new Date(from - OVERLAP_MS);
  const was = typeof ask.stamp === "string" ? ask.stamp.split("|") : [];
  const now = head.stamp.split("|");
  const moved = (part: (typeof STAMP_PARTS)[number]) => was[STAMP_PARTS.indexOf(part)] !== now[STAMP_PARTS.indexOf(part)];
  const board = moved("projects") || moved("links") || moved("votes") ? boardState(ws.id) : null;
  const L = schema.libraryTombstone;
  const [changed, comments, stones, b] = await Promise.all([
    itemsChangedSince(ws.id, after),
    commentsSince(ws.id, after),
    db.select({ kind: L.kind, id: L.id }).from(L).where(and(eq(L.organizationId, ws.id), gt(L.deletedAt, after))),
    board,
  ]);
  if (changed.items.length) out.changed = changed;
  if (comments.length) out.comments = comments;
  if (stones.length) out.gone = { items: stones.filter((s) => s.kind === "item").map((s) => s.id), comments: stones.filter((s) => s.kind === "comment").map((s) => s.id) };
  if (b && moved("projects")) out.projects = b.projects;
  if (b && moved("links")) out.links = b.links;
  if (b && moved("votes")) out.votes = b.votes;
  return out;
}

/** The morning cron's cleanup */
export async function pruneTombstones(): Promise<number> {
  const { rowCount } = await db.execute(sql`delete from library_tombstone where deleted_at < now() - make_interval(days => ${TOMBSTONE_DAYS})`);
  return rowCount ?? 0;
}
