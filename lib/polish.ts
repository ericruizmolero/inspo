// Polish (step 3 of Curar): a project's board, cleaned with the team's brief in hand.
// The brief is the team's words about the project; the games are a model's proposals
// over the board (what repeats, what pulls away from the brief). The person decides, and
// every decision is kept so the same question is not asked twice. Nothing here deletes a
// reference: leaving a project is `unfileItems` (lib/projects.ts).
import "server-only";
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { HttpError } from "./workspace-core";
import { getErrors } from "./i18n";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import { llm } from "./llm";
import { summarize } from "./jev";
import { rowToItem } from "./items";
import { SECTORS, STYLES } from "./taxonomy";
import en from "./i18n/en";
import { recordUsage, type UsageCtx } from "./usage";
import { AUDIENCES, BRIEF_TEXT_MAX, pairKey, type DupeGroup, type OffTone, type PolishBrief, type PolishRun, type PolishState } from "@/types/polish";
import type { InspoItem, InspoTags } from "@/types/inspo";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;

// Judgment over a whole board at once: Sonnet keeps to the ids and gives short reasons (a few cents a board)
export const POLISH_MODEL = process.env.POLISH_MODEL || "anthropic/claude-sonnet-5";
/** Bumps when a prompt or the output shape changes, so an old run is offered again */
const PROMPT_VERSION = 1;
const MAX_BOARD = 120;

async function projectRow(organizationId: string, projectId: string) {
  const [row] = await db.select({ id: P.id, polish: P.polish }).from(P)
    .where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!row) throw new HttpError(404, (await getErrors()).projectNotFound);
  return row;
}

const stateOf = (polish: PolishState | null | undefined): PolishState => ({
  brief: polish?.brief ?? null,
  decisions: { notDupes: polish?.decisions?.notDupes ?? [], keptTone: polish?.decisions?.keptTone ?? [] },
  run: polish?.run ?? null,
});

export async function getPolish(organizationId: string, projectId: string): Promise<PolishState> {
  return stateOf((await projectRow(organizationId, projectId)).polish);
}

async function savePolish(organizationId: string, projectId: string, polish: PolishState): Promise<void> {
  await db.update(P).set({ polish, updatedAt: new Date() }).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId)));
}

// ─── Brief ───────────────────────────────────────────────────────────────────

const text = (v: unknown) => String(v ?? "").trim().slice(0, BRIEF_TEXT_MAX);
const SECTOR_KEYS = new Set(SECTORS.map((s) => s.key));
const STYLE_KEYS = new Set(STYLES.map((s) => s.key));
const AUDIENCE_KEYS = new Set<string>(AUDIENCES);
const ids = (v: unknown, max: number) => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, max) : []);

/** Cleans what the form sent: unknown keys drop, texts are cut, lists are capped. */
export function cleanBrief(input: Partial<PolishBrief>, userId: string): PolishBrief {
  const sector = typeof input.sector === "string" && SECTOR_KEYS.has(input.sector) ? input.sector : null;
  return {
    sector,
    about: text(input.about),
    audience: ids(input.audience, AUDIENCES.length).filter((k): k is PolishBrief["audience"][number] => AUDIENCE_KEYS.has(k)),
    audienceNote: text(input.audienceNote),
    tone: ids(input.tone, 2).filter((k) => STYLE_KEYS.has(k)),
    avoidItems: ids(input.avoidItems, 50),
    avoid: text(input.avoid),
    firstSeconds: text(input.firstSeconds),
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };
}

export async function saveBrief(organizationId: string, projectId: string, input: Partial<PolishBrief>, userId: string): Promise<PolishState> {
  const state = stateOf((await projectRow(organizationId, projectId)).polish);
  const next: PolishState = { ...state, brief: cleanBrief(input, userId) };
  await savePolish(organizationId, projectId, next);
  return next;
}

// ─── Decisions ───────────────────────────────────────────────────────────────

