import { NextRequest } from "next/server";
import { setThumbnailInMap } from "@/lib/thumbnails";

export const runtime = "nodejs";

// POST { webUrl, blobUrl } → updates the map without uploading a new file
export async function POST(req: NextRequest) {
  try {
    const pin = process.env.UPLOAD_PIN;
    if (pin && req.headers.get("x-upload-pin") !== pin) {
      return Response.json({ error: "PIN incorrecto" }, { status: 401 });
    }

    const { webUrl, blobUrl } = await req.json() as { webUrl?: string; blobUrl?: string };
    if (!webUrl || !blobUrl) {
      return Response.json({ error: "Faltan webUrl o blobUrl" }, { status: 400 });
    }

    await setThumbnailInMap(webUrl, blobUrl);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
