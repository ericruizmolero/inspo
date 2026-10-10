// The project's system: eight areas, each with the decision the board supports so far. A model reads
// the board (the team's words first: notes, threads, the brief; then what the DESIGN.md measured)
// and proposes; a person confirms, rewrites or leaves an area to the board. Areas the team decided
// are never touched by a run. Every change leaves a revision, so the system can be read back in time.
// One run costs a fraction of a cent (DeepSeek, the DESIGN.md model), so a run per change is fine.
import "server-only";
import { createHash } from "crypto";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { getErrors } from "./i18n";
import type { OutputLanguage } from "./output-language";
import { llm, LlmError, type LlmInput } from "./llm";
import { prompt, PROMPTS } from "./prompts";
import { summarize } from "./jev";
import { embedEnabled, nearest, queryVector } from "./embed";
import { SIGNAL_AREA, TAXONOMY_VERSION, viewOf } from "./taxonomy";
import type { InspoColor, InspoTags } from "@/types/inspo";
import { rowToItem } from "./items";
import { mediaKindOf, webKeyOf } from "./url";
import { getDesignMd, getDesignMdIndex } from "./design-store";
import { getWhy } from "./design-why";
import { AUTO_REF, autoSystemPass, billOf, recordUsage, type UsageCtx } from "./usage";
import { autoSystemToday } from "./quota";
import { BRIEF_KEYS, type DesignBrief, type DesignSpec, type DesignWhy } from "@/types/design";
import { DECISION_MAX, DOC_PART_MAX, isDocPart, IMPROVE_NOTE_MAX, NEVER_MAX, SYSTEM_AREAS, cleanDecision, emptySystem, type ImproveAim, type SystemFocus, type ProjectSystem, type SystemArea, type SystemAreaState, type SystemEvidence, type SystemRun, type AreaCandidate, type AreaCuration, type AreaSupport, type CandidateVerdict } from "@/types/system";
import { areaCandidates } from "./candidates";
import type { Brief } from "@/types/brief";
import { briefForModel, briefPrompt } from "./brief";
import { readBrand } from "@/types/brand";
import { guideCutLine, projectGuides, type GuideCut } from "./brand-guides";
import { log } from "./log";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;
const C = schema.inspoComment;
const S = schema.projectSystem;
const A = schema.systemArea;
const R = schema.systemAreaRevision;

/** References read per run; beyond this the board is cut, not refused */
const MAX_BOARD = 120;
/** Thread comments sent per reference: the latest ones, each cut to 300 characters */
const COMMENTS_PER_REF = 6;
const AREA_SET = new Set<string>(SYSTEM_AREAS);

// ─── Read ────────────────────────────────────────────────────────────────────

async function projectRow(organizationId: string, projectId: string) {
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

/** The systems of every project in the workspace, for the sidebar (how full each one is). */
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

async function ensureHead(organizationId: string, projectId: string, now: Date): Promise<void> {
  await db.insert(S).values({ projectId, organizationId, summary: "", runJson: null, createdAt: now, updatedAt: now }).onConflictDoNothing();
}

/** `support` left out: it stays as it was. An area emptied loses it */
type AreaWrite = Omit<SystemAreaState, "updatedAt" | "why" | "curation" | "never" | "support"> & { why?: string; curation?: AreaCuration | null; support?: AreaSupport[] };

async function writeArea(organizationId: string, projectId: string, next: AreaWrite, author: { id: string | null; name: string }, now: Date): Promise<void> {
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

const cleanArea = async (area: string): Promise<SystemArea> => {
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
    .where(and(eq(A.projectId, projectId), eq(A.area, area)));
  void author;
  return getSystem(organizationId, projectId);
}

// ─── The board, as the model reads it ────────────────────────────────────────

const GROUP_ORDER = ["brand", "accent", "neutral", "semantic"];

/** What a reference measured, as the system pass reads it: the DESIGN.md's glance and real values, and the share of each
 *  colour in its saved palette (which images and posts have too). Undefined when nothing was measured */
export function measuredSummary(spec: DesignSpec | null, pixels: InspoColor[] | undefined): Record<string, unknown> | undefined {
  const b = spec?.brief;
  const glance = b ? Object.fromEntries(BRIEF_KEYS.filter((k) => k !== "framework" && b[k]).map((k) => [k, b[k]])) as Partial<DesignBrief> : {};
  const out: Record<string, unknown> = {
    glance: Object.keys(glance).length ? glance : undefined,
    layout: spec?.layout || undefined,
    colors: spec?.colors.length ? [...spec.colors].sort((x, y) => GROUP_ORDER.indexOf(x.group) - GROUP_ORDER.indexOf(y.group)).slice(0, 5).map(({ name, hex, group }) => ({ name, hex, group })) : undefined,
    pixels: pixels?.length ? [...pixels].sort((x, y) => y.share - x.share).slice(0, 5).map(({ hex, share }) => ({ hex, share: Math.round(share * 100) / 100 })) : undefined,
    families: spec?.fonts.length ? spec.fonts.map(({ family, role, weights }) => ({ family, role, weights })) : undefined,
    radius: spec?.radii.length ? spec.radii.slice(0, 3) : undefined,
    density: spec?.spacing?.density,
    theme: spec?.theme,
  };
  const kept = Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
  return Object.keys(kept).length ? kept : undefined;
}

interface BoardRef {
  code: string;
  itemId: string;
  words: string[];
  ref: Record<string, unknown>;
  /** The tagger's signals on it, by area (v5 tags); empty before */
  signals: Partial<Record<SystemArea, string[]>>;
}

/** How many references of the board show each signal, by area, most shown first: what a decision's confidence
 *  and its support are counted from. `refs` are board codes, so a frozen snapshot carries it too */
export interface SignalTally {
  of: number;
  areas: Partial<Record<SystemArea, { signal: string; refs: string[] }[]>>;
}

export function signalTally(refs: Pick<BoardRef, "code" | "signals">[]): SignalTally {
  const areas: SignalTally["areas"] = {};
  for (const area of SYSTEM_AREAS) {
    const by = new Map<string, string[]>();
    for (const r of refs) for (const k of r.signals[area] ?? []) by.set(k, [...(by.get(k) ?? []), r.code]);
    if (by.size) areas[area] = [...by].map(([signal, codes]) => ({ signal, refs: codes })).sort((a, b) => b.refs.length - a.refs.length);
  }
  return { of: refs.length, areas };
}

/** A reference's v5 tags as the system reads them: per area its signal keys, and what was measured (measuredSummary),
 *  plus the families its CSS names when no sheet measured any. They stand in for the prose look and the facet lists */
export function signalsOf(t: InspoTags, spec: DesignSpec | null): { signals?: Record<string, string>; measured?: Record<string, unknown> } {
  const areas = Object.entries(t.areas ?? {}) as [SystemArea, { signals: string[] }][];
  const sheet = measuredSummary(spec, t.colors);
  const css = !sheet?.families && t.fonts?.length ? { css_families: t.fonts.slice(0, 4) } : null;
  return {
    signals: areas.length ? Object.fromEntries(areas.map(([area, a]) => [area, a.signals.join(", ")])) : undefined,
    measured: sheet || css ? { ...sheet, ...css } : undefined,
  };
}

/** The board cut to MAX_BOARD: what the team filed under an area and the client's site first, then what the team wrote
 *  about (a note, a comment, a highlight), then the newest. What is kept stays in board order */
async function cutBoard<R extends { row: typeof T.$inferSelect; at: Date }>(organizationId: string, projectId: string, all: R[], commented: Set<string>): Promise<R[]> {
  const W = schema.designWhy;
  const webs = [...new Set(all.map(({ row }) => row.web))];
  const [[project], areas, whys] = await Promise.all([
    db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1),
    db.select({ evidence: A.evidence }).from(A).where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId))),
    db.select({ url: W.url, why: W.whyJson }).from(W).where(and(eq(W.organizationId, organizationId), inArray(W.url, webs))),
  ]);
  const first = new Set([project?.brief?.clientItemId, ...areas.flatMap((a) => (Array.isArray(a.evidence) ? (a.evidence as SystemEvidence[]) : []).filter((e) => e.pinned).map((e) => e.itemId))]);
  const pointed = new Set(whys.filter((w) => (w.why as DesignWhy | null)?.highlights?.length).map((w) => w.url));
  const rank = ({ row }: R) => first.has(row.id) ? 0 : row.note.trim() || row.subNote?.trim() || commented.has(row.id) || pointed.has(row.web) ? 1 : 2;
  const keep = new Set([...all].sort((a, b) => rank(a) - rank(b) || b.at.getTime() - a.at.getTime()).slice(0, MAX_BOARD).map(({ row }) => row.id));
  return all.filter(({ row }) => keep.has(row.id));
}

