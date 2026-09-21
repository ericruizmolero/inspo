import { NextRequest } from "next/server";
import { showcaseEntries, SHOWCASE_MAX } from "@/lib/showcase";
import { getStoredShot } from "@/lib/screenshot";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" };

// Imágenes del escaparate del login, por índice. Es pública, pero solo sirve las de esa
// lista (no acepta URLs), así que no puede usarse para leer otros blobs.
export async function GET(req: NextRequest) {
  const i = Number(req.nextUrl.searchParams.get("i"));
  if (!Number.isInteger(i) || i < 0 || i >= SHOWCASE_MAX) return new Response("bad index", { status: 400 });
  const entry = (await showcaseEntries())[i];
  if (!entry) return new Response(null, { status: 404 });
  try {
    if (entry.kind === "shot") {
      const jpeg = await getStoredShot(entry.web);
      if (!jpeg) return new Response(null, { status: 404 });
      return new Response(new Uint8Array(jpeg), { headers: { ...HEADERS, "Content-Type": "image/jpeg" } });
    }
    const res = await fetch(entry.url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (!res.ok) return new Response("blob fetch failed", { status: 502 });
    return new Response(await res.arrayBuffer(), { headers: { ...HEADERS, "Content-Type": res.headers.get("content-type") || "image/jpeg" } });
  } catch (e) {
    console.error("showcase error:", e);
    return new Response("error", { status: 500 });
  }
}
