// The project's system: eight areas, each with the decision the board supports so far. A model reads
// the board (the team's words first: notes, threads, the brief; then what the DESIGN.md measured)
// and proposes; a person confirms, rewrites or leaves an area to the board. Areas the team decided
// are never touched by a run. Every change leaves a revision, so the system can be read back in time.
// One run costs a fraction of a cent (DeepSeek, the DESIGN.md model), so a run per change is fine.

import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { HttpError, newId } from "../workspace-core";
import { getErrors } from "../i18n";
import { DOC_PART_MAX, isDocPart, NEVER_MAX, SYSTEM_AREAS, cleanDecision, emptySystem, type ProjectSystem, type SystemArea, type SystemAreaState, type SystemEvidence, type SystemRun, type AreaCuration, type AreaSupport, type SystemSummary } from "@/types/system";
import { readBrand } from "@/types/brand";

const P = schema.project;
const T = schema.inspoItem;
const S = schema.projectSystem;
const A = schema.systemArea;
const R = schema.systemAreaRevision;

export const AREA_SET = new Set<string>(SYSTEM_AREAS);

// ─── Read ────────────────────────────────────────────────────────────────────

export async function projectRow(organizationId: string, projectId: string) {
  const [row] = await db.select({ id: P.id, name: P.name, brief: P.brief }).from(P)
    .where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!row) throw new HttpError(404, (await getErrors()).projectNotFound);
  return row;
}

type AreaRow = typeof A.$inferSelect;

const areaState = (r: AreaRow): SystemAreaState => ({
  area: r.area as SystemArea,
  decision: r.decision,
  confidence: r.confidence,
  evidence: Array.isArray(r.evidence) ? (r.evidence as SystemEvidence[]) : [],
  source: (r.source as SystemAreaState["source"]) ?? null,
  decidedBy: r.decidedBy,
  why: r.why ?? "",
  never: r.never ?? "",
  curation: (r.curationJson as AreaCuration | null) ?? null,
  support: Array.isArray(r.support) ? (r.support as AreaSupport[]) : [],
  updatedAt: r.updatedAt.toISOString(),
});

/** The system as it stands: always the eight areas, the ones never written come back empty. */
export async function getSystem(organizationId: string, projectId: string): Promise<ProjectSystem> {
  const [[head], rows] = await Promise.all([
    db.select().from(S).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId))).limit(1),
    db.select().from(A).where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId))),
  ]);
  const base = emptySystem(projectId);
  const byArea = new Map(rows.map((r) => [r.area, areaState(r)]));
  const areas = base.areas.map((a) => byArea.get(a.area) ?? a);
  const latest = [head?.updatedAt, ...rows.map((r) => r.updatedAt)].filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0];
  return {
    projectId,
    summary: head?.summary ?? "",
    areas,
    run: (head?.runJson as SystemRun | null) ?? null,
    doc: head?.doc ?? {},
    brand: readBrand(head?.brand),
    updatedAt: latest?.toISOString() ?? null,
  };
}

// ─── The file, written by hand ───────────────────────────────────────────────────────────────────
// criterio.md is the system's other face, and the team writes on it. The areas' own words are decisions;
// the paragraph is the paragraph; the rest (the head, an area's status and references, the list of
// references) the app writes, and a person can write over it: that part then says what they wrote.

/** The project's paragraph, written by a person. The next reading of the board writes it again. */
export async function setSummary(organizationId: string, projectId: string, summary: string): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  const now = new Date();
  await ensureHead(organizationId, projectId, now);
  await db.update(S).set({ summary: String(summary ?? "").trim().slice(0, 4000), updatedAt: now }).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId)));
  return getSystem(organizationId, projectId);
}

/** A part of the file rewritten by hand; null (or the empty text) goes back to what the app writes */
export async function setDocPart(organizationId: string, projectId: string, part: string, text: string | null): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  if (!isDocPart(part)) throw new HttpError(400, (await getErrors()).badBody);
  const now = new Date();
  await ensureHead(organizationId, projectId, now);
  const [head] = await db.select({ doc: S.doc }).from(S).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId))).limit(1);
  const doc = { ...(head?.doc ?? {}) };
  const clean = text === null ? "" : String(text).replace(/\r/g, "").trimEnd().slice(0, DOC_PART_MAX);
  if (clean.trim()) doc[part] = clean; else delete doc[part];
  await db.update(S).set({ doc, updatedAt: now }).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId)));
  return getSystem(organizationId, projectId);
}

