// Jev (Typesafe AI): search, and the polish screens. Server only. Tagging is lib/tagger.ts.
import "server-only";
import { TypeSafeClient, noul } from "@typesafe-ai/sdk";
import type { JsonValue } from "@typesafe-ai/sdk";
import { InspoItem, InspoTags } from "@/types/inspo";
import { TAGS, TAG_THRESHOLD, viewOf } from "./taxonomy";
import en from "./i18n/en";
import { recordUsage, type UsageCtx } from "./usage";

let _client: TypeSafeClient | null = null;
function client() {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY not configured");
  return (_client ??= new TypeSafeClient());
}

export const jevEnabled = () => !!process.env.TYPESAFE_API_KEY;

// OpenRouter returns cost, provider and id on every Jev call; the SDK passes them through without typing them
const billingOf = (res: object) => {
  const r = res as { usage?: { cost?: unknown }; provider?: string; id?: string };
  return { costUsd: typeof r.usage?.cost === "number" ? r.usage.cost : null, provider: r.provider ?? null, requestId: r.id ?? null };
};

export const activeTags = (t: InspoTags | undefined) =>
  t ? TAGS.filter((x) => (t.tags[x.key] ?? 0) >= TAG_THRESHOLD).map((x) => x.key) : [];

// ─── Smart search ─────────────────────────────────────────────────────────────

// In-memory cache per query. Cleared on tagging, because tags are part of the state.
const searchCache = new Map<string, { at: number; scores: Record<string, number> }>();
const SEARCH_TTL = 10 * 60 * 1000;
const SEARCH_MAX = 200;

export function getCachedSearch(key: string) {
  const hit = searchCache.get(key);
  return hit && Date.now() - hit.at < SEARCH_TTL ? hit.scores : null;
}
export function setCachedSearch(key: string, scores: Record<string, number>) {
  if (searchCache.size >= SEARCH_MAX) searchCache.delete(searchCache.keys().next().value!);
  searchCache.set(key, { at: Date.now(), scores });
}
export const clearSearchCache = () => searchCache.clear();

const BATCH = 12;
const CONCURRENCY = 6;

export function summarize(item: InspoItem, t: InspoTags | undefined) {
  const v = viewOf(t);
  return {
    name: item.name,
    url: item.web,
    collection: item.type,
    curator_notes: [item.note, item.subNote].filter(Boolean).join(" — ") || null,
    page: t?.summary || null,
    look: t?.visual ? t.visual.slice(0, 400) : null,
    // The model is spoken to in English, labels included
    sector: t ? en.taxonomy.sector[t.sector as keyof typeof en.taxonomy.sector] ?? t.sector : null,
    style: t ? en.taxonomy.style[t.style as keyof typeof en.taxonomy.style] ?? t.style : null,
    traits: v ? v.traits.map((k) => en.taxonomy.tag[k as keyof typeof en.taxonomy.tag] ?? k) : [],
    // v3 tags, when it has them, with the workspace's own edits
    ...(v && t?.v && t.v >= 3 ? {
      colours: v.palette, sections: v.sections, elements: v.elements, type: v.type, layout: v.layout, keywords: v.keywords,
    } : {}),
    // Its own metadata, when it has some (v4)
    ...(t?.meta ? {
      made_by: v?.credits ?? [], declared_type: t.meta.kind ?? null, own_keywords: t.meta.keywords ?? [], place: t.meta.place ?? null,
    } : {}),
  };
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
    })
  );
  return out;
}

/** Returns, per URL, the probability (0–1) that the item fits the query. */
export async function matchQuery(
  query: string,
  items: InspoItem[],
  tagMap: Record<string, InspoTags>,
  usage?: UsageCtx
): Promise<Record<string, number>> {
  const batches: InspoItem[][] = [];
  for (let i = 0; i < items.length; i += BATCH) batches.push(items.slice(i, i + BATCH));

  const results = await pool(batches, CONCURRENCY, async (batch) => {
    const state = {
      search_query: query,
      note: "The query is written by a designer looking through their inspiration library. It may be in Spanish or English.",
      items: batch.map((it, i) => ({ id: `item_${i}`, ...summarize(it, tagMap[it.web]) })),
    };
    const questions = Object.fromEntries(
      batch.map((_, i) => [
        `item_${i}`,
        noul(`Does the item with id "item_${i}" match the search_query?`, {
          true: "The item clearly fits what the query asks for (subject, style, mood, traits or sector).",
          false: "The item does not fit the query, or only trivially.",
        }),
      ])
    );
    try {
      const res = await client().systemOne({ state, questions });
      const a = res.answers as Record<string, { noul?: number }>;
      return { ...billingOf(res), scores: batch.map((it, i) => [it.web, Number(a[`item_${i}`]?.noul ?? 0)] as const) };
    } catch (e) {
      console.error("matchQuery batch error:", e);
      return { costUsd: 0, provider: null, requestId: null, scores: batch.map((it) => [it.web, 0] as const) };
    }
  });

  // One row per search, with the sum of what each batch cost. If any batch arrives
  // without a cost, the whole row becomes estimated: better that than a fake real one.
  // Several batches are several calls: the provider is stored, not an id that would belong to just one
  const costs = results.map((r) => r.costUsd);
  const costUsd = costs.every((c) => c !== null) ? costs.reduce((n: number, c) => n + c!, 0) : null;
  void recordUsage(usage, { action: "jev_search", model: "jev", units: items.length, costUsd, provider: results.find((r) => r.provider)?.provider ?? null, ref: query });
  return Object.fromEntries(results.flatMap((r) => r.scores));
}


