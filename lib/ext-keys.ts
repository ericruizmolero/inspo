// Llaves de acceso de la extensión del navegador (tabla ext_key).
// La llave completa se enseña una sola vez al crearla; en la base de datos solo queda su
// SHA-256. Cada llave da acceso a UN workspace en nombre de la persona que la creó, mientras
// esa persona siga siendo miembro y la llave no esté revocada.
import "server-only";
import { createHash, randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { isMember, listWorkspaces, newId, type SessionUser, type Workspace } from "./workspace-core";
import { toLocale } from "./i18n/locale";
import { getErrors } from "./i18n";

const T = schema.extKey;
export const KEY_PREFIX = "crit_";
/** Con cuánta frecuencia se apunta lastUsedAt (no hace falta una escritura por petición) */
const TOUCH_EVERY_MS = 5 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface ExtKeyRow {
  id: string; prefix: string; name: string; userId: string; organizationId: string;
  createdAt: Date; lastUsedAt: Date | null; revokedAt: Date | null;
}

/** Crea una llave para (usuario, workspace). Devuelve la llave en claro: es la única vez que existe. */
export async function createExtKey(userId: string, organizationId: string, name: string): Promise<{ key: string; row: ExtKeyRow }> {
  if (!(await isMember(organizationId, userId))) throw new Error((await getErrors()).notAMember);
  const key = KEY_PREFIX + randomBytes(24).toString("base64url"); // crit_ + 32 caracteres
  const row = {
    id: newId(), hash: sha256(key), prefix: key.slice(0, KEY_PREFIX.length + 6),
    name: name.trim().slice(0, 60), userId, organizationId,
    createdAt: new Date(), lastUsedAt: null, revokedAt: null,
  };
  await db.insert(T).values(row);
  const { hash: _h, ...pub } = row;
  return { key, row: pub };
}

/** Llaves activas de un workspace, con el nombre de quien las creó (para /equipo). */
export async function listExtKeys(organizationId: string) {
  return db
    .select({ id: T.id, prefix: T.prefix, name: T.name, userId: T.userId, userName: schema.user.name, createdAt: T.createdAt, lastUsedAt: T.lastUsedAt })
    .from(T)
    .innerJoin(schema.user, eq(T.userId, schema.user.id))
    .where(and(eq(T.organizationId, organizationId), isNull(T.revokedAt)))
    .orderBy(T.createdAt);
}

/** Revoca una llave. La puede revocar su dueño o un admin del workspace (lo decide quien llama). */
export async function revokeExtKey(id: string, allow: (row: { userId: string; organizationId: string }) => boolean): Promise<"ok" | "not_found" | "forbidden"> {
  const [row] = await db.select({ userId: T.userId, organizationId: T.organizationId, revokedAt: T.revokedAt }).from(T).where(eq(T.id, id)).limit(1);
  if (!row || row.revokedAt) return "not_found";
  if (!allow(row)) return "forbidden";
  await db.update(T).set({ revokedAt: new Date() }).where(eq(T.id, id));
  return "ok";
}

export interface ExtCtx { user: SessionUser; workspace: Workspace; keyId: string }

/**
 * Autentica una petición de la extensión por la cabecera `Authorization: Bearer crit_…`.
 * Devuelve null si la llave no existe, está revocada, o la persona ya no está en el workspace.
 */
export async function authByExtKey(authorization: string | null): Promise<ExtCtx | null> {
  const m = /^Bearer\s+(crit_[A-Za-z0-9_-]{20,})$/.exec(authorization ?? "");
  if (!m) return null;
  const [row] = await db.select().from(T).where(eq(T.hash, sha256(m[1]))).limit(1);
  if (!row || row.revokedAt) return null;

  const [u] = await db.select({ id: schema.user.id, name: schema.user.name, email: schema.user.email, image: schema.user.image, language: schema.user.language })
    .from(schema.user).where(eq(schema.user.id, row.userId)).limit(1);
  if (!u) return null;
  const workspace = (await listWorkspaces(u.id)).find((w) => w.id === row.organizationId);
  if (!workspace) return null; // ya no es miembro: la llave deja de valer sola

  if (!row.lastUsedAt || Date.now() - +row.lastUsedAt > TOUCH_EVERY_MS) {
    void db.update(T).set({ lastUsedAt: new Date() }).where(eq(T.id, row.id)).catch(() => {});
  }
  return { user: { ...u, language: toLocale(u.language) }, workspace, keyId: row.id };
}

/** Para route handlers de /api/ext: contexto o Response 401. */
export async function requireExtCtx(req: Request): Promise<ExtCtx | Response> {
  const ctx = await authByExtKey(req.headers.get("authorization"));
  if (!ctx) return Response.json({ error: (await getErrors()).badKey }, { status: 401 });
  return ctx;
}
