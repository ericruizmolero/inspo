import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { proposeOptions } from "@/lib/system";
import { llmEnabled } from "@/lib/llm";
import { assertSeatsOk, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";

export const maxDuration = 60;

// POST { projectId, area } → the 2-3 directions the board allows for that area (one model call).
// Nothing is written: picking one goes through the decideSystemArea action.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blocked = await quotaBlock(assertSeatsOk(ctx.workspace));
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { projectId?: string; area?: string; itemIds?: string[] };
  const projectId = String(body.projectId ?? "").trim();
  const area = String(body.area ?? "").trim();
  if (!projectId || !area) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });

  try {
    const onlyItemIds = Array.isArray(body.itemIds) ? body.itemIds.map(String).slice(0, 60) : undefined;
    const options = await proposeOptions({ organizationId: ctx.workspace.id, projectId, area, usage: { organizationId: ctx.workspace.id, userId: ctx.user.id }, language: ctx.workspace.outputLanguage, onlyItemIds });
    return Response.json({ options });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : String(e);
    console.error("system options error:", projectId, area, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
