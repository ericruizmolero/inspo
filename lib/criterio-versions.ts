// criterio.md's history: the file as it left the app, one version each time it had changed since the last one.
// It leaves by Copy, Download or an agent reading it over MCP, and that is when the team iterates with an AI: so a
// version is exactly what an agent got, and editing in between leaves no trace until the file is taken out again.
import "server-only";
import { createHash } from "crypto";
import { and, desc, eq, max } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./workspace-core";
import { loadShareView } from "./share-view";
import type { Locale } from "./i18n/locale";
import type { CriterioBlock } from "./criterio-md";
import { log } from "./log";

const V = schema.criterioVersion;

export type VersionVia = "copy" | "download" | "mcp" | "result";

export interface CriterioVersionRow {
  n: number;
  changed: string[];
  byName: string | null;
  via: string;
  at: string;
}

const hashOf = (md: string) => createHash("sha1").update(md).digest("hex");

/** The file's sections by heading: what an area's section was, to tell which ones changed between two versions */
function sectionsOf(md: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of md.split(/\n(?=## )/)) {
    const m = part.match(/^## (.+)\n/);
    if (m) out.set(m[1].trim(), part.trim());
  }
  return out;
}

/** The areas whose section differs from the version before (by its heading in the file); a renamed one counts as changed */
function changedAreas(blocks: CriterioBlock[], md: string, before: string | null): string[] {
  if (before === null) return [];
  const now = sectionsOf(md);
  const then = sectionsOf(before);
  return blocks.flatMap((b) => (b.kind === "area" && now.get(b.heading) !== then.get(b.heading) ? [b.area] : []));
}

/**
 * Keeps the project's criterio.md as a new version when it changed since the last one. `view` is the file already
 * built (the MCP read builds it anyway); without it the file is built here, as a share link would hand it out.
 * Never throws: the file has already left, and a lost version only means one fewer step in the history.
 */
export async function recordVersion(input: {
  organizationId: string; projectId: string; via: VersionVia; byName: string | null; viaName?: string;
  locale: Locale; origin: string; view?: { markdown: string; blocks: CriterioBlock[] };
}): Promise<number | null> {
  try {
    const view = input.view ?? await loadShareView(input.organizationId, input.projectId, "full", input.locale, null, input.origin);
    if (!view) return null;
    const hash = hashOf(view.markdown);
    const [last] = await db.select({ n: V.n, hash: V.hash, markdown: V.markdown }).from(V)
      .where(and(eq(V.organizationId, input.organizationId), eq(V.projectId, input.projectId))).orderBy(desc(V.n)).limit(1);
    if (last?.hash === hash) return last.n;
    const n = (last?.n ?? 0) + 1;
    // Two exits at the same moment race for the same number: the unique index lets one win, the other is the same file
    await db.insert(V).values({
      id: newId(), organizationId: input.organizationId, projectId: input.projectId, n, markdown: view.markdown, hash,
      changed: changedAreas(view.blocks, view.markdown, last?.markdown ?? null),
      byName: input.byName, via: input.via === "mcp" && input.viaName ? `mcp:${input.viaName}` : input.via, createdAt: new Date(),
    }).onConflictDoNothing();
    return n;
  } catch (err) {
    log.warn("criterio_version.not_recorded", { ref: input.projectId, err });
    return null;
  }
}

/** The project's versions, newest first, without their files */
export async function listVersions(organizationId: string, projectId: string): Promise<CriterioVersionRow[]> {
  const rows = await db.select({ n: V.n, changed: V.changed, byName: V.byName, via: V.via, at: V.createdAt }).from(V)
    .where(and(eq(V.organizationId, organizationId), eq(V.projectId, projectId))).orderBy(desc(V.n));
  return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
}

/** One version's file */
export async function versionMarkdown(organizationId: string, projectId: string, n: number): Promise<string | null> {
  const [row] = await db.select({ markdown: V.markdown }).from(V)
    .where(and(eq(V.organizationId, organizationId), eq(V.projectId, projectId), eq(V.n, n))).limit(1);
  return row?.markdown ?? null;
}

/** How many versions the project has */
export async function versionCount(organizationId: string, projectId: string): Promise<number> {
  const [row] = await db.select({ n: max(V.n) }).from(V).where(and(eq(V.organizationId, organizationId), eq(V.projectId, projectId)));
  return row?.n ?? 0;
}
