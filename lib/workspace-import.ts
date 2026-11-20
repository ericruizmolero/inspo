// An export's zip (lib/workspace-export.ts) brought into a workspace on the importer's plan: the one they have open
// (importIntoWorkspace, any plan) or a new team in the account they pay for (importAsTeam, a plan with room for
// another workspace). In comes what the export holds: references, projects and what is on each board, systems,
// comments, revisions and the files they point at. Every row gets a new id and every file a path in the workspace's
// folder. Nothing links back to where it came from: comments are the importer's, each led by its author's name; who
// decided, revised or filed something is dropped; reactions, share links, members and AI spend stay behind. A path
// to a file that is not in the zip, or to another workspace's, is dropped too, and a reference that was such a file
// with it. What the workspace already has stays as it is there: a reference with the same address is that one
// (its thread too), a template with the same name is that one, a file at the same path is not written over, and a
// project whose name is taken gets the first free "Name (1)".
//
// The plan is checked before anything is written: the references, the projects and the files' bytes it adds to what
// the workspace holds, and the number of files one import copies in time. Then the files and the rows, in one
// transaction; anything that fails deletes the files this import wrote (and a new team with them), so a failed
// import leaves nothing behind.
import "server-only";
import { z } from "zod";
import { and, eq, getTableColumns, inArray, isNotNull } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db, schema } from "./db";
import { HttpError, newId, QuotaError } from "./workspace-core";
import { countItems, countProjects, storageUsed } from "./quota";
import { planOf } from "./plans";
import { fmtGb, roomLeft, whatIsFull, type Usage } from "./room";
import { getT } from "./i18n";
import { webKeyOf } from "./url";
import { deleteFiles, getFile, keyOf } from "./storage";
import { FileCarrier, keysIn, namesPrivateFile, remapIds, type ReadFile } from "./file-carry";
import { openZip, type ZipSource } from "./zip";
import { WORKSPACE_EXPORT_VERSION, ZIP_JSON, zipPathOf } from "./workspace-export";
import { openTeamInAccount } from "./account-workspaces";
import { deleteWorkspace } from "./workspace-delete";
import { TEMPLATE_AUTHOR } from "./sample-items";
import { firstFreeName, projectNames } from "./templates";
import { log } from "./log";

/** The biggest workspace.json read into memory */
const MAX_JSON_BYTES = 256 * 1024 ** 2;

// ─── The file ────────────────────────────────────────────────────────────────

const id = z.string().min(1);
const rows = <S extends z.ZodRawShape>(shape: S) => z.array(z.looseObject(shape));
const ExportFile = z.object({
  version: z.literal(WORKSPACE_EXPORT_VERSION),
  workspace: z.looseObject({ id, name: z.string(), outputLanguage: z.string().optional() }),
  items: rows({ id, web: z.string(), author: z.string() }),
  projects: rows({ id, name: z.string(), template: z.unknown().optional(), fromTemplate: z.string().nullish() }),
  projectItems: rows({ projectId: id, itemId: id }),
  systems: rows({ projectId: id }),
  systemAreas: rows({ projectId: id }),
  comments: z.object({
    items: rows({ id, itemId: id, parentId: z.string().nullish(), authorName: z.string(), body: z.string() }),
    areas: rows({ id, projectId: id, authorName: z.string(), body: z.string() }),
  }),
  revisions: z.object({ design: rows({ id, url: z.string() }), areas: rows({ id, projectId: id }) }),
  files: z.array(z.object({ path: z.string(), contentType: z.string() })).default([]),
});

/** The file says something the database cannot take: not an export, or a damaged one */
class NotAnExport extends Error {}

/** A row of `table` from the file: only the table's own columns, its timestamps as dates, then `set` on top */
function rowOf<T extends PgTable>(table: T, raw: Record<string, unknown>, set: Partial<T["$inferInsert"]>): T["$inferInsert"] {
  const out: Record<string, unknown> = {};
  for (const [k, col] of Object.entries(getTableColumns(table))) {
    const v = raw[k];
    if (v === undefined) continue;
    if (col.columnType === "PgTimestamp" && v !== null) {
      const at = new Date(v as string);
      if (Number.isNaN(at.getTime())) throw new NotAnExport(`bad date in ${k}`);
      out[k] = at;
    } else out[k] = v;
  }
  return { ...out, ...set } as T["$inferInsert"];
}

/** A database refusal of the file's values (a bad type, a broken check or reference), not of the database */
const refusedData = (e: unknown) => {
  const code = ((e as { cause?: { code?: unknown } })?.cause ?? (e as { code?: unknown }))?.code;
  return typeof code === "string" && /^2[23]/.test(code);
};

