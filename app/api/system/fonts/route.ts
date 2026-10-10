import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { boardVisuals } from "@/lib/system";
import { refFaces, type RefFace } from "@/lib/ref-fonts";
import { mediaKindOf } from "@/lib/url";
import { getErrors } from "@/lib/i18n";
import { log } from "@/lib/log";

export const maxDuration = 30;

// GET ?projectId=&ids=a,b → { faces: { <itemId>: RefFace[] } }: the font files each of those references
// of the project serves, for the type tester to load. No model, no browser: the sites' own CSS.
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const projectId = (req.nextUrl.searchParams.get("projectId") ?? "").trim();
  const ids = new Set((req.nextUrl.searchParams.get("ids") ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 40));
  if (!projectId) return Response.json({ error: "projectId" }, { status: 400 });
  try {
    const refs = (await boardVisuals(ctx.workspace.id, projectId)).filter((v) => (!ids.size || ids.has(v.itemId)) && mediaKindOf(v.web) === "web");
    const faces: Record<string, RefFace[]> = {};
    // A few sites at a time: each one is a page and its stylesheets
    const queue = [...refs];
    await Promise.all(Array.from({ length: 4 }, async () => {
      for (let v = queue.shift(); v; v = queue.shift()) faces[v.itemId] = await refFaces(v.web, v.fonts.map((f) => f.family)).catch(() => []);
    }));
    return Response.json({ faces }, { headers: { "Cache-Control": "private, max-age=600" } });
  } catch (e) {
    if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
    log.error("brand.fonts_failed", { ref: projectId, err: e });
    return Response.json({ error: (await getErrors()).unexpected }, { status: 500 });
  }
}
