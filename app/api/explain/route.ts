import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { loadWorkspaceData } from "@/lib/items";
import { explainMatches, explainEnabled } from "@/lib/explain";
import { assertSeatsOk, quotaBlock } from "@/lib/quota";
import { getErrors, getLocale } from "@/lib/i18n";

export const maxDuration = 30;

const MAX_ITEMS = 40;

// POST { q, results: [{ web, score }] } → { reasons: { [web]: sentence } }
export async function POST(req: NextRequest) {
  if (!explainEnabled()) return Response.json({ error: "OPENROUTER_API_KEY not configured" }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  // Downgrading can leave the team with more people than the plan allows: AI stops until they fix it
  const blocked = await quotaBlock(assertSeatsOk(ctx.workspace));
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { q?: string; results?: { web?: string; score?: number }[] };
  const query = (body.q ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (query.length < 3) return Response.json({ error: (await getErrors()).queryTooShort }, { status: 400 });
  const wanted = new Map<string, number>();
  for (const r of body.results ?? []) {
    if (typeof r.web === "string" && wanted.size < MAX_ITEMS) wanted.set(r.web, Number(r.score) || 0);
  }
  if (!wanted.size) return Response.json({ reasons: {} });

  try {
    const { items, tagMap } = await loadWorkspaceData(ctx.workspace.id);
    // Workspace URLs only: the client cannot make us explain arbitrary content
    const entries = items
      .filter((it) => wanted.has(it.web))
      .map((it) => ({ item: it, tags: tagMap[it.web], score: wanted.get(it.web)! }))
      .sort((a, b) => b.score - a.score);
    const reasons = await explainMatches(query, entries, ctx.workspace.id, { organizationId: ctx.workspace.id, userId: ctx.user.id }, await getLocale());
    return Response.json({ reasons });
  } catch (e) {
    console.error("explain error:", e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