async function readExport(src: ZipSource) {
  const files = await openZip(src);
  const json = files.get(ZIP_JSON);
  if (!json || json.size > MAX_JSON_BYTES) throw new NotAnExport("no workspace.json");
  return { files, data: ExportFile.parse(JSON.parse((await json.read()).toString("utf8"))) };
}

// ─── Import ──────────────────────────────────────────────────────────────────

/** Who imports: the rows they bring are theirs */
export interface Importer { id: string; name: string; language?: string | null }
/** Where an import landed, and what it added there */
export interface Imported { id: string; name: string; items: number; projects: number }

/** The most files one import copies: past it, copying could outlast the route (desarrollo.md, "Exportar e importar") */
export const MAX_IMPORT_FILES = 2000;
/** How long the files may take to copy before the import gives up and deletes them, inside the route's 300 s */
const COPY_BUDGET_MS = 230_000;

type Export = Awaited<ReturnType<typeof readExport>>;

/** What of an export lands in workspace `org`, given what `org` already holds (nothing, if it is still to be made) */
async function landingIn(exp: Export, org: string) {
  const { files: zip, data } = exp;
  const from = data.workspace.id;
  const inZip = (key: string) => zip.has(zipPathOf(key, from));
  const types = new Map(data.files.map((f) => [keyOf(f.path) ?? f.path, f.contentType]));
  const read: ReadFile = async (key) => {
    const f = zip.get(zipPathOf(key, from));
    return f ? { body: await f.read(), contentType: types.get(key) ?? "application/octet-stream" } : null;
  };
  const carrier = new FileCarrier(from, org, read, "drop");
  const P = schema.project, T = schema.inspoItem, F = schema.storedFile;
  const ids = new Map<string, string>([[from, org]]);

  // A reference whose address was a file comes only if the zip has it; one whose address the workspace has is that one
  const keeps = (web: string) => { const k = [...keysIn(web, from)]; return k.length ? inZip(k[0]) : !namesPrivateFile(web); };
  const items = data.items.filter((i) => keeps(i.web));
  const webKey = (i: (typeof items)[number]) => webKeyOf(carrier.next(i.web));
  const there = items.length
    ? await db.select({ id: T.id, webKey: T.webKey }).from(T).where(and(eq(T.organizationId, org), inArray(T.webKey, items.map(webKey))))
    : [];
  const had = new Map(there.map((r) => [r.webKey, r.id]));
  const fresh = items.filter((i) => { const id = had.get(webKey(i)); if (id) ids.set(i.id, id); return !id; });

  // A template the workspace has by name (as the built-in ones are loaded) is that one
  const templatesThere = new Map((await db.select({ id: P.id, name: P.name }).from(P).where(and(eq(P.organizationId, org), isNotNull(P.template))))
    .map((r) => [r.name, r.id]));
  const projects = data.projects.filter((p) => { const id = p.template != null && templatesThere.get(p.name); if (id) ids.set(p.id, id); return !id; });
  const templates = new Set(data.projects.filter((p) => p.template != null).map((p) => p.id));

  // What hangs off what comes in; a reference the workspace had keeps its own thread
  const itemIds = new Set(items.map((i) => i.id)), freshIds = new Set(fresh.map((i) => i.id)), projectIds = new Set(projects.map((p) => p.id));
  const links = data.projectItems.filter((l) => itemIds.has(l.itemId) && projectIds.has(l.projectId));
  const inProject = <R extends { projectId: string }>(list: R[]) => list.filter((r) => projectIds.has(r.projectId));
  const systems = inProject(data.systems), areas = inProject(data.systemAreas);
  const areaComments = inProject(data.comments.areas), areaRevisions = inProject(data.revisions.areas);
  const threads = data.comments.items.filter((c) => freshIds.has(c.itemId) && !c.parentId);
  const threadIds = new Set(threads.map((c) => c.id));
  const replies = data.comments.items.filter((c) => freshIds.has(c.itemId) && c.parentId && threadIds.has(c.parentId));
  // A revision rides on the site's DESIGN.md, which this database may not have
  const urls = [...new Set(data.revisions.design.map((r) => r.url))];
  const docs = new Set(urls.length ? (await db.select({ url: schema.designDoc.url }).from(schema.designDoc).where(inArray(schema.designDoc.url, urls))).map((d) => d.url) : []);
  const designRevisions = data.revisions.design.filter((r) => docs.has(r.url));
  for (const r of [...fresh, ...projects, ...threads, ...replies, ...areaComments, ...designRevisions, ...areaRevisions]) ids.set(r.id, newId());

  // A project's name is free in the workspace and among the others coming in
  const taken = await projectNames(org);
  const names = new Map(projects.filter((p) => p.template == null).map((p) => {
    const name = firstFreeName(taken, p.name);
    taken.add(name.toLowerCase());
    return [p.id, name] as const;
  }));

  // The files the rows point at. One already at its path in the workspace is that one, never written over
  const keys = [...carrier.keysIn([fresh, projects, systems, areas, threads, replies, areaComments])].filter(inZip);
  const next = new Map(keys.map((k) => [carrier.next(k), k]));
  const held = new Set(next.size ? (await db.select({ key: F.key }).from(F).where(inArray(F.key, [...next.keys()]))).map((r) => next.get(r.key)!) : []);
  carrier.adopt(held);
  const copy = keys.filter((k) => !held.has(k));

  // What the plan counts: references (a template's samples are free), projects (templates and the examples opened
  // from one are free) and the bytes written
  const samples = new Set(links.filter((l) => templates.has(l.projectId)).map((l) => l.itemId));
  const need = {
    items: fresh.filter((i) => !(i.author === TEMPLATE_AUTHOR && samples.has(i.id))).length,
    projects: projects.filter((p) => p.template == null && !(p.fromTemplate && templates.has(p.fromTemplate))).length,
    bytes: copy.reduce((n, k) => n + zip.get(zipPathOf(k, from))!.size, 0),
  };

  return { org, carrier, ids, names, copy, need, rows: { fresh, projects, templates, links, systems, areas, threads, replies, areaComments, designRevisions, areaRevisions } };
}
type Landing = Awaited<ReturnType<typeof landingIn>>;

