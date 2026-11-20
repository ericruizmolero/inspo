// Duplicating a project, and moving one to another of the person's workspaces (a sketch made in private, taken to
// the team). A duplicate stays in the same workspace: the references are the workspace's, so the copy files the same
// ones. A move changes the project's workspace in place, with everything that hangs off it (system, conversation,
// versions, share links), and brings its references along: the ones the other workspace already has are filed as
// they are there, the rest are copied in with their files and their thread. Those that were only on this project
// leave the old workspace; those still on another project there stay.
import "server-only";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { getErrors } from "./i18n";
import { HttpError, newId } from "./workspace-core";
import { assertProjectRoom, assertRoomIn } from "./quota";
import { freeName } from "./templates";
import { webKeyOf } from "./url";
import { getFile } from "./storage";
import { FileCarrier, remapIds } from "./file-carry";
import { deletableIds, deleteItems } from "./items";
import { deleteMediaFile } from "./media";
import { deleteTextFile } from "./text-refs";
import { deleteProjectBrandFiles, projectBrandPrefix } from "./brand-files";
import type { Project } from "@/types/inspo";

const P = schema.project, PI = schema.projectItem, T = schema.inspoItem, C = schema.inspoComment, S = schema.projectSystem, A = schema.systemArea;

async function sourceProject(organizationId: string, id: string) {
  const [p] = await db.select().from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, id), isNull(P.template))).limit(1);
  if (!p) throw new HttpError(404, (await getErrors()).projectNotFound);
  return p;
}

const asProject = (p: typeof P.$inferSelect): Project => {
  const brief = (p.brief ?? null) as { about?: string; clientItemId?: string } | null;
  return { id: p.id, name: p.name, intent: brief?.about ?? null, clientItemId: brief?.clientItemId ?? null, brief, hasRecipe: p.recipe.length > 0, started: !!p.startedAt };
};

// ─── Duplicate ───────────────────────────────────────────────────────────────

/** A copy in the same workspace: its brief, recipe, system and brand as they stand, and the same references on its
 *  board. The conversation, the history, the versions and the share links are the original's and stay with it. */
export async function duplicateProject(organizationId: string, id: string, name: string, userId: string): Promise<Project & { boardIds: string[] }> {
  const src = await sourceProject(organizationId, id);
  await assertProjectRoom(organizationId);
  const now = new Date();
  const to = newId();
  // A copy of an example is the person's own project: it spends the plan's room, as the check above says
  const row = { ...src, id: to, name: await freeName(organizationId, name), createdBy: userId, fromTemplate: null, createdAt: now, updatedAt: now };
  const [system, areas, links] = await Promise.all([
    db.select().from(S).where(and(eq(S.organizationId, organizationId), eq(S.projectId, id))),
    db.select().from(A).where(and(eq(A.organizationId, organizationId), eq(A.projectId, id))),
    db.select().from(PI).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, id))),
  ]);
  await db.transaction(async (tx) => {
    await tx.insert(P).values(row);
    // The brand's files are shared with the original: deleting either keeps them while the other shows them (lib/projects.ts)
    if (system[0]) await tx.insert(S).values({ ...system[0], projectId: to, exportedAt: null, createdAt: now, updatedAt: now });
    if (areas.length) await tx.insert(A).values(areas.map((a) => ({ ...a, projectId: to })));
    if (links.length) await tx.insert(PI).values(links.map((l) => ({ ...l, projectId: to })));
  });
  return { ...asProject(row), boardIds: links.filter((l) => !l.archivedAt).map((l) => l.itemId) };
}

// ─── Move ────────────────────────────────────────────────────────────────────

/**
 * Moves a project to another workspace of the person's. Room is checked first (a project, the references the other
 * workspace lacks, the bytes of their files): nothing moves if it does not fit. `canDeleteAll` is whether this person
 * manages the old workspace: the references left behind there are deleted only if they could delete them by hand.
 * Answers the project as it is now, and the references that left the old workspace.
 */
