// Save an image or a video from the extension's right-click menu. The extension sends the media's
// address, the page it was on and, when it could cut one, the piece of the tab the media covered.
// An image is copied into the workspace's media folder, the same as one dropped into the app; if its
// site refuses to hand it over, the piece of the tab stands in for it. A video stays a link to its
// file, which the app plays, with the piece of the tab as its frame; a video with no file of its own
// (a stream, a blob:) saves the page instead. Either way it lands on the board of the project this
// person was working in.
import { NextRequest, after } from "next/server";
import { requireExtCtx } from "@/lib/ext-keys";
import { addItem, findByWeb, rowToItem, setThumbnail } from "@/lib/items";
import { activeProjectFor, fileItems } from "@/lib/projects";
import { uploadThumbnail } from "@/lib/thumbnails";
import { newMediaKey, MEDIA_TYPES, MAX_MEDIA_BYTES } from "@/lib/media";
import { putFile } from "@/lib/storage";
import { nameFor } from "@/lib/item-name";
import { normalizeWebUrl, mediaKindOf, typeFromUrl } from "@/lib/url";
import { taggerEnabled } from "@/lib/tagger";
import { startTagJob } from "@/lib/tag-jobs";
import { getErrors } from "@/lib/i18n";
import { HttpError } from "@/lib/workspace-core";
import type { ExtCtx } from "@/lib/ext-keys";
import type { InspoItem } from "@/types/inspo";

export const maxDuration = 60;

const MAX_FRAME_BYTES = 3 * 1024 * 1024;

/** data:image/…;base64,… → its bytes and type, or null if it is not an image we keep */
function fromDataUrl(dataUrl: string | undefined, maxBytes: number): { body: Buffer; type: string } | null {
  const m = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!m || !MEDIA_TYPES.has(m[1])) return null;
  const body = Buffer.from(m[2], "base64");
  return body.byteLength > 0 && body.byteLength <= maxBytes ? { body, type: m[1] } : null;
}

/** Addresses this server must never be sent to fetch: its own machine and the private network */
const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|\[?f[cd])/i;

/** The image at `src`, asked for as the page that shows it would (some sites refuse a bare request) */
async function fetchImage(src: string, page: string | undefined): Promise<{ body: Buffer; type: string } | null> {
  let u: URL;
  try { u = new URL(src); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (process.env.NODE_ENV === "production" && PRIVATE_HOST.test(u.hostname)) return null;
  try {
    const res = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/avif,image/webp,image/png,image/*;q=0.8", ...(page ? { Referer: page } : {}) },
      redirect: "follow", signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok || !res.body) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase().replace("image/jpg", "image/jpeg");
    if (!MEDIA_TYPES.has(type) || Number(res.headers.get("content-length") ?? 0) > MAX_MEDIA_BYTES) { await res.body.cancel(); return null; }
    const body = Buffer.from(await res.arrayBuffer());
    return body.byteLength > 0 && body.byteLength <= MAX_MEDIA_BYTES ? { body, type } : null;
  } catch (e) {
    console.warn("ext media: image not fetched", src, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Files the new item on the board this person was working on, and tags it once answered */
async function settle(ctx: ExtCtx, item: InspoItem) {
  const projectId = await activeProjectFor(ctx.workspace.id, ctx.user.id).catch(() => null);
  if (projectId && item.id) await fileItems(ctx.workspace.id, projectId, [item.id], ctx.user.id).catch((e) => console.error("ext media: not filed", e));
  if (taggerEnabled() && item.id) after(() => startTagJob(ctx.workspace.id, item.id!, ctx.user.id));
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n).trim() : "");

// POST { kind: "image" | "video", src?, page?, title?, alt?, frame?, note? } → { ok, item, existed }
export async function POST(req: NextRequest) {
  const ctx = await requireExtCtx(req);
  if (ctx instanceof Response) return ctx;
  const errors = await getErrors();
  const body = (await req.json().catch(() => ({}))) as {
    kind?: string; src?: string; page?: string; title?: string; alt?: string; frame?: string; note?: string;
  };
  const page = normalizeWebUrl(body.page ?? "") ?? undefined;
  const note = clip(body.note, 500);
  const author = ctx.user.name || ctx.user.email;
  const frame = fromDataUrl(body.frame, MAX_FRAME_BYTES);

  try {
    if (body.kind === "image") {
      const src = body.src ?? "";
      const image = src.startsWith("data:") ? fromDataUrl(src, MAX_MEDIA_BYTES) : await fetchImage(src, page);
      const file = image ?? frame;
      if (!file) return Response.json({ error: errors.imageFailed }, { status: 422 });
      const url = await putFile(newMediaKey(ctx.workspace.id, file.type), file.body, file.type);
      const host = page ? new URL(page).hostname.replace(/^www\./, "") : "";
      const item = await addItem(ctx.workspace.id, {
        name: clip(body.alt, 48) || clip(body.title, 48) || host || "Image",
        web: url, thumbnailUrl: url, type: "inspiration", note, author, createdBy: ctx.user.id,
      });
      await settle(ctx, item);
      return Response.json({ ok: true, existed: false, item });
    }

    if (body.kind === "video") {
      // Its own file when it has one the app can play; the page it plays on otherwise
      const src = normalizeWebUrl(body.src ?? "");
      const web = src && mediaKindOf(src) === "video" ? src : page;
      if (!web) return Response.json({ error: errors.badUrl }, { status: 400 });
      const existing = await findByWeb(ctx.workspace.id, web);
      if (existing) return Response.json({ ok: true, existed: true, item: rowToItem(existing) });
      const item = await addItem(ctx.workspace.id, {
        name: web === page ? await nameFor(web, body.title) : clip(body.title, 80) || await nameFor(web),
        web, type: typeFromUrl(web), note, author, createdBy: ctx.user.id,
      });
      if (frame) {
        try {
          const thumb = await uploadThumbnail(ctx.workspace.id, "extension.jpg", new File([new Uint8Array(frame.body)], "extension.jpg", { type: frame.type }));
          await setThumbnail(ctx.workspace.id, web, thumb);
        } catch (e) { console.error("ext media: frame not saved", e instanceof Error ? e.message : e); }
      }
      await settle(ctx, item);
      return Response.json({ ok: true, existed: false, item });
    }

    return Response.json({ error: errors.missingData }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: err instanceof HttpError ? err.status : 500 });
  }
}
