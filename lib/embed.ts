// Search by meaning. Server only.
//
// Each item is one vector: its name, site, tags (as everyone sees them), metadata, notes and thread,
// embedded by a multilingual model, so "web tranquila con serif" finds what was tagged in English.
// The vector is made when tagging ends and remade whenever its words change (tags edited, a note, a
// comment): those set it to null and send its job (lib/jobs.ts); the sweep sends again any null left.
// A search embeds the query once (cached) and asks Postgres (pgvector) for the nearest items.
import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { viewOf, FACETS } from "./taxonomy";
import { hostOf } from "./url";
import { recordUsage } from "./usage";
import en from "./i18n/en";
import type { InspoTags, UserTags } from "@/types/inspo";
import { threadLines, type CommentRowLike } from "./comment-context";
import { log } from "./log";

const ENDPOINT = "https://openrouter.ai/api/v1/embeddings";
/** Picked with scripts/embed-bakeoff.ts (October 2026): the closest English/Spanish match of the cheap ones */
export const EMBED_MODEL = process.env.EMBED_MODEL || "baai/bge-m3";
export const EMBED_DIMS = 1024; // the column's size: a model with other dimensions needs a migration
/** Texts per call: one request embeds a whole batch */
const BATCH = 64;
const MAX_CHARS = 2000;

const T = schema.inspoItem, C = schema.inspoComment;

export const embedEnabled = () => !!process.env.OPENROUTER_API_KEY;

interface Embedded { vectors: number[][]; costUsd: number | null; tokens: number; model: string; provider: string | null; id: string | null }

export async function embedTexts(input: string[], model = EMBED_MODEL, signal?: AbortSignal): Promise<Embedded> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": "criterio.design" },
    body: JSON.stringify({ model, input }),
    signal,
  });
  const j = (await res.json().catch(() => null)) as {
    data?: { embedding: number[]; index?: number }[]; usage?: { prompt_tokens?: number; cost?: number };
    model?: string; provider?: string; id?: string; error?: { message?: string };
  } | null;
  if (!res.ok || !j?.data) throw new Error(`embeddings ${res.status}: ${j?.error?.message ?? res.statusText}`);
  const vectors = [...j.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((d) => d.embedding);
  return { vectors, costUsd: typeof j.usage?.cost === "number" ? j.usage.cost : null, tokens: j.usage?.prompt_tokens ?? 0, model: j.model ?? model, provider: j.provider ?? null, id: j.id ?? null };
}

// ─── What an item says ───────────────────────────────────────────────────────

const label = (map: Record<string, string>, k: string) => map[k] ?? k;
const FACET_LABELS = { palette: en.taxonomy.color, sections: en.taxonomy.section, elements: en.taxonomy.element, type: en.taxonomy.type, layout: en.taxonomy.layout } as Record<string, Record<string, string>>;

/** The words that stand for an item, in English labels (the model is multilingual: the query needn't be) */
export function itemText(r: { name: string; web: string; note: string; subNote: string | null; tagsJson: InspoTags | null; tagsUser: UserTags | null }, comments: string[]): string {
  const t = r.tagsJson;
  const v = viewOf(t ?? undefined, r.tagsUser ?? undefined);
  const parts = [
    r.name,
    hostOf(r.web),
    t?.summary,
    v && `${label(en.taxonomy.sector, t!.sector)}, ${label(en.taxonomy.style, t!.style)}`,
    v?.traits.map((k) => label(en.taxonomy.tag, k)).join(", "),
    v && FACETS.map((f) => v[f.field].map((k) => label(FACET_LABELS[f.field], k)).join(", ")).filter(Boolean).join(". "),
    v?.keywords.join(", "),
    v?.credits.length ? `by ${v.credits.join(", ")}` : "",
    t?.meta && [t.meta.kind, t.meta.place, t.meta.keywords?.join(", ")].filter(Boolean).join(". "),
    t?.visual,
    r.note, r.subNote,
    ...comments,
  ];
  return parts.filter((p) => p && String(p).trim()).join("\n").slice(0, MAX_CHARS);
}

// ─── Making the vectors ──────────────────────────────────────────────────────

