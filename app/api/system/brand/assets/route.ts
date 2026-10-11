import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
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
  // A download link carries no X-Workspace: the project's workspace, if it is one of the person's
  const [p] = projectId ? await db.select({ ws: schema.project.organizationId }).from(schema.project)
    .where(and(eq(schema.project.id, projectId), inArray(schema.project.organizationId, ctx.workspaces.map((w) => w.id)))).limit(1) : [];
  const view = p ? await loadShareView(p.ws, projectId, "full", await getLocale(), null, await requestOrigin()) : null;
  if (!p || !view) return Response.json({ error: "not found" }, { status: 404 });
  const { file, fileName } = await brandZip(p.ws, await getBrand(p.ws, projectId), view.name, view.markdown);
  return new Response(new Uint8Array(file), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "private, no-store" } });
}
