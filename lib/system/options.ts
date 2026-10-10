import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { HttpError } from "../workspace-core";
import { getErrors, getT } from "../i18n";
import type { OutputLanguage } from "../output-language";
import { llm, LlmError } from "../llm";
import { prompt } from "../prompts";
import { embedEnabled, nearest, queryVector } from "../embed";
import { viewOf } from "../taxonomy";
import type { InspoTags } from "@/types/inspo";
import { rowToItem } from "../items";
import { billOf, recordUsage, type UsageCtx } from "../usage";
import { DECISION_MAX, type SystemArea, type SystemEvidence } from "@/types/system";
import { briefPrompt } from "../brief";
import { A11Y_LEVELS, readBrief } from "@/types/brief";
import { log } from "../log";
import { areaMemory } from "../area-comments";
import { cleanArea, getSystem, projectRow } from "./areas";
import { boardVisuals, loadBoard, markClient, type RefVisual } from "./board";
import { memoryLine, OPTIONS_SYSTEM, START_ASK_SYSTEM } from "./prompts";

const PI = schema.projectItem;
const T = schema.inspoItem;
const C = schema.inspoComment;

// ─── Polish an area: the directions the board allows, for the team to pick ──────────────────────

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
  const [{ refs: all }, current, memory] = await Promise.all([loadBoard(input.organizationId, input.projectId), getSystem(input.organizationId, input.projectId), areaMemory(input.organizationId, input.projectId)]);
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
    memoryLine(memory[area]),
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

const StartAskSchema = z.object({
  say: z.string(),
  question: z.string(),
  options: z.array(z.object({ label: z.string(), decision: z.string(), why: z.string() })),
});

export interface AreaStartRefs { board: { itemId: string; why: string }[]; library: { itemId: string; why: string }[] }
export interface AreaStartAsk {
  say: string; question: string; options: { label: string; decision: string; why: string }[];
  /** The answer saves this brief field (saveProjectBrief) instead of deciding the area: the option's decision is the
   *  value, and with no options the answer is free text */
  brief?: BriefAsk;
}
/** The brief field an area asks for first, while it is empty, and never again once it is set: one question at a time */
type BriefAsk = "a11y" | "neverSay";
const BRIEF_ASKS: Partial<Record<SystemArea, BriefAsk>> = { color: "a11y", voice: "neverSay" };

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
  const field = BRIEF_ASKS[area];
  if (field && !readBrief(project.brief)?.[field]) {
    const q = (await getT()).t.system.briefAsk;
    return field === "a11y"
      ? { brief: field, say: q.a11y.say, question: q.a11y.question, options: A11Y_LEVELS.map((l) => ({ label: `WCAG ${l}`, decision: l, why: q.a11y.why[l] })) }
      : { brief: field, say: q.neverSay.say, question: q.neverSay.question, options: [] };
  }
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
