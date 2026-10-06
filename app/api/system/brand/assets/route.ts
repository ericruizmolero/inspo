import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { getBrand } from "@/lib/brand-store";
import { brandZip } from "@/lib/brand-zip";
import { loadShareView } from "@/lib/share-view";
import { getLocale } from "@/lib/i18n";
import { requestOrigin } from "@/lib/share-origin";

export const maxDuration = 60;

// GET ?projectId= → the brand's zip, with the whole criterio.md (the team's own copy)
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const projectId = (req.nextUrl.searchParams.get("projectId") ?? "").trim();
  const view = projectId ? await loadShareView(ctx.workspace.id, projectId, "full", await getLocale(), null, await requestOrigin()) : null;
  if (!view) return Response.json({ error: "not found" }, { status: 404 });
  const { file, fileName } = await brandZip(ctx.workspace.id, await getBrand(ctx.workspace.id, projectId), view.name, view.markdown);
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "private, no-store" } });
}