export async function moveProject(from: string, id: string, to: string, user: { id: string; name: string; email: string }, canDeleteAll: boolean): Promise<{ project: Project; gone: string[] }> {
  if (from === to) throw new HttpError(400, (await getErrors()).badBody);
  const src = await sourceProject(from, id);
  const carrier = new FileCarrier(from, to, getFile, "keep");

  // The references on the project (archived ones too) and, for each, the one the new workspace already has
  const links = await db.select({ itemId: PI.itemId }).from(PI).where(and(eq(PI.organizationId, from), eq(PI.projectId, id)));
  const items = links.length ? await db.select().from(T).where(and(eq(T.organizationId, from), inArray(T.id, links.map((l) => l.itemId)))) : [];
  const targetKey = (i: typeof T.$inferSelect) => webKeyOf(carrier.next(i.web));
  const there = items.length
    ? await db.select({ id: T.id, webKey: T.webKey }).from(T).where(and(eq(T.organizationId, to), inArray(T.webKey, [...new Set(items.map(targetKey))])))
    : [];
  const byKey = new Map(there.map((r) => [r.webKey, r.id]));
  const ids = new Map<string, string>();
  const fresh: typeof items = [];
  for (const i of items) {
    const had = byKey.get(targetKey(i));
    if (had) ids.set(i.id, had);
    else { const n = newId(); ids.set(i.id, n); fresh.push(i); byKey.set(targetKey(i), n); }
  }
  const comments = fresh.length ? await db.select().from(C).where(and(eq(C.organizationId, from), inArray(C.itemId, fresh.map((i) => i.id)))).orderBy(C.createdAt) : [];
  const [system] = await db.select().from(S).where(and(eq(S.organizationId, from), eq(S.projectId, id)));

  // Room in the new workspace, before anything is written. An example stays one there and spends no project
  if (!src.fromTemplate) await assertProjectRoom(to);
  const keys = carrier.keysIn([fresh.map((i) => [i.web, i.thumbnailUrl]), comments.map((c) => c.attachments), system?.brand]);
  const [bytes] = keys.size
    ? await db.select({ n: sql<number>`coalesce(sum(${schema.storedFile.bytes}), 0)::bigint` }).from(schema.storedFile).where(inArray(schema.storedFile.key, [...keys]))
    : [{ n: 0 }];
  await assertRoomIn(to, { items: fresh.length, bytes: Number(bytes.n) });

  // The files first: a copy no row points at is harmless, a row pointing at no file is not
  await carrier.copy(keys);
  const newItems: (typeof T.$inferInsert)[] = fresh.map((i) => {
    const web = carrier.map(i.web);
    return { ...i, id: ids.get(i.id)!, organizationId: to, web, webKey: webKeyOf(web), thumbnailUrl: carrier.map(i.thumbnailUrl),
      tagStatus: i.tagStatus === "running" ? "pending" : i.tagStatus, tagStartedAt: null };
  });
  const commentIds = new Map(comments.map((c) => [c.id, newId()]));
  const newComments: (typeof C.$inferInsert)[] = comments.map((c) => (
    { ...c, id: commentIds.get(c.id)!, organizationId: to, itemId: ids.get(c.itemId)!, parentId: c.parentId ? commentIds.get(c.parentId) ?? null : null, attachments: carrier.map(c.attachments) }));
  const brand = system?.brand ? carrier.map(system.brand) : null;

  const name = await freeName(to, src.name);
  await db.transaction(async (tx) => {
    for (let k = 0; k < newItems.length; k += 200) await tx.insert(T).values(newItems.slice(k, k + 200));
    // Parents before their replies: they were read oldest first
    for (const c of newComments) await tx.insert(C).values(c);

    // A reference an agent left waiting points at an item of the old workspace: it does not travel, the agent can bring it again
    await tx.delete(schema.projectSuggestion).where(and(eq(schema.projectSuggestion.projectId, id), eq(schema.projectSuggestion.state, "open")));
    // Every row of the project, whatever table it is in, changes workspace with it
    const tables = await tx.execute<{ table_name: string }>(sql`
      select c.table_name from information_schema.columns c
      join information_schema.columns o on o.table_schema = c.table_schema and o.table_name = c.table_name and o.column_name = 'organization_id'
      where c.table_schema = current_schema() and c.column_name = 'project_id'`);
    await tx.update(P).set({ organizationId: to, name, updatedAt: new Date() }).where(eq(P.id, id));
    for (const { table_name } of tables.rows) {
      await tx.execute(sql`update ${sql.identifier(table_name)} set organization_id = ${to} where project_id = ${id}`);
    }

    // And everything that names a reference names the one in the new workspace
    for (const [old, next] of ids) {
      await tx.update(PI).set({ itemId: next }).where(and(eq(PI.projectId, id), eq(PI.itemId, old)));
      await tx.update(schema.polishVote).set({ itemId: next }).where(and(eq(schema.polishVote.projectId, id), eq(schema.polishVote.itemId, old)));
    }
    if (src.brief) await tx.update(P).set({ brief: remapIds(src.brief, ids) }).where(eq(P.id, id));
    if (system) await tx.update(S).set({ runJson: remapIds(system.runJson, ids), brand: remapIds(brand, ids) }).where(eq(S.projectId, id));
    for (const a of await tx.select({ area: A.area, evidence: A.evidence, support: A.support, curationJson: A.curationJson }).from(A).where(eq(A.projectId, id))) {
      await tx.update(A).set({ evidence: remapIds(a.evidence, ids), support: remapIds(a.support, ids), curationJson: remapIds(a.curationJson, ids) })
        .where(and(eq(A.projectId, id), eq(A.area, a.area)));
    }
    const AC = schema.systemAreaComment, AR = schema.systemAreaRevision;
    for (const c of await tx.select({ id: AC.id, about: AC.about }).from(AC).where(and(eq(AC.projectId, id), sql`${AC.about} is not null`))) {
      await tx.update(AC).set({ about: remapIds(c.about, ids) }).where(eq(AC.id, c.id));
    }
    for (const r of await tx.select({ id: AR.id, evidence: AR.evidence }).from(AR).where(eq(AR.projectId, id))) {
      await tx.update(AR).set({ evidence: remapIds(r.evidence, ids) }).where(eq(AR.id, r.id));
    }
  });

  // What was only on this project leaves the old workspace, as far as this person could delete it by hand
  const elsewhere = new Set((links.length
    ? await db.select({ itemId: PI.itemId }).from(PI).where(and(eq(PI.organizationId, from), ne(PI.projectId, id), inArray(PI.itemId, links.map((l) => l.itemId))))
    : []).map((r) => r.itemId));
  const lone = items.filter((i) => !elsewhere.has(i.id));
  const gone = new Set(await deletableIds(from, lone.map((i) => i.id), user, canDeleteAll));
  if (gone.size) {
    await deleteItems(from, [...gone]);
    await Promise.all(lone.filter((i) => gone.has(i.id)).flatMap((i) => [deleteMediaFile(from, i.web), deleteTextFile(from, i.web)]));
  }
  // The brand's files went with it, unless a project still in the old workspace (one started from it) shows them
  const prefix = projectBrandPrefix(from, id);
  const [still] = await db.select({ id: S.projectId }).from(S).where(and(eq(S.organizationId, from), sql`${S.brand}::text like ${`%${prefix}%`}`)).limit(1);
  if (!still) await deleteProjectBrandFiles(from, id);

  const [moved] = await db.select().from(P).where(eq(P.id, id));
  return { project: asProject(moved), gone: [...gone] };
}
