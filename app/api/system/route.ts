import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { runSystem } from "@/lib/system";
import { llmEnabled } from "@/lib/llm";
import { assertSeatsOk, quotaBlock } from "@/lib/quota";
import { getErrors } from "@/lib/i18n";
import { IMPROVE_AIMS, IMPROVE_NOTE_MAX, SYSTEM_AREAS, type SystemFocus } from "@/types/system";

export const maxDuration = 90;

// POST { projectId, focus? } → the project's system after a fresh read of its board (one model call).
// Always costs (a fraction of a cent): the client asks when the run is stale or on request.
// `focus` is the scope of a pass asked for by hand ("Improve with AI"): what to work on, in which areas, a note.
export async function POST(req: NextRequest) {
  if (!llmEnabled()) return Response.json({ error: (await getErrors()).noModelKey }, { status: 503 });
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;

  const blocked = await quotaBlock(assertSeatsOk(ctx.workspace));
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as { projectId?: string; focus?: unknown };
  const projectId = String(body.projectId ?? "").trim();
  if (!projectId) return Response.json({ error: (await getErrors()).badBody }, { status: 400 });

  try {
    const system = await runSystem({ organizationId: ctx.workspace.id, projectId, usage: { organizationId: ctx.workspace.id, userId: ctx.user.id }, language: ctx.workspace.outputLanguage, focus: focusOf(body.focus) });
    return Response.json(system);
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    const msg = e instanceof Error ? e.message : String(e);
    console.error("system error:", projectId, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

/** Only what the dialog can send: known aims, known areas, a short note. Anything else is the plain pass */
function focusOf(raw: unknown): SystemFocus | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const f = raw as { aims?: unknown; areas?: unknown; note?: unknown };
  const aims = IMPROVE_AIMS.filter((a) => Array.isArray(f.aims) && f.aims.includes(a));
  const areas = SYSTEM_AREAS.filter((a) => Array.isArray(f.areas) && f.areas.includes(a));
  const note = typeof f.note === "string" ? f.note.trim().slice(0, IMPROVE_NOTE_MAX) : "";
  if (!areas.length || (!aims.length && !note)) return undefined;
  return { aims: [...aims], areas: [...areas], note };
}
