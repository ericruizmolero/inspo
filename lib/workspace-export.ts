// Everything a workspace made, in one JSON file its owner downloads (Settings › Space, /api/workspace/export).
// The team's own words and decisions, not what the app derives from them: no embeddings, no tagging state,
// no model caches, no share tokens or key hashes. Files stay as their /api/files/… paths.
import "server-only";
import { asc, eq, getTableColumns, type Table } from "drizzle-orm";
import { db, schema } from "./db";

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
  const O = schema.organization, M = schema.member, U = schema.user;
  const [ws] = await db.select({ id: O.id, name: O.name, kind: O.kind, plan: O.plan, outputLanguage: O.outputLanguage, createdAt: O.createdAt })
    .from(O).where(eq(O.id, organizationId));
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

/** "criterio-acme-2026-10-10.json" */
export const exportFileName = (slug: string, at: Date) => `criterio-${slug}-${at.toISOString().slice(0, 10)}.json`;
