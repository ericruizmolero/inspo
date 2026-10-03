// Projects: spaces inside a workspace to file references (schema.project / schema.projectItem).
// Always scoped to a workspace; an item in no project is in the Inbox.
import "server-only";
import { and, asc, eq, inArray, sql, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { getErrors } from "./i18n";
import { HttpError, newId } from "./workspace-core";
import type { Project, ProjectLinks } from "@/types/inspo";
import { dropSpace, dropFromSpace } from "./canvas";

const P = schema.project;
const PI = schema.projectItem;

const MAX_NAME = 60;

async function cleanName(name: string): Promise<string> {
  const n = String(name ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_NAME);
  if (!n) throw new HttpError(400, (await getErrors()).projectNameRequired);
  return n;
}

/**
 * The workspace's projects, oldest first, and which items are in each: two queries. `links` is
 * the board of each project; `shelf` what Polish archived (still the project's, off the board).
 */
export async function loadProjects(organizationId: string): Promise<{ projects: Project[]; links: ProjectLinks; shelf: ProjectLinks }> {
  const [projects, rows] = await Promise.all([
    db.select({ id: P.id, name: P.name, intent: sql<string | null>`${P.polish}->'brief'->>'about'`, clientItemId: sql<string | null>`${P.polish}->'brief'->>'clientItemId'`, hasRecipe: sql<boolean>`${P.recipe} <> ''` }).from(P).where(and(eq(P.organizationId, organizationId), isNull(P.template))).orderBy(asc(P.createdAt)),
    db.select({ projectId: PI.projectId, itemId: PI.itemId, archivedAt: PI.archivedAt }).from(PI).where(eq(PI.organizationId, organizationId)),
  ]);
  const links: ProjectLinks = {};
  const shelf: ProjectLinks = {};
  for (const r of rows) ((r.archivedAt ? shelf : links)[r.itemId] ??= []).push(r.projectId);
  return { projects, links, shelf };
}

export async function createProject(organizationId: string, name: string, userId: string): Promise<Project> {
  const now = new Date();
  const row = { id: newId(), organizationId, name: await cleanName(name), createdBy: userId, createdAt: now, updatedAt: now };
  await db.insert(P).values(row);
  return { id: row.id, name: row.name };
}

export async function renameProject(organizationId: string, id: string, name: string): Promise<Project> {
  const n = await cleanName(name);
  const res = await db.update(P).set({ name: n, updatedAt: new Date() }).where(and(eq(P.organizationId, organizationId), eq(P.id, id)));
  if (!res.rowCount) throw new HttpError(404, (await getErrors()).projectNotFound);
  return { id, name: n };
}

/** The references stay in the library (back in the Inbox if this was their only project).
 *  Its links go with it (ON DELETE CASCADE). */
export async function deleteProject(organizationId: string, id: string): Promise<void> {
  await db.delete(P).where(and(eq(P.organizationId, organizationId), eq(P.id, id)));
  await dropSpace(organizationId, id);
}

/** Files items in a project. Both have to belong to the workspace; already filed is not an error. */
export async function fileItems(organizationId: string, projectId: string, itemIds: string[], userId: string): Promise<void> {
  if (!itemIds.length) return;
  const [p] = await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!p) throw new HttpError(404, (await getErrors()).projectNotFound);
  const own = await db.select({ id: schema.inspoItem.id }).from(schema.inspoItem)
    .where(and(eq(schema.inspoItem.organizationId, organizationId), inArray(schema.inspoItem.id, itemIds)));
  if (!own.length) return;
  const now = new Date();
  // Filing an archived reference again puts it back on the board
  await db.insert(PI)
    .values(own.map((r) => ({ projectId, itemId: r.id, organizationId, addedBy: userId, createdAt: now })))
    .onConflictDoUpdate({ target: [PI.projectId, PI.itemId], set: { archivedAt: null } });
}

/** Off the board but still the project's (on), or back on the board (off). Polish's archive. */
export async function setArchived(organizationId: string, projectId: string, itemIds: string[], on: boolean): Promise<void> {
  if (!itemIds.length) return;
  await db.update(PI).set({ archivedAt: on ? new Date() : null })
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), inArray(PI.itemId, itemIds)));
}

export async function unfileItems(organizationId: string, projectId: string, itemIds: string[]): Promise<void> {
  if (!itemIds.length) return;
  await db.delete(PI).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), inArray(PI.itemId, itemIds)));
  await dropFromSpace(organizationId, projectId, itemIds);
}
