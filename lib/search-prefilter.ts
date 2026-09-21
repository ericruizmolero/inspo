// Prefiltro léxico antes de Jev. Solo servidor.
import { activeTags } from "./jev";
import { SECTORES, ESTILOS, TAGS, labelOf } from "./taxonomy";
import type { InspoItem, TagMap } from "@/types/inspo";

// Jev cobra por item puntuado, así que el coste de una búsqueda crecería con la
// biblioteca. Prefiltramos por texto (nombre, notas, resumen, descripción visual y
// etiquetas) y solo mandamos a Jev un máximo fijo de candidatos.
const MAX_JEV = 80;
const MIN_HITS = 40;
const STOP = new Set(["con", "que", "una", "uno", "unos", "unas", "para", "por", "del", "las", "los", "web", "webs", "sitio", "sitios", "pagina", "paginas", "page", "site", "sites", "the", "and", "with", "muy", "mas", "tipo", "estilo", "style", "like", "como"]);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function haystack(it: InspoItem, tagMap: TagMap): string {
  const t = tagMap[it.web];
  return norm([
    it.empresa, it.comentarios, it.subcomentarios ?? "", it.web, it.tipo,
    t?.resumen ?? "", t?.visual ?? "",
    t ? labelOf(SECTORES, t.sector) : "", t ? labelOf(ESTILOS, t.estilo) : "",
    ...(t ? activeTags(t).map((k) => labelOf(TAGS, k)) : []),
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

