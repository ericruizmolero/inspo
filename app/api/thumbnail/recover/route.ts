import { list, put } from "@vercel/blob";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// GET → diagnostic: lists all blobs and tries to read any existing map
export async function GET() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // 1. List all inspo blobs
    const { blobs: allBlobs } = await list({ prefix: "inspo/" });
    const mapBlobs  = allBlobs.filter((b) => b.pathname.includes("thumbnail-map"));
    const thumbBlobs = allBlobs.filter((b) => b.pathname.includes("inspo/thumbs/"));

    // 2. Try to read every map blob we find
    const mapReadResults: { url: string; ok: boolean; keys?: string[]; error?: string }[] = [];

    for (const blob of mapBlobs) {
      // Try with bearer token
      let result: { url: string; ok: boolean; keys?: string[]; error?: string } = { url: blob.url, ok: false };
      try {
        const res = await fetch(blob.url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          result = { url: blob.url, ok: true, keys: Object.keys(data) };
        } else {
          result = { url: blob.url, ok: false, error: `status ${res.status}` };
        }
      } catch (e) {
        result = { url: blob.url, ok: false, error: String(e) };
      }
      mapReadResults.push(result);
    }

    return Response.json({
      totalBlobs: allBlobs.length,
      mapBlobs: mapReadResults,
      thumbCount: thumbBlobs.length,
      thumbUrls: thumbBlobs.map((b) => ({ url: b.url, pathname: b.pathname, uploadedAt: b.uploadedAt })),
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// POST → rebuild map from existing data
// Body: { map: Record<string, string> } — the recovered mapping of webUrl → blobUrl
export async function POST(req: NextRequest) {
  try {
    const pin = process.env.UPLOAD_PIN;
    if (pin && req.headers.get("x-upload-pin") !== pin) {
      return Response.json({ error: "PIN incorrecto" }, { status: 401 });
    }

    const { map } = await req.json() as { map: Record<string, string> };
    if (!map || typeof map !== "object") {
      return Response.json({ error: "map inválido" }, { status: 400 });
    }

    // Save new map (timestamped — safe even if old ones remain)
    const result = await put(
      `inspo/thumbnail-map-${Date.now()}.json`,
      Buffer.from(JSON.stringify(map)),
      { access: "private", contentType: "application/json" }
    );

    return Response.json({ ok: true, blobUrl: result.url, keys: Object.keys(map) });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
