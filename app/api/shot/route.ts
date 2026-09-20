import { NextRequest } from "next/server";
import { requireCtx, isResponse } from "@/lib/workspace";
import { findByWeb } from "@/lib/items";
import { getOrCaptureShot } from "@/lib/screenshot";

export const runtime = "nodejs";
export const maxDuration = 60;

const TTL = 60 * 60 * 24 * 30; // 30 days

// Solo capturamos URLs que estén en el workspace del usuario, para que el
// endpoint no sirva de servicio de capturas gratis.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new Response("missing url", { status: 400 });
  try { new URL(url); } catch { return new Response("bad url", { status: 400 }); }

  const ctx = await requireCtx();
  if (isResponse(ctx)) return ctx;
  if (!(await findByWeb(ctx.workspace.id, url))) return new Response("url not in workspace", { status: 403 });

  try {
    const jpeg = await getOrCaptureShot(url);
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": `private, max-age=${TTL}, stale-while-revalidate=${TTL}`,
      },
    });
  } catch (err) {
    console.error("shot error:", url, err instanceof Error ? err.message : err);
    // Un fallo se recuerda un rato para no relanzar Chromium en cada carga, pero no tanto
    // como para que un arreglo en el servidor tarde una hora en verse.
    return new Response("capture failed", { status: 502, headers: { "Cache-Control": "private, max-age=900" } });
  }
}
