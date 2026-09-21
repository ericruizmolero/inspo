// Explica en una frase por qué cada resultado de la búsqueda IA encaja con la consulta.
// Jev solo devuelve probabilidades; aquí Claude redacta el "porqué" a partir de los mismos datos
// que vio Jev (notas, resumen, descripción de la captura, tags) y de la puntuación.
import Anthropic from "@anthropic-ai/sdk";
import { InspoItem, InspoTags } from "@/types/inspo";
import { summarize } from "./jev";
import { recordUsage, type UsageCtx } from "./usage";

const MODEL = process.env.EXPLAIN_MODEL || "claude-haiku-4-5-20251001";
export const explainEnabled = () => !!process.env.ANTHROPIC_API_KEY;

const SYSTEM = `Un diseñador busca en su librería de webs de inspiración. Recibes la consulta y, por cada resultado, lo que sabemos de él (notas del curador, resumen de la página, descripción de la captura, sector, estilo, rasgos) y su afinidad 0-1 con la consulta según un clasificador.

Para cada item escribe en español UNA frase de máximo 14 palabras que explique por qué encaja con la consulta: concreta y visual, basada solo en los datos dados. No repitas el nombre del item ni la consulta, no uses comillas ni punto final. Si la afinidad es baja (<0.5), di qué encaja solo en parte.

Responde únicamente con líneas "item_N: frase", una por item y en el mismo orden. Nada más.`;

let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic());

// Caché en memoria por consulta + conjunto de resultados
const cache = new Map<string, { at: number; reasons: Record<string, string> }>();
const TTL = 10 * 60 * 1000;
const MAX = 200;
export const clearExplainCache = () => cache.clear();

export interface ExplainEntry { item: InspoItem; tags?: InspoTags; score: number }

export async function explainMatches(query: string, entries: ExplainEntry[], scope = "", usage?: UsageCtx): Promise<Record<string, string>> {
  if (!entries.length) return {};
  const key = `${scope}|${query.toLowerCase()}|${entries.map((e) => e.item.web).sort().join(",")}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.reasons;

  const payload = {
    consulta: query,
    items: entries.map((e, i) => ({ id: `item_${i}`, afinidad: Math.round(e.score * 100) / 100, ...summarize(e.item, e.tags) })),
  };

  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 60 * entries.length + 200,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });

  void recordUsage(usage, { action: "explain", model: msg.model, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens, cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0, ref: query });
  const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
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
