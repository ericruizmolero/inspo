// Browser extension access keys (ext_key table).
// The full key is shown only once on creation; the database keeps only its
// SHA-256. Each key grants access to ONE workspace on behalf of the person who created it, as long as
// that person is still a member and the key isn't revoked.
import "server-only";
import { createHash, randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { isMember, listWorkspaces, newId, type SessionUser, type Workspace } from "./workspace-core";
import { toLocale } from "./i18n/locale";
import { getErrors } from "./i18n";

const T = schema.extKey;
export const KEY_PREFIX = "crit_";
/** How often lastUsedAt is written (no need for one write per request) */
const TOUCH_EVERY_MS = 5 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface ExtKeyRow {
  id: string; prefix: string; name: string; userId: string; organizationId: string;
  createdAt: Date; lastUsedAt: Date | null; revokedAt: Date | null;
}

/** Creates a key for (user, workspace). Returns the plain key: the only time it exists. */
export async function createExtKey(userId: string, organizationId: string, name: string): Promise<{ key: string; row: ExtKeyRow }> {
  if (!(await isMember(organizationId, userId))) throw new Error((await getErrors()).notAMember);
  const key = KEY_PREFIX + randomBytes(24).toString("base64url"); // crit_ + 32 characters
  const row = {
    id: newId(), hash: sha256(key), prefix: key.slice(0, KEY_PREFIX.length + 6),
    name: name.trim().slice(0, 60), userId, organizationId,
    createdAt: new Date(), lastUsedAt: null, revokedAt: null,
  };
  await db.insert(T).values(row);
  const { hash: _h, ...pub } = row;
  return { key, row: pub };
}

/** A workspace's active keys, with the creator's name (for the members settings). */
export async function listExtKeys(organizationId: string) {
  return db
    .select({ id: T.id, prefix: T.prefix, name: T.name, userId: T.userId, userName: schema.user.name, createdAt: T.createdAt, lastUsedAt: T.lastUsedAt })
    .from(T)
    .innerJoin(schema.user, eq(T.userId, schema.user.id))
    .where(and(eq(T.organizationId, organizationId), isNull(T.revokedAt)))
    .orderBy(T.createdAt);
}

/** Revokes a key. Its owner or a workspace admin can revoke it (the caller decides). */
export async function revokeExtKey(id: string, allow: (row: { userId: string; organizationId: string }) => boolean): Promise<"ok" | "not_found" | "forbidden"> {
  const [row] = await db.select({ userId: T.userId, organizationId: T.organizationId, revokedAt: T.revokedAt }).from(T).where(eq(T.id, id)).limit(1);
  if (!row || row.revokedAt) return "not_found";
  if (!allow(row)) return "forbidden";
  await db.update(T).set({ revokedAt: new Date() }).where(eq(T.id, id));
  return "ok";
}

export interface ExtCtx { user: SessionUser; workspace: Workspace; workspaces: Workspace[]; keyId: string }

/**
 * Authenticates an extension request by the `Authorization: Bearer crit_…` header.
 * The key belongs to the person, and opens every workspace they are in: `wanted` (the
 * X-Workspace header) picks one, otherwise the workspace the key was created in.
 * Returns null if the key doesn't exist, is revoked, or the person has no workspace left;
 * "forbidden" if `wanted` is not one of theirs.
 */
export async function authByExtKey(authorization: string | null, wanted?: string | null): Promise<ExtCtx | null | "forbidden"> {
  const m = /^Bearer\s+(crit_[A-Za-z0-9_-]{20,})$/.exec(authorization ?? "");
  if (!m) return null;
  const [row] = await db.select().from(T).where(eq(T.hash, sha256(m[1]))).limit(1);
  if (!row || row.revokedAt) return null;

  const [u] = await db.select({ id: schema.user.id, name: schema.user.name, email: schema.user.email, image: schema.user.image, language: schema.user.language })
    .from(schema.user).where(eq(schema.user.id, row.userId)).limit(1);
  if (!u) return null;
  const workspaces = await listWorkspaces(u.id);
  if (workspaces.length === 0) return null;
  let workspace: Workspace | undefined;
  if (wanted) {
    workspace = workspaces.find((w) => w.id === wanted);
    if (!workspace) return "forbidden";
  } else {
    workspace = workspaces.find((w) => w.id === row.organizationId) ?? workspaces.find((w) => w.kind === "personal") ?? workspaces[0];
  }

  if (!row.lastUsedAt || Date.now() - +row.lastUsedAt > TOUCH_EVERY_MS) {
    void db.update(T).set({ lastUsedAt: new Date() }).where(eq(T.id, row.id)).catch(() => {});
  }
  return { user: { ...u, language: toLocale(u.language) }, workspace, workspaces, keyId: row.id };
}

/** For /api/ext route handlers: context, or a 401 (bad key) / 403 (workspace not theirs) Response. */
export async function requireExtCtx(req: Request): Promise<ExtCtx | Response> {
  const ctx = await authByExtKey(req.headers.get("authorization"), req.headers.get("x-workspace"));
  if (!ctx) return Response.json({ error: (await getErrors()).badKey }, { status: 401 });
  if (ctx === "forbidden") return Response.json({ error: (await getErrors()).workspaceNotYours }, { status: 403 });
  return ctx;
}
