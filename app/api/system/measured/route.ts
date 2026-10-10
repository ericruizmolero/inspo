import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { loadProjectMeasures } from "@/lib/share-view";

export const maxDuration = 30;

// GET ?projectId= → { measured: { <itemId>: RefMeasured }, clientCopy: string[] }: what each reference measured and the
// client's own words, for the criterio.md the app builds in the browser to read as the server's (lib/share-view.ts).
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const projectId = (req.nextUrl.searchParams.get("projectId") ?? "").trim();
  if (!projectId) return Response.json({ error: "projectId" }, { status: 400 });
  const measures = await loadProjectMeasures(ctx.workspace.id, projectId);
  if (!measures) return Response.json({ error: "project" }, { status: 404 });
  return Response.json(measures, { headers: { "Cache-Control": "private, max-age=60" } });
}