/** What the library needs of every project's system (types/system.ts SystemSummary), selecting only that: the
 *  run's read ids, each area's decided flag and evidence ids. Never the file, the brand, the curation or the takes */
export async function loadSystemSummaries(organizationId: string): Promise<Record<string, SystemSummary>> {
  const ids = (await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), isNull(P.template)))).map((r) => r.id);
  if (!ids.length) return {};
  const [heads, rows] = await Promise.all([
    db.select({ projectId: S.projectId, itemIds: sql<string[] | null>`${S.runJson}->'itemIds'`, omitted: sql<number | null>`(${S.runJson}->>'omitted')::int` })
      .from(S).where(and(eq(S.organizationId, organizationId), inArray(S.projectId, ids), sql`${S.runJson} is not null`)),
    db.select({ projectId: A.projectId, area: A.area, decided: sql<boolean>`${A.decision} <> ''`, evidence: sql<string[]>`coalesce(jsonb_path_query_array(${A.evidence}, '$[*].itemId'), '[]'::jsonb)` })
      .from(A).where(and(eq(A.organizationId, organizationId), inArray(A.projectId, ids))),
  ]);
  const out: Record<string, SystemSummary> = {};
  for (const id of ids) out[id] = { projectId: id, areas: SYSTEM_AREAS.map((area) => ({ area, decided: false, evidence: [] })), read: null };
  for (const h of heads) out[h.projectId].read = { itemIds: Array.isArray(h.itemIds) ? h.itemIds : [], omitted: h.omitted ?? 0 };
  for (const r of rows) {
    const i = SYSTEM_AREAS.indexOf(r.area as SystemArea);
    if (i >= 0) out[r.projectId].areas[i] = { area: r.area as SystemArea, decided: r.decided, evidence: r.evidence };
  }
  return out;
}

/** The whole systems of every project in the workspace: the agent and the MCP read them all */
export async function loadSystems(organizationId: string): Promise<Record<string, ProjectSystem>> {
  const ids = (await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), isNull(P.template)))).map((r) => r.id);
  if (!ids.length) return {};
  const [heads, rows] = await Promise.all([
    db.select().from(S).where(and(eq(S.organizationId, organizationId), inArray(S.projectId, ids))),
    db.select().from(A).where(and(eq(A.organizationId, organizationId), inArray(A.projectId, ids))),
  ]);
  const out: Record<string, ProjectSystem> = {};
  for (const id of ids) out[id] = emptySystem(id);
  for (const h of heads) { out[h.projectId].summary = h.summary; out[h.projectId].run = (h.runJson as SystemRun | null) ?? null; out[h.projectId].doc = h.doc ?? {}; out[h.projectId].updatedAt = h.updatedAt.toISOString(); }
  for (const r of rows) {
    const sys = out[r.projectId];
    const i = SYSTEM_AREAS.indexOf(r.area as SystemArea);
    if (i >= 0) sys.areas[i] = areaState(r);
    if (!sys.updatedAt || r.updatedAt.toISOString() > sys.updatedAt) sys.updatedAt = r.updatedAt.toISOString();
  }
  return out;
}

// ─── Write (the team) ────────────────────────────────────────────────────────

export async function ensureHead(organizationId: string, projectId: string, now: Date): Promise<void> {
  await db.insert(S).values({ projectId, organizationId, summary: "", runJson: null, createdAt: now, updatedAt: now }).onConflictDoNothing();
}

/** `support` left out: it stays as it was. An area emptied loses it */
export type AreaWrite = Omit<SystemAreaState, "updatedAt" | "why" | "curation" | "never" | "support"> & { why?: string; curation?: AreaCuration | null; support?: AreaSupport[] };

