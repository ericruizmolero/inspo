// Share links: a project's brand for anyone who has the address (/s/<token>). Unlisted and read only; any member makes
// or turns one off. Each link says which criterio.md it hands out: the whole file, or a clean one without the
// team's conversation and names.
import "server-only";
import { randomBytes } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { getErrors } from "./i18n";

const Sh = schema.systemShare;
const P = schema.project;
export type ShareMode = "clean" | "full";
export interface ShareLink { id: string; token: string; mode: ShareMode; label: string; createdBy: string | null; createdAt: string; lastViewedAt: string | null }

const toLink = (r: typeof Sh.$inferSelect & { by?: string | null }): ShareLink => ({
  id: r.id, token: r.token, mode: r.mode as ShareMode, label: r.label, createdBy: r.by ?? null, createdAt: r.createdAt.toISOString(), lastViewedAt: r.lastViewedAt?.toISOString() ?? null,
});

async function ownProject(organizationId: string, projectId: string) {
  const [p] = await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!p) throw new HttpError(404, (await getErrors()).projectNotFound);
}

export async function listShares(organizationId: string, projectId: string): Promise<ShareLink[]> {
  await ownProject(organizationId, projectId);
  const U = schema.user;
  const rows = await db.select({ s: Sh, by: U.name }).from(Sh).leftJoin(U, eq(U.id, Sh.createdBy))
    .where(and(eq(Sh.organizationId, organizationId), eq(Sh.projectId, projectId), isNull(Sh.revokedAt))).orderBy(desc(Sh.createdAt));
  return rows.map((r) => toLink({ ...r.s, by: r.by }));
}

export async function createShare(organizationId: string, projectId: string, mode: ShareMode, label: string, userId: string): Promise<ShareLink[]> {
  await ownProject(organizationId, projectId);
  await db.insert(Sh).values({ id: newId(), token: randomBytes(16).toString("base64url"), projectId, organizationId, mode: mode === "full" ? "full" : "clean", label: label.trim().slice(0, 80), createdBy: userId, createdAt: new Date() });
  return listShares(organizationId, projectId);
}

export async function revokeShare(organizationId: string, projectId: string, id: string): Promise<ShareLink[]> {
  await db.update(Sh).set({ revokedAt: new Date() }).where(and(eq(Sh.organizationId, organizationId), eq(Sh.projectId, projectId), eq(Sh.id, id)));
  return listShares(organizationId, projectId);
}

/** The live link behind an address, or null (unknown, turned off, or its project gone) */
export async function resolveShare(token: string): Promise<{ id: string; organizationId: string; projectId: string; mode: ShareMode } | null> {
  if (!/^[\w-]{16,64}$/.test(token)) return null;
  const [r] = await db.select({ id: Sh.id, organizationId: Sh.organizationId, projectId: Sh.projectId, mode: Sh.mode }).from(Sh).where(and(eq(Sh.token, token), isNull(Sh.revokedAt))).limit(1);
  return r ? { ...r, mode: r.mode as ShareMode } : null;
}

export async function markViewed(id: string): Promise<void> {
  await db.update(Sh).set({ lastViewedAt: new Date() }).where(eq(Sh.id, id)).catch(() => {});
}
