// Search, in the browser: the chips (filters people pick from suggestions), the words they type, and how
// the three layers come together. Pure: no React, no server. Works on what the library already holds.
//
// Layer 1 (here, every keystroke): chips filter; words match a text index of each item.
// Layer 2 (/api/search/semantic, ~0.3–0.6 s): nearness in meaning, any language (lib/embed.ts).
// Layer 3 (/api/search, ~1 s, descriptive queries only): Jev reads the top 20 and reorders them.
import { COLORS, SECTIONS, ELEMENTS, TYPE, LAYOUT, TAGS, SECTORS, STYLES, FACETS, viewOf, hasFacet, type Term } from "./taxonomy";
import { mediaKindOf, hostOf, type MediaKind } from "./url";
import { taxonomy as enTax } from "./i18n/en/taxonomy";
import { taxonomy as esTax } from "./i18n/es/taxonomy";
import { labels as enLabels } from "./i18n/en/labels";
import { labels as esLabels } from "./i18n/es/labels";
import type { InspoItem, InspoTags, TagMap, CommentMap } from "@/types/inspo";

// ─── Filters (chips) ─────────────────────────────────────────────────────────

export type FilterKind = "person" | "date" | "media" | "collection" | "tag" | "sector" | "style";
/** `tag` values are taxonomy selectors (lib/taxonomy.ts facetOf): "c:blue", "s:pricing", "k:coffee", "a:Attio", "dark" */
export interface Filter { kind: FilterKind; value: string }

export const filterKey = (f: Filter) => `${f.kind}:${f.value}`;
export function parseFilter(s: string): Filter | null {
  const i = s.indexOf(":");
  const kind = s.slice(0, i) as FilterKind;
  return i > 0 && KINDS.includes(kind) ? { kind, value: s.slice(i + 1) } : null;
}
const KINDS: FilterKind[] = ["person", "date", "media", "collection", "tag", "sector", "style"];

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ─── Dates ───────────────────────────────────────────────────────────────────

/** "DD/MM/YYYY" (the library's dates) → ms, 0 when unreadable */
export function parseDate(s: string): number {
  const p = s?.split("/");
  if (p?.length === 3) { const t = Date.parse(`${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`); if (!isNaN(t)) return t; }
  const t = Date.parse(s);
  return isNaN(t) ? 0 : t;
}

const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** A date chip's range [from, to) in local time. Values: today, yesterday, week, lastweek, month, lastmonth,
 *  year, m:<1-12> (the latest such month), y:<year> */
export function dateRange(value: string, now = new Date()): [number, number] | null {
  const today = day(now);
  const plus = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  const monday = plus(today, -((today.getDay() + 6) % 7));
  const r = (a: Date, b: Date): [number, number] => [a.getTime(), b.getTime()];
  switch (value) {
    case "today": return r(today, plus(today, 1));
    case "yesterday": return r(plus(today, -1), today);
    case "week": return r(monday, plus(today, 1));
    case "lastweek": return r(plus(monday, -7), monday);
    case "month": return r(new Date(today.getFullYear(), today.getMonth(), 1), plus(today, 1));
    case "lastmonth": return r(new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 1));
    case "year": return r(new Date(today.getFullYear(), 0, 1), plus(today, 1));
  }
  const m = value.match(/^m:(\d{1,2})$/);
  if (m) {
    const month = Number(m[1]) - 1;
    const year = month > today.getMonth() ? today.getFullYear() - 1 : today.getFullYear();
    return r(new Date(year, month, 1), new Date(year, month + 1, 1));
  }
  const y = value.match(/^y:(\d{4})$/);
  if (y) return r(new Date(Number(y[1]), 0, 1), new Date(Number(y[1]) + 1, 0, 1));
  return null;
}

// ─── Vocabulary: what can become a chip ──────────────────────────────────────

export interface Term2 { filter: Filter; words: string[]; group: "person" | "date" | "media" | "collection" | "colour" | "page" | "look" | "credit" | "keyword" }

