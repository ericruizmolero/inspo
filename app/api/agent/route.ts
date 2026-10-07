import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { ask, confirm, type AgentScope } from "@/lib/agent";
import { llmEnabled } from "@/lib/llm";
import { assertQuota, assertSeatsOk, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";

export const maxDuration = 300;

// POST { text, scope } → the agent plans from the request and runs what is safe; deletions come back as `pending`.
// POST { run: Action[] } → the person said yes: the pending actions run as they are.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const body = (await req.json().catch(() => ({}))) as { text?: string; scope?: AgentScope; run?: unknown };
  // Asking the agent is an AI action; running what it already planned (a confirmation, an undo) is not
  const blocked = await quotaBlock(Array.isArray(body.run) ? assertSeatsOk(ctx.workspace) : assertQuota(ctx.workspace, "ai"));
  if (blocked) return blocked;
  const usage = { organizationId: ctx.workspace.id, userId: ctx.user.id };
  // The model writes in the team's language, whatever the person's interface is in
  const language = ctx.workspace.outputLanguage;
  try {
    if (Array.isArray(body.run)) return Response.json(await confirm(ctx, body.run, usage, language));
    const text = String(body.text ?? "").trim();
    if (!text) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });
    const scope = body.scope && typeof body.scope === "object" ? body.scope : {};
    return Response.json(await ask(ctx, { text, scope, usage, language }));
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : String(e);
    console.error("agent error:", msg);
    return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
  }
}
