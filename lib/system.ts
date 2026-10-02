// The project's system: eight areas, each with the decision the board supports so far. A model reads
// the board (the team's words first: notes, threads, the brief; then what the DESIGN.md measured)
// and proposes; a person confirms, rewrites or leaves an area to the board. Areas the team decided
// are never touched by a run. Every change leaves a revision, so the system can be read back in time.
// One run costs a fraction of a cent (DeepSeek, the DESIGN.md model), so a run per change is fine.
import "server-only";
import { createHash } from "crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { getErrors } from "./i18n";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import { llm, LlmError } from "./llm";
import { summarize } from "./jev";
import { rowToItem } from "./items";
import { mediaKindOf, webKeyOf } from "./url";
import { getDesignMd, getDesignMdIndex } from "./design-store";
import { getWhy } from "./design-why";
import { recordUsage, type UsageCtx } from "./usage";
import { BRIEF_KEYS, type DesignBrief, type DesignWhy } from "@/types/design";
import { DECISION_MAX, SYSTEM_AREAS, emptySystem, type ProjectSystem, type SystemArea, type SystemAreaState, type SystemEvidence, type SystemRun } from "@/types/system";
import type { PolishBrief } from "@/types/polish";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;
const C = schema.inspoComment;
const S = schema.projectSystem;
const A = schema.systemArea;
const R = schema.systemAreaRevision;

export const SYSTEM_MODEL = process.env.SYSTEM_MODEL || process.env.DESIGN_MD_MODEL || "deepseek/deepseek-v4.1-flash";
/** Bumps when the prompt or the output shape changes, so an old run reads as stale */
const PROMPT_VERSION = 1;
/** References read per run; beyond this the board is cut, not refused */
const MAX_BOARD = 120;
/** Thread comments sent per reference: the latest ones, each cut to 300 characters */
const COMMENTS_PER_REF = 6;
const AREA_SET = new Set<string>(SYSTEM_AREAS);

// ─── Read ────────────────────────────────────────────────────────────────────

async function projectRow(organizationId: string, projectId: string) {
  const [row] = await db.select({ id: P.id, name: P.name, polish: P.polish }).from(P)
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
    updatedAt: latest?.toISOString() ?? null,
  };
}

