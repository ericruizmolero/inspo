// Lexical prefilter before Jev. Server only.
import { activeTags } from "./jev";
import en from "./i18n/en";
import es from "./i18n/es";
import type { InspoItem, TagMap } from "@/types/inspo";

// Jev bills per token (via OpenRouter) and each candidate is about 330 tokens, so
// the cost of a search would grow with the library. We prefilter by text (name,
// notes, summary, visual description and tags) and only send Jev a fixed maximum
// of candidates. With 80, a search costs about $0.0011 (September 2026).
const MAX_JEV = 80;
const MIN_HITS = 40;
const STOP = new Set(["con", "que", "una", "uno", "unos", "unas", "para", "por", "del", "las", "los", "web", "webs", "sitio", "sitios", "pagina", "paginas", "page", "site", "sites", "the", "and", "with", "muy", "mas", "tipo", "estilo", "style", "like", "como"]);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Labels go in in both languages: the query can come in either
// and the prefilter has to match it all the same ("videos" and "documentaries").
const both = (pick: (d: typeof en) => Record<string, string>, key: string): string[] =>
  [pick(en)[key] ?? key, pick(es)[key] ?? key];

function haystack(it: InspoItem, tagMap: TagMap): string {
  const t = tagMap[it.web];
  return norm([
    it.name, it.note, it.subNote ?? "", it.web,
    it.type, ...both((d) => d.labels.type, it.type),
    t?.summary ?? "", t?.visual ?? "",
    ...(t ? both((d) => d.taxonomy.sector, t.sector) : []),
    ...(t ? both((d) => d.taxonomy.style, t.style) : []),
    ...(t ? activeTags(t).flatMap((k) => both((d) => d.taxonomy.tag, k)) : []),
  ].join(" "));
}

export function prefilter(query: string, items: InspoItem[], tagMap: TagMap): InspoItem[] {
  if (items.length <= MAX_JEV) return items;
  const toks = norm(query).split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOP.has(t));
  const scored = items.map((it) => {
    const hay = haystack(it, tagMap);
    return { it, hits: toks.filter((t) => hay.includes(t)).length };
  });
  const picked = scored.filter((s) => s.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, MAX_JEV).map((s) => s.it);
  if (picked.length >= MIN_HITS) return picked;
  // Few literal matches (query in another language, or very abstract): fill with the most recent
  const seen = new Set(picked.map((i) => i.web));
  for (const it of items) {
    if (picked.length >= MAX_JEV) break;
    if (!seen.has(it.web)) picked.push(it);
  }
  return picked;
}

