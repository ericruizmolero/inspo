import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { llmEnabled } from "@/lib/llm";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { buildResult, hasResult, listResults, suggestedPage } from "@/lib/criterio-result";
import { originOfHeaders } from "@/lib/mcp/auth";
import { log } from "@/lib/log";

export const maxDuration = 120;

// GET ?projectId → the project's results (newest first) and the kind of page to build first.
// POST { projectId, page, auto? } → one page built from criterio.md as it is now (one frontier-model call, 40 to 60 s).
// `auto` is the view building a project's first result on its own: it never counts nor waits on the quota, and only
// holds for a project with no result yet; any other is an ordinary one.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  if (!projectId) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });
  const [results, suggested] = await Promise.all([listResults(ctx.workspace.id, projectId), suggestedPage(ctx.workspace.id, projectId)]);
  return Response.json({ results, suggested });
}

export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const body = (await req.json().catch(() => ({}))) as { projectId?: string; page?: string; auto?: boolean };
  const projectId = String(body.projectId ?? "").trim();
  if (!projectId) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });
  const auto = body.auto === true && !(await hasResult(ctx.workspace.id, projectId));
  if (!auto) {
    const blocked = await quotaBlock(assertQuota(ctx.workspace, "ai"));
    if (blocked) return blocked;
  }
  try {
    const result = await buildResult({
      organizationId: ctx.workspace.id, projectId, page: String(body.page ?? "home"), usage: { organizationId: ctx.workspace.id, userId: ctx.user.id },
      byName: ctx.user.name, auto, locale: ctx.user.language, language: ctx.workspace.outputLanguage, origin: originOfHeaders(req.headers, req.nextUrl.origin),
    });
    return Response.json(result);
  } catch (e) {
    log.error("result.route_failed", { ref: projectId, err: e });
    return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
  }
}