/** The systems of every project in the workspace, for the sidebar (how full each one is). */
export async function loadSystems(organizationId: string): Promise<Record<string, ProjectSystem>> {
  const ids = (await db.select({ id: P.id }).from(P).where(eq(P.organizationId, organizationId))).map((r) => r.id);
  if (!ids.length) return {};
  const [heads, rows] = await Promise.all([
    db.select().from(S).where(and(eq(S.organizationId, organizationId), inArray(S.projectId, ids))),
    db.select().from(A).where(and(eq(A.organizationId, organizationId), inArray(A.projectId, ids))),
  ]);
  const out: Record<string, ProjectSystem> = {};
  for (const id of ids) out[id] = emptySystem(id);
  for (const h of heads) { out[h.projectId].summary = h.summary; out[h.projectId].run = (h.runJson as SystemRun | null) ?? null; out[h.projectId].updatedAt = h.updatedAt.toISOString(); }
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

async function writeArea(organizationId: string, projectId: string, next: Omit<SystemAreaState, "updatedAt">, author: { id: string | null; name: string }, now: Date): Promise<void> {
  await db.insert(A).values({
    projectId, organizationId, area: next.area, decision: next.decision, confidence: next.confidence, evidence: next.evidence,
    source: next.source, decidedBy: next.decidedBy, updatedAt: now,
  }).onConflictDoUpdate({
    target: [A.projectId, A.area],
    set: { decision: next.decision, confidence: next.confidence, evidence: next.evidence, source: next.source, decidedBy: next.decidedBy, updatedAt: now },
  });
  if (next.source) {
    await db.insert(R).values({
      id: newId(), projectId, organizationId, area: next.area, decision: next.decision, confidence: next.confidence, evidence: next.evidence,
      source: next.source, authorId: author.id, authorName: author.name, createdAt: now,
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
export async function decideArea(organizationId: string, projectId: string, areaKey: string, input: { decision: string; confidence?: number; evidence?: SystemEvidence[] }, author: { id: string; name: string }): Promise<ProjectSystem> {
  await projectRow(organizationId, projectId);
  const area = await cleanArea(areaKey);
  const decision = String(input.decision ?? "").trim().replace(/\s+/g, " ").slice(0, DECISION_MAX);
  const current = (await getSystem(organizationId, projectId)).areas.find((a) => a.area === area)!;
  const now = new Date();
  await ensureHead(organizationId, projectId, now);
  if (!decision) {
    await writeArea(organizationId, projectId, { area, decision: "", confidence: 0, evidence: [], source: null, decidedBy: null }, { id: author.id, name: author.name }, now);
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
    await writeArea(organizationId, projectId, { area, decision, confidence, evidence, source: "team", decidedBy: author.id }, { id: author.id, name: author.name }, now);
  }
  return getSystem(organizationId, projectId);
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

interface BoardRef {
  code: string;
  itemId: string;
  words: string[];
  ref: Record<string, unknown>;
}

/**
 * Everything known about each reference, the team's words first. The stamp fingerprints the words,
 * so a new note or comment reads as a stale run even when no reference was added.
 */
async function loadBoard(organizationId: string, projectId: string): Promise<{ refs: BoardRef[]; stamp: string }> {
  const rows = await db.select({ row: T, at: PI.createdAt }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))).orderBy(asc(PI.createdAt));
  const board = rows.slice(0, MAX_BOARD);
  const ids = board.map(({ row }) => row.id);
  const threads = ids.length
    ? await db.select({ itemId: C.itemId, author: C.authorName, body: C.body }).from(C)
        .where(and(eq(C.organizationId, organizationId), inArray(C.itemId, ids))).orderBy(C.createdAt)
    : [];
  const byItem = new Map<string, string[]>();
  for (const c of threads) byItem.set(c.itemId, [...(byItem.get(c.itemId) ?? []), `${c.author}: ${c.body.trim().slice(0, 300)}`]);

  // DESIGN.md sheets and "why it's here", only the ones that exist; never generated here
  const index = await getDesignMdIndex();
  const sheets = await Promise.all(board.map(async ({ row }) => {
    if (mediaKindOf(row.web) !== "web" || !(row.web in index || webKeyOf(row.web) in index)) return { brief: null, layout: null, why: null };
    const [entry, why] = await Promise.all([getDesignMd(row.web), getWhy(organizationId, row.web)]);
    const b = entry?.spec?.brief;
    const brief = b ? Object.fromEntries(BRIEF_KEYS.filter((k) => k !== "framework" && b[k]).map((k) => [k, b[k]])) as Partial<DesignBrief> : null;
    return { brief, layout: entry?.spec?.layout ?? null, why: (why?.why as DesignWhy | undefined) ?? null };
  }));

  const refs: BoardRef[] = board.map(({ row }, i) => {
    const item = rowToItem(row);
    const comments = (byItem.get(row.id) ?? []).slice(-COMMENTS_PER_REF);
    const { brief, layout, why } = sheets[i];
    const pointed = why?.highlights?.map((h) => ({ quote: h.quote, by: h.author, values: h.values?.length ? h.values : undefined, take: h.note || undefined })) ?? [];
    const base = summarize(item, row.tagsJson ?? undefined);
    return {
      code: `r${i + 1}`,
      itemId: row.id,
      words: [base.curator_notes ?? "", ...comments, ...pointed.map((p) => p.quote)],
      ref: {
        id: `r${i + 1}`, kind: mediaKindOf(row.web), ...base,
        team_comments: comments.length ? comments : undefined,
        team_pointed_at: pointed.length ? pointed : undefined,
        measured: brief || layout ? { ...brief, layout: layout ?? undefined } : undefined,
      },
    };
  });
  const stamp = createHash("sha1").update(JSON.stringify({ ids, w: refs.map((r) => r.words), m: SYSTEM_MODEL, v: PROMPT_VERSION })).digest("hex").slice(0, 20);
  return { refs, stamp };
}

/** The current board's stamp, so the client can tell a stale run without running */
export async function boardStamp(organizationId: string, projectId: string): Promise<{ stamp: string; itemIds: string[] }> {
  const { refs, stamp } = await loadBoard(organizationId, projectId);
  return { stamp, itemIds: refs.map((r) => r.itemId) };
}

function briefForModel(b: PolishBrief | null | undefined) {
  if (!b) return null;
  return { about: b.about || null, audience_note: b.audienceNote || null, tone: b.tone.length ? b.tone : null, avoid: b.avoid || null, first_five_seconds: b.firstSeconds || null };
}

// ─── The run ─────────────────────────────────────────────────────────────────

const SYSTEM = `A design team keeps a board of references for one project: websites, images and posts they saved, each with the note of whoever saved it, the team's comments, what the team pointed at on it, and (for websites) a brief measured from the live page. From this board you build the PROJECT'S SYSTEM: what the project has decided about its own design, in eight areas: typography, color, layout, motion, iconography, logo, imagery, voice (tone of the copy).

The system is alive and starts empty. Your job is to fill only what the board supports, and to say how far it supports it.

Rules:
- The team's words come first. A note, a comment or a thing they pointed at says WHY a reference is here: that is the decision's root. The measured brief says WHAT the reference does: use it to make the decision concrete (families, weights, palette logic, easing, grid), never to invent a direction nobody asked for.
- A decision is an instruction an agent can execute for THIS project, in 1 to 3 sentences (max 60 words): concrete values when the evidence has them, the principle when it does not. Write what the project will do, not what the references do ("Headlines in a high-contrast serif at 400, body in a geist-like grotesque", not "r1 uses a serif").
- An area the board says nothing about stays EMPTY: decision "", confidence 0, no evidence. Never fill an area from general taste. Empty areas are useful: they show the team what is still open.
- confidence is 0-100: how many references agree, how concrete and how explicit the evidence is. One passing mention is 25-40; two or three references that agree with concrete values is 60-80; the team saying it in so many words plus measured values is 85+.
- evidence lists the references behind the decision, by id, each with a "take": what to take from it for this area, as one instruction of at most 20 words. Only references that actually speak to that area. A photo or an illustration has no values: its take names the treatment to copy.
- You receive the SYSTEM AS IT STANDS. Areas marked "team" were decided by a person: they are facts about the project, keep every other area coherent with them and return them unchanged (same text). Areas marked "model" are your previous proposals: keep what the board still supports, change what new evidence changes, do not rephrase for the sake of it.
- The summary is the project's criterio in one paragraph (max 90 words): what it is, who it speaks to, the few decisions that define its look. Written so that an agent that reads only this paragraph would already design in the right direction. Empty string if the board is empty.
- No markdown, no dashes as punctuation, no counts of references in the text. Font names, hex values, CSS values and verbatim quotes stay exactly as given.`;

const LANGUAGE: Record<Locale, string> = {
  en: "Write decisions, takes and the summary in English.",
  es: "Write decisions, takes and the summary in Castilian Spanish (Spain), natural and direct.",
};

const OutSchema = z.object({
  summary: z.string(),
  areas: z.array(z.object({
    area: z.enum(SYSTEM_AREAS),
    decision: z.string(),
    confidence: z.number().int().min(0).max(100),
    evidence: z.array(z.object({ ref: z.string(), take: z.string() })),
  })),
});

// One run per project at a time: two tabs must not pay twice for the same board
const inflight = new Map<string, Promise<ProjectSystem>>();

/**
 * Reads the board and writes the system: the model's proposal for every area the team has not
 * decided, the summary and the run. Always costs (little): the client asks when the run is stale.
 */
export function runSystem(input: { organizationId: string; projectId: string; usage: UsageCtx; locale?: Locale }): Promise<ProjectSystem> {
  const key = `${input.organizationId}|${input.projectId}`;
  const running = inflight.get(key);
  if (running) return running;
  const job = (async () => {
    const project = await projectRow(input.organizationId, input.projectId);
    const [{ refs, stamp }, current] = await Promise.all([loadBoard(input.organizationId, input.projectId), getSystem(input.organizationId, input.projectId)]);
    if (!refs.length) throw new HttpError(400, (await getErrors()).systemEmptyBoard);

    const codes = new Map(refs.map((r) => [r.code, r.itemId]));
    const codeOf = new Map(refs.map((r) => [r.itemId, r.code]));
    const standing = current.areas.map((a) => ({
      area: a.area,
      status: a.source ?? "empty",
      decision: a.decision || undefined,
      confidence: a.decision ? a.confidence : undefined,
      evidence: a.evidence.length ? a.evidence.map((e) => ({ ref: codeOf.get(e.itemId) ?? "gone", take: e.take })) : undefined,
    }));
    const text = [
      `Project: ${project.name}`,
      `Project brief (the team's words, JSON): ${JSON.stringify(briefForModel(project.polish?.brief))}`,
      `System as it stands (JSON): ${JSON.stringify(standing)}`,
      `References on the board (JSON): ${JSON.stringify(refs.map((r) => r.ref))}`,
    ].join("\n\n");

    let res: Awaited<ReturnType<typeof llm>>;
    try {
      res = await llm({
        model: SYSTEM_MODEL,
        system: `${SYSTEM}\n\n${LANGUAGE[input.locale ?? DEFAULT_LOCALE]}`,
        text,
        schema: OutSchema,
        // Reasoning counts against the budget: room for it, the answer itself is short
        maxTokens: 16000,
        effort: (process.env.SYSTEM_EFFORT as "low" | "medium" | "high") || "medium",
      });
    } catch (err) {
      if (!(err instanceof LlmError) || !err.finishReason) throw err;
      throw new Error(`${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
    }
    void recordUsage(input.usage, { action: "system", model: res.model, inputTokens: res.usage.input, outputTokens: res.usage.output, cacheReadTokens: res.usage.cacheRead, costUsd: res.costUsd, provider: res.provider, requestId: res.id, ref: `project:${input.projectId}` });
    const out = OutSchema.parse(JSON.parse(res.text));
    console.log(`system ${input.projectId}: ${refs.length} refs → ${out.areas.filter((a) => a.decision.trim()).length} areas filled, ${res.usage.input}+${res.usage.output} tokens, ${res.ms} ms, ${res.costUsd ?? "?"} USD`);

    const now = new Date();
    await ensureHead(input.organizationId, input.projectId, now);
    const run: SystemRun = { itemIds: refs.map((r) => r.itemId), stamp, model: res.model, at: now.toISOString() };
    await db.update(S).set({ summary: out.summary.trim().slice(0, 1200), runJson: run, updatedAt: now })
      .where(and(eq(S.organizationId, input.organizationId), eq(S.projectId, input.projectId)));

    const byArea = new Map(out.areas.map((a) => [a.area, a]));
    for (const cur of current.areas) {
      if (cur.source === "team") continue;  // the team's word stands
      const got = byArea.get(cur.area);
      const decision = (got?.decision ?? "").trim().replace(/\s+/g, " ").slice(0, DECISION_MAX);
      // Back to item ids; an invented code or a repeated reference is dropped
      const seen = new Set<string>();
      const evidence: SystemEvidence[] = [];
      for (const e of got?.evidence ?? []) {
        const itemId = codes.get(e.ref);
        if (!itemId || seen.has(itemId)) continue;
        seen.add(itemId);
        evidence.push({ itemId, take: e.take.trim().slice(0, 200) });
      }
      const next: Omit<SystemAreaState, "updatedAt"> = decision
        ? { area: cur.area, decision, confidence: Math.max(1, got?.confidence ?? 0), evidence, source: "model", decidedBy: null }
        : { area: cur.area, decision: "", confidence: 0, evidence: [], source: null, decidedBy: null };
      const same = next.decision === cur.decision && next.confidence === cur.confidence && JSON.stringify(next.evidence) === JSON.stringify(cur.evidence);
      if (same && (cur.decision || cur.updatedAt !== emptySystem(input.projectId).areas[0].updatedAt)) continue;
      await writeArea(input.organizationId, input.projectId, next, { id: null, name: res.model }, now);
    }
    return getSystem(input.organizationId, input.projectId);
  })();
  inflight.set(key, job);
  job.finally(() => inflight.delete(key)).catch(() => {});
  return job;
}

// ─── Polish an area: the directions the board allows, for the team to pick ──────────────────────

const OPTIONS_SYSTEM = `A design team keeps a board of references for one project (websites, images, posts), each with the note of whoever saved it, the team's comments, what they pointed at and, for websites, a brief measured from the live page. The project has a SYSTEM with eight areas (typography, color, layout, motion, iconography, logo, imagery, voice). One area is weakly decided or empty, and the team wants to settle it.

Your job: lay out the 2 or 3 DIRECTIONS the board actually allows for that area, so the team can pick one. Each direction is a decision written for this project, as an instruction an agent can execute (1 to 3 sentences, max 60 words), backed by the references that point that way.

Rules:
- Directions come from the board, not from taste. Two references that pull different ways make two directions; if the board only supports one direction, return that one alone (and a second only if the team's words make another plausible).
- Directions must differ in substance (a serif headline vs a grotesque headline; a monochrome palette vs one accent; dense bento vs airy single column), not in wording.
- Each direction has a "why": one sentence of at most 24 words, for the team, saying what the project would feel like if it goes this way. No verdict, no advice.
- "evidence" lists the references behind that direction by id, each with a "take" of at most 20 words: what to take from it for this area. Only references that speak to the area. Ids are short codes: use them exactly as given, never invent one.
- Order the directions from best supported to least. No markdown, no dashes as punctuation.`;

const OptionsSchema = z.object({
  options: z.array(z.object({
    decision: z.string(),
    why: z.string(),
    evidence: z.array(z.object({ ref: z.string(), take: z.string() })),
  })),
});

export interface AreaOption { decision: string; why: string; evidence: SystemEvidence[] }

/** The directions the board allows for one area. Nothing is written: the team picks and that picks writes. */
export async function proposeOptions(input: { organizationId: string; projectId: string; area: string; usage: UsageCtx; locale?: Locale; onlyItemIds?: string[] }): Promise<AreaOption[]> {
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
    `Project brief (the team's words, JSON): ${JSON.stringify(briefForModel(project.polish?.brief))}`,
    `This area as it stands (JSON): ${JSON.stringify(standing.decision ? { decision: standing.decision, confidence: standing.confidence, evidence: standing.evidence.map((e) => ({ ref: codeOf.get(e.itemId) ?? "gone", take: e.take })) } : null)}`,
    `The other areas, decided or proposed (JSON): ${JSON.stringify(others)}`,
    only ? `The team picked these references for this area, on purpose: build the directions from them alone.` : "",
    `References on the board (JSON): ${JSON.stringify(refs.map((r) => r.ref))}`,
  ].filter(Boolean).join("\n\n");
  let res: Awaited<ReturnType<typeof llm>>;
  try {
    res = await llm({ model: SYSTEM_MODEL, system: `${OPTIONS_SYSTEM}\n\n${LANGUAGE[input.locale ?? DEFAULT_LOCALE]}`, text, schema: OptionsSchema, maxTokens: 12000, effort: (process.env.SYSTEM_EFFORT as "low" | "medium" | "high") || "medium" });
  } catch (err) {
    if (!(err instanceof LlmError) || !err.finishReason) throw err;
    throw new Error(`${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
  }
  void recordUsage(input.usage, { action: "system", model: res.model, inputTokens: res.usage.input, outputTokens: res.usage.output, cacheReadTokens: res.usage.cacheRead, costUsd: res.costUsd, provider: res.provider, requestId: res.id, ref: `project:${input.projectId} ${area} options` });
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

export interface AreaRevision { decision: string; confidence: number; source: "model" | "team"; authorName: string; at: string }

export async function areaHistory(organizationId: string, projectId: string, perArea = 6): Promise<Record<string, AreaRevision[]>> {
  const rows = await db.select({ area: R.area, decision: R.decision, confidence: R.confidence, source: R.source, authorName: R.authorName, createdAt: R.createdAt })
    .from(R).where(and(eq(R.organizationId, organizationId), eq(R.projectId, projectId))).orderBy(desc(R.createdAt));
  const out: Record<string, AreaRevision[]> = {};
  for (const r of rows) {
    const list = (out[r.area] ??= []);
    if (list.length < perArea) list.push({ decision: r.decision, confidence: r.confidence, source: r.source as "model" | "team", authorName: r.authorName, at: r.createdAt.toISOString() });
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
    await writeArea(organizationId, projectId, { area, decision: "", confidence: 0, evidence: [], source: null, decidedBy: null }, author, now);
  } else {
    const evidence = Array.isArray(previous.evidence) ? (previous.evidence as SystemEvidence[]) : [];
    await writeArea(organizationId, projectId, { area, decision: previous.decision, confidence: previous.confidence, evidence, source: previous.source as "model" | "team", decidedBy: previous.source === "team" ? author.id : null }, author, now);
  }
  return getSystem(organizationId, projectId);
}
