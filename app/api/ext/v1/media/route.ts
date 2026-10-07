// Save an image or a video from the extension's right-click menu. The extension sends the media's
// address, the page it was on and, when it could cut one, the piece of the tab the media covered.
// An image is copied into the workspace's media folder, the same as one dropped into the app; if its
// site refuses to hand it over, the piece of the tab stands in for it. A video file is copied too, into
// the workspace's video folder, so it plays from criterio whatever its site does with the link later,
// with the piece of the tab as its frame. A video with no file to copy (a stream played in pieces) is
// saved by the post or the video page it belongs to, which the app knows how to play (a post from X
// has its video copied on import); only when there is none does it keep the page and the frame.
// Either way it lands on the board picked in the popup, under the areas ticked there.
import { NextRequest, after } from "next/server";
import { requireExtCtx } from "@/lib/ext-keys";
import { addItem, findByWeb, rowToItem, setThumbnail } from "@/lib/items";
import { fileFromExt, cleanAreas } from "@/lib/ext-file";
import { uploadThumbnail } from "@/lib/thumbnails";
import { newMediaKey, MEDIA_TYPES, MAX_MEDIA_BYTES, newVideoKey, VIDEO_TYPES, MAX_VIDEO_BYTES } from "@/lib/media";
import { putFile } from "@/lib/storage";
import { fetchFile } from "@/lib/remote-file";
import { nameFor } from "@/lib/item-name";
import { ensurePost, postThumb } from "@/lib/posts";
import { normalizeWebUrl, mediaKindOf, typeFromUrl } from "@/lib/url";
import { taggerEnabled } from "@/lib/tagger";
import { startTagJob } from "@/lib/tag-jobs";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import type { ExtCtx } from "@/lib/ext-keys";
import type { InspoItem } from "@/types/inspo";

export const maxDuration = 300; // copying a video of up to 100 MB

const MAX_FRAME_BYTES = 3 * 1024 * 1024;

/** data:image/…;base64,… → its bytes and type, or null if it is not an image we keep */
function fromDataUrl(dataUrl: string | undefined, maxBytes: number): { body: Buffer; type: string } | null {
  const m = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!m || !MEDIA_TYPES.has(m[1])) return null;
  const body = Buffer.from(m[2], "base64");
  return body.byteLength > 0 && body.byteLength <= maxBytes ? { body, type: m[1] } : null;
}

/** Files the new item on the board picked in the popup (with its areas), and tags it once answered */
async function settle(ctx: ExtCtx, item: InspoItem, projectId: unknown, areas: unknown) {
  await fileFromExt(ctx, item.id, projectId, cleanAreas(areas));
  if (taggerEnabled() && item.id) after(() => startTagJob(ctx.workspace.id, item.id!, ctx.user.id));
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n).trim() : "");

// POST { kind: "image" | "video", src?, page?, link?, title?, alt?, frame?, note?, projectId?, areas? }
//   → { ok, item, existed, saved: "copy" | "link" | "page" }
// `link` is the post or video page the video belongs to, when the extension found one around it.
export async function POST(req: NextRequest) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const errors = await getErrors();
  const body = (await req.json().catch(() => ({}))) as {
    kind?: string; src?: string; page?: string; link?: string; title?: string; alt?: string; frame?: string; note?: string; projectId?: string; areas?: string[];
  };
  const page = normalizeWebUrl(body.page ?? "") ?? undefined;
  const note = clip(body.note, 500);
  const author = ctx.user.name || ctx.user.email;
  const frame = fromDataUrl(body.frame, MAX_FRAME_BYTES);

  try {
    if (body.kind === "image") {
      const src = body.src ?? "";
      const image = src.startsWith("data:") ? fromDataUrl(src, MAX_MEDIA_BYTES) : await fetchFile(src, page, (t) => MEDIA_TYPES.has(t), MAX_MEDIA_BYTES);
      const file = image ?? frame;
      if (!file) return Response.json({ error: errors.imageFailed }, { status: 422 });
      const url = await putFile(newMediaKey(ctx.workspace.id, file.type), file.body, file.type);
      const host = page ? new URL(page).hostname.replace(/^www\./, "") : "";
      const item = await addItem(ctx.workspace.id, {
        name: clip(body.alt, 48) || clip(body.title, 48) || host || "Image",
        web: url, thumbnailUrl: url, source: page, type: "inspiration", note, author, createdBy: ctx.user.id,
      });
      await settle(ctx, item, body.projectId, body.areas);
      return Response.json({ ok: true, existed: false, item, saved: "copy" });
    }

    if (body.kind === "video") {
      const name = clip(body.alt, 80) || clip(body.title, 80);
      const saveFrame = async (web: string) => {
        if (!frame) return;
        try {
          const thumb = await uploadThumbnail(ctx.workspace.id, "extension.jpg", new File([new Uint8Array(frame.body)], "extension.jpg", { type: frame.type }));
          await setThumbnail(ctx.workspace.id, web, thumb);
        } catch (e) { console.error("ext media: frame not saved", e instanceof Error ? e.message : e); }
      };

      // 1. Its file, copied
      const file = await fetchFile(body.src ?? "", page, (t) => t in VIDEO_TYPES, MAX_VIDEO_BYTES);
      if (file) {
        const url = await putFile(newVideoKey(ctx.workspace.id, file.type), file.body, file.type);
        const item = await addItem(ctx.workspace.id, { name: name || "Video", web: url, source: page, type: "videos", note, author, createdBy: ctx.user.id });
        await saveFrame(url);
        await settle(ctx, item, body.projectId, body.areas);
        return Response.json({ ok: true, existed: false, item, saved: "copy" });
      }

      // 2. No file to copy: the post or video page it belongs to, which the app plays; 3. the page and its frame
      const link = [normalizeWebUrl(body.link ?? ""), page].find((w) => w && ["post", "video"].includes(mediaKindOf(w)));
      const web = link ?? page;
      if (!web) return Response.json({ error: errors.badUrl }, { status: 400 });
      const existing = await findByWeb(ctx.workspace.id, web);
      if (existing) return Response.json({ ok: true, existed: true, item: rowToItem(existing), saved: link ? "link" : "page" });
      const item = await addItem(ctx.workspace.id, {
        name: await nameFor(web, link ? undefined : body.title), web, type: typeFromUrl(web), note, author, createdBy: ctx.user.id,
      });
      if (mediaKindOf(web) === "post") {
        // Its video is copied on import, and its picture is the card's
        await saveFrame(web);
        after(async () => { const post = await ensurePost(web); const thumb = post && postThumb(post); if (thumb) await setThumbnail(ctx.workspace.id, web, thumb); });
      } else if (!link) await saveFrame(web);
      await settle(ctx, item, body.projectId, body.areas);
      return Response.json({ ok: true, existed: false, item, saved: link ? "link" : "page" });
    }

    return Response.json({ error: errors.missingData }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: err instanceof HttpError ? err.status : 500 });
  }
}
