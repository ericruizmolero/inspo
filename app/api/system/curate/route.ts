import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { curateArea } from "@/lib/system";
import { llmEnabled } from "@/lib/llm";
import { assertQuota, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { log } from "@/lib/log";

export const maxDuration = 60;

// POST { projectId, area, keep? } → the agent curates the area's table (keeps, discards, drafts the decision
// and the criterio) and writes it as the area's proposal. `keep` fixes verdicts the team already settled.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blocked = await quotaBlock(assertQuota(ctx.workspace, "ai"));
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as { projectId?: string; area?: string; keep?: Record<string, boolean> };
  const projectId = String(body.projectId ?? "").trim(); const area = String(body.area ?? "").trim();
  if (!projectId || !area) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });
  try {
    const keep = body.keep && typeof body.keep === "object" ? Object.fromEntries(Object.entries(body.keep).map(([k, v]) => [String(k), !!v])) : undefined;
    const system = await curateArea({ organizationId: ctx.workspace.id, projectId, area, keep, usage: { organizationId: ctx.workspace.id, userId: ctx.user.id }, language: ctx.workspace.outputLanguage });
    return Response.json(system);
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    log.error("system.curate_failed", { ref: projectId, area, err: e });
    return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
  }
}
