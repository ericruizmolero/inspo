import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { startAreaAsk, startAreaRefs } from "@/lib/system";
import { llmEnabled } from "@/lib/llm";
import { assertSeatsOk, quotaBlock } from "@/lib/quota";
import { getErrors, getLocale } from "@/lib/i18n";

export const maxDuration = 60;

// POST { projectId, area, part } → how to start an empty area, in two parts the client asks for side by side:
// "refs" (what on the board and in the library speaks of the area: no model, it answers at once) and "ask"
// (the question that gets it going, with its answers: one short model call).
// Nothing is written: adding a reference and picking an answer go through the system actions.
export async function POST(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blocked = await quotaBlock(assertSeatsOk(ctx.workspace));
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { projectId?: string; area?: string; part?: string };
  const projectId = String(body.projectId ?? "").trim();
  const area = String(body.area ?? "").trim();
  if (!projectId || !area) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });

  try {
    const input = { organizationId: ctx.workspace.id, projectId, area, usage: { organizationId: ctx.workspace.id, userId: ctx.user.id }, locale: await getLocale() };
    // The references need no model; the question does
    if (body.part !== "ask") return Response.json(await startAreaRefs(input));
    if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
    return Response.json(await startAreaAsk(input));
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : String(e);
    console.error("system start error:", projectId, area, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
