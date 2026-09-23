// Classification with Jev (Typesafe AI). Server only.
import "server-only";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import type { JsonValue } from "@typesafe-ai/sdk";
import { InspoItem, InspoTags } from "@/types/inspo";
import { SECTORS, STYLES, TAGS, TAXONOMY_VERSION, TAG_THRESHOLD } from "./taxonomy";
import en from "./i18n/en";
import { fetchSiteText, SiteText } from "./extract";
import { describeSite } from "./vision";
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

const criteriaOf = (terms: typeof SECTORS) =>
  Object.fromEntries(terms.map((t) => [t.key, t.description]));

// ─── Tagging an item ───────────────────────────────────────────────────────────

function buildState(item: InspoItem, site: SiteText | null, visual: string | null): { [k: string]: JsonValue } {
  return {
    name: item.name,
    url: item.web,
    collection: item.type,
    curator_notes: [item.note, item.subNote].filter(Boolean).join(" — ") || null,
    // What the screenshot shows, described by a vision model. It's the best
    // evidence for visual traits (typography, illustration, palette, layout).
    screenshot_description: visual,
    page: site
      ? {
          title: site.title || null,
          description: site.description || null,
          site_name: site.siteName || null,
          lang: site.lang || null,
          headings: site.headings,
          text_sample: site.textSample || null,
        }
      : { note: "Page content could not be fetched; rely on name, url and curator notes." } as { [k: string]: JsonValue },
    html_signals: site
      ? {
          theme_color: site.signals.themeColor,
          fonts: site.signals.fonts,
          css_colors_seen: site.signals.colors,
          has_canvas_or_webgl: site.signals.hasCanvas,
          has_video: site.signals.hasVideo,
          image_count: site.signals.imageCount,
          platform: site.signals.platform,
        }
      : null,
  };
}

export async function classifyItem(item: InspoItem, usage?: UsageCtx): Promise<InspoTags> {
  const [site, vision] = await Promise.all([fetchSiteText(item.web), describeSite(item)]);
  const visual = vision?.text ?? null;
  if (vision) {
    console.log(`vision ${item.web}: ${vision.model} in/out ${vision.inputTokens}/${vision.outputTokens}`);
    void recordUsage(usage, { action: "vision", model: vision.model, inputTokens: vision.inputTokens, outputTokens: vision.outputTokens, cacheReadTokens: vision.cacheReadTokens, costUsd: vision.costUsd, provider: vision.provider, requestId: vision.requestId, ref: item.web });
  }
  const state = buildState(item, site, visual);

  const questions = {
    sector: choice("What kind of website or piece is this?", criteriaOf(SECTORS)),
    style: choice(
      "Which visual style best describes it? Weigh screenshot_description most, then fonts, colors, copy and structure signals.",
      criteriaOf(STYLES)
    ),
    ...Object.fromEntries(
      TAGS.map((t) => [
        `tag_${t.key}`,
        noul(`Does this apply? ${t.description}`, {
          true: "The evidence (screenshot_description first, then copy, headings, fonts, colors, signals, curator notes) supports this trait.",
          false: "No evidence or the opposite is true.",
        }),
      ])
    ),
  };

  const res = await client().systemOne({ state, questions });
  void recordUsage(usage, { action: "jev_tag", model: "jev", units: 1, ...billingOf(res), ref: item.web });
  const a = res.answers as Record<string, { type: string; choice?: string; probabilities?: Record<string, number>; noul?: number }>;

  const tags: Record<string, number> = {};
  for (const t of TAGS) tags[t.key] = Number(a[`tag_${t.key}`]?.noul ?? 0);

  const sector = a.sector?.choice ?? "other";
  const style = a.style?.choice ?? "minimal";
  const summary = [site?.title, site?.description].filter(Boolean).join(" · ").slice(0, 300);

  return {
    sector, sectorP: a.sector?.probabilities?.[sector] ?? 0,
    style, styleP: a.style?.probabilities?.[style] ?? 0,
    tags, summary,
    visual: visual ?? undefined,
    at: new Date().toISOString(),
    v: TAXONOMY_VERSION,
  };
}

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
    traits: t ? activeTags(t).map((k) => en.taxonomy.tag[k as keyof typeof en.taxonomy.tag] ?? k) : [],
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

