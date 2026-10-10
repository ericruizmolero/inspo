// Save a site from the extension. The extension sends only the address, the tab title
// and a screenshot of what is visible; the rest (name, collection, tags) is decided by the
// server, same as when a URL is pasted in the app.
import { NextRequest } from "next/server";
import { requireExtCtx } from "@/lib/ext-keys";
import { setThumbnail } from "@/lib/items";
import { addReference, cleanAreas } from "@/lib/add";
import { uploadThumbnail } from "@/lib/thumbnails";
import { normalizeWebUrl } from "@/lib/url";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import { log, recordFailure } from "@/lib/log";

export const maxDuration = 300; // importing a post (copying its video) runs in after(), once the response is sent

const MAX_SHOT_BYTES = 3 * 1024 * 1024;

/** data:image/jpeg;base64,… → File, or null if it is not a reasonable image */
function fileFromDataUrl(dataUrl: string | undefined): File | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (buf.byteLength === 0 || buf.byteLength > MAX_SHOT_BYTES) return null;
  const ext = m[1] === "image/png" ? "png" : m[1] === "image/webp" ? "webp" : "jpg";
  return new File([buf], `extension.${ext}`, { type: m[1] });
}

// POST { url, title?, screenshot?, note?, projectId?, areas? } → { ok, item, existed }
export async function POST(req: NextRequest) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const body = (await req.json().catch(() => ({}))) as { url?: string; title?: string; screenshot?: string; note?: string; projectId?: string; areas?: string[] };
  const web = normalizeWebUrl(body.url ?? "");
  if (!web) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });

  try {
    // Named by its page (nameFor), the tab title standing in. Filed on the board picked in the popup, under the
    // areas ticked there, or where this person was working; a post on X is imported and the AI tags once answered
    const { item, existed } = await addReference(ctx.workspace.id, { kind: "url", web, title: body.title }, ctx.user, {
      note: typeof body.note === "string" ? body.note.slice(0, 500) : "",
      file: { projectId: typeof body.projectId === "string" ? body.projectId : null, fallback: "active", areas: cleanAreas(body.areas), onError: "log" },
      finish: { post: true, tag: "after" },
    });
    if (existed) return Response.json({ ok: true, existed: true, item });

    // The tab screenshot serves as the thumbnail from the first second
    const shot = fileFromDataUrl(body.screenshot);
    if (shot) {
      try {
        const url = await uploadThumbnail(ctx.workspace.id, shot.name, shot);
        await setThumbnail(ctx.workspace.id, web, url);
      } catch (err) { log.warn("ext.thumbnail_not_saved", { ref: web, err }); }
    }

    return Response.json({ ok: true, existed: false, item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!(err instanceof HttpError)) void recordFailure("action", "save from the extension", err);
    // The status comes from the error, not from the message: the text is translated
    return Response.json({ error: err instanceof HttpError ? msg : (await getErrors()).unexpected }, { status: err instanceof HttpError ? err.status : 500 });
  }
}
