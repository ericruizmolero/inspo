import { NextRequest } from "next/server";
import { showcaseCovers, SHOWCASE_MAX } from "@/lib/showcase";

export const runtime = "nodejs";

// Portadas del escaparate del login, por índice. Es pública, pero solo sirve las imágenes
// de esa lista (no acepta URLs), así que no puede usarse para leer otros blobs.
export async function GET(req: NextRequest) {
  const i = Number(req.nextUrl.searchParams.get("i"));
  if (!Number.isInteger(i) || i < 0 || i >= SHOWCASE_MAX) return new Response("bad index", { status: 400 });
  const covers = await showcaseCovers();
  const url = covers[i];
  if (!url) return new Response(null, { status: 404 });
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!res.ok) return new Response("blob fetch failed", { status: 502 });
    return new Response(await res.arrayBuffer(), {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("showcase error:", e);
    return new Response("error", { status: 500 });
  }
}
