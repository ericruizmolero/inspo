// A project's board as it stood after each change: which references were on it, and what came in and went out.
// Every door that files or unfiles goes through lib/projects.ts (fileItems, unfileItems) or the polish's own exit,
// and each calls boardChanged after its write, so the app, the extension, an agent over MCP and the polish all leave
// a version. Changes by the same person through the same door within GROUP_MS are one version, as criterio.md's are
// (lib/criterio-versions.ts). The first change also keeps the board as it was before it, so there is always
// somewhere to go back to. Restoring files and unfiles to match a version, and is a version of its own.
import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { log, requestPerson } from "./log";

const V = schema.boardVersion;
const PI = schema.projectItem;
export const BOARD_GROUP_MS = 5 * 60_000;

export interface BoardVersionRow {
  n: number;
  /** How many references the board had */
  count: number;
  added: string[];
  removed: string[];
  byName: string | null;
  byImage: string | null;
  via: string;
  at: string;
}

export interface BoardBy { id?: string | null; name?: string | null; via?: string }

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === new Set([...a, ...b]).size;
const minus = (a: readonly string[], b: readonly string[]) => { const s = new Set(b); return a.filter((x) => !s.has(x)); };

async function boardNow(organizationId: string, projectId: string): Promise<string[]> {
  const rows = await db.select({ id: PI.itemId }).from(PI).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))).orderBy(asc(PI.createdAt));
  return rows.map((r) => r.id);
}

/** Who made a change: what the caller says, else the request's person (the app's session, the MCP's token) */
async function whoOf(by: BoardBy | undefined): Promise<{ id: string | null; name: string | null; via: string }> {
  const req = await requestPerson();
  const id = by?.id ?? req.userId ?? null;
  let name = by?.name ?? null;
  if (!name && id) {
    const [u] = await db.select({ name: schema.user.name, email: schema.user.email }).from(schema.user).where(eq(schema.user.id, id)).limit(1);
    name = u ? u.name || u.email : null;
  }
  return { id, name, via: by?.via ?? req.via ?? "app" };
}

/**
 * Keeps the board as it stands now, after a change. `change` says what the change filed and unfiled, so the first
 * version can be the board before it. Never throws: a version not kept must not undo the change itself.
 */
export async function boardChanged(organizationId: string, projectId: string, change: { added?: readonly string[]; removed?: readonly string[] } = {}, by?: BoardBy): Promise<void> {
  try {
    // Only a project of this workspace: an unfile aimed at another one's board writes nothing, and keeps nothing either
    const [own] = await db.select({ id: schema.project.id }).from(schema.project).where(and(eq(schema.project.organizationId, organizationId), eq(schema.project.id, projectId))).limit(1);
    if (!own) return;
    const now = await boardNow(organizationId, projectId);
    const [last] = await db.select().from(V).where(and(eq(V.organizationId, organizationId), eq(V.projectId, projectId))).orderBy(desc(V.n)).limit(1);
    if (last && same(last.itemIds, now)) return;
    const who = await whoOf(by);
    const at = new Date();
    if (!last) {
      const before = [...minus(now, change.added ?? []), ...(change.removed ?? []).filter((id) => !now.includes(id))];
      let n = 1;
      if (before.length && !same(before, now)) {
        await db.insert(V).values({ id: newId(), organizationId, projectId, n: 1, itemIds: before, added: [], removed: [], byName: null, byId: null, via: "start", createdAt: at }).onConflictDoNothing();
        n = 2;
      }
      const base = n === 2 ? before : [];
      await db.insert(V).values({ id: newId(), organizationId, projectId, n, itemIds: now, added: minus(now, base), removed: minus(base, now), byName: who.name, byId: who.id, via: who.via, createdAt: at }).onConflictDoNothing();
      return;
    }
    // The same person through the same door a moment ago: one version, measured against the one before it
    if (last.byId && last.byId === who.id && last.via === who.via && at.getTime() - last.createdAt.getTime() < BOARD_GROUP_MS) {
      const [prev] = await db.select({ itemIds: V.itemIds }).from(V).where(and(eq(V.projectId, projectId), eq(V.n, last.n - 1))).limit(1);
      const base = prev?.itemIds ?? [];
      await db.update(V).set({ itemIds: now, added: minus(now, base), removed: minus(base, now), createdAt: at }).where(eq(V.id, last.id));
      return;
    }
    await db.insert(V).values({ id: newId(), organizationId, projectId, n: last.n + 1, itemIds: now, added: minus(now, last.itemIds), removed: minus(last.itemIds, now), byName: who.name, byId: who.id, via: who.via, createdAt: at }).onConflictDoNothing();
  } catch (err) {
    log.warn("board.version_failed", { ref: projectId, err });
  }
}

/** The board's versions, newest first, with the face of who made each */
export async function listBoardVersions(organizationId: string, projectId: string): Promise<BoardVersionRow[]> {
  const U = schema.user;
  const rows = await db.select({ n: V.n, itemIds: V.itemIds, added: V.added, removed: V.removed, byName: V.byName, byImage: U.image, via: V.via, at: V.createdAt })
    .from(V).leftJoin(U, eq(U.id, V.byId))
    .where(and(eq(V.organizationId, organizationId), eq(V.projectId, projectId))).orderBy(desc(V.n)).limit(200);
  return rows.map(({ itemIds, ...r }) => ({ ...r, count: itemIds.length, at: r.at.toISOString() }));
}

/** One version's references, oldest first */
export async function boardVersionItems(organizationId: string, projectId: string, n: number): Promise<string[]> {
  const [row] = await db.select({ itemIds: V.itemIds }).from(V).where(and(eq(V.organizationId, organizationId), eq(V.projectId, projectId), eq(V.n, n))).limit(1);
  if (!row) throw new HttpError(404, "That version is not there.");
  return row.itemIds;
}

/**
 * Puts the board back as a version had it: what it had and is gone comes back, what came after goes off the board
 * (it stays in the library). A reference deleted from the library since cannot come back, and is counted.
 */
export async function restoreBoardVersion(organizationId: string, projectId: string, n: number, by: { id: string; name: string }): Promise<{ itemIds: string[]; missing: number }> {
  const { fileItems, unfileItems } = await import("./projects");
  const want = await boardVersionItems(organizationId, projectId, n);
  const alive = want.length ? (await db.select({ id: schema.inspoItem.id }).from(schema.inspoItem)
    .where(and(eq(schema.inspoItem.organizationId, organizationId), inArray(schema.inspoItem.id, want)))).map((r) => r.id) : [];
  const keep = want.filter((id) => alive.includes(id));
  const now = await boardNow(organizationId, projectId);
  const add = minus(keep, now), drop = minus(now, keep);
  await fileItems(organizationId, projectId, add, by.id, { quiet: true });
  await unfileItems(organizationId, projectId, drop, { quiet: true });
  await boardChanged(organizationId, projectId, { added: add, removed: drop }, { ...by, via: `restore:${n}` });
  return { itemIds: keep, missing: want.length - keep.length };
}
