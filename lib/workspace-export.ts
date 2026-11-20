// Everything a workspace made, in one zip its owners and admins download (Settings › Workspace, /api/workspace/export):
// workspace.json with the rows, and under files/ every stored file the rows point at. The team's own words and
// decisions, not what the app derives from them: no embeddings, no tagging state, no model caches, no share tokens or
// key hashes. Rows keep their files as /api/files/inspo/<id>/… paths; the zip holds each one at files/<the rest>, and
// workspace.json lists them with their types. lib/workspace-import.ts reads it back as a new workspace.
import "server-only";
import { asc, eq, getTableColumns, type Table } from "drizzle-orm";
import { db, schema } from "./db";
import { fileUrl, getFile, type StoredFile } from "./storage";
import { keysIn } from "./file-carry";
import { ZipWriter } from "./zip";
import { log } from "./log";

/** Bumps when a field changes meaning or goes away; a new field keeps the version */
export const WORKSPACE_EXPORT_VERSION = 1;

type Columns<T extends Table> = T["_"]["columns"];
type Row<T extends Table, K extends keyof Columns<T> = never> = Omit<T["$inferSelect"], K | "organizationId">;

/** Every column of `table` but its organization_id (the file is about one workspace) and the ones in `omit` */
function columns<T extends Table, K extends keyof Columns<T> & string = never>(table: T, ...omit: K[]) {
  const skip = new Set<string>([...omit, "organizationId"]);
  return Object.fromEntries(Object.entries(getTableColumns(table)).filter(([k]) => !skip.has(k))) as Omit<Columns<T>, K | "organizationId">;
}

const ITEM_OMIT = ["embedding", "embeddingAt", "tagStatus", "tagAttempts", "tagStartedAt", "tagError"] as const;
type ItemOmit = (typeof ITEM_OMIT)[number];

/** The file's shape. Dates are Date here and ISO 8601 strings in the file */
export interface WorkspaceExport {
  version: typeof WORKSPACE_EXPORT_VERSION;
  exportedAt: Date;
  workspace: { id: string; name: string; kind: string; plan: string; outputLanguage: string; createdAt: Date };
  members: { userId: string; name: string; email: string; role: string; joinedAt: Date }[];
  items: Row<typeof schema.inspoItem, ItemOmit>[];
  projects: Row<typeof schema.project>[];
  /** Which reference is in which project; archivedAt set = it left the board but stays with the project */
  projectItems: Row<typeof schema.projectItem>[];
  systems: Row<typeof schema.projectSystem>[];
  systemAreas: Row<typeof schema.systemArea>[];
  comments: { items: Row<typeof schema.inspoComment>[]; areas: Row<typeof schema.systemAreaComment>[] };
  revisions: { design: Row<typeof schema.designRevision>[]; areas: Row<typeof schema.systemAreaRevision>[] };
  aiUsage: Row<typeof schema.aiUsage, "organizationName">[];
}

