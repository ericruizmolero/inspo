// Polish (step 3 of Curar): a project's board, cleaned with the team's brief in hand.
// The brief is the team's words about the project; the games are a model's proposals
// over the board (what repeats, what pulls away from the brief). The person decides, and
// every decision is kept so the same question is not asked twice. Nothing here deletes a
// reference: leaving a project is `unfileItems` (lib/projects.ts).
import "server-only";
import { createHash } from "crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { HttpError } from "./workspace-core";
import { getErrors } from "./i18n";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import { llm } from "./llm";
import { jevEnabled, screenDuels, screenDupes, screenTone, screenWeight, summarize } from "./jev";
import { addComment, listItemComments } from "./comments";
import { rowToItem } from "./items";
import { mediaKindOf, webKeyOf } from "./url";
import { getDesignMd, getDesignMdIndex } from "./design-store";
import { BRIEF_KEYS, type DesignBrief } from "@/types/design";
import { SECTORS, STYLES } from "./taxonomy";
import en from "./i18n/en";
import { recordUsage, type UsageCtx } from "./usage";
import { AUDIENCES, BOARD_TARGET, BRIEF_TEXT_MAX, TAKES, WHY_NOTE_MAX, pairKey, type Duel, type DupeGroup, type Light, type OffTone, type PolishBrief, type PolishRun, type PolishState, type Take, type Why } from "@/types/polish";
import type { InspoItem, InspoTags } from "@/types/inspo";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;
const C = schema.inspoComment;

// Two steps. Jev screens the whole board in under a second (a probability per reference and per
// candidate pair, no reasons); Sonnet then judges only what Jev flagged and writes the reason.
// Without a Jev key, Sonnet reads the whole board (slower, pricier, same answer shape).
export const POLISH_MODEL = process.env.POLISH_MODEL || "anthropic/claude-sonnet-5";
/** Bumps when a prompt or the output shape changes, so an old run is offered again */
const PROMPT_VERSION = 4;
/** References read per run; beyond this a board is cut, not refused */
const MAX_BOARD = 120;
/** Thread comments sent per reference: the latest ones, each cut to 300 characters */
const COMMENTS_PER_REF = 6;
// Measured on a 48-reference board: Jev puts the clear clashes above 0.9 but half the board above
// 0.5, so the bar is high and capped; duplicate pairs never scored above 0.7, so that bar is lower
const TONE_CANDIDATE = 0.75;
const TONE_CANDIDATES_MAX = 24;
const DUPE_CANDIDATE = 0.55;
const DUEL_CANDIDATE = 0.55;
const LIGHT_CANDIDATES_MAX = 30;
/** A reference may be in this many duels: losing one settles the rest it was in */
const DUELS_PER_REF = 2;

async function projectRow(organizationId: string, projectId: string) {
  const [row] = await db.select({ id: P.id, polish: P.polish }).from(P)
    .where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!row) throw new HttpError(404, (await getErrors()).projectNotFound);
  return row;
}

/** What project.polish holds; the whys live on project_item and join it on the way out */
type Stored = Omit<PolishState, "whys">;

const stateOf = (polish: Partial<Stored> | null | undefined): Stored => ({
  brief: polish?.brief ?? null,
  decisions: { notDupes: polish?.decisions?.notDupes ?? [], keptTone: polish?.decisions?.keptTone ?? [], keptDuels: polish?.decisions?.keptDuels ?? [], keptLight: polish?.decisions?.keptLight ?? [] },
  run: polish?.run ?? null,
});

async function loadWhys(organizationId: string, projectId: string): Promise<Record<string, Why>> {
  const rows = await db.select({ itemId: PI.itemId, why: PI.why }).from(PI)
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), isNull(PI.archivedAt)));
  return Object.fromEntries(rows.filter((r) => r.why).map((r) => [r.itemId, r.why!]));
}

const withWhys = async (organizationId: string, projectId: string, stored: Stored): Promise<PolishState> =>
  ({ ...stored, whys: await loadWhys(organizationId, projectId) });