/**
 * Everything known about each reference, the team's words first. The stamp fingerprints the words,
 * so a new note or comment reads as a stale run even when no reference was added. A reference's code is its place
 * on the whole board (as lib/brand.ts names it), so the cut never renumbers one.
 */
async function loadBoard(organizationId: string, projectId: string): Promise<{ refs: BoardRef[]; stamp: string; omitted: number }> {
  const rows = await db.select({ row: T, at: PI.createdAt }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))).orderBy(asc(PI.createdAt));
  const all = rows.map((r, i) => ({ ...r, code: `r${i + 1}` }));
  const threads = all.length
    ? await db.select({ itemId: C.itemId, author: C.authorName, body: C.body, attachments: C.attachments }).from(C)
        .where(and(eq(C.organizationId, organizationId), inArray(C.itemId, all.map(({ row }) => row.id)))).orderBy(C.createdAt)
    : [];
  const byItem = new Map<string, string[]>();
  // The model reads no pictures here: a comment made with a screenshot says so, so its words ("these 3D…") are
  // read as pointing at something on the reference and not as a line on their own
  for (const c of threads) byItem.set(c.itemId, [...(byItem.get(c.itemId) ?? []), `${c.author}: ${c.body.trim().slice(0, 300)}${c.attachments?.length ? " (said with a screenshot attached, pointing at that part of the reference)" : ""}`]);
  const board = all.length > MAX_BOARD ? await cutBoard(organizationId, projectId, all, new Set(byItem.keys())) : all;
  const ids = board.map(({ row }) => row.id);

  // DESIGN.md sheets and "why it's here", only the ones that exist; never generated here
  const index = await getDesignMdIndex();
  const sheets = await Promise.all(board.map(async ({ row }) => {
    if (mediaKindOf(row.web) !== "web" || !(row.web in index || webKeyOf(row.web) in index)) return { spec: null, why: null };
    const [entry, why] = await Promise.all([getDesignMd(row.web), getWhy(organizationId, row.web)]);
    return { spec: entry?.spec ?? null, why: (why?.why as DesignWhy | undefined) ?? null };
  }));

  const refs: BoardRef[] = board.map(({ row, code }, i) => {
    const item = rowToItem(row);
    const said = byItem.get(row.id) ?? [];
    const comments = said.slice(-COMMENTS_PER_REF);
    const omitted = said.length - comments.length || undefined;
    const { spec, why } = sheets[i];
    const pointed = why?.highlights?.map((h) => ({ quote: h.quote, by: h.author, values: h.values?.length ? h.values : undefined, take: h.note || undefined })) ?? [];
    const base = summarize(item, row.tagsJson ?? undefined);
    const tags = row.tagsJson && row.tagsJson.v >= TAXONOMY_VERSION ? row.tagsJson : null;
    const v5 = tags ? signalsOf(tags, spec) : null;
    return {
      code,
      itemId: row.id,
      signals: Object.fromEntries(Object.entries(tags?.areas ?? {}).map(([area, a]) => [area, a!.signals])),
      words: [base.curator_notes ?? "", ...comments, ...pointed.map((p) => p.quote)],
      // A pasted text is the project's content: the model gets its title and first lines, nothing to read a look from
      ref: mediaKindOf(row.web) === "text" ? {
        id: code, kind: "text", name: base.name, curator_notes: base.curator_notes, excerpt: base.page,
        team_comments: comments.length ? comments : undefined, team_comments_omitted: omitted,
      } : v5 ? {
        id: code, kind: mediaKindOf(row.web), name: base.name, url: base.url, curator_notes: base.curator_notes, page: base.page,
        sector: base.sector, style: base.style,
        team_comments: comments.length ? comments : undefined, team_comments_omitted: omitted,
        team_pointed_at: pointed.length ? pointed : undefined,
        signals: v5.signals,
        measured: v5.measured,
      } : {
        id: code, kind: mediaKindOf(row.web), ...base,
        team_comments: comments.length ? comments : undefined, team_comments_omitted: omitted,
        team_pointed_at: pointed.length ? pointed : undefined,
        measured: measuredSummary(spec, row.tagsJson?.colors),
      },
    };
  });
  const stamp = createHash("sha1").update(JSON.stringify({ ids, w: refs.map((r) => r.words), m: PROMPTS.system.model, v: PROMPTS.system.version })).digest("hex").slice(0, 20);
  return { refs, stamp, omitted: all.length - board.length };
}

/** The current board's stamp, so the client can tell a stale run without running */
export async function boardStamp(organizationId: string, projectId: string): Promise<{ stamp: string; itemIds: string[] }> {
  const { refs, stamp } = await loadBoard(organizationId, projectId);
  return { stamp, itemIds: refs.map((r) => r.itemId) };
}

/** The board as the model reads it, with the client's current site marked when the project is a redesign */
function markClient(refs: BoardRef[], brief: Partial<Brief> | null | undefined) {
  const id = brief?.clientItemId;
  return refs.map((r) => (id && r.itemId === id ? { ...r.ref, client_site: true } : r.ref));
}

// ─── The run ─────────────────────────────────────────────────────────────────

// Blocks every system prompt shares, so the five calls describe the areas, the client's site and
// a good decision in the same words.

const AREAS = `THE EIGHT AREAS
- typography: families, sizes, weights.
- color: the palette and how it is used.
- layout: grid, spacing, radii, density.
- motion: motion and interaction. How things move and how they answer the pointer: hovers, buttons, what is clicked, what only hovers.
- iconography: the icon set, its stroke and style.
- logo: the project's own mark (wordmark, symbol, monogram), how it sits and in what colour.
- imagery: photos, illustration, captures, and how they are framed.
- voice: how the copy sounds.`;

const BOARD = `THE BOARD
References the team saved for this project: websites, images, posts. Each comes with a short id (r1, r2…), the note of whoever saved it, the team's comments, what the team pointed at on it, and what was measured from it. Most also carry "signals": per area, keys of a shared vocabulary for what the reference shows (a model read its picture).
- "measured": glance (one line per aspect) and layout, read from a website's live page; colors (name, hex, group: its palette, brand and accent first), families (family, role, weights), radius, density and theme, from the same page; pixels, the colours of the saved picture or page with their share of it (0 to 1), which images and posts have too; css_families, the families its stylesheets name, when no sheet measured them.
- The team's words say WHY a reference is here: that is where a decision starts. The measured values say WHAT it does: use them to make a decision concrete (families, weights, palette logic, easing, grid), never to invent a direction nobody asked for.
- hex and families in "measured" are real values: a decision that uses one cites it literally, as given. Never round a hex or rename a family.
- "team_comments" are the latest ones; "team_comments_omitted" counts the older ones left out.
- Ids: use them exactly as given, never invent one.`;

