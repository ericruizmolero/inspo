import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { editFile } from "@/lib/system/edit";
import { originOfHeaders } from "@/lib/mcp/auth";
import { llmEnabled } from "@/lib/llm";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { log } from "@/lib/log";

export const maxDuration = 60;

// POST { projectId, instruction } → { edits: [{ area, decision, why, never, reason }] }: the areas of criterio.md the change
// asked for in words touches, each written again with it and Tino's sentence saying what changes (one model call; none
// when the file needs no change for it). Nothing is written: the client posts each as Tino's proposal under its area
// and the team takes it or leaves it.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blocked = await quotaBlock(assertQuota(ctx.workspace, "ai"));
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { projectId?: string; instruction?: string };
  const projectId = String(body.projectId ?? "").trim();
  const instruction = String(body.instruction ?? "");
  if (!projectId || !instruction.trim()) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });

  try {
    const edits = await editFile({
      organizationId: ctx.workspace.id, projectId, instruction, usage: { organizationId: ctx.workspace.id, userId: ctx.user.id }, language: ctx.workspace.outputLanguage,
      locale: ctx.user.language, origin: originOfHeaders(req.headers, req.nextUrl.origin),
    });
    return Response.json({ edits });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    log.error("system.edit_failed", { ref: projectId, err: e });
    return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
  }
}