export async function writeArea(organizationId: string, projectId: string, next: AreaWrite, author: { id: string | null; name: string }, now: Date): Promise<void> {
  const why = (next.why ?? "").trim().slice(0, 400);
  const set: Record<string, unknown> = { decision: next.decision, confidence: next.confidence, evidence: next.evidence, source: next.source, decidedBy: next.decidedBy, why, updatedAt: now };
  if (next.curation !== undefined) set.curationJson = next.curation;
  const support = next.decision ? next.support : [];
  if (support !== undefined) set.support = support;
  await db.insert(A).values({
    projectId, organizationId, area: next.area, decision: next.decision, confidence: next.confidence, evidence: next.evidence,
    source: next.source, decidedBy: next.decidedBy, why, curationJson: next.curation ?? null, support: support ?? [], updatedAt: now,
  }).onConflictDoUpdate({ target: [A.projectId, A.area], set });
  if (next.source) {
    await db.insert(R).values({
      id: newId(), projectId, organizationId, area: next.area, decision: next.decision, confidence: next.confidence, evidence: next.evidence,
      source: next.source, why, authorId: author.id, authorName: author.name, createdAt: now,
    });
  }
}

export const cleanArea = async (area: string): Promise<SystemArea> => {
  if (!AREA_SET.has(area)) throw new HttpError(400, (await getErrors()).badBody);
  return area as SystemArea;
};

/**
 * A person writes the decision of an area (or confirms the model's as it is). From here on, runs
 * leave this area alone. An empty decision empties the area: nothing decided, open to the board.
 */
export async function decideArea(organizationId: string, projectId: string, areaKey: string, input: { decision: string; confidence?: number; evidence?: SystemEvidence[]; why?: string }, author: { id: string; name: string }): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  const area = await cleanArea(areaKey);
  const decision = cleanDecision(input.decision);
  const current = (await getSystem(organizationId, projectId)).areas.find((a) => a.area === area)!;
  const now = new Date();
  await ensureHead(organizationId, projectId, now);
  if (!decision) {
    await writeArea(organizationId, projectId, { area, decision: "", confidence: 0, evidence: [], source: null, decidedBy: null, why: "" }, { id: author.id, name: author.name }, now);
  } else {
    const confidence = typeof input.confidence === "number" && Number.isFinite(input.confidence) ? Math.max(0, Math.min(100, Math.round(input.confidence))) : Math.max(current.confidence, 80);
    // A confirmed proposal keeps the references that led to it; a rewritten one keeps them too, they still back it.
    // A picked option brings its own (only references of this workspace, each once)
    let evidence = current.evidence;
    if (Array.isArray(input.evidence)) {
      const ids = [...new Set(input.evidence.map((e) => String(e?.itemId ?? "")).filter(Boolean))].slice(0, 20);
      const mine = new Set((ids.length ? await db.select({ id: T.id }).from(T).where(and(eq(T.organizationId, organizationId), inArray(T.id, ids))) : []).map((r) => r.id));
      evidence = input.evidence.filter((e) => mine.has(e.itemId)).map((e) => ({ itemId: e.itemId, take: String(e.take ?? "").trim().slice(0, 200) }));
    }
    await writeArea(organizationId, projectId, { area, decision, confidence, evidence, source: "team", decidedBy: author.id, why: typeof input.why === "string" ? input.why : current.why }, { id: author.id, name: author.name }, now);
  }
  return getSystem(organizationId, projectId);
}

/** What an area must never do, as the team wrote it (one rule per line). Apart from the decision: writing it
 *  neither confirms nor changes what the area decided, and the board's runs leave it alone. */
export async function setAreaNever(organizationId: string, projectId: string, areaKey: string, never: string): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  const area = await cleanArea(areaKey);
  const text = String(never ?? "").split("\n").map((l) => l.trim().replace(/^[-*·]\s*/, "")).filter(Boolean).join("\n").slice(0, NEVER_MAX);
  const now = new Date();
  await ensureHead(organizationId, projectId, now);
  await db.insert(A).values({ projectId, organizationId, area, never: text, updatedAt: now })
    .onConflictDoUpdate({ target: [A.projectId, A.area], set: { never: text, updatedAt: now } });
  return getSystem(organizationId, projectId);
}

/** Copies a project's system into another: every area (decision, why, never), the paragraph. As "team" when the copy
 *  is a template or a project started from one (its decisions are the work's, runs leave them alone), as "model"
 *  when they are proposals the next run may change. No references travel here: the board is copied apart. */
