import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { loadWorkspaceData } from "@/lib/items";
import { matchQuery, jevEnabled, getCachedSearch, setCachedSearch } from "@/lib/jev";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST { q } → { scores: { [web]: 0–1 } } dentro del workspace activo
export async function POST(req: NextRequest) {
  if (!jevEnabled()) return Response.json({ error: "TYPESAFE_API_KEY no configurada" }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  const { q } = (await req.json().catch(() => ({}))) as { q?: string };
  const query = (q ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (query.length < 3) return Response.json({ error: "Consulta demasiado corta" }, { status: 400 });

  const key = `${ctx.workspace.id}|${query.toLowerCase()}`;
  const hit = getCachedSearch(key);
  if (hit) return Response.json({ scores: hit, cached: true });

  try {
    const { items, tagMap } = await loadWorkspaceData(ctx.workspace.id);
    const scores = await matchQuery(query, items, tagMap);
    setCachedSearch(key, scores);
    return Response.json({ scores });
  } catch (e) {
    console.error("search error:", e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
