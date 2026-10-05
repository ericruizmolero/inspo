import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { getBrand } from "@/lib/brand-store";
import { siteFacesOf } from "@/lib/brand-fonts";

export const maxDuration = 30;

// GET ?projectId= → { faces: { <faceId>: { weight, style, src }[] } }: the files of the brand's faces that come from
// a site, for the presentation to set its specimens in them. The files themselves travel through /api/system/font.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const projectId = (req.nextUrl.searchParams.get("projectId") ?? "").trim();
  if (!projectId) return Response.json({ error: "projectId" }, { status: 400 });
  const brand = await getBrand(ctx.workspace.id, projectId);
  return Response.json({ faces: await siteFacesOf(brand) }, { headers: { "Cache-Control": "private, max-age=600" } });
}
