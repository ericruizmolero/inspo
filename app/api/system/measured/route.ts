import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { loadProjectMeasures, loadShareView } from "@/lib/share-view";
import { signedFilePath } from "@/lib/file-links";
import { fileUrl } from "@/lib/storage";
import { getLocale } from "@/lib/i18n";

export const maxDuration = 30;

// GET ?projectId= → { measured: { <itemId>: RefMeasured }, clientCopy: string[], links: { <path>: <public path> } }: what
// each reference measured, the client's own words and a public link for every stored file the file cites, for the
// criterio.md the app builds in the browser to read as the server's (lib/share-view.ts). The browser cannot sign.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const projectId = (req.nextUrl.searchParams.get("projectId") ?? "").trim();
  if (!projectId) return Response.json({ error: "projectId" }, { status: 400 });
  const [measures, view] = await Promise.all([
    loadProjectMeasures(ctx.workspace.id, projectId),
    loadShareView(ctx.workspace.id, projectId, "full", await getLocale(), null, ""),
  ]);
  if (!measures || !view) return Response.json({ error: "project" }, { status: 404 });
  const links = Object.fromEntries([...view.keys].map((k) => [fileUrl(k), signedFilePath(k)]));
  return Response.json({ ...measures, links }, { headers: { "Cache-Control": "no-store" } });
}
