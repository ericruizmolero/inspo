import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import type { OutputLanguage } from "../output-language";
import { llm } from "../llm";
import { prompt } from "../prompts";
import { summarize } from "../jev";
import { rowToItem } from "../items";
import { mediaKindOf } from "../url";
import { recordUsage, billOf, type UsageCtx } from "../usage";
import { SYSTEM_AREAS, type ProjectSystem, type SystemArea } from "@/types/system";
import { briefForModel } from "../brief";
import { log } from "../log";
import { AREA_SET, fileEvidence, loadSystems, projectRow } from "./areas";
import { TRIAGE_SYSTEM } from "./prompts";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;

// ─── Organising the Inbox ────────────────────────────────────────────────────────────────────────
// Two hundred bookmarks saved from X, nothing filed: the model reads each one and says which project
// it serves and which areas of that project's system it speaks to. The team reviews the list and
// applies it in one go; nothing moves until then.

export interface TriageProposal { itemId: string; projectId: string | null; areas: SystemArea[]; reason: string }

const TriageSchema = z.object({
  items: z.array(z.object({ id: z.string(), project: z.string().nullable(), areas: z.array(z.enum(SYSTEM_AREAS)), reason: z.string() })),
});

const TRIAGE_BATCH = 60;

export async function triageInbox(input: { organizationId: string; itemIds?: string[]; usage: UsageCtx; language?: OutputLanguage }): Promise<TriageProposal[]> {
  const org = input.organizationId;
  // The unfiled references (or the ones asked for), and what the projects are about
  const filed = new Set((await db.select({ itemId: PI.itemId }).from(PI).where(eq(PI.organizationId, org))).map((r) => r.itemId));
  const rowsAll = await db.select({ row: T }).from(T).where(eq(T.organizationId, org)).orderBy(desc(T.createdAt));
  const want = input.itemIds?.length ? new Set(input.itemIds) : null;
  const rows = rowsAll.filter(({ row }) => (want ? want.has(row.id) : !filed.has(row.id))).slice(0, 240);
  if (!rows.length) return [];
  const projects = await db.select({ id: P.id, name: P.name, brief: P.brief }).from(P).where(and(eq(P.organizationId, org), isNull(P.template))).orderBy(asc(P.createdAt));
  const systems = await loadSystems(org);
  const pcodes = new Map(projects.map((p, i) => [`p${i + 1}`, p.id]));
  const projectsText = projects.map((p, i) => ({ id: `p${i + 1}`, name: p.name, brief: briefForModel(p.brief), system: systems[p.id]?.summary || undefined,
    decided: systems[p.id]?.areas.filter((a) => a.decision).map((a) => ({ area: a.area, decision: a.decision })) }));
  // The batches run at once: a batch takes one to three minutes, the inbox has several
  const batches: typeof rows[] = [];
  for (let b = 0; b < rows.length; b += TRIAGE_BATCH) batches.push(rows.slice(b, b + TRIAGE_BATCH));
  const results = await Promise.all(batches.map(async (batch) => {
    const codes = new Map(batch.map(({ row }, i) => [`r${i + 1}`, row.id]));
    const refs = batch.map(({ row }, i) => ({ id: `r${i + 1}`, kind: mediaKindOf(row.web), ...summarize(rowToItem(row), row.tagsJson ?? undefined) }));
    const text = `Projects (JSON): ${JSON.stringify(projectsText)}\n\nUnfiled references (JSON): ${JSON.stringify(refs)}`;
    const res = await llm(prompt("triage", { system: TRIAGE_SYSTEM, text, schema: TriageSchema, language: input.language }));
    void recordUsage(input.usage, { action: "system", ...billOf(res), ref: `inbox triage ${batch.length}` });
    const parsed = TriageSchema.parse(JSON.parse(res.text));
    const out: TriageProposal[] = [];
    for (const it of parsed.items) {
      const itemId = codes.get(it.id);
      if (!itemId) continue;
      out.push({ itemId, projectId: it.project ? pcodes.get(it.project) ?? null : null, areas: [...new Set(it.areas)], reason: it.reason.trim().slice(0, 160) });
    }
    log.info("system.triaged", { organizationId: org, refs: batch.length, filed: parsed.items.filter((i) => i.project).length, tokensIn: res.usage.input, tokensOut: res.usage.output, costUsd: res.costUsd, ms: res.ms });
    return out;
  }));
  return results.flat();
}

/** The team said yes: file each reference in its project and hang it from its areas. */
export async function applyTriage(organizationId: string, picks: { itemId: string; projectId: string; areas: SystemArea[] }[], author: { id: string; name: string }): Promise<{ filed: number; systems: Record<string, ProjectSystem> }> {
  const { fileItems } = await import("../projects");
  const byProject = new Map<string, { itemId: string; areas: SystemArea[] }[]>();
  for (const p of picks) byProject.set(p.projectId, [...(byProject.get(p.projectId) ?? []), { itemId: p.itemId, areas: p.areas }]);
  let filed = 0;
  for (const [projectId, list] of byProject) {
    await fileItems(organizationId, projectId, list.map((x) => x.itemId), author.id);
    filed += list.length;
    // One write per area, not one per reference and area: two hundred bookmarks were thousands of queries
    const byArea = new Map<SystemArea, string[]>();
    for (const x of list) for (const area of x.areas) if (AREA_SET.has(area)) byArea.set(area, [...(byArea.get(area) ?? []), x.itemId]);
    if (!byArea.size) continue;
    await projectRow(organizationId, projectId);
    const ids = [...new Set([...byArea.values()].flat())];
    const mine = new Set((await db.select({ id: T.id }).from(T).where(and(eq(T.organizationId, organizationId), inArray(T.id, ids)))).map((r) => r.id));
    for (const [area, itemIds] of byArea) {
      const ok = itemIds.filter((id) => mine.has(id));
      if (ok.length) await fileEvidence(organizationId, projectId, area, ok, true);
    }
  }
  return { filed, systems: await loadSystems(organizationId) };
}