export async function getPolish(organizationId: string, projectId: string): Promise<PolishState> {
  return withWhys(organizationId, projectId, stateOf((await projectRow(organizationId, projectId)).polish as Stored | null));
}

async function savePolish(organizationId: string, projectId: string, polish: Stored): Promise<void> {
  await db.update(P).set({ polish: polish as PolishState, updatedAt: new Date() }).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId)));
}

// ─── Why ─────────────────────────────────────────────────────────────────────

const TAKE_KEYS = new Set<string>(TAKES);

/** The team's why for one reference in this project: which of the six things they take from it, and a line. */
export async function saveWhy(organizationId: string, projectId: string, itemId: string, input: Partial<Why>, userId: string): Promise<PolishState> {
  const takes = (Array.isArray(input.takes) ? input.takes.map(String) : []).filter((k): k is Take => TAKE_KEYS.has(k)).slice(0, TAKES.length);
  const why: Why = { takes: [...new Set(takes)], note: String(input.note ?? "").trim().slice(0, WHY_NOTE_MAX), updatedAt: new Date().toISOString(), updatedBy: userId };
  await db.update(PI).set({ why }).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), eq(PI.itemId, itemId)));
  return getPolish(organizationId, projectId);
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
  const state = stateOf((await projectRow(organizationId, projectId)).polish as Stored | null);
  const next: Stored = { ...state, brief: cleanBrief(input, userId) };
  await savePolish(organizationId, projectId, next);
  return withWhys(organizationId, projectId, next);
}

// ─── Decisions ───────────────────────────────────────────────────────────────

/** Remembers an answer: not duplicates, fits the tone, both sides of a duel stay, or stays despite weighing little. */
export async function addDecision(organizationId: string, projectId: string, d: { notDupes?: string[]; keptTone?: string[]; keptDuel?: string[]; keptLight?: string[] }): Promise<PolishState> {
  const state = stateOf((await projectRow(organizationId, projectId)).polish as Stored | null);
  const notDupes = new Set(state.decisions.notDupes);
  const group = ids(d.notDupes, 20);
  for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) notDupes.add(pairKey(group[i], group[j]));
  const keptTone = new Set([...state.decisions.keptTone, ...ids(d.keptTone, 50)]);
  const keptDuels = new Set(state.decisions.keptDuels ?? []);
  const duel = ids(d.keptDuel, 2);
  if (duel.length === 2) keptDuels.add(pairKey(duel[0], duel[1]));
  const keptLight = new Set([...(state.decisions.keptLight ?? []), ...ids(d.keptLight, 50)]);
  const next: Stored = { ...state, decisions: { notDupes: [...notDupes].slice(-2000), keptTone: [...keptTone].slice(-1000), keptDuels: [...keptDuels].slice(-1000), keptLight: [...keptLight].slice(-1000) } };
  await savePolish(organizationId, projectId, next);
  return withWhys(organizationId, projectId, next);
}

/**
 * Merge: the references that leave give the one that stays what the team wrote on them (note and
 * thread), as comments on it, so nothing said is lost with the card. Leaving the project is the
 * client's usual unfile, after this.
 */
export async function mergeInto(organizationId: string, keepId: string, fromIds: string[], author: { id: string; name: string }): Promise<void> {
  const from = ids(fromIds, 20).filter((id) => id !== keepId);
  if (!from.length) return;
  const rows = await db.select({ row: T }).from(T).where(and(eq(T.organizationId, organizationId), inArray(T.id, [keepId, ...from])));
  const keep = rows.find((r) => r.row.id === keepId);
  if (!keep) throw new HttpError(404, (await getErrors()).itemNotInWorkspace);
  for (const { row } of rows) {
    if (row.id === keepId) continue;
    const note = [row.note, row.subNote].map((x) => (x ?? "").trim()).filter(Boolean).join(" — ");
    const thread = (await listItemComments(organizationId, row.id)).map((c) => `${c.authorName}: ${c.body}`);
    const lines = [`${MERGED_FROM} ${row.name} (${row.web})`, ...(note ? [note] : []), ...thread];
    if (lines.length === 1) continue;  // nothing written on it: nothing to carry over
    await addComment(organizationId, { itemId: keepId, authorId: author.id, authorName: author.name, body: lines.join("\n") });
  }
}
/** First line of a merge comment; the same in every language, so it can be recognised later */
const MERGED_FROM = "Merged from";