export async function copySystem(organizationId: string, fromProjectId: string, toProjectId: string, as: "team" | "model", author: { id: string; name: string }): Promise<void> {
  const from = await getSystem(organizationId, fromProjectId);
  const now = new Date();
  // The brand's values travel whole; as "model" they are proposals the next run may change
  const brand = from.brand ? { ...from.brand, meta: as === "team" ? from.brand.meta : {}, run: null } : null;
  await db.insert(S).values({ projectId: toProjectId, organizationId, summary: from.summary, runJson: null, brand, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: S.projectId, set: { summary: from.summary, brand, updatedAt: now } });
  for (const a of from.areas) {
    if (!a.decision && !a.never) continue;
    const source = a.decision ? as : null;
    const confidence = a.decision ? (as === "team" ? 100 : 70) : 0;
    const row = { decision: a.decision, confidence, evidence: [], source, decidedBy: as === "team" && a.decision ? author.id : null, why: a.why, never: a.never, curationJson: null, support: [], updatedAt: now };
    await db.insert(A).values({ projectId: toProjectId, organizationId, area: a.area, ...row })
      .onConflictDoUpdate({ target: [A.projectId, A.area], set: row });
    if (a.decision) await db.insert(R).values({ id: newId(), projectId: toProjectId, organizationId, area: a.area, decision: a.decision, confidence, evidence: [], source: as, why: a.why, authorId: author.id, authorName: author.name, createdAt: now });
  }
}

/** The team hands an area back to the board: its text stays, but the next run may change it. */
export async function releaseArea(organizationId: string, projectId: string, areaKey: string, author: { id: string; name: string }): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  const area = await cleanArea(areaKey);
  const current = (await getSystem(organizationId, projectId)).areas.find((a) => a.area === area)!;
  if (current.source !== "team") return getSystem(organizationId, projectId);
  const now = new Date();
  await db.update(A).set({ source: current.decision ? "model" : null, decidedBy: null, updatedAt: now })
    .where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId), eq(A.area, area)));
  void author;
  return getSystem(organizationId, projectId);
}

// ─── History and undo ───────────────────────────────────────────────────────────────────────────
// Every change to an area left a revision: who (a person or the model), what, when. The screen shows
// the trail and can step back one change.

export interface AreaRevision { decision: string; why: string; confidence: number; source: "model" | "team"; authorName: string; at: string }

export async function areaHistory(organizationId: string, projectId: string, perArea = 6): Promise<Record<string, AreaRevision[]>> {
  const rows = await db.select({ area: R.area, decision: R.decision, why: R.why, confidence: R.confidence, source: R.source, authorName: R.authorName, createdAt: R.createdAt })
    .from(R).where(and(eq(R.organizationId, organizationId), eq(R.projectId, projectId))).orderBy(desc(R.createdAt));
  const out: Record<string, AreaRevision[]> = {};
  for (const r of rows) {
    const list = (out[r.area] ??= []);
    if (list.length < perArea) list.push({ decision: r.decision, why: r.why ?? "", confidence: r.confidence, source: r.source as "model" | "team", authorName: r.authorName, at: r.createdAt.toISOString() });
  }
  return out;
}

/** Steps an area back to what it said before its last change. The step itself is a change by this person. */
export async function revertArea(organizationId: string, projectId: string, areaKey: string, author: { id: string; name: string }): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  const area = await cleanArea(areaKey);
  const rows = await db.select().from(R).where(and(eq(R.organizationId, organizationId), eq(R.projectId, projectId), eq(R.area, area))).orderBy(desc(R.createdAt)).limit(2);
  const previous = rows[1];
  const now = new Date();
  await ensureHead(organizationId, projectId, now);
  if (!previous) {
    await writeArea(organizationId, projectId, { area, decision: "", confidence: 0, evidence: [], source: null, decidedBy: null, why: "" }, author, now);
  } else {
    const evidence = Array.isArray(previous.evidence) ? (previous.evidence as SystemEvidence[]) : [];
    await writeArea(organizationId, projectId, { area, decision: previous.decision, confidence: previous.confidence, evidence, source: previous.source as "model" | "team", decidedBy: previous.source === "team" ? author.id : null, why: previous.why ?? "" }, author, now);
  }
  return getSystem(organizationId, projectId);
}