const DATE_WORDS: Record<string, string[]> = {
  today: ["today", "hoy"], yesterday: ["yesterday", "ayer"],
  week: ["this week", "esta semana"], lastweek: ["last week", "semana pasada"],
  month: ["this month", "este mes"], lastmonth: ["last month", "mes pasado"],
  year: ["this year", "este ano"],
};
const MONTHS = [
  ["january", "enero"], ["february", "febrero"], ["march", "marzo"], ["april", "abril"], ["may", "mayo"], ["june", "junio"],
  ["july", "julio"], ["august", "agosto"], ["september", "septiembre"], ["october", "octubre"], ["november", "noviembre"], ["december", "diciembre"],
];
const MEDIA_WORDS: Record<MediaKind, string[]> = {
  web: ["sites", "websites", "webs", "pages", "paginas", "landings"],
  image: ["images", "imagenes", "photos", "fotos", "pictures", "gifs"],
  video: ["videos", "youtube", "vimeo"],
  post: ["posts", "tweets", "x posts"],
};
const terms = (list: Term[], kind: FilterKind, sel: (k: string) => string, labelsEn: Record<string, string>, labelsEs: Record<string, string>, group: Term2["group"]): Term2[] =>
  list.map((t) => ({ filter: { kind, value: sel(t.key) }, words: [...new Set([t.key, labelsEn[t.key], labelsEs[t.key]].filter(Boolean).map(norm))], group }));

/** Everything a chip can be, for this library: fixed words plus its people, credits and keywords */
export function vocabulary(items: InspoItem[], tagMap: TagMap, members: string[], now = new Date()): Term2[] {
  const out: Term2[] = [];
  for (const name of new Set([...members, ...items.map((i) => i.addedBy)].filter((n) => n && n !== "Both"))) {
    out.push({ filter: { kind: "person", value: name }, words: [norm(name), ...norm(name).split(" ")], group: "person" });
  }
  for (const [value, w] of Object.entries(DATE_WORDS)) out.push({ filter: { kind: "date", value }, words: w, group: "date" });
  MONTHS.forEach((w, i) => out.push({ filter: { kind: "date", value: `m:${i + 1}` }, words: w, group: "date" }));
  const years = new Set(items.map((i) => new Date(parseDate(i.date)).getFullYear()).filter((y) => y > 2000));
  for (const y of [...years].sort((a, b) => b - a)) if (y !== now.getFullYear()) out.push({ filter: { kind: "date", value: `y:${y}` }, words: [String(y)], group: "date" });
  for (const [value, w] of Object.entries(MEDIA_WORDS)) out.push({ filter: { kind: "media", value }, words: w, group: "media" });
  // Collections besides "videos" (that one is the video media chip)
  for (const k of ["inspiration", "ideas", "documentaries"] as const) {
    out.push({ filter: { kind: "collection", value: k }, words: [norm(enLabels.type[k]), norm(esLabels.type[k])], group: "collection" });
  }
  out.push(...terms(COLORS, "tag", (k) => `c:${k}`, enTax.color, esTax.color, "colour"));
  out.push(...terms(SECTIONS, "tag", (k) => `s:${k}`, enTax.section, esTax.section, "page"));
  out.push(...terms(ELEMENTS, "tag", (k) => `e:${k}`, enTax.element, esTax.element, "page"));
  out.push(...terms(TYPE, "tag", (k) => `y:${k}`, enTax.type, esTax.type, "look"));
  out.push(...terms(LAYOUT, "tag", (k) => `l:${k}`, enTax.layout, esTax.layout, "look"));
  out.push(...terms(TAGS, "tag", (k) => k, enTax.tag, esTax.tag, "look"));
  out.push(...terms(STYLES, "style", (k) => k, enTax.style, esTax.style, "look"));
  out.push(...terms(SECTORS.filter((s) => s.key !== "other"), "sector", (k) => k, enTax.sector, esTax.sector, "page"));
  // From the library itself: who made things, and the words they are tagged with
  const credits = new Set<string>(), keywords = new Set<string>();
  for (const t of Object.values(tagMap)) { const v = viewOf(t); v?.credits.forEach((c) => credits.add(c)); v?.keywords.forEach((k) => keywords.add(k)); }
  for (const c of credits) out.push({ filter: { kind: "tag", value: `a:${c}` }, words: [norm(c)], group: "credit" });
  for (const k of keywords) out.push({ filter: { kind: "tag", value: `k:${k}` }, words: [norm(k)], group: "keyword" });
  return out;
}

