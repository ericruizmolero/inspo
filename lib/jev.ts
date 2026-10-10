// Jev (Typesafe AI): search. Server only. Tagging is lib/tagger.ts.
import "server-only";
import { TypeSafeClient, noul } from "@typesafe-ai/sdk";
import { InspoItem, InspoTags } from "@/types/inspo";
import { TAGS, TAG_THRESHOLD, viewOf } from "./taxonomy";
import en from "./i18n/en";
import { recordUsage, type UsageCtx } from "./usage";
import { recordFailure } from "./log";

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
      // The search goes on with this batch scored 0; the failure is kept
      void recordFailure("ai", "jev", e, { ref: query });
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
