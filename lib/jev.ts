// Clasificación con Jev (Typesafe AI). Solo servidor.
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import type { JsonValue } from "@typesafe-ai/sdk";
import { InspoItem, InspoTags } from "@/types/inspo";
import { SECTORES, ESTILOS, TAGS, TAXONOMY_VERSION, TAG_THRESHOLD, labelOf } from "./taxonomy";
import { fetchSiteText, SiteText } from "./extract";
import { describeSite } from "./vision";
import { recordUsage, type UsageCtx } from "./usage";

let _client: TypeSafeClient | null = null;
function client() {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY no configurada");
  return (_client ??= new TypeSafeClient());
}

export const jevEnabled = () => !!process.env.TYPESAFE_API_KEY;

const criteriaOf = (terms: typeof SECTORES) =>
  Object.fromEntries(terms.map((t) => [t.key, t.description]));

// ─── Etiquetado de un item ────────────────────────────────────────────────────

function buildState(item: InspoItem, site: SiteText | null, visual: string | null): { [k: string]: JsonValue } {
  return {
    name: item.empresa,
    url: item.web,
    collection: item.tipo,
    curator_notes: [item.comentarios, item.subcomentarios].filter(Boolean).join(" — ") || null,
    // Lo que se ve en la captura, descrito por un modelo de visión. Es la mejor
    // evidencia para rasgos visuales (tipografía, ilustración, paleta, layout).
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
    void recordUsage(usage, { action: "vision", model: vision.model, inputTokens: vision.inputTokens, outputTokens: vision.outputTokens, cacheReadTokens: vision.cacheReadTokens, ref: item.web });
  }
  const state = buildState(item, site, visual);

  const questions = {
    sector: choice("What kind of website or piece is this?", criteriaOf(SECTORES)),
    estilo: choice(
      "Which visual style best describes it? Weigh screenshot_description most, then fonts, colors, copy and structure signals.",
      criteriaOf(ESTILOS)
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
  void recordUsage(usage, { action: "jev_tag", model: "jev", units: 1, ref: item.web });
  const a = res.answers as Record<string, { type: string; choice?: string; probabilities?: Record<string, number>; noul?: number }>;

  const tags: Record<string, number> = {};
  for (const t of TAGS) tags[t.key] = Number(a[`tag_${t.key}`]?.noul ?? 0);

  const sector = a.sector?.choice ?? "otro";
  const estilo = a.estilo?.choice ?? "minimal";
  const resumen = [site?.title, site?.description].filter(Boolean).join(" · ").slice(0, 300);

  return {
    sector, sectorP: a.sector?.probabilities?.[sector] ?? 0,
    estilo, estiloP: a.estilo?.probabilities?.[estilo] ?? 0,
    tags, resumen,
    visual: visual ?? undefined,
    at: new Date().toISOString(),
    v: TAXONOMY_VERSION,
  };
}

export const activeTags = (t: InspoTags | undefined) =>
  t ? TAGS.filter((x) => (t.tags[x.key] ?? 0) >= TAG_THRESHOLD).map((x) => x.key) : [];

// ─── Búsqueda inteligente ─────────────────────────────────────────────────────

// Caché en memoria por consulta. Se vacía al etiquetar, porque las etiquetas forman parte del estado.
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
    name: item.empresa,
    url: item.web,
    collection: item.tipo,
    curator_notes: [item.comentarios, item.subcomentarios].filter(Boolean).join(" — ") || null,
    page: t?.resumen || null,
    look: t?.visual ? t.visual.slice(0, 400) : null,
    sector: t ? labelOf(SECTORES, t.sector) : null,
    style: t ? labelOf(ESTILOS, t.estilo) : null,
    traits: t ? activeTags(t).map((k) => labelOf(TAGS, k)) : [],
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

/** Devuelve, por URL, la probabilidad (0–1) de que el item encaje con la consulta. */
export async function matchQuery(
  query: string,
  items: InspoItem[],
  tagMap: Record<string, InspoTags>,
  usage?: UsageCtx
): Promise<Record<string, number>> {
  void recordUsage(usage, { action: "jev_search", model: "jev", units: items.length, ref: query });
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
      return batch.map((it, i) => [it.web, Number(a[`item_${i}`]?.noul ?? 0)] as const);
    } catch (e) {
      console.error("matchQuery batch error:", e);
      return batch.map((it) => [it.web, 0] as const);
    }
  });

  return Object.fromEntries(results.flat());
}

