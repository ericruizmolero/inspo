import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { loadWorkspaceData } from "@/lib/items";
import { matchQuery, jevEnabled, getCachedSearch, setCachedSearch } from "@/lib/jev";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";

export const maxDuration = 30;

/** Jev reads this many at most: the nearest ones by meaning, picked by the browser */
const MAX_RERANK = 20;

// POST { q, webs } → { scores: { [web]: 0–1 } }: Jev's careful reading of the few best candidates.
// The last layer of search, for descriptive queries only: the browser already shows results (its own
// match, then the semantic one) and only reorders when this arrives. Two Jev batches, about a second.
export async function POST(req: NextRequest) {
  if (!jevEnabled()) return Response.json({ error: "TYPESAFE_API_KEY not configured" }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  const { q, webs } = (await req.json().catch(() => ({}))) as { q?: string; webs?: string[] };
  const query = (q ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (query.length < 3) return Response.json({ error: (await getErrors()).queryTooShort }, { status: 400 });
  const wanted = new Set((Array.isArray(webs) ? webs : []).slice(0, MAX_RERANK).map(String));
  if (!wanted.size) return Response.json({ scores: {} });

  const key = `${ctx.workspace.id}|${query.toLowerCase()}|${[...wanted].sort().join(",")}`;
  const hit = getCachedSearch(key);
  if (hit) return Response.json({ scores: hit, cached: true });

  const blocked = await quotaBlock(assertQuota(ctx.workspace, "jev_search"));
  if (blocked) return blocked;

  try {
    // Only the candidates: never the whole workspace for 20 rows
    const { items: candidates, tagMap } = await loadWorkspaceData(ctx.workspace.id, [...wanted]);
    const scores = await matchQuery(query, candidates, tagMap, { organizationId: ctx.workspace.id, userId: ctx.user.id });
    setCachedSearch(key, scores);
    return Response.json({ scores });
  } catch (e) {
    console.error("search error:", e);
    return Response.json({ error: e instanceof HttpError ? e.message : (await getErrors()).unexpected }, { status: e instanceof HttpError ? e.status : 500 });
  }
}
