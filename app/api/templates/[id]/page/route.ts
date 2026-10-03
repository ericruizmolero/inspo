import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { templatePage } from "@/lib/templates";

export const maxDuration = 90; // the first time: Chromium cold start, the page loaded and scrolled, the copies cut

// GET → the template's published result as a page: { topUrl, shotUrl, shotH, color } or null when it has none.
// Captured the first time it is asked for, then read from the page index.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireCtx();
  if (isResponse(session)) return session;
  const { id } = await ctx.params;
  try {
    return Response.json(await templatePage(session.workspace.id, id), { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (e) {
    if (e instanceof HttpError) return new Response(e.message, { status: e.status });
    console.error("template page:", id, e instanceof Error ? e.message : e);
    return Response.json(null, { status: 502 });
  }
}
