import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { matchRecursos, jevEnabled, getCachedSearch, setCachedSearch } from "@/lib/jev";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST { q } → { scores: { [url]: 0–1 } } sobre el directorio de recursos (estático, compartido entre workspaces)
export async function POST(req: NextRequest) {
  if (!jevEnabled()) return Response.json({ error: "TYPESAFE_API_KEY no configurada" }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  const { q } = (await req.json().catch(() => ({}))) as { q?: string };
  const query = (q ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (query.length < 3) return Response.json({ error: "Consulta demasiado corta" }, { status: 400 });

  const key = `recursos|${query.toLowerCase()}`;
  const hit = getCachedSearch(key);
  if (hit) return Response.json({ scores: hit, cached: true });

  try {
    const scores = await matchRecursos(query, { organizationId: ctx.workspace.id, userId: ctx.user.id });
    setCachedSearch(key, scores);
    return Response.json({ scores });
  } catch (e) {
    console.error("recursos search error:", e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