/** Remembers an answer: these are not duplicates, or this one does fit the tone. */
export async function addDecision(organizationId: string, projectId: string, d: { notDupes?: string[]; keptTone?: string[] }): Promise<PolishState> {
  const state = stateOf((await projectRow(organizationId, projectId)).polish);
  const notDupes = new Set(state.decisions.notDupes);
  const group = ids(d.notDupes, 20);
  for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) notDupes.add(pairKey(group[i], group[j]));
  const keptTone = new Set([...state.decisions.keptTone, ...ids(d.keptTone, 50)]);
  const next: PolishState = { ...state, decisions: { notDupes: [...notDupes].slice(-2000), keptTone: [...keptTone].slice(-1000) } };
  await savePolish(organizationId, projectId, next);
  return next;
}

// ─── The games ───────────────────────────────────────────────────────────────

const DupesSchema = z.object({
  groups: z.array(z.object({ ids: z.array(z.string()), reason: z.string() })),
});
const ToneSchema = z.object({
  off_tone: z.array(z.object({ id: z.string(), reason: z.string() })),
});

const CONTEXT = `A design team keeps a board of reference websites for one project. Each reference comes with its name, URL, the curator's notes (why they saved it), a summary of the page, a description of how it looks and classifier labels (sector, style, traits). Ids are short codes: use them exactly as given and never invent one.`;

const DUPES_SYSTEM = `${CONTEXT}

Your job: find groups of references that say the same thing for this project, so that keeping all of them adds nothing. Two references are duplicates when the concrete idea the team would take from them coincides: the same typographic approach, the same layout pattern, the same kind of imagery, the same interaction, the same tone of voice. Read the curator's notes first: they say what each one is there for.

Rules:
- A group has at least 2 references; a reference belongs to at most one group.
- Be strict. The same sector is not a duplicate. The same style label is not a duplicate. Only the same idea is.
- Prefer few, sure groups over many loose ones. An empty list is a fine answer.
- "reason" is one sentence of at most 20 words naming the shared idea, written for the team in the language given below. No praise, no advice.`;

const TONE_SYSTEM = `${CONTEXT}

The team wrote a brief for the project: what it is, who it speaks to, the tone it should keep, what they do not want to see, and what a visitor must understand in the first five seconds. Some references were marked by the team as clashing with the project: take them as examples of what does not fit.

Your job: flag the references that pull away from that brief. A tone the brief rejects, something listed under "avoid", a look that speaks to another audience, a reference that would confuse what the visitor must get in five seconds.

Rules:
- Be strict: flag only clear conflicts, and judge against the brief, never against your own taste.
- A reference saved for one detail (the curator's note says so) is not off tone because the rest of the site is: judge what it was saved for.
- Do not flag the references the team already marked as clashing; they are examples, not candidates.
- An empty list is a fine answer.
- "reason" is one sentence of at most 20 words saying which part of the brief it conflicts with, written for the team in the language given below. No praise, no advice.`;

const LANGUAGE: Record<Locale, string> = {
  en: "Language: write every \"reason\" in English.",
  es: "Language: write every \"reason\" in Castilian Spanish (Spanish from Spain).",
};

/** The brief, with its keys turned into the English labels the model is spoken to in */
function briefForModel(b: PolishBrief, avoidExamples: string[]) {
  const sector = b.sector ? en.taxonomy.sector[b.sector as keyof typeof en.taxonomy.sector] ?? b.sector : null;
  const tone = b.tone.map((k) => {
    const term = STYLES.find((s) => s.key === k);
    return term ? `${en.taxonomy.style[k as keyof typeof en.taxonomy.style] ?? k}: ${term.description}` : k;
  });
  return {
    sector, about: b.about || null,
    audience: b.audience.map((k) => en.polish.audiences[k]), audience_note: b.audienceNote || null,
    tone, avoid: b.avoid || null, marked_as_clashing: avoidExamples,
    first_five_seconds: b.firstSeconds || null,
  };
}

export function runStamp(brief: PolishBrief): string {
  const { updatedAt: _at, updatedBy: _by, ...words } = brief;
  return createHash("sha1").update(JSON.stringify({ b: words, m: POLISH_MODEL, v: PROMPT_VERSION })).digest("hex").slice(0, 20);
}

/** The project's references with their tags, as the board the model will read */
async function loadBoard(organizationId: string, projectId: string): Promise<{ item: InspoItem; tags: InspoTags | undefined }[]> {
  const rows = await db.select({ row: T }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId)));
  return rows.slice(0, MAX_BOARD).map(({ row }) => ({ item: rowToItem(row), tags: row.tagsJson ?? undefined }));
}

