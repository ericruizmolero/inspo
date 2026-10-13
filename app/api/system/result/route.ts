import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { llmEnabled } from "@/lib/llm";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { buildResult, hasResult, listResults, boardPieces } from "@/lib/criterio-result";
import { originOfHeaders } from "@/lib/mcp/auth";
import { log } from "@/lib/log";

export const maxDuration = 300;

// GET ?projectId → the project's results (newest first) and what the board references, most first (the first is built first).
// POST { projectId, page, auto? } (page: a kind of page, "storyboard", or "ask:" and the team's words) → one page built from criterio.md as it is now (one frontier-model call, 40 to 60 s),
// streamed as lines: { t: "read" | "write", text, refs? } while it is built, then { t: "done", result } or { t: "error", error }.
// `auto` is the view building a project's first result on its own: it never counts nor waits on the quota, and only
// holds for a project with no result yet; any other is an ordinary one.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  if (!projectId) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });
  const [results, offered] = await Promise.all([listResults(ctx.workspace.id, projectId), boardPieces(ctx.workspace.id, projectId)]);
  return Response.json({ results, offered });
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
  // The answer is a stream of lines (NDJSON): each thing read and written as it happens, then the result or the error
  const origin = originOfHeaders(req.headers, req.nextUrl.origin);
  const errors = await getErrors();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(o)}\n`));
      try {
        const result = await buildResult({
          organizationId: ctx.workspace.id, projectId, page: String(body.page ?? "home"), usage: { organizationId: ctx.workspace.id, userId: ctx.user.id },
          byName: ctx.user.name, auto, locale: ctx.user.language, language: ctx.workspace.outputLanguage, origin,
          onEvent: (e) => send({ t: e.kind, text: e.text, refs: e.refs }),
        });
        send({ t: "done", result });
      } catch (e) {
        log.error("result.route_failed", { ref: projectId, err: e });
        send({ t: "error", error: errors.unexpected });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
