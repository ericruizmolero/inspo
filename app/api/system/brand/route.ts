import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { runBrand } from "@/lib/brand";
import { llmEnabled } from "@/lib/llm";
import { assertSeatsOk, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { BRAND_SECTIONS, type BrandSection } from "@/types/brand";

export const maxDuration = 90;

// POST { projectId, force? } → the project's system with its brand values read again from the decisions (one model
// call). The client calls it right after a system run. `force` names sections the team asked to have redone even
// though they set them by hand.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blocked = await quotaBlock(assertSeatsOk(ctx.workspace));
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as { projectId?: string; force?: unknown };
  const projectId = String(body.projectId ?? "").trim();
  if (!projectId) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });
  const force = Array.isArray(body.force) ? BRAND_SECTIONS.filter((k): k is BrandSection => (body.force as unknown[]).includes(k)) : undefined;
  try {
    const system = await runBrand({ organizationId: ctx.workspace.id, projectId, usage: { organizationId: ctx.workspace.id, userId: ctx.user.id }, language: ctx.workspace.outputLanguage, force });
    return Response.json(system);
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : String(e);
    console.error("brand error:", projectId, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
