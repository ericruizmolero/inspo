import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { runPolish } from "@/lib/polish";
import { llmEnabled } from "@/lib/llm";
import { assertSeatsOk, quotaBlock } from "@/lib/quota";
import { getErrors, getLocale } from "@/lib/i18n";

export const maxDuration = 90;

// POST { projectId } → the project's polish state with a fresh run of the games (two model calls).
// Always costs: the client asks when there is no run, the brief changed or the board grew.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  // Downgrading can leave the team with more people than the plan allows: AI stops until they fix it
  const blocked = await quotaBlock(assertSeatsOk(ctx.workspace));
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { projectId?: string };
  const projectId = String(body.projectId ?? "").trim();
  if (!projectId) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });

  try {
    const state = await runPolish({ organizationId: ctx.workspace.id, projectId, usage: { organizationId: ctx.workspace.id, userId: ctx.user.id }, locale: await getLocale() });
    return Response.json(state);
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : String(e);
    console.error("polish error:", projectId, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