// ─── The games ───────────────────────────────────────────────────────────────

const DupesSchema = z.object({
  groups: z.array(z.object({ ids: z.array(z.string()), reason: z.string() })),
});
const ToneSchema = z.object({
  off_tone: z.array(z.object({ id: z.string(), reason: z.string() })),
});
const DuelsSchema = z.object({
  duels: z.array(z.object({ ids: z.array(z.string()), reason: z.string() })),
});
const LightSchema = z.object({
  light: z.array(z.object({ id: z.string(), reason: z.string() })),
});

const CONTEXT = `A design team keeps a board of references for one project: websites, but also images, videos and social posts ("kind"). Each reference comes with its name, URL, the curator's notes (why they saved it), the team's comments under it, what the team takes from it for this project ("what_the_team_takes": which of color, typography, composition, rhythm, tone or a detail, and a line), a summary of the page, a description of how it looks ("look": for an image or a post, what the picture itself shows), classifier labels (sector, style, traits) and, for some sites, the DESIGN.md brief the team generated (typography, imagery, motion, color, voice). Use everything given; an image or a post has no page, so judge it by its look and the team's words, and never fault it for lacking what only a website has. Ids are short codes: use them exactly as given and never invent one.`;

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

// Second step over Jev's candidates: the same judgment, over a shortlist instead of the whole board
const DUPES_CONFIRM = `${CONTEXT}

A fast classifier compared the references on the board and proposes groups that may say the same thing for this project. Your job: keep, split or drop those groups. Two references are duplicates when the concrete idea the team would take from them coincides: the same typographic approach, the same layout pattern, the same kind of imagery, the same interaction, the same tone of voice. Read the curator's notes first: they say what each one is there for.

Rules:
- Only references from the proposed groups may appear in your answer; a group has at least 2 and a reference belongs to at most one.
- Be strict. The same sector is not a duplicate. The same style label is not a duplicate. Only the same idea is. Dropping every group is a fine answer.
- "reason" is one sentence of at most 20 words naming the shared idea, written for the team in the language given below. No praise, no advice.`;

const TONE_CONFIRM = `${CONTEXT}

The team wrote a brief for the project: what it is, who it speaks to, the tone it should keep, what they do not want to see, and what a visitor must understand in the first five seconds. Some references were marked by the team as clashing with the project: take them as examples of what does not fit. A fast classifier read the whole board and shortlisted the references that may pull away from the brief.

Your job: from that shortlist, keep only the clear conflicts. A tone the brief rejects, something listed under "avoid", a look that speaks to another audience, a reference that would confuse what the visitor must get in five seconds.

Rules:
- Judge against the brief, never against your own taste. Being on the shortlist is not a reason: drop what fits.
- A reference saved for one detail (the curator's note says so) is not off tone because the rest of the site is: judge what it was saved for.
- Only shortlisted ids may appear in your answer. An empty list is a fine answer.
- "reason" is one sentence of at most 20 words saying which part of the brief it conflicts with, written for the team in the language given below. No praise, no advice.`;

const DUELS_CONFIRM = `${CONTEXT}

The team wrote a brief for the project. A fast classifier proposes pairs of references that may pull the project in opposite directions. Your job: keep only the real duels, where following both would give an incoherent site and the team has to choose: a different tone of voice, an opposite typographic approach, a different kind of imagery, a different idea of what the visitor should feel.

Rules:
- Only proposed pairs may appear in your answer, each with exactly its 2 ids; a reference may appear in more than one duel.
- A difference of sector or subject is not a duel. Two references the team could follow at once are not a duel. Dropping every pair is a fine answer.
- "reason" is one sentence of at most 24 words naming the two directions, written for the team in the language given below. No verdict, no advice.`;

