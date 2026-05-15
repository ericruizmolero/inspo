import { NextRequest } from "next/server";
import { getDownloadUrl } from "@vercel/blob";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) return new Response("missing url", { status: 400 });

  try {
    const signedUrl = await getDownloadUrl(blobUrl);
    const res = await fetch(signedUrl);
    if (!res.ok) return new Response("blob fetch failed", { status: 502 });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("thumbnail img proxy error:", e);
    return new Response("error", { status: 500 });
  }
}
