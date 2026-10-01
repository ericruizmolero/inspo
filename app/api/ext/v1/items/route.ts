// Save a site from the extension. The extension sends only the address, the tab title
// and a screenshot of what is visible; the rest (name, collection, tags) is decided by the
// server, same as when a URL is pasted in the app.
import { NextRequest, after } from "next/server";
import { requireExtCtx } from "@/lib/ext-keys";
import { addItem, findByWeb, rowToItem, setThumbnail } from "@/lib/items";
import { uploadThumbnail } from "@/lib/thumbnails";
import { nameFor } from "@/lib/item-name";
import { ensurePost, postThumb } from "@/lib/posts";
import { normalizeWebUrl, typeFromUrl, mediaKindOf } from "@/lib/url";
import { taggerEnabled } from "@/lib/tagger";
import { startTagJob } from "@/lib/tag-jobs";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";

export const maxDuration = 300; // tagging (with a whole-page capture) and importing a post (copying its video) run in after(), once the response is sent

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

// POST { url, title?, screenshot?, note? } → { ok, item, existed }
export async function POST(req: NextRequest) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const body = (await req.json().catch(() => ({}))) as { url?: string; title?: string; screenshot?: string; note?: string };
  const web = normalizeWebUrl(body.url ?? "");
  if (!web) return Response.json({ error: (await getErrors()).badUrl }, { status: 400 });

  const existing = await findByWeb(ctx.workspace.id, web);
  if (existing) return Response.json({ ok: true, existed: true, item: rowToItem(existing) });

  // Name: a post's author and words, a video's title, the site's og:site_name or <title> with a time limit; if missing, the tab title
  const name = await nameFor(web, body.title);

  try {
    const item = await addItem(ctx.workspace.id, {
      name, web, type: typeFromUrl(web), note: typeof body.note === "string" ? body.note.slice(0, 500) : "",
      author: ctx.user.name || ctx.user.email, createdBy: ctx.user.id,
    });

    // The tab screenshot serves as the thumbnail from the first second
    const shot = fileFromDataUrl(body.screenshot);
    if (shot) {
      try {
        const url = await uploadThumbnail(ctx.workspace.id, shot.name, shot);
        await setThumbnail(ctx.workspace.id, web, url);
      } catch (e) { console.error("ext: thumbnail not saved", e instanceof Error ? e.message : e); }
    }

    // A post on X is imported after responding (its photos, frame and video are copied);
    // its picture replaces the tab screenshot. Then the AI tags, as the app does when a URL is pasted.
    const isPost = mediaKindOf(web) === "post";
    if (isPost || taggerEnabled()) {
      after(async () => {
        if (isPost) {
          const post = await ensurePost(web);
          const thumb = post && postThumb(post);
          if (thumb) await setThumbnail(ctx.workspace.id, web, thumb);
        }
        if (taggerEnabled() && item.id) await startTagJob(ctx.workspace.id, item.id, ctx.user.id);
      });
    }

    return Response.json({ ok: true, existed: false, item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // The status comes from the error, not from the message: the text is translated
    return Response.json({ error: msg }, { status: err instanceof HttpError ? err.status : 500 });
  }
}