const CLIENT_SITE = `- A reference marked "client_site" is the client's own current website: this project is a REDESIGN of it. Its copy (headline, closing, positioning lines), its typefaces (as its stylesheets name them), its logo and its figures are the source of truth. Carry them literally into typography, logo and voice, never propose others for those, and never invent figures or dates. The rest of the board is inspiration for everything else.`;

const DECISION = `- A decision is an instruction an agent can execute for THIS project: 1 to 3 sentences, at most 60 words. Concrete values when the evidence has them, the principle when it does not. Write what the project will do, not what the references do ("Headlines in a high-contrast serif at 400", not "r1 uses a serif").`;

const EVIDENCE = (words: number) => `- Evidence names the references behind a decision by id, each with a "take": what to take from it for this area, as one instruction of at most ${words} words. Only references that speak to that area. A photo or an illustration has no values: its take names the treatment to copy.`;

const CONFIDENCE = `- confidence, 0 to 100: how many references agree, and how concrete and explicit the evidence is. One passing mention is 25 to 40. Two or three references that agree, with concrete values, is 60 to 80. The team saying it in so many words, plus measured values, is 85 or more.`;

/** The system pass reads the board's tally: the confidence and the signals it names are counted, not guessed */
const SIGNALS_RULE = `- signals: 0 to 2 keys from SIGNALS ACROSS THE BOARD, of that area only, that back the decision. Name them for an area the team decided too, even though its text comes back unchanged. None when no counted signal backs the decision, and none for an empty area.
- confidence, 0 to 100: how far the board backs the decision, grounded in the counts. One passing mention, or a signal 1 reference shows, is 25 to 40. A signal a quarter of the board or more shows, or two or three references that agree with concrete values, is 60 to 80. The team saying it in so many words, plus a signal most of the board shows or measured values, is 85 or more. Without the tally (no signals on the board), go by how many references agree and how concrete the evidence is.`;

const STYLE = `- Never write ids (r1, p2) or candidate codes in the text: name the reference or the value instead.
- No markdown, no dashes as punctuation. Font names, hex values, CSS values and verbatim quotes stay exactly as given.`;

const SYSTEM = `You build a project's SYSTEM from its board of references: what the project has decided about its own design, area by area. The system is alive and starts empty. Fill only what the board supports, and say how far it supports it.

${AREAS}

${BOARD}
- A reference of kind "text" is the project's own CONTENT, pasted by the team (a list of services, a piece of copy), given as its title and first lines. It is material to place, not a look: only voice may cite it, for the tone and vocabulary of the real copy. Never decide another area from it, and never summarise, rewrite or quote it in a decision.
- A reference marked "filed_by_team" under an area was put there by a person: it is a directive. Decide that area from those references first, and keep them in its evidence.

THE SYSTEM AS IT STANDS
- Areas marked "team" were decided by a person. They are facts about the project: keep every other area coherent with them, and return them unchanged.
- Areas marked "model" are your earlier proposals. Keep what the board still supports and change what new evidence changes. Do not rephrase for the sake of it; translating into the language below is not rephrasing, so do it.

RULES
${CLIENT_SITE}
${DECISION}
- An area the board says nothing about stays EMPTY: decision "", confidence 0, no evidence. Never fill an area from general taste. Empty areas are useful: they show the team what is still open.
- Be faithful to what the team brought. The board speaks to an area only when: the team's words (a note, a comment, what they pointed at) are about it; a reference was filed under it ("filed_by_team"); or a reference is that area's own material (a type specimen or a foundry for typography, a palette for color, a logo for logo, an animation or a clip of an interaction for motion, an icon set for iconography, a photo or an illustration for imagery, pasted copy for voice). A website saved without words decides no area on its own: its measured brief only makes concrete an area something above already opened. Two saved websites are not eight decided areas.
- "why" is the criterio behind the decision: why this and not the rest, in 1 or 2 sentences (at most 40 words), rooted in the brief and the team's words. Empty when the area is empty.
${SIGNALS_RULE}
${EVIDENCE(20)}
- The summary is the project's criterio in one paragraph (at most 90 words): what it is, who it speaks to, the few decisions that define its look. An agent that reads only this paragraph should already design in the right direction. Empty string if the board is empty.
- Never count references in the text.
${STYLE}`;


export const SystemOutSchema = z.object({
  summary: z.string(),
  areas: z.array(z.object({
    area: z.enum(SYSTEM_AREAS),
    decision: z.string(),
    why: z.string(),
    confidence: z.number().int().min(0).max(100),
    evidence: z.array(z.object({ ref: z.string(), take: z.string() })),
    signals: z.array(z.enum(Object.keys(SIGNAL_AREA) as [string, ...string[]])),
  })),
});

/** What each aim of a pass asked for by hand tells the model */
const AIMS: Record<ImproveAim, string> = {
  order: "Put order in the system: each idea in the area it belongs to, nothing said twice across areas, no area contradicting another or the summary.",
  copy: "Sharpen the writing of decisions, whys and takes: tighter, more concrete, the same meaning. For this pass this overrides \"do not rephrase\".",
  refs: "Read the references again from scratch: evidence and takes re-derived from what each reference actually shows and what the team said about it, not carried over from the previous pass.",
};
/** The team's scope for this pass, as the last block of the prompt; nothing when the pass is the plain one */
function focusForModel(focus: SystemFocus | undefined, teamAreas: SystemArea[] = []): string | null {
  if (!focus) return null;
  // Areas the team decided and now asks to improve: its decision stands, how it is told is what gets better
  const own = focus.areas.filter((a) => teamAreas.includes(a));
  const note = (focus.note ?? "").trim().replace(/\s+/g, " ").slice(0, IMPROVE_NOTE_MAX);
  const lines = [
    focus.areas.length < SYSTEM_AREAS.length ? `Work ONLY on these areas: ${focus.areas.join(", ")}. Return every other area exactly as it stands.` : "",
    own.length ? `The team asks you to improve areas it decided itself: ${own.join(", ")}. For this pass they are NOT returned unchanged. Keep what each one decides: its direction and every concrete value (families, weights, colours, sizes, numbers, verbatim quotes), and keep its length (they may run well over 60 words, with their own line breaks: do not shorten or summarise them). Improve how it is written, its why and the evidence behind it. Never empty one of them.` : "",
    // Asked for by hand, the pass may go past what the team said: everything on the board is context to decide from
    "In this pass you may fill the areas asked for from the whole context, past the rule of being faithful to what the team brought: the measured briefs, what each reference shows and the project brief. An area decided only from that context gets a low confidence (25 to 45).",
    ...focus.aims.map((a) => AIMS[a]),
    note ? `In the team's own words, to follow as an instruction for this pass only: ${JSON.stringify(note)}` : "",
  ].filter(Boolean);
  return lines.length ? `THIS PASS was asked for by the team, who said what they want from it:\n${lines.map((l) => `- ${l}`).join("\n")}` : null;
}

/** Everything the system pass reads: built from the database by runSystem, frozen as a fixture by the eval (scripts/eval-system.ts) */
export interface SystemSnapshot {
  name: string;
  brief: Partial<Brief> | null;
  /** The system as it stands, its references named by their code on the board */
  standing: { area: SystemArea; status: string; decision?: string; confidence?: number; evidence?: { ref: string; take?: string; filed_by_team?: boolean }[]; never?: string[] }[];
  /** The board as the model reads it, the client's site marked */
  refs: Record<string, unknown>[];
  /** References on the board left out of this reading (MAX_BOARD) */
  omitted: number;
  guides: string[];
  /** What the guides lost to READ_MAX; absent when nothing */
  guidesCut?: GuideCut;
  /** The board's signals counted (signalTally); missing on a board frozen before v5 tags */
  signals?: SignalTally;
}

