import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { sharpenRules } from "@/lib/system/rules";
import { llmEnabled } from "@/lib/llm";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { log } from "@/lib/log";

export const maxDuration = 60;

// POST { projectId, area } → the area's never list written as rules with an id, a reason and a right and a wrong
// example (one model call). Nothing is written: the client posts the lines as a proposal and the team takes them.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blocked = await quotaBlock(assertQuota(ctx.workspace, "ai"));
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { projectId?: string; area?: string };
  const projectId = String(body.projectId ?? "").trim();
  const area = String(body.area ?? "").trim();
  if (!projectId || !area) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });

  try {
    const out = await sharpenRules({ organizationId: ctx.workspace.id, projectId, area, usage: { organizationId: ctx.workspace.id, userId: ctx.user.id }, language: ctx.workspace.outputLanguage });
    return Response.json(out);
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    log.error("system.rules_failed", { ref: projectId, area, err: e });
    return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
  }
}