const CONNECTORS = new Set(["by", "de", "from", "por", "von"]);
const GROUP_ORDER: Term2["group"][] = ["person", "date", "media", "colour", "page", "look", "collection", "credit", "keyword"];

/**
 * Suggestions for what is being typed: the last one, two or three words, matched at the start of a term's
 * words. Exact matches first, then by group (people before keywords), then shorter first.
 */
export function suggest(text: string, vocab: Term2[], taken: Filter[], limit = 7): { term: Term2; consumed: number }[] {
  const words = norm(text).split(/\s+/).filter(Boolean);
  if (!words.length || !text.trim()) return [];
  const takenKeys = new Set(taken.map(filterKey));
  const seen = new Set<string>();
  const found: { term: Term2; consumed: number; n: number; rank: number }[] = [];
  // Longest phrase first, so "last week" beats "week"; once a phrase matches, its last word alone isn't asked
  for (let n = Math.min(3, words.length); n >= 1; n--) {
    if (n === 1 && found.some((f) => f.n > 1)) break;
    const phrase = words.slice(-n).join(" ");
    if (phrase.length < (n === 1 ? 2 : 3)) continue;
    for (const term of vocab) {
      const key = filterKey(term.filter);
      if (seen.has(key) || takenKeys.has(key)) continue;
      const exact = term.words.includes(phrase);
      if (!exact && !term.words.some((w) => w.startsWith(phrase) || w.split(" ").some((p) => p.startsWith(phrase)))) continue;
      seen.add(key);
      // The text the suggestion replaces: the matched words, in their original spelling, and the "by" or "de"
      // before a name ("by att" → the Attio chip, nothing left over)
      const typed = text.trimEnd().split(/\s+/);
      const lead = (term.group === "credit" || term.group === "person") && CONNECTORS.has(norm(typed[typed.length - n - 1] ?? "")) ? 1 : 0;
      const consumed = typed.slice(-(n + lead)).join(" ").length;
      const g = GROUP_ORDER.indexOf(term.group);
      found.push({ term, consumed, n, rank: (exact ? 0 : 100) + g * 10 + Math.min(9, term.words[0].length / 4) - n * 50 });
    }
  }
  return found.sort((a, b) => a.rank - b.rank).slice(0, limit).map(({ term, consumed }) => ({ term, consumed }));
}

// ─── Matching ────────────────────────────────────────────────────────────────

/**
 * The chips as one test, built once per change of chips. Chips of a kind are alternatives (Eric or
 * Andoni, images or videos); tag chips all have to hold.
 */
export function filterTest(filters: Filter[], now = new Date()): (item: InspoItem, tags: InspoTags | undefined) => boolean {
  const of = (k: FilterKind) => filters.filter((f) => f.kind === k).map((f) => f.value);
  const people = new Set(of("person")), media = new Set(of("media")), cols = new Set(of("collection"));
  const sectors = new Set(of("sector")), styles = new Set(of("style")), tagSels = of("tag");
  const ranges = of("date").map((v) => dateRange(v, now)).filter((r): r is [number, number] => !!r);
  return (item, tags) => {
    if (people.size && !people.has(item.addedBy)) return false;
    if (cols.size && !cols.has(item.type)) return false;
    if (media.size && !media.has(mediaKindOf(item.web))) return false;
    if (sectors.size && !sectors.has(tags?.sector ?? "")) return false;
    if (styles.size && !styles.has(tags?.style ?? "")) return false;
    if (ranges.length) { const ts = parseDate(item.date); if (!ranges.some(([a, b]) => ts >= a && ts < b)) return false; }
    return tagSels.every((sel) => hasFacet(tags, sel));
  };
}