// ─── Screening a project's board for Polish (lib/polish.ts) ─────────────────
// Jev answers yes/no per reference in milliseconds and for a fraction of a cent, so it reads the
// whole board; a language model then only explains what Jev flagged. Jev gives probabilities,
// never a reason, which is why it does not replace the second step.

/** A reference as the games read it: the search summary, plus the thread under it and the DESIGN.md brief when there is one */
export type BoardRef = { id: string; kind?: string; team_comments?: string[]; design_brief?: Record<string, string> | null } & ReturnType<typeof summarize>;
export interface ScreenBilling { costUsd: number | null; provider: string | null; calls: number }

/** References per tone call, like a search batch */
const SCREEN_BATCH = 12;
/** A bucket (same sector and style) is compared in chunks this big: 28 pairs per call */
const DUPE_CHUNK = 8;

function sumBilling(parts: { costUsd: number | null; provider: string | null }[]): ScreenBilling {
  const costs = parts.map((p) => p.costUsd);
  return {
    costUsd: parts.length && costs.every((c) => c !== null) ? costs.reduce((n: number, c) => n + c!, 0) : null,
    provider: parts.find((p) => p.provider)?.provider ?? null,
    calls: parts.length,
  };
}

/** Per reference code, the probability (0–1) that it pulls away from the brief. */
export async function screenTone(brief: JsonValue, refs: BoardRef[], examples: BoardRef[]): Promise<{ scores: Map<string, number>; billing: ScreenBilling }> {
  const batches: BoardRef[][] = [];
  for (let i = 0; i < refs.length; i += SCREEN_BATCH) batches.push(refs.slice(i, i + SCREEN_BATCH));
  const results = await pool(batches, CONCURRENCY, async (batch) => {
    const state = {
      note: "A design team keeps a board of references for one project (websites, images, videos, posts: see kind). The brief is the team's own words about the project. Judge each reference against the brief only, never against taste, using everything given: curator_notes, team_comments, look (for an image, what the picture shows), labels and design_brief when present. A reference saved for one detail is judged on that detail. Never fault an image or a post for lacking what only a website has.",
      brief,
      marked_as_clashing_by_the_team: examples.map((e) => ({ name: e.name, curator_notes: e.curator_notes, style: e.style, look: e.look })),
      references: batch,
    };
    const questions = Object.fromEntries(batch.map((r) => [
      r.id,
      noul(`Does the reference with id "${r.id}" pull away from the brief?`, {
        true: "It clearly conflicts with the brief: a tone the brief rejects, something listed under avoid, a look for another audience, or it would confuse what a visitor must get in five seconds.",
        false: "It fits the brief, or the conflict is minor or arguable.",
      }),
    ]));
    const res = await client().systemOne({ state, questions });
    const a = res.answers as Record<string, { noul?: number }>;
    return { ...billingOf(res), scores: batch.map((r) => [r.id, Number(a[r.id]?.noul ?? 0)] as const) };
  });
  return { scores: new Map(results.flatMap((r) => r.scores)), billing: sumBilling(results) };
}

/**
 * Pairs that may be the same idea for the project, with their probability. Only references
 * sharing sector and style are compared (the rest cannot be the same idea), in chunks of a bucket.
 */