/** Throws before anything is written when the landing does not fit a workspace holding `used` on `planKey`: a
 *  QuotaError saying how much does not fit, or a 413 when it has more files than one import copies in time */
async function assertFits(landing: Landing, planKey: string, used: Usage & { projects: number }): Promise<void> {
  const { t, locale } = await getT();
  const plan = planOf(planKey), name = t.plans.items[plan.key].name, d = t.workspaceData, { need } = landing;
  const room = roomLeft(plan, used);
  const full = whatIsFull(room, need);
  const projectsLeft = plan.projectsMax === null ? null : Math.max(0, plan.projectsMax - used.projects);
  if (full === "items") throw new QuotaError("items", plan.key, d.importItemsFull(need.items, room.items!, name));
  if (projectsLeft !== null && need.projects > projectsLeft) throw new QuotaError("projects", plan.key, d.importProjectsFull(need.projects, projectsLeft, name));
  if (full === "storage") throw new QuotaError("storage", plan.key, d.importStorageFull(fmtGb(need.bytes, locale), fmtGb(room.bytes!, locale), name));
  if (landing.copy.length > MAX_IMPORT_FILES) throw new HttpError(413, d.tooManyFiles(landing.copy.length, MAX_IMPORT_FILES));
}

/** Writes the landing: its files, then its rows in one transaction. A failure deletes the files it wrote */
async function land(landing: Landing, user: Importer, signal: AbortSignal): Promise<void> {
  const { org, carrier, ids, names, copy, rows: r } = landing;
  try {
    if ((await carrier.copy(copy, 4, signal)).length) throw new NotAnExport("a file in the zip could not be read");
    const clean = (row: Record<string, unknown>) => remapIds(carrier.map(row), ids);
    const me = { authorId: user.id, authorName: user.name };
    const said = (c: { authorName: string; body: string }) => `${c.authorName}: ${c.body}`;
    const T = schema.inspoItem, P = schema.project, C = schema.inspoComment;

    const itemRows = r.fresh.map((raw) => {
      const row = clean(raw);
      const web = row.web as string;
      return rowOf(T, row, { organizationId: org, web, webKey: webKeyOf(web), createdBy: user.id, noteReactions: [], tagStatus: row.tagsJson ? "done" : "pending" });
    });
    const projectRows = r.projects.map((raw) => rowOf(P, clean(raw), { organizationId: org, createdBy: user.id, fromTemplate: null, name: names.get(raw.id) ?? raw.name }));
    // An example points at its template once both are in, and the template may be the one the workspace had
    const fromTemplate = r.projects.flatMap((p) => (p.fromTemplate && r.templates.has(p.fromTemplate) ? [[ids.get(p.id)!, ids.get(p.fromTemplate)!] as const] : []));
    const comment = (raw: (typeof r.threads)[number]) => rowOf(C, clean(raw), { organizationId: org, ...me, body: said(raw), reactions: [], guestKey: null, shareId: null });

    await db.transaction(async (tx) => {
      const insert = async <Tb extends PgTable>(table: Tb, values: Tb["$inferInsert"][]) => {
        for (let k = 0; k < values.length; k += 200) await tx.insert(table).values(values.slice(k, k + 200));
      };
      await insert(T, itemRows);
      await insert(P, projectRows);
      for (const [project, template] of fromTemplate) await tx.update(P).set({ fromTemplate: template }).where(eq(P.id, project));
      await insert(schema.projectItem, r.links.map((raw) => rowOf(schema.projectItem, clean(raw), { organizationId: org, addedBy: null })));
      await insert(schema.projectSystem, r.systems.map((raw) => rowOf(schema.projectSystem, clean(raw), { organizationId: org, exportedAt: null })));
      await insert(schema.systemArea, r.areas.map((raw) => rowOf(schema.systemArea, clean(raw), { organizationId: org, decidedBy: null })));
      // Threads before their replies
      await insert(C, r.threads.map(comment));
      await insert(C, r.replies.map(comment));
      await insert(schema.systemAreaComment, r.areaComments.map((raw) => rowOf(schema.systemAreaComment, clean(raw), { organizationId: org, ...me, body: said(raw) })));
      await insert(schema.designRevision, r.designRevisions.map((raw) => rowOf(schema.designRevision, clean(raw), { organizationId: org, authorId: null })));
      await insert(schema.systemAreaRevision, r.areaRevisions.map((raw) => rowOf(schema.systemAreaRevision, clean(raw), { organizationId: org, authorId: null })));
    });
  } catch (err) {
    await deleteFiles(copy.map((k) => carrier.next(k)));
    throw err;
  }
}

