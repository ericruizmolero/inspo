// criterio.md's history: one version with each change of the file, and each time it left the app changed.
// A change is the team's in the app (an area, a part typed over, a proposal accepted, the skills, the brand: via
// "edit") or an agent's over MCP (an answer, a learning, a proposal, a brand: "mcp-write"). It leaves by Copy,
// Download, a result or an agent reading it, and a version that left is marked `exported`: it is what someone got.
// Changes of the same person a few minutes apart are one version: the last one that has not left is rewritten in
// place instead of taking a new number, so typing a decision in three goes does not leave three versions.
import "server-only";
import { createHash } from "crypto";
import { and, desc, eq, max } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./workspace-core";
import { loadShareView } from "./share-view";
import type { Locale } from "./i18n/locale";
import type { CriterioBlock } from "./criterio-md";
import { log } from "./log";
import { inBackground } from "./notify";
import { headers } from "next/headers";
import { originOfHeaders } from "./mcp/auth";

const V = schema.criterioVersion;

export type VersionVia = "copy" | "download" | "mcp" | "result" | "edit" | "mcp-write";
/** The vias that take the file out of the app: the version they keep is marked exported, and is never rewritten */
const LEAVES: ReadonlySet<VersionVia> = new Set(["copy", "download", "mcp", "result"]);
/** How long after a version the same person's next change still goes into it, while it has not left */
export const GROUP_MS = 5 * 60_000;

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

type FileView = { markdown: string; blocks: CriterioBlock[] };

/** The file as it is now against the last version kept: that version's number when they are the same file, else
 *  the next one. The one place that numbers the file, so the label on screen and what an exit records agree */
async function standing(input: { organizationId: string; projectId: string; locale: Locale; origin: string; view?: FileView }) {
  const view = input.view ?? await loadShareView(input.organizationId, input.projectId, "full", input.locale, null, input.origin);
  if (!view) return null;
  const hash = hashOf(view.markdown);
  const [last] = await db.select({ id: V.id, n: V.n, hash: V.hash, markdown: V.markdown, byName: V.byName, exported: V.exported, at: V.createdAt }).from(V)
    .where(and(eq(V.organizationId, input.organizationId), eq(V.projectId, input.projectId))).orderBy(desc(V.n)).limit(1);
  return { view, hash, last, n: last?.hash === hash ? last.n : (last?.n ?? 0) + 1 };
}

/** The number the file carries now: the last version's when nothing changed since, else the one the next exit keeps
 *  it as (1 when none was kept). Null when the project is not this workspace's */
export async function currentVersion(input: { organizationId: string; projectId: string; locale: Locale; origin: string }): Promise<number | null> {
  return (await standing(input))?.n ?? null;
}

/**
 * Keeps the project's criterio.md as a version when it changed since the last one: a new number, or, for a change by
 * the same person within GROUP_MS of a version that has not left, that version rewritten. An exit marks the version it
 * took as exported, changed or not. `view` is the file already built (the MCP read builds it anyway); without it the
 * file is built here, as a share link would hand it out. Never throws: a lost version only means one fewer step.
 */
export async function recordVersion(input: {
  organizationId: string; projectId: string; via: VersionVia; byName: string | null; viaName?: string;
  locale: Locale; origin: string; view?: FileView; now?: Date;
}): Promise<number | null> {
  try {
    const now = await standing(input);
    if (!now) return null;
    const { view, hash, last, n } = now;
    const leaves = LEAVES.has(input.via);
    const at = input.now ?? new Date();
    if (last?.hash === hash) {
      if (leaves && !last.exported) await db.update(V).set({ exported: true }).where(eq(V.id, last.id));
      return last.n;
    }
    const via = (input.via === "mcp" || input.via === "mcp-write") && input.viaName ? `${input.via}:${input.viaName}` : input.via;
    // The same person still at it, and the file has not left since: their last version is rewritten, not followed
    if (last && !last.exported && last.byName === input.byName && at.getTime() - last.at.getTime() < GROUP_MS) {
      const [before] = last.n > 1 ? await db.select({ markdown: V.markdown }).from(V)
        .where(and(eq(V.organizationId, input.organizationId), eq(V.projectId, input.projectId), eq(V.n, last.n - 1))).limit(1) : [];
      // Only while it still has not left: an exit that took it in between keeps it as it was
      const [kept] = await db.update(V).set({
        markdown: view.markdown, hash, changed: changedAreas(view.blocks, view.markdown, before?.markdown ?? null), via, exported: leaves, createdAt: at,
      }).where(and(eq(V.id, last.id), eq(V.exported, false))).returning({ n: V.n });
      if (kept) return kept.n;
    }
    // Two writers at the same moment race for the same number: the unique index lets one win, the other is the same file
    await db.insert(V).values({
      id: newId(), organizationId: input.organizationId, projectId: input.projectId, n, markdown: view.markdown, hash,
      changed: changedAreas(view.blocks, view.markdown, last?.markdown ?? null),
      byName: input.byName, via, exported: leaves, createdAt: at,
    }).onConflictDoNothing();
    return n;
  } catch (err) {
    log.warn("criterio_version.not_recorded", { ref: input.projectId, err });
    return null;
  }
}

/** A change the team made in the app, kept as a version once the answer is out. Called from the server actions that
 *  change what the file says; the origin is read now, while the request is at hand */
export async function versionAfterEdit(ctx: { workspace: { id: string }; user: { name: string; language: Locale } }, projectIds: string | readonly string[]): Promise<void> {
  const ids = typeof projectIds === "string" ? [projectIds] : [...new Set(projectIds)];
  if (!ids.length) return;
  const origin = originOfHeaders(await headers());
  inBackground(async () => {
    for (const projectId of ids) await recordVersion({ organizationId: ctx.workspace.id, projectId, via: "edit", byName: ctx.user.name, locale: ctx.user.language, origin });
  });
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