/** The system pass's input as the database has it now */
export async function loadSnapshot(organizationId: string, projectId: string): Promise<{ snapshot: SystemSnapshot; refs: BoardRef[]; stamp: string; current: ProjectSystem }> {
  const project = await projectRow(organizationId, projectId);
  const [{ refs, stamp, omitted }, current, guides] = await Promise.all([loadBoard(organizationId, projectId), getSystem(organizationId, projectId), projectGuides(organizationId, projectId)]);
  const codeOf = new Map(refs.map((r) => [r.itemId, r.code]));
  const snapshot: SystemSnapshot = {
    name: project.name,
    brief: project.brief,
    standing: current.areas.map((a) => ({
      area: a.area,
      status: a.source ?? "empty",
      decision: a.decision || undefined,
      confidence: a.decision ? a.confidence : undefined,
      evidence: a.evidence.length ? a.evidence.map((e) => ({ ref: codeOf.get(e.itemId) ?? "gone", take: e.take || undefined, filed_by_team: e.pinned || undefined })) : undefined,
      never: a.never ? a.never.split("\n") : undefined,
    })),
    refs: markClient(refs, project.brief),
    omitted,
    guides: guides.texts,
    ...(guides.cut ? { guidesCut: guides.cut } : {}),
    signals: signalTally(refs),
  };
  return { snapshot, refs, stamp, current };
}

/** Names the prompt an eval scored: the version and a fingerprint, so an edit nobody numbered still reads as another prompt */
export const SYSTEM_PROMPT_ID = `v${PROMPTS.system.version}-${createHash("sha1").update(SYSTEM).digest("hex").slice(0, 7)}`;

/** The tally as the model reads it: per area, each signal and in how many of the board's references it shows */
function tallyForModel(t: SignalTally | undefined): string | null {
  const rows = SYSTEM_AREAS.flatMap((area) => t?.areas[area]?.length ? [`- ${area}: ${t.areas[area]!.map((x) => `${x.signal} in ${x.refs.length} of ${t.of}`).join(", ")}`] : []);
  return rows.length ? `SIGNALS ACROSS THE BOARD: per area, how many of the ${t!.of} references show each signal\n${rows.join("\n")}` : null;
}

/** The signals a run named for an area, as stored: only that area's keys the board shows, each with its references */
export function supportOf(area: SystemArea, named: string[], tally: SignalTally | undefined, idOf: Map<string, string>): AreaSupport[] {
  const counted = tally?.areas[area] ?? [];
  return [...new Set(named)].filter((k) => SIGNAL_AREA[k] === area).slice(0, 2).flatMap((signal) => {
    const itemIds = (counted.find((x) => x.signal === signal)?.refs ?? []).map((c) => idOf.get(c)).filter((id): id is string => !!id);
    return itemIds.length ? [{ signal, itemIds, of: tally!.of }] : [];
  });
}

/** The system pass as one model call */
export function systemRequest(s: SystemSnapshot, o: { language?: OutputLanguage; focus?: SystemFocus } = {}): LlmInput & { schema: typeof SystemOutSchema } {
  const text = [
    `Project: ${s.name}`,
    briefPrompt(s.brief),
    `System as it stands (JSON): ${JSON.stringify(s.standing)}`,
    `References on the board (JSON): ${JSON.stringify(s.refs)}`,
    s.omitted ? `${s.omitted} references on the board were left out of this reading; what you see is not everything the team saved.` : null,
    tallyForModel(s.signals),
    s.guides.length ? `GUIDE: brand guidelines the team brought in, verbatim. They are the brand's own word, as strong as the client's site: decisions follow their explicit rules and values unless the team's own words on the board say otherwise. Cite no reference for what only the guide says.\n${s.guides.map((g) => `<<<\n${g}\n>>>`).join("\n")}` : null,
    s.guides.length ? guideCutLine(s.guidesCut) : null,
    focusForModel(o.focus, s.standing.filter((a) => a.status === "team").map((a) => a.area)),
  ].filter(Boolean).join("\n\n");
  return { ...prompt("system", { system: SYSTEM, text, language: o.language }), schema: SystemOutSchema };
}

// One run per project at a time: two tabs must not pay twice for the same board
const inflight = new Map<string, Promise<ProjectSystem>>();

/**
 * Reads the board and writes the system: the model's proposal for every area the team has not
 * decided, the summary and the run. Always costs (little): the client asks when the run is stale.
 */