/** A failure as the person reads it: the copy out of time, or an export the database refused; the rest as they are */
async function refusal(err: unknown): Promise<unknown> {
  if (err instanceof HttpError) return err;
  const { t } = await getT();
  if (err instanceof DOMException && err.name === "TimeoutError") { log.warn("workspace_import.out_of_time", { err }); return new HttpError(413, t.workspaceData.tooSlow); }
  if (err instanceof NotAnExport || refusedData(err)) { log.info("workspace_import.refused", { err }); return new HttpError(400, t.workspaceData.notAnExport); }
  return err;
}

async function openExport(src: ZipSource): Promise<Export> {
  try {
    return await readExport(src);
  } catch (err) {
    log.info("workspace_import.not_an_export", { err });
    throw new HttpError(400, (await getT()).t.workspaceData.notAnExport);
  }
}

/** The zip at `src` added to the workspace `into`, on its plan: the caller checked the person manages it */
export async function importIntoWorkspace(src: ZipSource, into: { id: string; name: string; plan: string }, user: Importer): Promise<Imported> {
  const signal = AbortSignal.timeout(COPY_BUDGET_MS);
  const landing = await landingIn(await openExport(src), into.id);
  const [items, bytes, projects] = await Promise.all([countItems(into.id), storageUsed(into.id), countProjects(into.id)]);
  await assertFits(landing, into.plan, { items, bytes, projects });
  await land(landing, user, signal).catch(async (err) => { throw await refusal(err); });
  return { id: into.id, name: into.name, items: landing.rows.fresh.length, projects: landing.names.size };
}

/** The zip at `src` as a new team in `account`, on its plan, with the importer as its one member and owner: the
 *  caller checked the person pays for it. Whether the plan holds another workspace is checked as the team is made */
export async function importAsTeam(src: ZipSource, account: { id: string; plan: string }, user: Importer): Promise<Imported> {
  const signal = AbortSignal.timeout(COPY_BUDGET_MS);
  const exp = await openExport(src);
  // A workspace that is not made yet holds nothing: everything comes in, against an empty one's room
  const org = newId();
  const landing = await landingIn(exp, org);
  await assertFits(landing, account.plan, { items: 0, bytes: 0, projects: 0 });
  const name = exp.data.workspace.name.trim().slice(0, 60) || (await getT()).t.workspaceData.importedName;
  await openTeamInAccount(account.id, name, user, { id: org, outputLanguage: exp.data.workspace.outputLanguage });
  await land(landing, user, signal).catch(async (err) => {
    await deleteWorkspace(org).catch((e) => log.warn("workspace_import.cleanup_failed", { organizationId: org, err: e }));
    throw await refusal(err);
  });
  return { id: org, name, items: landing.rows.fresh.length, projects: landing.names.size };
}

// ─── Where the zip is ────────────────────────────────────────────────────────

/** Where an upload waits to be imported: the person's own folder, outside every workspace's */
export const importPrefix = (userId: string) => `imports/${userId}/`;
export const newImportKey = (userId: string) => `${importPrefix(userId)}${newId()}.zip`;

/** A zip in storage, read by ranges: only the directory and the files the import takes are fetched. Null if it is not there */
export async function storedZip(key: string): Promise<ZipSource | null> {
  const head = await getFile(key, "bytes=0-0");
  if (!head) return null;
  return {
    size: head.total ?? head.size,
    async read(start, end) {
      if (end <= start) return Buffer.alloc(0);
      const f = await getFile(key, `bytes=${start}-${end - 1}`);
      if (!f) throw new Error(`gone: ${key}`);
      // A store that answers the whole file to a range still holds the bytes asked for
      return f.range ? f.body : f.body.subarray(start, end);
    },
  };
}