// One run per project at a time: two tabs must not pay twice for the same board
const inflight = new Map<string, Promise<PolishState>>();

/**
 * Runs both games over the board and keeps the answer in the project. The run always costs: the
 * client decides when to ask (no run yet, a changed brief, new references since the last one).
 */
export function runPolish(input: { organizationId: string; projectId: string; usage: UsageCtx; locale?: Locale }): Promise<PolishState> {
  const key = `${input.organizationId}|${input.projectId}`;
  const running = inflight.get(key);
  if (running) return running;
  const job = (async () => {
    const state = stateOf((await projectRow(input.organizationId, input.projectId)).polish);
    if (!state.brief) throw new HttpError(400, (await getErrors()).polishBriefFirst);
    const board = await loadBoard(input.organizationId, input.projectId);
    const codes = new Map<string, string>();  // short code → item id
    const refs = board.map(({ item, tags }, i) => { const code = `r${i + 1}`; codes.set(code, item.id!); return { id: code, ...summarize(item, tags) }; });
    const marked = new Set(state.brief.avoidItems);
    const avoidExamples = refs.filter((r, i) => marked.has(board[i].item.id!)).map((r) => r.id);
    const brief = briefForModel(state.brief, avoidExamples);
    const language = LANGUAGE[input.locale ?? DEFAULT_LOCALE];
    const refsText = `References on the board (JSON):\n${JSON.stringify(refs)}`;
    const ref = `project:${input.projectId}`;

    const ask = async <S extends z.ZodType>(game: string, system: string, text: string, schema: S): Promise<z.infer<S>> => {
      const res = await llm({ model: POLISH_MODEL, system: `${system}\n\n${language}`, text, schema, maxTokens: 3000 });
      void recordUsage(input.usage, { action: "polish", model: res.model, inputTokens: res.usage.input, outputTokens: res.usage.output, cacheReadTokens: res.usage.cacheRead, costUsd: res.costUsd, provider: res.provider, requestId: res.id, ref: `${ref} ${game}` });
      return schema.parse(JSON.parse(res.text));
    };

    // Two references or fewer leave nothing to compare; the tone game still makes sense from one
    const [dupesOut, toneOut] = await Promise.all([
      refs.length >= 2 ? ask("dupes", DUPES_SYSTEM, `Project brief (JSON):\n${JSON.stringify(brief)}\n\n${refsText}`, DupesSchema) : Promise.resolve({ groups: [] }),
      refs.length >= 1 ? ask("tone", TONE_SYSTEM, `Project brief (JSON):\n${JSON.stringify(brief)}\n\n${refsText}`, ToneSchema) : Promise.resolve({ off_tone: [] }),
    ]);

    // Back to item ids; an invented code, a repeated member or a group of one is dropped
    const seen = new Set<string>();
    const dupes: DupeGroup[] = [];
    for (const g of dupesOut.groups) {
      const members = [...new Set(g.ids.map((c) => codes.get(c)).filter((id): id is string => !!id && !seen.has(id)))];
      if (members.length < 2) continue;
      members.forEach((id) => seen.add(id));
      dupes.push({ ids: members, reason: g.reason.trim().slice(0, 200) });
    }
    const flagged = new Set<string>();
    const offTone: OffTone[] = [];
    for (const o of toneOut.off_tone) {
      const id = codes.get(o.id);
      if (!id || flagged.has(id) || marked.has(id)) continue;
      flagged.add(id);
      offTone.push({ id, reason: o.reason.trim().slice(0, 200) });
    }
    const run: PolishRun = { stamp: runStamp(state.brief), itemIds: board.map((b) => b.item.id!), dupes, offTone, model: POLISH_MODEL, at: new Date().toISOString() };
    const next: PolishState = { ...state, run };
    await savePolish(input.organizationId, input.projectId, next);
    console.log(`polish ${input.projectId}: ${refs.length} refs → ${dupes.length} groups, ${offTone.length} off tone`);
    return next;
  })().finally(() => { inflight.delete(key); });
  inflight.set(key, job);
  return job;
}