const LIGHT_CONFIRM = `${CONTEXT}

The team wrote a brief and wants the board down to about a dozen references that each earn their place. A fast classifier shortlisted the references that seem to weigh least for the project. Your job: for each one, say in one sentence what it is not bringing, so the team can decide whether it leaves the board (it stays in the project's archive). Keep the shortlist's order unless one clearly weighs more than the rest; drop from your answer any that in fact earns its place.

Rules:
- Only shortlisted ids may appear in your answer, each once.
- A reference with a reason written by the team (notes, comments, what they take from it) earns its place unless the reason itself is off the brief.
- "reason" is one sentence of at most 20 words, written for the team in the language given below. No praise, no advice.`;

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
/**
 * The project's references with everything known about them: tags, the thread under each one (the
 * team's words are what the games judge by) and, when the team generated it, the DESIGN.md brief.
 */
async function loadBoard(organizationId: string, projectId: string): Promise<{ item: InspoItem; tags: InspoTags | undefined; comments: string[]; brief: Partial<DesignBrief> | null; why: Why | null }[]> {
  const rows = await db.select({ row: T, why: PI.why }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), isNull(PI.archivedAt)));
  const board = rows.slice(0, MAX_BOARD);
  const ids = board.map(({ row }) => row.id);
  const threads = ids.length
    ? await db.select({ itemId: C.itemId, author: C.authorName, body: C.body, at: C.createdAt }).from(C)
        .where(and(eq(C.organizationId, organizationId), inArray(C.itemId, ids))).orderBy(C.createdAt)
    : [];
  const byItem = new Map<string, string[]>();
  for (const c of threads) byItem.set(c.itemId, [...(byItem.get(c.itemId) ?? []), `${c.author}: ${c.body.trim().slice(0, 300)}`]);
  // DESIGN.md briefs: only the ones that exist (the index says), read in parallel, never generated here
  const index = await getDesignMdIndex();
  const briefs = await Promise.all(board.map(async ({ row }) => {
    if (mediaKindOf(row.web) !== "web" || !(row.web in index || webKeyOf(row.web) in index)) return null;
    const entry = await getDesignMd(row.web);
    const b = entry?.spec?.brief;
    return b ? Object.fromEntries(BRIEF_KEYS.filter((k) => b[k]).map((k) => [k, b[k]])) as Partial<DesignBrief> : null;
  }));
  return board.map(({ row, why }, i) => ({ item: rowToItem(row), tags: row.tagsJson ?? undefined, comments: (byItem.get(row.id) ?? []).slice(-COMMENTS_PER_REF), brief: briefs[i], why: why ?? null }));
}

