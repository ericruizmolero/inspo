// Explica en una frase por qué cada resultado de la búsqueda IA encaja con la consulta.
// Jev solo devuelve probabilidades; aquí un modelo redacta el "porqué" a partir de los mismos datos
// que vio Jev (notas, resumen, descripción de la captura, tags) y de la puntuación.
import "server-only";
import { InspoItem, InspoTags } from "@/types/inspo";
import { summarize } from "./jev";
import { recordUsage, type UsageCtx } from "./usage";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import { llm, llmEnabled } from "./llm";

const MODEL = process.env.EXPLAIN_MODEL || "anthropic/claude-haiku-4.5";
export const explainEnabled = llmEnabled;

// El prompt va en inglés; lo único que cambia con el idioma es en qué idioma
// se pide la respuesta, porque esa frase se lee en pantalla.
const LANGUAGE: Record<Locale, string> = {
  en: "in English",
  es: "in Spanish (from Spain)",
};

const systemFor = (locale: Locale) => `A designer is searching their library of inspiration sites. You get the query and, for each result, what we know about it (curator notes, a summary of the page, a description of the screenshot, sector, style, traits) and its 0-1 affinity with the query according to a classifier.

For each item write ONE sentence ${LANGUAGE[locale]}, 14 words at most, explaining why it fits the query: concrete and visual, based only on the data given. Do not repeat the item name or the query, do not use quotes or a full stop. If the affinity is low (<0.5), say what only partly fits.

Answer only with lines "item_N: sentence", one per item and in the same order. Nothing else.`;

// Caché en memoria por consulta + conjunto de resultados
const cache = new Map<string, { at: number; reasons: Record<string, string> }>();
const TTL = 10 * 60 * 1000;
const MAX = 200;
export const clearExplainCache = () => cache.clear();

export interface ExplainEntry { item: InspoItem; tags?: InspoTags; score: number }

export async function explainMatches(query: string, entries: ExplainEntry[], scope = "", usage?: UsageCtx, locale: Locale = DEFAULT_LOCALE): Promise<Record<string, string>> {
  if (!entries.length) return {};
  // El idioma entra en la clave: si no, quien busca en inglés se come la frase en castellano
  const key = `${locale}|${scope}|${query.toLowerCase()}|${entries.map((e) => e.item.web).sort().join(",")}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.reasons;

  const payload = {
    consulta: query,
    items: entries.map((e, i) => ({ id: `item_${i}`, afinidad: Math.round(e.score * 100) / 100, ...summarize(e.item, e.tags) })),
  };

  const res = await llm({
    model: MODEL,
    system: systemFor(locale),
    text: JSON.stringify(payload),
    maxTokens: 60 * entries.length + 200,
  });

  void recordUsage(usage, { action: "explain", model: res.model, inputTokens: res.usage.input, outputTokens: res.usage.output, cacheReadTokens: res.usage.cacheRead, costUsd: res.costUsd, ref: query });
  const text = res.text;
  const reasons: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*item_(\d+)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const entry = entries[Number(m[1])];
    if (entry) reasons[entry.item.web] = m[2].replace(/^["“]|["”.]$/g, "");
  }

  if (cache.size >= MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), reasons });
  return reasons;
}
