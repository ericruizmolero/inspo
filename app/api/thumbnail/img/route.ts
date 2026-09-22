import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { ownsThumbnail } from "@/lib/items";
import { blobPrefix } from "@/lib/thumbnails";
import { DESIGN_MD_PREFIX } from "@/lib/design-store";
import { commentPrefix } from "@/lib/comment-files";
import { isBlobUrl, isBlobUrlUnder } from "@/lib/blob-url";

export const runtime = "nodejs";

// Proxy de blobs privados: miniaturas y capturas de comentarios del workspace activo, y las
// portadas de DESIGN.md (capturas de webs públicas, compartidas entre workspaces; el índice ya se filtra por items).
export async function GET(req: NextRequest) {
  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) return new Response("missing url", { status: 400 });

  // El token solo viaja a hosts de Vercel Blob
  if (!isBlobUrl(blobUrl)) return new Response("forbidden", { status: 403 });
  const inLibrary = [blobPrefix(ctx.workspace.id), commentPrefix(ctx.workspace.id), DESIGN_MD_PREFIX]
    .some((prefix) => isBlobUrlUnder(blobUrl, prefix));
  if (!inLibrary && !(await ownsThumbnail(ctx.workspace.id, blobUrl))) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const res = await fetch(blobUrl, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!res.ok) return new Response("blob fetch failed", { status: 502 });
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    console.error("thumbnail img proxy error:", e);
    return new Response("error", { status: 500 });
  }
}