/** Embeds these items now, in one call per batch. Their usage is billed to their workspaces. */
export async function embedItems(ids: string[]): Promise<number> {
  if (!ids.length || !embedEnabled()) return 0;
  const [rows, thread] = await Promise.all([
    db.select({ id: T.id, organizationId: T.organizationId, name: T.name, web: T.web, note: T.note, subNote: T.subNote, tagsJson: T.tagsJson, tagsUser: T.tagsUser })
      .from(T).where(inArray(T.id, ids)),
    db.select({ id: C.id, itemId: C.itemId, parentId: C.parentId, authorName: C.authorName, body: C.body, createdAt: C.createdAt })
      .from(C).where(inArray(C.itemId, ids)),
  ]);
  // Each item's comments as threads (each with its replies), the same words the prompts read
  const byItem = new Map<string, CommentRowLike[]>();
  for (const c of thread) {
    byItem.set(c.itemId, [...(byItem.get(c.itemId) ?? []), {
      id: c.id, parentId: c.parentId, author: c.authorName, body: c.body, at: c.createdAt,
    }]);
  }
  const said = new Map([...byItem].map(([id, rows]) => [id, threadLines(rows)]));

  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const res = await embedTexts(batch.map((r) => itemText(r, said.get(r.id) ?? [])));
    // One UPDATE for the batch: the pool has 3 connections on Vercel, and 64 single-row updates queue on them
    const values = batch.map((r, k) => sql`(${r.id}, ${`[${res.vectors[k].join(",")}]`}::vector)`);
    await db.execute(sql`
      update ${T} set embedding = v.embedding, embedding_at = now()
      from (values ${sql.join(values, sql`, `)}) as v(id, embedding)
      where ${T.id} = v.id`);
    done += batch.length;
    // One row per workspace in the batch, its share of the call
    const per = new Map<string, number>();
    for (const r of batch) per.set(r.organizationId, (per.get(r.organizationId) ?? 0) + 1);
    for (const [organizationId, n] of per) {
      void recordUsage({ organizationId }, {
        action: "embed", model: res.model, units: n, inputTokens: Math.round((res.tokens * n) / batch.length),
        costUsd: res.costUsd === null ? null : (res.costUsd * n) / batch.length, provider: res.provider, requestId: res.id,
      });
    }
  }
  return done;
}

/** Its words changed (tags, a note, the thread): the vector is cleared, and its job makes it again */
export async function staleEmbedding(itemId: string): Promise<void> {
  await db.update(T).set({ embedding: null }).where(eq(T.id, itemId));
}

// ─── Searching ───────────────────────────────────────────────────────────────

const queryCache = new Map<string, number[]>();
const QUERY_CACHE_MAX = 500;

/** The query's vector, from memory when it was asked before */
export async function queryVector(q: string, organizationId: string, signal?: AbortSignal): Promise<number[]> {
  const key = q.trim().toLowerCase();
  const hit = queryCache.get(key);
  if (hit) { queryCache.delete(key); queryCache.set(key, hit); return hit; }
  const res = await embedTexts([key], EMBED_MODEL, signal);
  void recordUsage({ organizationId }, { action: "embed", model: res.model, units: 1, inputTokens: res.tokens, costUsd: res.costUsd, provider: res.provider, requestId: res.id, ref: q });
  if (queryCache.size >= QUERY_CACHE_MAX) queryCache.delete(queryCache.keys().next().value!);
  queryCache.set(key, res.vectors[0]);
  return res.vectors[0];
}

/** How close each item of the workspace is to the query, 0–1, the nearest `limit`. Items without a vector are left out. */
export async function nearest(organizationId: string, vec: number[], limit = 60): Promise<Record<string, number>> {
  const v = `[${vec.join(",")}]`;
  const query = (q: Pick<typeof db, "select">) => q.select({ web: T.web, sim: sql<number>`1 - (${T.embedding} <=> ${v}::vector)` }).from(T)
    .where(and(eq(T.organizationId, organizationId), sql`${T.embedding} is not null`))
    .orderBy(sql`${T.embedding} <=> ${v}::vector`).limit(limit);
  let rows;
  try {
    // The HNSW index holds every workspace: alone it hands back its nearest 40 of all of them, and the
    // workspace filter comes after, so a small workspace could get few results or none. An iterative scan
    // (pgvector 0.8) keeps reading the index until `limit` rows of this workspace are found.
    rows = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('hnsw.iterative_scan', 'strict_order', true), set_config('hnsw.ef_search', ${String(Math.max(limit, 40))}, true)`);
      return query(tx);
    });
  } catch (e) {
    // A Postgres with an older pgvector: the plain query
    log.warn("embed.no_iterative_scan", { err: e });
    rows = await query(db);
  }
  return Object.fromEntries(rows.map((r) => [r.web, Number(r.sim)]));
}