// ─── Filing a reference under an area, from the board ───────────────────────────────────────────
// The team says where a piece belongs (this clip is Motion, this capture is Imagery). The node counts
// it at once; the next run decides the area from what was filed.

export async function assignEvidence(organizationId: string, projectId: string, areaKey: string, itemId: string | string[], on: boolean, author: { id: string; name: string }): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  const area = await cleanArea(areaKey);
  const ids = [...new Set(Array.isArray(itemId) ? itemId : [itemId])];
  const mine = await db.select({ id: T.id }).from(T).where(and(eq(T.organizationId, organizationId), inArray(T.id, ids)));
  if (mine.length !== ids.length) throw new HttpError(404, (await getErrors()).itemNotInWorkspace);
  if (ids.length) await fileEvidence(organizationId, projectId, area, ids, on);
  void author;
  return getSystem(organizationId, projectId);
}

/** Files (or unfiles) several references under one area in one write. The caller has checked project, area and items. */
export async function fileEvidence(organizationId: string, projectId: string, area: SystemArea, itemIds: string[], on: boolean): Promise<void> {
  const ids = new Set(itemIds);
  const current = (await getSystem(organizationId, projectId)).areas.find((a) => a.area === area)!;
  const rest = current.evidence.filter((e) => !ids.has(e.itemId));
  const kept = new Map(current.evidence.map((e) => [e.itemId, e]));
  const evidence: SystemEvidence[] = on ? [...rest, ...[...ids].map((itemId) => ({ itemId, take: kept.get(itemId)?.take ?? "", pinned: true }))] : rest;
  const now = new Date();
  await ensureHead(organizationId, projectId, now);
  // Filing is not deciding: the decision and its source stay as they were, only the evidence moves
  await db.insert(A).values({ projectId, organizationId, area, decision: current.decision, confidence: current.confidence, evidence, source: current.source, decidedBy: current.decidedBy, why: current.why, curationJson: current.curation, updatedAt: now })
    .onConflictDoUpdate({ target: [A.projectId, A.area], set: { evidence, updatedAt: now } });
}

/** The references behind an area as the team rewrote them in criterio.md: the ones left, each with its take, in
 *  that order. One that was there keeps whether it was filed by hand; one written in is filed by hand. The decision
 *  and its source stay as they were */
export async function setAreaEvidence(organizationId: string, projectId: string, areaKey: string, refs: { itemId: string; take: string }[]): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  const area = await cleanArea(areaKey);
  const ids = [...new Set(refs.map((r) => String(r?.itemId ?? "")).filter(Boolean))].slice(0, 40);
  const mine = new Set((ids.length ? await db.select({ id: T.id }).from(T).where(and(eq(T.organizationId, organizationId), inArray(T.id, ids))) : []).map((r) => r.id));
  const current = (await getSystem(organizationId, projectId)).areas.find((a) => a.area === area)!;
  const evidence: SystemEvidence[] = ids.filter((id) => mine.has(id)).map((id) => {
    const was = current.evidence.find((e) => e.itemId === id);
    const take = String(refs.find((r) => r.itemId === id)?.take ?? "").trim().slice(0, 200);
    return was ? { ...was, take } : { itemId: id, take, pinned: true };
  });
  const now = new Date();
  await ensureHead(organizationId, projectId, now);
  await db.insert(A).values({ projectId, organizationId, area, decision: current.decision, confidence: current.confidence, evidence, source: current.source, decidedBy: current.decidedBy, why: current.why, curationJson: current.curation, updatedAt: now })
    .onConflictDoUpdate({ target: [A.projectId, A.area], set: { evidence, updatedAt: now } });
  return getSystem(organizationId, projectId);
}

/** References that left the project leave its system too: their evidence goes from every area, in one pass. */
export async function dropEvidence(organizationId: string, projectId: string, itemIds: string[]): Promise<void> {
  const gone = new Set(itemIds);
  const rows = await db.select().from(A).where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId)));
  const now = new Date();
  for (const r of rows) {
    const evidence = Array.isArray(r.evidence) ? (r.evidence as SystemEvidence[]) : [];
    const kept = evidence.filter((e) => !gone.has(e.itemId));
    if (kept.length !== evidence.length) await db.update(A).set({ evidence: kept, updatedAt: now }).where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId), eq(A.area, r.area)));
  }
}
