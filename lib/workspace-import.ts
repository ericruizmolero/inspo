// An export's zip (lib/workspace-export.ts) made into a new team workspace on the importer's plan, with the importer
// as its one member and owner: its references, projects and what is on each board, systems, comments, revisions and
// the files they point at. Every row gets a new id and every file a new path in the new workspace's folder. Nothing
// links back to where it came from: comments are the importer's, each led by its author's name; who decided,
// revised or filed something is dropped; reactions, share links, members and AI spend stay behind. A path to a file
// that is not in the zip, or to another workspace's, is dropped too, and a reference that was such a file with it.
//
// The plan is checked before anything is written: a workspace, the references, the projects and the files' bytes.
// Then the workspace, its files and its rows, in that order; anything that fails deletes what was made
// (lib/workspace-delete.ts), so a failed import leaves nothing behind.
import "server-only";
import { z } from "zod";
import { eq, getTableColumns, inArray } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db, schema } from "./db";
import { HttpError, newId, QuotaError } from "./workspace-core";
import { fullMessage } from "./quota";
import { planOf } from "./plans";
import { roomLeft, whatIsFull } from "./room";
import { getT } from "./i18n";
import { webKeyOf } from "./url";
import { getFile, keyOf } from "./storage";
import { FileCarrier, keysIn, namesPrivateFile, remapIds, type ReadFile } from "./file-carry";
import { openZip, type ZipFile, type ZipSource } from "./zip";
import { WORKSPACE_EXPORT_VERSION, ZIP_JSON, zipPathOf } from "./workspace-export";
import { openTeamInAccount } from "./account-workspaces";
import { deleteWorkspace } from "./workspace-delete";
import { TEMPLATE_AUTHOR } from "./sample-items";
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
  projects: rows({ id, template: z.unknown().optional(), fromTemplate: z.string().nullish() }),
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

export interface ImportInto {
  /** The account the new workspace joins, and its plan: the caller checked the person pays for it */
  accountId: string;
  plan: string;
  user: { id: string; name: string; language?: string | null };
}