export function runSystem(input: { organizationId: string; projectId: string; usage: UsageCtx; language?: OutputLanguage; focus?: SystemFocus; /** The client calls this pass automatic; autoSystemPass decides whether it counts */ auto?: boolean }): Promise<ProjectSystem> {
  const key = `${input.organizationId}|${input.projectId}`;
  const running = inflight.get(key);
  if (running) return running;
  const job = (async () => {
    const { snapshot, refs, stamp, current } = await loadSnapshot(input.organizationId, input.projectId);
    if (!refs.length && !snapshot.guides.length) throw new HttpError(400, (await getErrors()).systemEmptyBoard);
    const asked = !!input.auto && !input.focus;
    const auto = autoSystemPass(asked, { lastStamp: current.run?.stamp ?? null, stamp, autoToday: asked ? await autoSystemToday(input.organizationId, input.projectId) : 0 });

    const codes = new Map(refs.map((r) => [r.code, r.itemId]));
    const codeOf = new Map(refs.map((r) => [r.itemId, r.code]));
    const textIds = new Set(refs.filter((r) => r.ref.kind === "text").map((r) => r.itemId));
    let res: Awaited<ReturnType<typeof llm>>;
    try {
      res = await llm(systemRequest(snapshot, input));
    } catch (err) {
      if (!(err instanceof LlmError) || !err.finishReason) throw err;
      throw new HttpError(502, `${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
    }
    // Awaited: a brand pass asked for right after this one looks for this row (autoBrandPass)
    await recordUsage(input.usage, { action: "system", ...billOf(res), ref: `${auto ? AUTO_REF : ""}project:${input.projectId}` });
    const out = SystemOutSchema.parse(JSON.parse(res.text));
    log.info("system.built", { ref: input.projectId, refs: refs.length, omitted: snapshot.omitted, areasFilled: out.areas.filter((a) => a.decision.trim()).length, tokensIn: res.usage.input, tokensOut: res.usage.output, ms: res.ms, costUsd: res.costUsd });

    const now = new Date();
    await ensureHead(input.organizationId, input.projectId, now);
    const run: SystemRun = { itemIds: refs.map((r) => r.itemId), stamp, model: res.model, at: now.toISOString(), ...(snapshot.omitted ? { omitted: snapshot.omitted } : {}) };
    await db.update(S).set({ summary: out.summary.trim().slice(0, 1200), runJson: run, updatedAt: now })
      .where(and(eq(S.organizationId, input.organizationId), eq(S.projectId, input.projectId)));

    const byArea = new Map(out.areas.map((a) => [a.area, a]));
    for (const cur of current.areas) {
      if (input.focus && !input.focus.areas.includes(cur.area)) continue;  // out of this pass's scope: as it was
      // The team's word stands, unless the team itself asked for this area to be improved ("Improve with AI")
      const own = cur.source === "team";
      const got = byArea.get(cur.area);
      if (own && !input.focus) {
        // Its words stand; how many references back it is the app's count, so the run keeps it current
        const support = supportOf(cur.area, got?.signals ?? [], snapshot.signals, codes);
        if (cur.decision && JSON.stringify(support) !== JSON.stringify(cur.support)) {
          await db.update(A).set({ support }).where(and(eq(A.organizationId, input.organizationId), eq(A.projectId, input.projectId), eq(A.area, cur.area)));
        }
        continue;
      }
      // A decision of the team keeps its paragraphs; a proposal is one run of text
      const decision = own ? cleanDecision(got?.decision) : (got?.decision ?? "").trim().replace(/\s+/g, " ").slice(0, DECISION_MAX);
      if (own && !decision) continue;  // never emptied by a pass
      // Back to item ids; an invented code or a repeated reference is dropped
      // What a person filed under the area stays, whatever the model made of it
      const pinned = cur.evidence.filter((e) => e.pinned && codes.has(codeOf.get(e.itemId) ?? ""));
      const seen = new Set<string>(pinned.map((e) => e.itemId));
      const evidence: SystemEvidence[] = [...pinned];
      for (const e of got?.evidence ?? []) {
        const itemId = codes.get(e.ref);
        if (!itemId) continue;
        // The project's content backs no area but voice, whatever the model made of it
        if (cur.area !== "voice" && textIds.has(itemId)) continue;
        if (seen.has(itemId)) { const p = evidence.find((x) => x.itemId === itemId); if (p && !p.take) p.take = e.take.trim().slice(0, 200); continue; }
        seen.add(itemId);
        evidence.push({ itemId, take: e.take.trim().slice(0, 200) });
      }
      // An improved decision of the team is still the team's: same author, same standing, better told
      // A proposal is backed by what this run counted
      const next: AreaWrite = own
        ? { area: cur.area, decision, confidence: cur.confidence, evidence, source: "team", decidedBy: cur.decidedBy, why: got?.why || cur.why }
        : decision
        ? { area: cur.area, decision, confidence: Math.max(1, got?.confidence ?? 0), evidence, source: "model", decidedBy: null, why: got?.why ?? "", support: supportOf(cur.area, got?.signals ?? [], snapshot.signals, codes) }
        : { area: cur.area, decision: "", confidence: 0, evidence: pinned, source: null, decidedBy: null, why: "" };
      const same = next.decision === cur.decision && next.confidence === cur.confidence && JSON.stringify(next.evidence) === JSON.stringify(cur.evidence) && (next.why ?? "") === cur.why
        && (next.support === undefined || JSON.stringify(next.support) === JSON.stringify(cur.support));
      if (same && (cur.decision || cur.updatedAt !== emptySystem(input.projectId).areas[0].updatedAt)) continue;
      await writeArea(input.organizationId, input.projectId, next, { id: null, name: res.model }, now);
    }
    return getSystem(input.organizationId, input.projectId);
  })();
  inflight.set(key, job);
  job.finally(() => inflight.delete(key)).catch(() => {}); // the caller gets the job's error
  return job;
}

// ─── Polish an area: the directions the board allows, for the team to pick ──────────────────────

const OPTIONS_SYSTEM = `One area of a project's SYSTEM is weakly decided or empty, and the team wants to settle it. Lay out the 2 or 3 DIRECTIONS the board actually allows for that area, so the team can pick one.

${AREAS}

${BOARD}

RULES
${CLIENT_SITE}
- Directions come from the board, not from taste. Two references that pull different ways make two directions. If the board supports only one, return it alone, plus a second only if the team's words make another plausible.
- Directions differ in substance (a serif headline vs a grotesque one; a monochrome palette vs one accent; dense bento vs an airy single column), never only in wording.
${DECISION}
- "why": one sentence of at most 24 words saying what the project would feel like if it goes this way. No verdict, no advice.
${EVIDENCE(20)}
- Order the directions from best supported to least.
${STYLE}`;

const OptionsSchema = z.object({
  options: z.array(z.object({
    decision: z.string(),
    why: z.string(),
    evidence: z.array(z.object({ ref: z.string(), take: z.string() })),
  })),
});

export interface AreaOption { decision: string; why: string; evidence: SystemEvidence[] }

/** The directions the board allows for one area. Nothing is written: the team picks and that picks writes. */
export async function proposeOptions(input: { organizationId: string; projectId: string; area: string; usage: UsageCtx; language?: OutputLanguage; onlyItemIds?: string[] }): Promise<AreaOption[]> {
  const area = await cleanArea(input.area);
  const project = await projectRow(input.organizationId, input.projectId);
  const [{ refs: all }, current] = await Promise.all([loadBoard(input.organizationId, input.projectId), getSystem(input.organizationId, input.projectId)]);
  // The team may hand-pick the references this area should be decided from
  const only = input.onlyItemIds?.length ? new Set(input.onlyItemIds) : null;
  const refs = only ? all.filter((r) => only.has(r.itemId)) : all;
  if (!refs.length) throw new HttpError(400, (await getErrors()).systemEmptyBoard);
  const codes = new Map(refs.map((r) => [r.code, r.itemId]));
  const codeOf = new Map(refs.map((r) => [r.itemId, r.code]));
  const standing = current.areas.find((a) => a.area === area)!;
  const others = current.areas.filter((a) => a.area !== area && a.decision).map((a) => ({ area: a.area, status: a.source, decision: a.decision }));
  const text = [
    `Project: ${project.name}`,
    `Area to settle: ${area}`,
    standing.never ? `The team ruled these out for this area, never propose them (one per line):\n${standing.never}` : "",
    briefPrompt(project.brief),
    `This area as it stands (JSON): ${JSON.stringify(standing.decision ? { decision: standing.decision, confidence: standing.confidence, evidence: standing.evidence.map((e) => ({ ref: codeOf.get(e.itemId) ?? "gone", take: e.take })) } : null)}`,
    `The other areas, decided or proposed (JSON): ${JSON.stringify(others)}`,
    only ? `The team picked these references for this area, on purpose: build the directions from them alone.` : "",
    `References on the board (JSON): ${JSON.stringify(markClient(refs, project.brief))}`,
  ].filter(Boolean).join("\n\n");
  let res: Awaited<ReturnType<typeof llm>>;
  try {
    res = await llm(prompt("options", { system: OPTIONS_SYSTEM, text, schema: OptionsSchema, language: input.language }));
  } catch (err) {
    if (!(err instanceof LlmError) || !err.finishReason) throw err;
    throw new HttpError(502, `${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
  }
  void recordUsage(input.usage, { action: "system", ...billOf(res), ref: `project:${input.projectId} ${area} options` });
  const out = OptionsSchema.parse(JSON.parse(res.text));
  return out.options.slice(0, 3).map((o) => {
    const seen = new Set<string>();
    const evidence: SystemEvidence[] = [];
    for (const e of o.evidence) {
      const itemId = codes.get(e.ref);
      if (!itemId || seen.has(itemId)) continue;
      seen.add(itemId);
      evidence.push({ itemId, take: e.take.trim().slice(0, 200) });
    }
    return { decision: o.decision.trim().replace(/\s+/g, " ").slice(0, DECISION_MAX), why: o.why.trim().slice(0, 200), evidence };
  }).filter((o) => o.decision);
}

// ─── Starting an empty area ─────────────────────────────────────────────────────────────────────
// An area with nothing behind it is not a dead end. Two things, asked side by side so each shows as soon
// as it can. The references come at once, with no model: what on the board and in the rest of the library
// speaks of the area, by the words of whoever saved them and by meaning (the search's own vectors, when
// the library has them). The question takes a short model call: what a designer would ask, with the
// answers it could have. Nothing is written: adding a reference goes through assignEvidence, picking an
// answer through decideArea.

const START_ASK_SYSTEM = `One area of a project's SYSTEM is EMPTY. Ask the team the one question that gets it going, and give the answers it could have.

${AREAS}

RETURN
- "say": one sentence of at most 24 words telling the team what their own notes and comments already say about this area. If they say nothing, say so. No advice here.
- "question": the one question a designer would ask the team about this area, at most 14 words.
- "options": 3 or 4 answers that differ in substance. Each has:
  - "label": at most 5 words.
  - "decision": the instruction it would write for this project, 1 or 2 sentences, at most 45 words. Stay consistent with the areas already decided: use their typeface names and colours when it helps.
  - "why": at most 20 words on what the project would feel like.

RULES
- Every sentence you write, in the language LANGUAGE names.
${STYLE}`;

const StartAskSchema = z.object({
  say: z.string(),
  question: z.string(),
  options: z.array(z.object({ label: z.string(), decision: z.string(), why: z.string() })),
});

export interface AreaStartRefs { board: { itemId: string; why: string }[]; library: { itemId: string; why: string }[] }
export interface AreaStartAsk { say: string; question: string; options: { label: string; decision: string; why: string }[] }

// A person is waiting in front of an empty area: the question is short and wants an answer in a few seconds, so it
// goes to a quick model that does not stop to reason (the system's own takes 15 to 45 s for the same few lines)
type StartInput = { organizationId: string; projectId: string; area: string; usage: UsageCtx; language?: OutputLanguage };
async function startCall<S extends z.ZodTypeAny>(input: StartInput, part: string, system: string, text: string, schema: S): Promise<z.infer<S>> {
  let res: Awaited<ReturnType<typeof llm>>;
  try {
    res = await llm(prompt("start", { system, text, schema, language: input.language }));
  } catch (err) {
    if (!(err instanceof LlmError) || !err.finishReason) throw err;
    throw new HttpError(502, `${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
  }
  void recordUsage(input.usage, { action: "system", ...billOf(res), ref: `project:${input.projectId}:start-${part}:${input.area}` });
  log.info("system.started", { ref: input.projectId, part, area: input.area, tokensIn: res.usage.input, tokensOut: res.usage.output, costUsd: res.costUsd });
  return schema.parse(JSON.parse(res.text));
}

/** What each area is looked for by: a query for the search's vectors, and the words a person would have written */
const AREA_SEARCH: Record<SystemArea, { q: string; words: RegExp }> = {
  typography: { q: "typeface, type foundry, typography specimen, fonts, lettering", words: /\b(tipograf\w*|typograph\w*|typefaces?|fonts?|fuentes?|foundry|serif\w*|lettering|typos?|tipos?)\b/gi },
  color: { q: "colour palette, color system, gradients, colourful", words: /\b(colou?r\w*|palet\w*|gradient\w*|degradad\w*|monocrom\w*|monochrom\w*)\b/gi },
  layout: { q: "grid layout, bento grid, editorial layout, composition", words: /\b(layouts?|grids?|ret[ií]culas?|bentos?|maquetaci[oó]n|composici[oó]n|composition)\b/gi },
  motion: { q: "animation, motion design, micro-interactions, hover effects, buttons, interaction design, transitions, scroll effects", words: /\b(motion|animaci\w*|animat\w*|transici\w*|transition\w*|hovers?|scroll\w*|interacci\w*|interaction\w*)\b/gi },
  iconography: { q: "icon set, icon library, pictograms, interface icons", words: /\b(icons?|iconos?|iconograf\w*|iconograph\w*|pictogram\w*|glyphs?)\b/gi },
  logo: { q: "logo, logotype, wordmark, brand identity, brand guidelines, branding studio", words: /\b(logos?|logotip\w*|logotypes?|wordmarks?|monogram\w*|isotipos?|brand\w*|identity|identidad\w*|marcas?|guidelines?)\b/gi },
  imagery: { q: "photography, illustration, art direction, 3D renders, imagery", words: /\b(foto\w*|photo\w*|ilustraci\w*|illustration\w*|im[aá]gen\w*|imagery|renders?|3d|mockups?)\b/gi },
  voice: { q: "copywriting, tone of voice, manifesto, editorial writing, storytelling", words: /\b(copy\w*|tono|tone|voz|voice|narrativa|storytelling|manifest\w*|claims?|redacci[oó]n)\b/gi },
};
/** The tags every reference got when it was saved, by the area they speak of: the base that needs no thinking.
 *  Logo and iconography have no tag of their own: there the words decide (and, for logo, being a studio's site). */
const AREA_TAGS: Record<SystemArea, string[]> = {
  typography: ["typography"], color: ["colorful"], layout: ["grid"], motion: ["motion"],
  imagery: ["photography", "illustration", "3d"], voice: ["storytelling"], iconography: [], logo: [],
};
/** How strongly a reference's tags speak of an area, 0–1: the tagger's own score when it kept one, else whether it carries the trait */
function tagScore(area: SystemArea, t: InspoTags | null | undefined): number {
  if (!t) return 0;
  const scores = (t as { tags?: Record<string, number> }).tags;
  const traits = viewOf(t)?.traits ?? [];
  return Math.max(0, ...AREA_TAGS[area].map((k) => (typeof scores?.[k] === "number" ? scores[k] : traits.includes(k) ? 0.8 : 0)));
}

/** The sentence of a text that says the word, short enough for a card */
function sentenceWith(text: string, words: RegExp): string | null {
  for (const part of text.split(/(?<=[.!?])\s+|\n+/)) { words.lastIndex = 0; if (words.test(part)) return part.trim().slice(0, 150); }
  return null;
}

/** The references that are ideal for an area: on the board, and in the rest of the library. No model thinks here:
 *  it is a base read from what each reference already carries (the words of whoever saved it, its tags, what its
 *  page is and looks like) plus closeness in meaning when the library has its vectors. Any area, empty or not. */
export async function startAreaRefs(input: Omit<StartInput, "usage" | "language">): Promise<AreaStartRefs> {
  const area = await cleanArea(input.area);
  const search = AREA_SEARCH[area];
  const [boardRows, rows, visuals] = await Promise.all([
    db.select({ itemId: PI.itemId }).from(PI).where(and(eq(PI.organizationId, input.organizationId), eq(PI.projectId, input.projectId))),
    db.select().from(T).where(eq(T.organizationId, input.organizationId)).orderBy(desc(T.createdAt)),
    boardVisuals(input.organizationId, input.projectId).catch((err) => { log.warn("system.visuals_unread", { ref: input.projectId, err }); return [] as RefVisual[]; }),
  ]);
  const ids = rows.map((r) => r.id);
  const threads = ids.length ? await db.select({ itemId: C.itemId, body: C.body }).from(C).where(and(eq(C.organizationId, input.organizationId), inArray(C.itemId, ids))) : [];
  const said = new Map<string, string>();
  for (const c of threads) said.set(c.itemId, `${said.get(c.itemId) ?? ""} ${c.body}`);
  // Closeness in meaning, when the library has its vectors (it costs one cached embedding of the query); without them the words decide alone
  const near = embedEnabled() ? await queryVector(search.q, input.organizationId).then((vec) => nearest(input.organizationId, vec, 60)).catch((err) => { log.warn("embed.query_failed", { err }); return {} as Record<string, number>; }) : {};
  const onBoard = new Set(boardRows.map((r) => r.itemId));
  const material = new Map(visuals.map((v) => [v.itemId, area === "logo" ? !!v.logo : area === "iconography" ? v.icons.length > 0 : false]));
  const count = (text: string) => { search.words.lastIndex = 0; return new Set((text.match(search.words) ?? []).map((w) => w.toLowerCase())).size; };
  const scored = rows.map((row) => {
    const item = rowToItem(row);
    const words = `${item.note} ${item.subNote ?? ""} ${said.get(row.id) ?? ""}`;
    const about = `${item.name} ${row.tagsJson?.summary ?? ""} ${(row.tagsJson?.meta?.keywords ?? []).join(" ")}`;
    const look = row.tagsJson?.visual ?? "";
    const sem = near[row.web] ?? 0;
    const tag = tagScore(area, row.tagsJson);
    // What the team wrote counts most; then the tags it already carries (only when they are strong); then what its page is and looks like; then meaning
    const score = count(words) * 3 + (tag >= 0.6 ? tag * 3 : 0) + count(about) * 1.5 + Math.min(count(look), 2) * 0.75 + (material.get(row.id) ? 2 : 0)
      + (area === "logo" && row.tagsJson?.sector === "studio" && count(`${words} ${about} ${look}`) ? 1 : 0) + (sem >= 0.42 ? sem * 4 : 0);
    const why = sentenceWith(words, search.words) ?? sentenceWith(row.tagsJson?.summary ?? "", search.words) ?? sentenceWith(look, search.words) ?? (item.note.trim() || row.tagsJson?.summary || "").slice(0, 150);
    return { itemId: row.id, score, why: why.trim() };
  }).filter((x) => x.score >= 1.5).sort((a, b) => b.score - a.score);
  return {
    board: scored.filter((x) => onBoard.has(x.itemId)).slice(0, 6).map(({ itemId, why }) => ({ itemId, why })),
    library: scored.filter((x) => !onBoard.has(x.itemId)).slice(0, 12).map(({ itemId, why }) => ({ itemId, why })),
  };
}

/** The question that gets an empty area going, and the answers it could have */
export async function startAreaAsk(input: StartInput): Promise<AreaStartAsk> {
  const area = await cleanArea(input.area);
  const project = await projectRow(input.organizationId, input.projectId);
  const [{ refs }, current] = await Promise.all([loadBoard(input.organizationId, input.projectId), getSystem(input.organizationId, input.projectId)]);
  const others = current.areas.filter((a) => a.area !== area && a.decision).map((a) => ({ area: a.area, status: a.source, decision: a.decision }));
  const text = [
    `Project: ${project.name}`,
    `The empty area: ${area}`,
    current.areas.find((x) => x.area === area)?.never ? `Ruled out by the team for this area, never offer them:\n${current.areas.find((x) => x.area === area)!.never}` : "",
    briefPrompt(project.brief),
    `In a paragraph: ${current.summary || "(not written yet)"}`,
    project.brief?.clientItemId ? `This project is a REDESIGN of the client's current site (${String(refs.find((r) => r.itemId === project.brief!.clientItemId)?.ref.url ?? "on the board")}): for typography, logo and voice the answers take what that site already uses, never something new.` : "",
    `The other areas, decided or proposed (JSON): ${JSON.stringify(others)}`,
    `What the team said about the references on the board (JSON): ${JSON.stringify(refs.map((r) => { const x = r.ref as Record<string, unknown>; return { name: x.name, notes: x.curator_notes ?? undefined, team_comments: x.team_comments }; }))}`,
  ].join("\n\n");
  const out = await startCall({ ...input, area }, "ask", START_ASK_SYSTEM, text, StartAskSchema);
  return {
    say: out.say.trim().slice(0, 220),
    question: out.question.trim().slice(0, 140),
    options: out.options.slice(0, 4).map((o) => ({ label: o.label.trim().slice(0, 48), decision: o.decision.trim().replace(/\s+/g, " ").slice(0, DECISION_MAX), why: o.why.trim().slice(0, 200) })).filter((o) => o.label && o.decision),
  };
}

// ─── Visual material behind the system ──────────────────────────────────────────────────────────
// The sheet of each reference holds what the screen can show instead of describing: palettes, families,
// radii, the easing, the page captures. Read once per open, never generated here.

export interface RefVisual {
  itemId: string;
  name: string;
  web: string;
  cover: string | null;
  scroll: string | null;
  colors: { name: string; hex: string; group: "brand" | "accent" | "neutral" | "semantic" }[];
  fonts: { family: string; role: "display" | "body" | "mono" | "ui"; weights: number[] }[];
  radii: { element: string; value: string }[];
  /** The dominant easing as `cubic-bezier(a, b, c, d)` or a CSS keyword, and its duration in ms, when the sheet has them */
  easing: string | null;
  durationMs: number | null;
  logo: string | null;
  icons: string[];
  voice: string | null;
  tagline: string | null;
}

const EASING_RE = /cubic-bezier\(\s*[\d.]+\s*,\s*-?[\d.]+\s*,\s*[\d.]+\s*,\s*-?[\d.]+\s*\)|\b(ease-in-out|ease-out|ease-in|linear|ease)\b/;
const DURATION_RE = /(\d+(?:[.,]\d+)?)\s*(ms|s)\b/;

export async function boardVisuals(organizationId: string, projectId: string): Promise<RefVisual[]> {
  const rows = await db.select({ row: T }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))).orderBy(asc(PI.createdAt));
  const index = await getDesignMdIndex();
  return Promise.all(rows.slice(0, MAX_BOARD).map(async ({ row }) => {
    const base: RefVisual = { itemId: row.id, name: row.name, web: row.web, cover: null, scroll: null, colors: [], fonts: [], radii: [], easing: null, durationMs: null, logo: null, icons: [], voice: null, tagline: null };
    if (mediaKindOf(row.web) !== "web" || !(row.web in index || webKeyOf(row.web) in index)) return base;
    const e = await getDesignMd(row.web);
    if (!e) return base;
    const s = e.spec;
    const motion = `${s?.brief?.motion ?? ""} ${s?.motion ?? ""}`;
    const easing = motion.match(EASING_RE)?.[0] ?? null;
    const dur = motion.match(DURATION_RE);
    const durationMs = dur ? Math.round(parseFloat(dur[1].replace(",", ".")) * (dur[2] === "s" ? 1000 : 1)) : null;
    return {
      ...base,
      cover: e.coverUrl ?? e.screenshotUrl ?? null,
      scroll: e.scrollUrl ?? null,
      colors: (s?.colors ?? []).map((c) => ({ name: c.name, hex: c.hex, group: c.group })),
      fonts: (s?.fonts ?? []).map((f) => ({ family: f.family, role: f.role, weights: f.weights })),
      radii: s?.radii ?? [],
      easing, durationMs,
      logo: e.logoUrl ?? null,
      icons: (e.icons ?? []).slice(0, 8),
      voice: s?.brief?.voice ?? null,
      tagline: s?.tagline ?? null,
    };
  }));
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
async function fileEvidence(organizationId: string, projectId: string, area: SystemArea, itemIds: string[], on: boolean): Promise<void> {
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
    if (kept.length !== evidence.length) await db.update(A).set({ evidence: kept, updatedAt: now }).where(and(eq(A.projectId, projectId), eq(A.area, r.area)));
  }
}

// ─── Organising the Inbox ────────────────────────────────────────────────────────────────────────
// Two hundred bookmarks saved from X, nothing filed: the model reads each one and says which project
// it serves and which areas of that project's system it speaks to. The team reviews the list and
// applies it in one go; nothing moves until then.

export interface TriageProposal { itemId: string; projectId: string | null; areas: SystemArea[]; reason: string }

const TRIAGE_SYSTEM = `A pile of references in the team's library is still unfiled. For each one, say which project it serves and which areas of that project's system it speaks to. The team reviews your list before anything moves.

${AREAS}

WHAT YOU GET
- The PROJECTS, each with its brief and its system.
- The unfiled references, each with a short id, the note of whoever saved it, a summary of what it shows and how it looks.

RULES
- Read the saver's note first: it says why the reference is here. Then the summary and the look.
- File a reference under a project only when it clearly serves that project's brief or system. Otherwise project null: a wrong guess is noise the team has to undo.
- areas: only the ones the reference actually speaks to (a palette, a typeface, a layout pattern, a motion or an interaction, an icon style, a logo, a kind of imagery, a tone of copy). Usually one or two. Empty is fine when nothing concrete stands out.
- reason: one sentence of at most 16 words saying what to take from it. No praise.
- Ids: use them exactly as given in the "id" and "project" fields, never invent one.
${STYLE}`;

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
  const { fileItems } = await import("./projects");
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

// ─── The table of an area: everything the board offers, curated by the agent ─────────────────────
// For one area the board offers candidates (the families found, the palettes, the easings, the lines
// of copy). The agent keeps or discards each with a reason, drafts the decision and the criterio behind
// it, and writes it all as the area's proposal. The team flips what it wants and confirms.

const CURATE_SYSTEM = `The team is deciding one AREA of a project's system. The board offers CANDIDATES for it: the typefaces found across the references, their palettes, their easings, their captures, their lines of copy. Decide the area from the candidates the way a senior designer who knows the brief would.

${AREAS}

WHAT YOU GET
The project's brief, the area, and the candidates. Each candidate has an id and the references it comes from, each with the team's note and comments: why they saved it.

RULES
${CLIENT_SITE}
- Every candidate gets "keep" (true or false) and a "reason" of at most 16 words: what it brings to this project, or why it goes.
- Judge against the brief and the team's words first, then against coherence: one or two families, one palette logic, one easing. Keeping everything is not deciding. Keeping nothing is right only when nothing fits.
${DECISION} Build it from what you kept, with the concrete values the candidates carry.
- "why": the criterio, in 1 or 2 sentences (at most 40 words): why this and not the rest, rooted in the brief and what the team said. The team reads this part twice.
${CONFIDENCE}
- Ids: use them exactly as given in "id", never invent one.
${STYLE}`;

const CurateSchema = z.object({
  verdicts: z.array(z.object({ id: z.string(), keep: z.boolean(), reason: z.string() })),
  decision: z.string(),
  why: z.string(),
  confidence: z.number().int().min(0).max(100),
});

export async function curateArea(input: { organizationId: string; projectId: string; area: string; usage: UsageCtx; language?: OutputLanguage; keep?: Record<string, boolean> }): Promise<ProjectSystem> {
  const area = await cleanArea(input.area);
  const project = await projectRow(input.organizationId, input.projectId);
  const [visuals, { refs }, current] = await Promise.all([boardVisuals(input.organizationId, input.projectId), loadBoard(input.organizationId, input.projectId), getSystem(input.organizationId, input.projectId)]);
  const candidates = areaCandidates(area, visuals);
  if (!candidates.length) throw new HttpError(400, (await getErrors()).systemNoCandidates);
  const codeOf = new Map(refs.map((r) => [r.itemId, r.code]));
  const standing = current.areas.find((a) => a.area === area)!;
  const text = [
    `Project: ${project.name}`,
    `Area: ${area}`,
    briefPrompt(project.brief),
    `The area as it stands (JSON): ${JSON.stringify(standing.decision ? { decision: standing.decision, why: standing.why, source: standing.source } : null)}`,
    input.keep && Object.keys(input.keep).length ? `The team already settled some candidates, keep these verdicts exactly (JSON): ${JSON.stringify(input.keep)}` : "",
    `Candidates (JSON): ${JSON.stringify(candidates.map((c) => ({ id: c.id, label: c.label, detail: c.detail, refs: c.refs.map((id) => codeOf.get(id) ?? id), ...c.visual })))}`,
    `References on the board (JSON): ${JSON.stringify(markClient(refs, project.brief))}`,
  ].filter(Boolean).join("\n\n");
  let res: Awaited<ReturnType<typeof llm>>;
  try {
    res = await llm(prompt("curate", { system: CURATE_SYSTEM, text, schema: CurateSchema, language: input.language }));
  } catch (err) {
    if (!(err instanceof LlmError) || !err.finishReason) throw err;
    throw new HttpError(502, `${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
  }
  void recordUsage(input.usage, { action: "system", ...billOf(res), ref: `project:${input.projectId} ${area} curate` });
  const out = CurateSchema.parse(JSON.parse(res.text));
  const ids = new Set(candidates.map((c) => c.id));
  const verdicts: CandidateVerdict[] = candidates.map((c) => {
    const v = out.verdicts.find((x) => x.id === c.id);
    const forced = input.keep?.[c.id];
    return { id: c.id, keep: forced ?? v?.keep ?? false, reason: (v?.reason ?? "").trim().slice(0, 160), byTeam: forced !== undefined || undefined };
  }).filter((v) => ids.has(v.id));
  const curation: AreaCuration = { candidates, verdicts, model: res.model, at: new Date().toISOString() };
  // The references behind what was kept become the evidence; what the team filed stays
  const keptRefs = new Set(candidates.filter((c) => verdicts.find((v) => v.id === c.id)?.keep).flatMap((c) => c.refs));
  const pinned = standing.evidence.filter((e) => e.pinned);
  const evidence: SystemEvidence[] = [...pinned, ...[...keptRefs].filter((id) => !pinned.some((e) => e.itemId === id)).map((id) => ({ itemId: id, take: standing.evidence.find((e) => e.itemId === id)?.take ?? "" }))];
  const now = new Date();
  await ensureHead(input.organizationId, input.projectId, now);
  if (standing.source === "team") {
    // A decided area keeps its decision: only the table is written, for the team to look at
    await db.update(A).set({ curationJson: curation, updatedAt: now }).where(and(eq(A.projectId, input.projectId), eq(A.area, area)));
  } else {
    const decision = out.decision.trim().replace(/\s+/g, " ").slice(0, DECISION_MAX);
    await writeArea(input.organizationId, input.projectId, decision
      ? { area, decision, confidence: Math.max(1, out.confidence), evidence, source: "model", decidedBy: null, why: out.why, curation }
      : { area, decision: "", confidence: 0, evidence: pinned, source: null, decidedBy: null, why: "", curation }, { id: null, name: res.model }, now);
  }
  log.info("system.curated", { ref: input.projectId, area, candidates: candidates.length, kept: verdicts.filter((v) => v.keep).length, costUsd: res.costUsd });
  return getSystem(input.organizationId, input.projectId);
}

/** A person flips a verdict on the table (or rewrites its reason). The decision is not touched: that is confirm. */
export async function setVerdict(organizationId: string, projectId: string, areaKey: string, verdict: { id: string; keep: boolean; reason?: string }): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  const area = await cleanArea(areaKey);
  const current = (await getSystem(organizationId, projectId)).areas.find((a) => a.area === area)!;
  if (!current.curation) return getSystem(organizationId, projectId);
  const verdicts = current.curation.verdicts.map((v) => (v.id === verdict.id ? { ...v, keep: !!verdict.keep, reason: typeof verdict.reason === "string" ? verdict.reason.trim().slice(0, 160) : v.reason, byTeam: true } : v));
  const curation: AreaCuration = { ...current.curation, verdicts };
  await db.update(A).set({ curationJson: curation, updatedAt: new Date() }).where(and(eq(A.projectId, projectId), eq(A.area, area)));
  return getSystem(organizationId, projectId);
}
