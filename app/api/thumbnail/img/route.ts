import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const blobUrl = req.nextUrl.searchParams.get("url");
  if (!blobUrl) return new Response("missing url", { status: 400 });

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return new Response("no token", { status: 500 });

  try {
    const res = await fetch(blobUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return new Response("blob fetch failed", { status: 502 });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("error", { status: 500 });
  }
}
