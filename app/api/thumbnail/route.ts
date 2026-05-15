import { NextRequest } from "next/server";
import {
  getThumbnailMap,
  uploadThumbnail,
  setThumbnailInMap,
  removeThumbnailFromMap,
} from "@/lib/thumbnails";

export const runtime = "nodejs";

// GET → devuelve el mapa completo
export async function GET() {
  try {
    const map = await getThumbnailMap();
    return Response.json(map);
  } catch {
    return Response.json({});
  }
}

// POST → sube imagen y actualiza el mapa
export async function POST(req: NextRequest) {
  try {
    const pin = process.env.UPLOAD_PIN;
    if (pin && req.headers.get("x-upload-pin") !== pin) {
      return Response.json({ error: "PIN incorrecto" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const webUrl = formData.get("webUrl") as string | null;

    if (!file || !webUrl) {
      return Response.json({ error: "Faltan file o webUrl" }, { status: 400 });
    }

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const url = await uploadThumbnail(safeFilename, file);
    await setThumbnailInMap(webUrl, url);

    return Response.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error("Error subiendo thumbnail:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

// DELETE → elimina entrada del mapa
export async function DELETE(req: NextRequest) {
  try {
    const pin = process.env.UPLOAD_PIN;
    if (pin && req.headers.get("x-upload-pin") !== pin) {
      return Response.json({ error: "PIN incorrecto" }, { status: 401 });
    }
    const webUrl = req.nextUrl.searchParams.get("webUrl");
    if (!webUrl) return Response.json({ error: "Falta webUrl" }, { status: 400 });
    await removeThumbnailFromMap(webUrl);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
