// DESIGN.md revisions per workspace: the spec a workspace regenerated or corrected, laid over the global entry.
// The screen that revised a section by hand is gone; its rows still apply.
import "server-only";
import { desc, and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./workspace-core";
import { DesignSpecSchema, renderDesignMd, type DesignSpec } from "@/types/design";

export interface RevisionMeta {
  id: string;
  kind: "regeneration" | "revision" | "reversion";
  authorName: string;
  section: string | null;
  comment: string;
  summary: string;
  warning: string | null;
  createdAt: string;
}

const toMeta = (r: typeof schema.designRevision.$inferSelect): RevisionMeta => ({
  id: r.id, kind: r.kind as RevisionMeta["kind"], authorName: r.authorName, section: r.section,
  comment: r.comment, summary: r.summary, warning: r.warning, createdAt: r.createdAt.toISOString(),
});

export async function listRevisions(organizationId: string, url: string): Promise<RevisionMeta[]> {
  const rows = await db.select().from(schema.designRevision)
    .where(and(eq(schema.designRevision.organizationId, organizationId), eq(schema.designRevision.url, url)))
    .orderBy(desc(schema.designRevision.createdAt));
  return rows.map(toMeta);
}

export async function getRevisionSpec(organizationId: string, id: string): Promise<{ meta: RevisionMeta; spec: DesignSpec } | null> {
  const [row] = await db.select().from(schema.designRevision)
    .where(and(eq(schema.designRevision.organizationId, organizationId), eq(schema.designRevision.id, id))).limit(1);
  if (!row) return null;
  return { meta: toMeta(row), spec: DesignSpecSchema.parse(row.specJson) };
}

export async function addRevision(input: {
  organizationId: string; url: string; authorId: string; authorName: string;
  kind: RevisionMeta["kind"]; section?: string | null; comment?: string; summary: string; warning?: string | null; spec: DesignSpec;
}): Promise<RevisionMeta> {
  const row = {
    id: newId(), organizationId: input.organizationId, url: input.url,
    authorId: input.authorId, authorName: input.authorName, kind: input.kind,
    section: input.section ?? null, comment: input.comment ?? "", summary: input.summary,
    warning: input.warning ?? null, specJson: input.spec, createdAt: new Date(),
  };
  await db.insert(schema.designRevision).values(row);
  return toMeta({ ...row });
}

/** Applies the workspace's current spec (if any) over the global entry */
export async function overlayRevision<T extends { url: string; spec?: DesignSpec; markdown: string; generatedAt: string }>(
  organizationId: string, entry: T
): Promise<T & { revisions: RevisionMeta[] }> {
  const revisions = await listRevisions(organizationId, entry.url);
  if (!revisions.length) return { ...entry, revisions };
  const latest = await getRevisionSpec(organizationId, revisions[0].id);
  if (!latest) return { ...entry, revisions };
  const date = latest.meta.createdAt.slice(0, 10);
  return { ...entry, spec: latest.spec, markdown: renderDesignMd(latest.spec, entry.url, date), revisions };
}