export const matchesFilters = (item: InspoItem, tags: InspoTags | undefined, filters: Filter[], now = new Date()) => filterTest(filters, now)(item, tags);

const both = (en: Record<string, string>, es: Record<string, string>, k: string) => [k, en[k] ?? "", es[k] ?? ""];
/** The page's light from its pixels (lib/palette.ts), in the words people search with */
const THEME_WORDS: Record<string, string[]> = {
  dark: ["dark", "oscura", "oscuro", "dunkel", "sombre"], light: ["light", "clara", "claro", "hell", "white background", "fondo blanco"], mixed: [],
};
const FACET_LABELS = { palette: "color", sections: "section", elements: "element", type: "type", layout: "layout" } as const;

/** One searchable text per item: its words and every tag in both languages, notes and its thread */
export function textIndex(items: InspoItem[], tagMap: TagMap, comments: CommentMap): Map<string, string> {
  const out = new Map<string, string>();
  for (const it of items) {
    const t = tagMap[it.web];
    const v = viewOf(t);
    const thread = it.id ? (comments[it.id] ?? []).map((c) => `${c.authorName} ${c.body}`) : [];
    out.set(it.web, " " + norm([
      it.name, hostOf(it.web), it.note, it.subNote ?? "", it.addedBy,
      ...both(enLabels.type, esLabels.type, it.type),
      t?.summary ?? "", t?.visual ?? "",
      ...(t ? [...both(enTax.sector, esTax.sector, t.sector), ...both(enTax.style, esTax.style, t.style)] : []),
      ...(v ? v.traits.flatMap((k) => both(enTax.tag, esTax.tag, k)) : []),
      ...(v ? FACETS.flatMap((f) => v[f.field].flatMap((k) => both(enTax[FACET_LABELS[f.field]], esTax[FACET_LABELS[f.field]], k))) : []),
      ...(v?.keywords ?? []), ...(v?.credits ?? []),
      ...(t?.meta ? [t.meta.kind ?? "", t.meta.place ?? "", t.meta.camera ?? "", t.meta.generator ?? "", ...(t.meta.keywords ?? [])] : []),
      ...(t?.theme ? THEME_WORDS[t.theme] : []),
      ...thread,
    ].join(" ")).replace(/[^a-z0-9@#]+/g, " ") + " ");
  }
  return out;
}

// Glue words, and words every item in a design library could claim (a site is a page)
const STOP = new Set([
  "the", "and", "with", "for", "of", "a", "an", "con", "que", "una", "uno", "para", "por", "del", "las", "los", "el", "la", "de", "y", "en", "un", "mit", "und", "der", "die", "das",
  "page", "pages", "site", "sites", "website", "websites", "web", "webs", "pagina", "paginas", "landing", "seite", "design", "diseno",
]);
export const queryWords = (text: string) => norm(text).split(/[^a-z0-9@#]+/).filter((w) => w.length >= 2 && !STOP.has(w));

/** Share of the query's words found at the start of a word in the item's text, 0–1 */
export function textScore(hay: string, words: string[]): number {
  if (!words.length) return 0;
  let hit = 0;
  for (const w of words) if (hay.includes(" " + w)) hit++;
  return hit / words.length;
}

/** An item counts when it holds at least this share of the query's weight */
const LOCAL_MIN = 0.5;

/**
 * The words layer: which items hold the query's words, weighted by how rare each word is in the library
 * ("pricing" in 3 items says more than "dark" in 40). Score 0–1, only items over LOCAL_MIN.
 */
export function localScores(webs: string[], index: Map<string, string>, words: string[]): Map<string, number> {
  const out = new Map<string, number>();
  if (!words.length) return out;
  const hits = new Map<string, boolean[]>();
  const df = words.map(() => 0);
  for (const web of webs) {
    const hay = index.get(web);
    if (!hay) continue;
    const h = words.map((w) => hay.includes(" " + w));
    if (!h.some(Boolean)) continue;
    h.forEach((x, k) => { if (x) df[k]++; });
    hits.set(web, h);
  }
  const n = Math.max(1, webs.length);
  // A word no item holds weighs nothing here (another language, a description): meaning answers for it
  const idf = df.map((d) => (d ? Math.log(1 + n / d) : 0));
  const total = idf.reduce((a, b) => a + b, 0);
  if (!total) return out;
  for (const [web, h] of hits) {
    const got = h.reduce((a, x, k) => a + (x ? idf[k] : 0), 0) / total;
    if (got >= LOCAL_MIN - 1e-9) out.set(web, got);
  }
  return out;
}

// ─── Bringing the layers together ────────────────────────────────────────────

/** bge-m3 puts most things between 0.4 and 0.6: what counts is the distance to the best */
const SEMANTIC_BAND = 0.07;
const SEMANTIC_MAX = 40;

/**
 * Which items the words select and their order: words found (local) or near in meaning (semantic); Jev,
 * when it has read the top, puts what it believes fits first and drops what it is sure doesn't.
 */
export function rankText(
  candidates: string[], local: Map<string, number>, semantic: Record<string, number> | null, jev: Record<string, number> | null,
): { order: string[]; score: Map<string, number> } {
  const score = new Map<string, number>();
  const top = semantic ? Math.max(0, ...Object.values(semantic)) : 0;
  const near = new Set(semantic ? Object.entries(semantic).filter(([, s]) => s >= top - SEMANTIC_BAND).sort((a, b) => b[1] - a[1]).slice(0, SEMANTIC_MAX).map(([w]) => w) : []);
  for (const web of candidates) {
    const l = local.get(web) ?? 0;
    const s = near.has(web) ? (semantic![web] - (top - SEMANTIC_BAND)) / SEMANTIC_BAND : 0;
    if (l <= 0 && s <= 0) continue;
    // The words found count most; nearness in meaning adds, and alone ranks below a full word match
    let v = l + 0.6 * s;
    if (jev && web in jev) {
      if (jev[web] < 0.1 && l < 0.75) continue; // Jev is sure it doesn't fit, and the words don't insist
      v += 0.8 * (jev[web] - 0.3); // a nudge, both ways: Jev's scores are low and noisy on their own
    }
    score.set(web, v);
  }
  return { order: [...score.keys()].sort((a, b) => score.get(b)! - score.get(a)!), score };
}

/** Is this worth Jev's second, slower look? Long descriptions, or few plain hits */
export const isDescriptive = (words: string[], localHits: number) => words.length >= 3 || localHits < 5;

// ─── The URL ─────────────────────────────────────────────────────────────────
// ?f=person:Eric&f=tag:c:blue&q=serif hero. Older links (?type= ?author= ?date= ?sector= ?style= ?tags=)
// are read as chips, so shared filtered views keep working.

export function filtersFromParams(sp: URLSearchParams): Filter[] {
  const out = sp.getAll("f").map(parseFilter).filter((f): f is Filter => !!f);
  const type = sp.get("type");
  if (type === "videos") out.push({ kind: "media", value: "video" });
  else if (type) out.push({ kind: "collection", value: type });
  if (sp.get("author")) out.push({ kind: "person", value: sp.get("author")! });
  const date = sp.get("date");
  if (date === "thisMonth") out.push({ kind: "date", value: "month" });
  if (date === "thisYear") out.push({ kind: "date", value: "year" });
  if (sp.get("sector")) out.push({ kind: "sector", value: sp.get("sector")! });
  if (sp.get("style")) out.push({ kind: "style", value: sp.get("style")! });
  for (const t of (sp.get("tags") ?? "").split(",").filter(Boolean)) out.push({ kind: "tag", value: t });
  const seen = new Set<string>();
  return out.filter((f) => !seen.has(filterKey(f)) && !!seen.add(filterKey(f)));
}

export const LEGACY_PARAMS = ["type", "author", "date", "sector", "style", "tags"];