/** The zip at `src` as a new workspace in `into`'s account. Answers its id and name */
export async function importWorkspace(src: ZipSource, into: ImportInto): Promise<{ id: string; name: string }> {
  const { t } = await getT();
  const notAnExport = () => new HttpError(400, t.workspaceData.notAnExport);
  let zip: Map<string, ZipFile>, data: z.infer<typeof ExportFile>;
  try {
    ({ files: zip, data } = await readExport(src));
  } catch (err) {
    log.info("workspace_import.not_an_export", { err });
    throw notAnExport();
  }

  const from = data.workspace.id;
  const org = newId();
  const inZip = (key: string) => zip.has(zipPathOf(key, from));
  const types = new Map(data.files.map((f) => [keyOf(f.path) ?? f.path, f.contentType]));
  const read: ReadFile = async (key) => {
    const f = zip.get(zipPathOf(key, from));
    return f ? { body: await f.read(), contentType: types.get(key) ?? "application/octet-stream" } : null;
  };
  const carrier = new FileCarrier(from, org, read, "drop");

  // What comes in: a reference whose address was a file only if the zip has it, and what hangs off what came in
  const keeps = (web: string) => { const k = [...keysIn(web, from)]; return k.length ? inZip(k[0]) : !namesPrivateFile(web); };
  const items = data.items.filter((i) => keeps(i.web));
  const itemIds = new Set(items.map((i) => i.id));
  const projectIds = new Set(data.projects.map((p) => p.id));
  const links = data.projectItems.filter((l) => itemIds.has(l.itemId) && projectIds.has(l.projectId));
  const inProject = <R extends { projectId: string }>(list: R[]) => list.filter((r) => projectIds.has(r.projectId));
  const systems = inProject(data.systems), areas = inProject(data.systemAreas);
  const areaComments = inProject(data.comments.areas), areaRevisions = inProject(data.revisions.areas);
  const threads = data.comments.items.filter((c) => itemIds.has(c.itemId) && !c.parentId);
  const threadIds = new Set(threads.map((c) => c.id));
  const replies = data.comments.items.filter((c) => itemIds.has(c.itemId) && c.parentId && threadIds.has(c.parentId));
  // A revision rides on the site's DESIGN.md, which this database may not have
  const urls = [...new Set(data.revisions.design.map((r) => r.url))];
  const docs = new Set(urls.length ? (await db.select({ url: schema.designDoc.url }).from(schema.designDoc).where(inArray(schema.designDoc.url, urls))).map((d) => d.url) : []);
  const designRevisions = data.revisions.design.filter((r) => docs.has(r.url));

  // The plan, before anything is written: references (a template's samples are free), projects (templates and the
  // examples opened from one are free) and the files' bytes. The workspace itself is checked as it is created
  const plan = planOf(into.plan);
  const templates = new Set(data.projects.filter((p) => p.template != null).map((p) => p.id));
  const samples = new Set(links.filter((l) => templates.has(l.projectId)).map((l) => l.itemId));
  const needItems = items.filter((i) => !(i.author === TEMPLATE_AUTHOR && samples.has(i.id))).length;
  const needProjects = data.projects.filter((p) => p.template == null && !(p.fromTemplate && projectIds.has(p.fromTemplate))).length;
  const keys = [...carrier.keysIn([items, data.projects, systems, areas, threads, replies, areaComments])].filter(inZip);
  const bytes = keys.reduce((n, k) => n + zip.get(zipPathOf(k, from))!.size, 0);
  const full = whatIsFull(roomLeft(plan, { items: 0, bytes: 0 }), { items: needItems, bytes });
  if (full) throw new QuotaError(full, plan.key, await fullMessage(plan, full));
  if (plan.projectsMax !== null && needProjects > plan.projectsMax) {
    throw new QuotaError("projects", plan.key, t.quota.projectsFull(plan.projectsMax, t.plans.items[plan.key].name));
  }

  // New ids for every row, and the workspace's own
  const ids = new Map<string, string>([[from, org]]);
  for (const r of [...items, ...data.projects, ...threads, ...replies, ...areaComments, ...designRevisions, ...areaRevisions]) ids.set(r.id, newId());
  const name = data.workspace.name.trim().slice(0, 60) || t.workspaceData.importedName;
  await openTeamInAccount(into.accountId, name, into.user, { id: org, outputLanguage: data.workspace.outputLanguage });

  try {
    if ((await carrier.copy(keys)).length) throw new NotAnExport("a file in the zip could not be read");
    const clean = (r: Record<string, unknown>) => remapIds(carrier.map(r), ids);
    const me = { authorId: into.user.id, authorName: into.user.name };
    const said = (r: { authorName: string; body: string }) => `${r.authorName}: ${r.body}`;
    const T = schema.inspoItem, P = schema.project, C = schema.inspoComment;

    const itemRows = items.map((raw) => {
      const r = clean(raw);
      const web = r.web as string;
      return rowOf(T, r, { organizationId: org, web, webKey: webKeyOf(web), createdBy: into.user.id, noteReactions: [], tagStatus: r.tagsJson ? "done" : "pending" });
    });
    const newProjects = new Set(data.projects.map((p) => ids.get(p.id)!));
    const projectRows = data.projects.map((raw) => rowOf(P, clean(raw), { organizationId: org, createdBy: into.user.id, fromTemplate: null }));
    const fromTemplate = data.projects.map((p) => [ids.get(p.id)!, p.fromTemplate ? ids.get(p.fromTemplate) : undefined] as const)
      .filter((pair): pair is readonly [string, string] => !!pair[1] && newProjects.has(pair[1]));
    const comment = (raw: (typeof threads)[number]) => rowOf(C, clean(raw), { organizationId: org, ...me, body: said(raw), reactions: [], guestKey: null, shareId: null });

    await db.transaction(async (tx) => {
      const insert = async <Tb extends PgTable>(table: Tb, values: Tb["$inferInsert"][]) => {
        for (let k = 0; k < values.length; k += 200) await tx.insert(table).values(values.slice(k, k + 200));
      };
      await insert(T, itemRows);
      await insert(P, projectRows);
      for (const [project, template] of fromTemplate) await tx.update(P).set({ fromTemplate: template }).where(eq(P.id, project));
      await insert(schema.projectItem, links.map((raw) => rowOf(schema.projectItem, clean(raw), { organizationId: org, addedBy: null })));
      await insert(schema.projectSystem, systems.map((raw) => rowOf(schema.projectSystem, clean(raw), { organizationId: org, exportedAt: null })));
      await insert(schema.systemArea, areas.map((raw) => rowOf(schema.systemArea, clean(raw), { organizationId: org, decidedBy: null })));
      // Threads before their replies
      await insert(C, threads.map(comment));
      await insert(C, replies.map(comment));
      await insert(schema.systemAreaComment, areaComments.map((raw) => rowOf(schema.systemAreaComment, clean(raw), { organizationId: org, ...me, body: said(raw) })));
      await insert(schema.designRevision, designRevisions.map((raw) => rowOf(schema.designRevision, clean(raw), { organizationId: org, authorId: null })));
      await insert(schema.systemAreaRevision, areaRevisions.map((raw) => rowOf(schema.systemAreaRevision, clean(raw), { organizationId: org, authorId: null })));
    });
  } catch (err) {
    await deleteWorkspace(org).catch((e) => log.warn("workspace_import.cleanup_failed", { organizationId: org, err: e }));
    if (err instanceof HttpError) throw err;
    if (err instanceof NotAnExport || refusedData(err)) { log.info("workspace_import.refused", { err }); throw notAnExport(); }
    throw err;
  }
  return { id: org, name };
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