/** Connected pairs become one group (a↔b and b↔c make a, b, c), each capped so a chain does not swallow the board */
function groupPairs(pairs: { a: string; b: string }[], max = 6): string[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  for (const { a, b } of pairs) { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); }
  const groups = new Map<string, string[]>();
  for (const id of new Set(pairs.flatMap((p) => [p.a, p.b]))) { const r = find(id); groups.set(r, [...(groups.get(r) ?? []), id]); }
  return [...groups.values()].flatMap((g) => { const out: string[][] = []; for (let i = 0; i < g.length; i += max) out.push(g.slice(i, i + max)); return out.filter((x) => x.length >= 2); });
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
    const state = stateOf((await projectRow(input.organizationId, input.projectId)).polish as Stored | null);
    if (!state.brief) throw new HttpError(400, (await getErrors()).polishBriefFirst);
    const board = await loadBoard(input.organizationId, input.projectId);
    const codes = new Map<string, string>();  // short code → item id
    const refs = board.map(({ item, tags, comments, brief: designBrief, why }, i) => {
      const code = `r${i + 1}`; codes.set(code, item.id!);
      // The why, in the model's words: which of the six things the team takes from it, and their line
      const taken = why ? { takes: why.takes.map((k) => en.polish.takes[k]), note: why.note || null } : null;
      return { id: code, kind: mediaKindOf(item.web), ...summarize(item, tags), team_comments: comments, design_brief: designBrief, what_the_team_takes: taken };
    });
    const marked = new Set(state.brief.avoidItems);
    const avoidExamples = refs.filter((r, i) => marked.has(board[i].item.id!)).map((r) => r.id);
    const brief = briefForModel(state.brief, avoidExamples);
    const language = LANGUAGE[input.locale ?? DEFAULT_LOCALE];
    const refsText = `References on the board (JSON):\n${JSON.stringify(refs)}`;
    const ref = `project:${input.projectId}`;

    const ask = async <S extends z.ZodType>(game: string, system: string, text: string, schema: S, maxTokens: number): Promise<z.infer<S>> => {
      // Sonnet reasons before answering and that counts against maxTokens: short reasoning, roomy limit
      const res = await llm({ model: POLISH_MODEL, system: `${system}\n\n${language}`, text, schema, maxTokens, effort: "low" });
      void recordUsage(input.usage, { action: "polish", model: res.model, inputTokens: res.usage.input, outputTokens: res.usage.output, cacheReadTokens: res.usage.cacheRead, costUsd: res.costUsd, provider: res.provider, requestId: res.id, ref: `${ref} ${game}` });
      return schema.parse(JSON.parse(res.text));
    };
    const briefText = `Project brief (JSON):\n${JSON.stringify(brief)}`;
    let model = POLISH_MODEL;
    let dupesOut: z.infer<typeof DupesSchema> = { groups: [] };
    let toneOut: z.infer<typeof ToneSchema> = { off_tone: [] };
    let duelsOut: z.infer<typeof DuelsSchema> = { duels: [] };
    let lightOut: z.infer<typeof LightSchema> = { light: [] };

    if (jevEnabled() && refs.length >= 1) {
      // Step one: Jev over the whole board. One usage row for both screens
      model = `jev+${POLISH_MODEL}`;
      const examples = refs.filter((r) => avoidExamples.includes(r.id));
      const candidates = refs.filter((r) => !avoidExamples.includes(r.id));
      const none = Promise.resolve({ pairs: [], billing: { costUsd: null, provider: null, calls: 0 } });
      // Size: only a board above the target is weighed, and only as many are shortlisted as it is over by
      const over = Math.max(0, refs.length - BOARD_TARGET);
      const [tone, dupes, duels, weight] = await Promise.all([
        screenTone(brief, candidates, examples),
        candidates.length >= 2 ? screenDupes(state.brief.about || null, candidates) : none,
        candidates.length >= 2 ? screenDuels(brief, candidates) : none,
        over > 0 ? screenWeight(brief, candidates) : Promise.resolve({ scores: new Map<string, number>(), billing: { costUsd: null, provider: null, calls: 0 } }),
      ]);
      const costs = [tone.billing.costUsd, dupes.billing.costUsd, duels.billing.costUsd, weight.billing.costUsd];
      void recordUsage(input.usage, { action: "polish", model: "jev", units: refs.length, costUsd: costs.every((c) => c !== null) ? costs.reduce((n: number, c) => n + c!, 0) : null, provider: tone.billing.provider ?? dupes.billing.provider, ref: `${ref} screen` });

      const toneShort = [...tone.scores].filter(([, p]) => p >= TONE_CANDIDATE).sort((a, b) => b[1] - a[1]).slice(0, TONE_CANDIDATES_MAX).map(([id]) => id);
      const lightShort = [...weight.scores].sort((a, b) => a[1] - b[1]).slice(0, Math.min(over, LIGHT_CANDIDATES_MAX)).map(([id]) => id);
      const groups = groupPairs(dupes.pairs.filter((x) => x.p >= DUPE_CANDIDATE));
      // Duels: the strongest pairs, each reference in a couple at most, as many as references
      const duelPairs: [string, string][] = [];
      const inDuels = new Map<string, number>();
      for (const x of [...duels.pairs].sort((a, b) => b.p - a.p)) {
        if (x.p < DUEL_CANDIDATE || (inDuels.get(x.a) ?? 0) >= DUELS_PER_REF || (inDuels.get(x.b) ?? 0) >= DUELS_PER_REF) continue;
        duelPairs.push([x.a, x.b]); inDuels.set(x.a, (inDuels.get(x.a) ?? 0) + 1); inDuels.set(x.b, (inDuels.get(x.b) ?? 0) + 1);
        if (duelPairs.length >= refs.length) break;
      }
      const byCode = new Map(refs.map((r) => [r.id, r]));
      const shortlist = (ids: string[]) => `Shortlisted references (JSON):\n${JSON.stringify(ids.map((id) => byCode.get(id)!))}`;

      // Step two: Sonnet, only where Jev found something
      [dupesOut, toneOut, duelsOut, lightOut] = await Promise.all([
        groups.length
          ? ask("dupes", DUPES_CONFIRM, `${briefText}\n\nProposed groups (ids): ${JSON.stringify(groups)}\n\n${shortlist(groups.flat())}`, DupesSchema, 4000 + groups.flat().length * 150)
          : Promise.resolve({ groups: [] }),
        toneShort.length
          ? ask("tone", TONE_CONFIRM, `${briefText}\n\n${shortlist(toneShort)}`, ToneSchema, 4000 + toneShort.length * 150)
          : Promise.resolve({ off_tone: [] }),
        duelPairs.length
          ? ask("duels", DUELS_CONFIRM, `${briefText}\n\nProposed pairs (ids): ${JSON.stringify(duelPairs)}\n\n${shortlist(duelPairs.flat())}`, DuelsSchema, 4000 + duelPairs.length * 200)
          : Promise.resolve({ duels: [] }),
        lightShort.length
          ? ask("light", LIGHT_CONFIRM, `${briefText}\n\nShortlist, lightest first (ids): ${JSON.stringify(lightShort)}\n\n${shortlist(lightShort)}`, LightSchema, 4000 + lightShort.length * 150)
          : Promise.resolve({ light: [] }),
      ]);
      console.log(`polish ${input.projectId}: jev ${tone.billing.calls + dupes.billing.calls + duels.billing.calls} calls → ${toneShort.length} tone candidates, ${groups.length} candidate groups, ${duelPairs.length} candidate duels`);
    } else {
      // No Jev: the whole board goes to Sonnet. The answer and its reasoning grow with the board
      // (a 48-reference board overran 3000 tokens; ~2.8k for 14)
      const maxTokens = Math.min(16000, 2500 + refs.length * 200);
      [dupesOut, toneOut] = await Promise.all([
        refs.length >= 2 ? ask("dupes", DUPES_SYSTEM, `${briefText}\n\n${refsText}`, DupesSchema, maxTokens) : Promise.resolve({ groups: [] }),
        refs.length >= 1 ? ask("tone", TONE_SYSTEM, `${briefText}\n\n${refsText}`, ToneSchema, maxTokens) : Promise.resolve({ off_tone: [] }),
      ]);
    }

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
    const dueling = new Set<string>();  // pair keys, so the same duel is not listed twice
    const duelsList: Duel[] = [];
    for (const d of duelsOut.duels) {
      const pair = [...new Set(d.ids.map((c) => codes.get(c)).filter((id): id is string => !!id))];
      if (pair.length !== 2 || pair.some((id) => marked.has(id)) || dueling.has(pairKey(pair[0], pair[1]))) continue;
      dueling.add(pairKey(pair[0], pair[1]));
      duelsList.push({ ids: [pair[0], pair[1]], reason: d.reason.trim().slice(0, 200) });
    }
    const weighed = new Set<string>();
    const light: Light[] = [];
    for (const l of lightOut.light) {
      const id = codes.get(l.id);
      if (!id || weighed.has(id) || marked.has(id)) continue;
      weighed.add(id);
      light.push({ id, reason: l.reason.trim().slice(0, 200) });
    }
    const run: PolishRun = { stamp: runStamp(state.brief), itemIds: board.map((b) => b.item.id!), dupes, offTone, duels: duelsList, light, model, at: new Date().toISOString() };
    const next: Stored = { ...state, run };
    await savePolish(input.organizationId, input.projectId, next);
    console.log(`polish ${input.projectId}: ${refs.length} refs → ${dupes.length} groups, ${offTone.length} off tone, ${duelsList.length} duels, ${light.length} light`);
    return withWhys(input.organizationId, input.projectId, next);
  })().finally(() => { inflight.delete(key); });
  inflight.set(key, job);
  return job;
}
