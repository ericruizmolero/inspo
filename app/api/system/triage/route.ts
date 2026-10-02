import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { triageInbox } from "@/lib/system";
import { llmEnabled } from "@/lib/llm";
import { assertSeatsOk, quotaBlock } from "@/lib/quota";
import { getErrors, getLocale } from "@/lib/i18n";

export const maxDuration = 120;

// POST { itemIds? } → for each unfiled reference (or the ones given), the project and areas it belongs to.
// A proposal only: applying it goes through the applySystemTriage action.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blocked = await quotaBlock(assertSeatsOk(ctx.workspace));
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as { itemIds?: string[] };
  try {
    const proposals = await triageInbox({ organizationId: ctx.workspace.id, itemIds: Array.isArray(body.itemIds) ? body.itemIds.map(String) : undefined, usage: { organizationId: ctx.workspace.id, userId: ctx.user.id }, locale: await getLocale() });
    return Response.json({ proposals });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : String(e);
    console.error("triage error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
