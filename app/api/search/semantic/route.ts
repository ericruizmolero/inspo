import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { embedEnabled, nearest, queryVector } from "@/lib/embed";

export const maxDuration = 15;

// POST { q } → { scores: { [web]: 0–1 } }: the workspace's items nearest in meaning to the query, in any
// language. The middle layer of search (lib/search-query.ts runs in the browser first; Jev reranks after).
// One embedding of the query (cached) and one indexed Postgres query: no quota, a fraction of a cent a month.
export async function POST(req: NextRequest) {
  if (!embedEnabled()) return Response.json({ scores: {} });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const { q } = (await req.json().catch(() => ({}))) as { q?: string };
  const query = (q ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (query.length < 3) return Response.json({ scores: {} });
  try {
    const vec = await queryVector(query, ctx.workspace.id, req.signal);
    return Response.json({ scores: await nearest(ctx.workspace.id, vec) });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error("semantic search:", e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