export async function screenDupes(about: string | null, refs: BoardRef[]): Promise<{ pairs: { a: string; b: string; p: number }[]; billing: ScreenBilling }> {
  const buckets = new Map<string, BoardRef[]>();
  for (const r of refs) {
    const k = `${r.sector ?? "?"}|${r.style ?? "?"}`;
    buckets.set(k, [...(buckets.get(k) ?? []), r]);
  }
  const chunks: BoardRef[][] = [];
  for (const list of buckets.values()) for (let i = 0; i < list.length; i += DUPE_CHUNK) {
    const chunk = list.slice(i, i + DUPE_CHUNK);
    if (chunk.length >= 2) chunks.push(chunk);
  }
  const results = await pool(chunks, CONCURRENCY, async (chunk) => {
    const state = {
      note: "A design team keeps a board of reference websites for one project. Two references are duplicates when the concrete idea the team would take from them coincides: the same typographic approach, the same layout pattern, the same kind of imagery, the same interaction, the same tone of voice. Read curator_notes and team_comments first: they say what each one is there for. The same sector or the same style label alone is not a duplicate.",
      project: about,
      references: chunk,
    };
    const pairs: [string, string][] = [];
    for (let i = 0; i < chunk.length; i++) for (let j = i + 1; j < chunk.length; j++) pairs.push([chunk[i].id, chunk[j].id]);
    const questions = Object.fromEntries(pairs.map(([a, b]) => [
      `${a}_${b}`,
      noul(`Would the team take the same idea from "${a}" and "${b}", so that keeping both adds nothing?`, {
        true: "They say the same thing for this project: one of them is enough.",
        false: "Each brings something the other does not.",
      }),
    ]));
    const res = await client().systemOne({ state, questions });
    const ans = res.answers as Record<string, { noul?: number }>;
    return { ...billingOf(res), pairs: pairs.map(([a, b]) => ({ a, b, p: Number(ans[`${a}_${b}`]?.noul ?? 0) })) };
  });
  const best = new Map<string, { a: string; b: string; p: number }>();
  for (const x of results.flatMap((r) => r.pairs)) {
    const k = x.a < x.b ? `${x.a}|${x.b}` : `${x.b}|${x.a}`;
    if ((best.get(k)?.p ?? -1) < x.p) best.set(k, x);
  }
  return { pairs: [...best.values()], billing: sumBilling(results) };
}

/** Chunk of the board for the duel screen: 12 references are 66 pairs, one call */
const DUEL_CHUNK = 12;

/**
 * Pairs that may pull the project in opposite directions, with their probability. The board is
 * compared in chunks, twice with different shuffles (by url, then by name), so each reference meets
 * a good share of the others; a pair asked twice keeps its higher score.
 */
export async function screenDuels(brief: JsonValue, refs: BoardRef[]): Promise<{ pairs: { a: string; b: string; p: number }[]; billing: ScreenBilling }> {
  const chunks: BoardRef[][] = [];
  for (const order of [[...refs].sort((a, b) => (a.url < b.url ? -1 : 1)), [...refs].sort((a, b) => (a.name < b.name ? -1 : 1))]) {
    for (let i = 0; i < order.length; i += DUEL_CHUNK) { const c = order.slice(i, i + DUEL_CHUNK); if (c.length >= 2) chunks.push(c); }
  }
  const results = await pool(chunks, CONCURRENCY, async (chunk) => {
    const state = {
      note: "A design team keeps a board of reference websites for one project, with a brief. Two references duel when they would take the project in opposite directions, so the team has to choose: a different tone of voice, an opposite typographic approach, a different kind of imagery, a different idea of what the visitor should feel. A difference of sector or subject alone is not a duel; two references that could both be followed at once are not a duel.",
      brief,
      references: chunk,
    };
    const pairs: [string, string][] = [];
    for (let i = 0; i < chunk.length; i++) for (let j = i + 1; j < chunk.length; j++) pairs.push([chunk[i].id, chunk[j].id]);
    const questions = Object.fromEntries(pairs.map(([a, b]) => [
      `${a}_${b}`,
      noul(`Do "${a}" and "${b}" pull this project in opposite directions, so that the team must pick one?`, {
        true: "Following both would give an incoherent site: the team has to choose one direction.",
        false: "They are compatible, or they differ in something that does not set a direction.",
      }),
    ]));
    const res = await client().systemOne({ state, questions });
    const ans = res.answers as Record<string, { noul?: number }>;
    return { ...billingOf(res), pairs: pairs.map(([a, b]) => ({ a, b, p: Number(ans[`${a}_${b}`]?.noul ?? 0) })) };
  });
  const best = new Map<string, { a: string; b: string; p: number }>();
  for (const x of results.flatMap((r) => r.pairs)) {
    const k = x.a < x.b ? `${x.a}|${x.b}` : `${x.b}|${x.a}`;
    if ((best.get(k)?.p ?? -1) < x.p) best.set(k, x);
  }
  return { pairs: [...best.values()], billing: sumBilling(results) };
}