/** The workspace's export, or null when it does not exist */
export async function buildWorkspaceExport(organizationId: string): Promise<WorkspaceExport | null> {
  const O = schema.organization, B = schema.billingAccount, M = schema.member, U = schema.user;
  const [ws] = await db.select({ id: O.id, name: O.name, kind: O.kind, plan: B.plan, outputLanguage: O.outputLanguage, createdAt: O.createdAt })
    .from(O).innerJoin(B, eq(B.id, O.billingAccountId)).where(eq(O.id, organizationId));
  if (!ws) return null;
  const I = schema.inspoItem, P = schema.project, PI = schema.projectItem, PS = schema.projectSystem, SA = schema.systemArea;
  const C = schema.inspoComment, AC = schema.systemAreaComment, DR = schema.designRevision, AR = schema.systemAreaRevision, AI = schema.aiUsage;
  const [members, items, projects, projectItems, systems, systemAreas, itemComments, areaComments, designRevisions, areaRevisions, aiUsage] = await Promise.all([
    db.select({ userId: M.userId, name: U.name, email: U.email, role: M.role, joinedAt: M.createdAt })
      .from(M).innerJoin(U, eq(M.userId, U.id)).where(eq(M.organizationId, organizationId)).orderBy(asc(M.createdAt)),
    db.select(columns(I, ...ITEM_OMIT)).from(I).where(eq(I.organizationId, organizationId)).orderBy(asc(I.createdAt)),
    db.select(columns(P)).from(P).where(eq(P.organizationId, organizationId)).orderBy(asc(P.createdAt)),
    db.select(columns(PI)).from(PI).where(eq(PI.organizationId, organizationId)).orderBy(asc(PI.createdAt)),
    db.select(columns(PS)).from(PS).where(eq(PS.organizationId, organizationId)),
    db.select(columns(SA)).from(SA).where(eq(SA.organizationId, organizationId)),
    db.select(columns(C)).from(C).where(eq(C.organizationId, organizationId)).orderBy(asc(C.createdAt)),
    db.select(columns(AC)).from(AC).where(eq(AC.organizationId, organizationId)).orderBy(asc(AC.createdAt)),
    db.select(columns(DR)).from(DR).where(eq(DR.organizationId, organizationId)).orderBy(asc(DR.createdAt)),
    db.select(columns(AR)).from(AR).where(eq(AR.organizationId, organizationId)).orderBy(asc(AR.createdAt)),
    db.select(columns(AI, "organizationName")).from(AI).where(eq(AI.organizationId, organizationId)).orderBy(asc(AI.createdAt)),
  ]);
  return {
    version: WORKSPACE_EXPORT_VERSION,
    exportedAt: new Date(),
    workspace: ws,
    members,
    items,
    projects,
    projectItems,
    systems,
    systemAreas,
    comments: { items: itemComments, areas: areaComments },
    revisions: { design: designRevisions, areas: areaRevisions },
    aiUsage,
  };
}

/** One stored file in the zip: its path as the rows name it, its type and size */
export interface ExportedFile { path: string; contentType: string; bytes: number }

/** workspace.json: the rows, and the files the zip carries */
export type WorkspaceExportFile = WorkspaceExport & { files: ExportedFile[] };

export const ZIP_JSON = "workspace.json";
/** Where a file of the workspace's folder (inspo/<id>/<rest>) is in the zip: files/<rest> */
export const zipPathOf = (key: string, organizationId: string) => `files/${key.slice(`inspo/${organizationId}/`.length)}`;

/** Files read ahead of the one being written: the next reads overlap the writing, and memory holds at most these */
const READ_AHEAD = 4;
const compressible = (type: string) => /^(text\/|application\/(json|xml)|image\/svg)/.test(type);

/**
 * The export as a zip, piece by piece, for a response to stream: each file the rows point at (a few read ahead), then
 * workspace.json. Nothing waits for the whole: a large workspace starts downloading at once and is never in memory.
 * A file that can no longer be read is left out of the zip and of the list.
 */
export async function* exportZip(data: WorkspaceExport): AsyncGenerator<Buffer> {
  const org = data.workspace.id;
  const keys = [...keysIn(data, org)];
  const w = new ZipWriter(data.exportedAt);
  const files: ExportedFile[] = [];
  const read = (key: string) => getFile(key).catch((err) => { log.warn("workspace_export.file_unread", { ref: key, err }); return null; });
  const ahead: (Promise<StoredFile | null> | null)[] = keys.slice(0, READ_AHEAD).map(read);
  for (let i = 0; i < keys.length; i++) {
    const f = await ahead[i];
    ahead[i] = null;
    if (i + READ_AHEAD < keys.length) ahead.push(read(keys[i + READ_AHEAD]));
    if (!f) continue;
    yield* w.add(zipPathOf(keys[i], org), f.body, compressible(f.contentType));
    files.push({ path: fileUrl(keys[i]), contentType: f.contentType, bytes: f.body.length });
  }
  const json: WorkspaceExportFile = { ...data, files };
  yield* w.add(ZIP_JSON, Buffer.from(JSON.stringify(json, null, 2)));
  yield w.end();
}

/** "criterio-acme-2026-10-10.zip" */
export const exportFileName = (slug: string, at: Date) => `criterio-${slug}-${at.toISOString().slice(0, 10)}.zip`;
