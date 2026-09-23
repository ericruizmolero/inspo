import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { loadWorkspaceData } from "@/lib/items";
import { matchQuery, jevEnabled, getCachedSearch, setCachedSearch } from "@/lib/jev";
import { prefilter } from "@/lib/search-prefilter";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";

export const maxDuration = 30;

// POST { q } → { scores: { [web]: 0–1 } } within the active workspace
export async function POST(req: NextRequest) {
  if (!jevEnabled()) return Response.json({ error: "TYPESAFE_API_KEY not configured" }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  const { q } = (await req.json().catch(() => ({}))) as { q?: string };
  const query = (q ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (query.length < 3) return Response.json({ error: (await getErrors()).queryTooShort }, { status: 400 });

  const key = `${ctx.workspace.id}|${query.toLowerCase()}`;
  const hit = getCachedSearch(key);
  if (hit) return Response.json({ scores: hit, cached: true });

  const blocked = await quotaBlock(assertQuota(ctx.workspace, "jev_search"));
  if (blocked) return blocked;

  try {
    const { items, tagMap } = await loadWorkspaceData(ctx.workspace.id);
    const candidates = prefilter(query, items, tagMap);
    const scores = await matchQuery(query, candidates, tagMap, { organizationId: ctx.workspace.id, userId: ctx.user.id });
    setCachedSearch(key, scores);
    return Response.json({ scores, candidates: candidates.length, total: items.length });
  } catch (e) {
    console.error("search error:", e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
