// Guardar una web desde la extensión. La extensión manda solo la dirección, el título de la
// pestaña y una captura de lo que se ve; el resto (nombre, colección, etiquetas) lo decide el
// servidor, igual que cuando se pega una URL en la app.
import { NextRequest, after } from "next/server";
import { requireExtCtx } from "@/lib/ext-keys";
import { addItem, findByWeb, rowToItem, setThumbnail, setTags } from "@/lib/items";
import { uploadThumbnail } from "@/lib/thumbnails";
import { fetchSiteText } from "@/lib/extract";
import { normalizeWebUrl, guessEmpresa, tipoFromUrl } from "@/lib/url";
import { classifyItem, jevEnabled } from "@/lib/jev";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";

export const maxDuration = 60; // el etiquetado corre en after(), tras responder

const NAME_TIMEOUT_MS = 5000;
const MAX_SHOT_BYTES = 3 * 1024 * 1024;

/** data:image/jpeg;base64,… → File, o null si no es una imagen razonable */
function fileFromDataUrl(dataUrl: string | undefined): File | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (buf.byteLength === 0 || buf.byteLength > MAX_SHOT_BYTES) return null;
  const ext = m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg";
  return new File([buf], `extension.${ext}`, { type: m[1] });
}

// POST { url, title?, screenshot? } → { ok, item, existed }
export async function POST(req: NextRequest) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const body = (await req.json().catch(() => ({}))) as { url?: string; title?: string; screenshot?: string };
  const web = normalizeWebUrl(body.url ?? "");
  if (!web) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });

  const existing = await findByWeb(ctx.workspace.id, web);
  if (existing) return Response.json({ ok: true, existed: true, item: rowToItem(existing) });

  // Nombre: og:site_name o <title> de la web con tope de tiempo; si no llega, el título de la pestaña
  const site = await Promise.race([
    fetchSiteText(web).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), NAME_TIMEOUT_MS)),
  ]);
  const empresa = guessEmpresa(web, site ?? (body.title ? { title: body.title } : null));

  try {
    const item = await addItem(ctx.workspace.id, {
      empresa, web, tipo: tipoFromUrl(web),
      autor: ctx.user.name || ctx.user.email, createdBy: ctx.user.id,
    });

    // La captura de la pestaña hace de miniatura desde el primer segundo
    const shot = fileFromDataUrl(body.screenshot);
    if (shot) {
      try {
        const url = await uploadThumbnail(ctx.workspace.id, shot.name, shot);
        await setThumbnail(ctx.workspace.id, web, url);
      } catch (e) { console.error("ext: miniatura no guardada", e instanceof Error ? e.message : e); }
    }

    // Etiquetas con IA después de responder, como hace la app al pegar una URL
    if (jevEnabled()) {
      after(async () => {
        try {
          const tags = await classifyItem(item, { organizationId: ctx.workspace.id, userId: ctx.user.id });
          await setTags(ctx.workspace.id, web, tags);
        } catch (e) { console.error("ext: etiquetado fallido", web, e instanceof Error ? e.message : e); }
      });
    }

    return Response.json({ ok: true, existed: false, item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // El estado viene del error, no de lo que diga el mensaje: el texto está traducido
    return Response.json({ error: msg }, { status: err instanceof HttpError ? err.status : 500 });
  }
}
