import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { proposeOptions } from "@/lib/system";
import { llmEnabled } from "@/lib/llm";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { log } from "@/lib/log";

export const maxDuration = 60;

// POST { projectId, area } → the 2-3 directions the board allows for that area (one model call).
// Nothing is written: picking one goes through the decideSystemArea action.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blocked = await quotaBlock(assertQuota(ctx.workspace, "ai"));
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
    log.error("system.options_failed", { ref: projectId, area, err: e });
    return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
  }
}
