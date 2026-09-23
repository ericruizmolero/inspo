// Prefiltro léxico antes de Jev. Solo servidor.
import { activeTags } from "./jev";
import en from "./i18n/en";
import es from "./i18n/es";
import type { InspoItem, TagMap } from "@/types/inspo";

// Jev cobra por token (vía OpenRouter) y cada candidato son unos 330 tokens, así que
// el coste de una búsqueda crecería con la biblioteca. Prefiltramos por texto (nombre,
// notas, resumen, descripción visual y etiquetas) y solo mandamos a Jev un máximo fijo
// de candidatos. Con 80, una búsqueda cuesta unos 0,0011 dólares (septiembre de 2026).
const MAX_JEV = 80;
const MIN_HITS = 40;
const STOP = new Set(["con", "que", "una", "uno", "unos", "unas", "para", "por", "del", "las", "los", "web", "webs", "sitio", "sitios", "pagina", "paginas", "page", "site", "sites", "the", "and", "with", "muy", "mas", "tipo", "estilo", "style", "like", "como"]);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Las etiquetas entran en los dos idiomas: la consulta puede venir en cualquiera
// de los dos y el prefiltro tiene que encontrarla igual ("videos" y "documentaries").
const both = (pick: (d: typeof en) => Record<string, string>, key: string): string[] =>
  [pick(en)[key] ?? key, pick(es)[key] ?? key];

function haystack(it: InspoItem, tagMap: TagMap): string {
  const t = tagMap[it.web];
  return norm([
    it.empresa, it.comentarios, it.subcomentarios ?? "", it.web,
    it.tipo, ...both((d) => d.labels.tipo, it.tipo),
    t?.resumen ?? "", t?.visual ?? "",
    ...(t ? both((d) => d.taxonomy.sector, t.sector) : []),
    ...(t ? both((d) => d.taxonomy.estilo, t.estilo) : []),
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
  // Pocas coincidencias literales (consulta en otro idioma, o muy abstracta): rellenar con los más recientes
  const seen = new Set(picked.map((i) => i.web));
  for (const it of items) {
    if (picked.length >= MAX_JEV) break;
    if (!seen.has(it.web)) picked.push(it);
  }
  return picked;
}

