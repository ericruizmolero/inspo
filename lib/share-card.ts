// What a pasted link to one reference (/i/<id>) shows in Telegram, WhatsApp, Slack or X: its own name and its own
// picture, the one its card shows, instead of the app's generic card. Only the preview apps get it
// (lib/preview-bots.ts); a person still signs in to see the reference. The id is the secret, as with any shared link.
//
// What we copied from X, Pinterest, Are.na or Cosmos stays inside (staysInside, lib/url.ts): a post shows X's own
// picture, linked where X serves it, and the rest keeps the app's card. Nothing else of the reference goes out: no
// note, no comment, no workspace.
import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { getFile, keyOf } from "./storage";
import { getDesignMd } from "./design-store";
import { getStoredShot } from "./screenshot";
import { readPost } from "./posts";
import { safeFetch } from "./safe-fetch";
import { isPublicHttpUrl, viaProxy } from "./extract";
import { mediaKindOf, postOf, staysInside, videoEmbedOf } from "./url";
import { log } from "./log";

export const CARD = { width: 1200, height: 630 };

const T = schema.inspoItem;
export type SharedItem = { id: string; name: string; web: string; source: string | null; thumbnailUrl: string | null };

export async function sharedItem(id: string): Promise<SharedItem | null> {
  if (!/^[\w-]{6,64}$/.test(id)) return null;
  const [row] = await db.select({ id: T.id, name: T.name, web: T.web, source: T.source, thumbnailUrl: T.thumbnailUrl })
    .from(T).where(eq(T.id, id)).limit(1);
  return row ?? null;
}

/** The site the reference lives on, for the preview's line under the title */
export function hostOf(item: SharedItem): string | null {
  try {
    const u = new URL(item.source || item.web);
    return u.protocol.startsWith("http") ? u.hostname.replace(/^www\./, "") : null;
  } catch { return null; }
}

/** Where the preview's picture is: our own card (/i/<id>/preview), X's picture of a post, or null for the app's card */
export async function previewImageOf(item: SharedItem): Promise<string | null> {
  if (postOf(item.web)) {
    const post = await readPost(item.web).catch(() => null);
    return post?.media[0]?.image ?? null;
  }
  if (staysInside(item)) return null;
  if (mediaKindOf(item.web) === "text") return null;
  return `/i/${encodeURIComponent(item.id)}/preview`;
}

// ─── The picture ─────────────────────────────────────────────────────────────

const RASTER = /^image\/(png|jpeg|jpg|webp|gif|avif)\s*(;|$)/i;
const MAX_BYTES = 12 * 1024 * 1024;
const TIMEOUT_MS = 5000;

async function stored(url: string | null | undefined): Promise<Buffer | null> {
  const key = url ? keyOf(url) : null;
  if (!key) return null;
  try { return (await getFile(key))?.body ?? null; } catch (err) { log.warn("share_card.read_failed", { ref: key, err }); return null; }
}

async function remote(url: string | null | undefined): Promise<Buffer | null> {
  if (!url || !isPublicHttpUrl(url)) return null;
  try {
    const res = await safeFetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok || !RASTER.test(res.headers.get("content-type") ?? "")) { await res.body?.cancel(); return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.byteLength <= MAX_BYTES ? buf : null;
  } catch { return null; }
}

/** The page's own og:image, as the card shows it before any capture of ours */
async function ogImageOf(web: string): Promise<string | null> {
  if (!isPublicHttpUrl(web)) return null;
  try {
    const res = await safeFetch(viaProxy(web) ?? web, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) { await res.body?.cancel(); return null; }
    const html = (await res.text()).slice(0, 400_000);
    const m = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    return m?.[1] ? new URL(m[1].replace(/&amp;/g, "&"), web).href : null;
  } catch { return null; }
}

/** The card's picture, in the order the card itself tries them; null when it has none to give */
async function pictureOf(item: SharedItem): Promise<{ data: Buffer; page: boolean } | null> {
  const first = async (...tries: (() => Promise<Buffer | null>)[]) => { for (const t of tries) { const b = await t(); if (b) return b; } return null; };
  const kind = mediaKindOf(item.web);
  if (kind === "image") {
    const data = await first(() => stored(item.thumbnailUrl), () => stored(item.web), () => remote(item.web));
    return data && { data, page: false };
  }
  if (kind === "video") {
    const poster = videoEmbedOf(item.web)?.poster;
    const data = await first(() => stored(item.thumbnailUrl), () => remote(poster));
    return data && { data, page: false };
  }
  if (kind !== "web") return null;
  // A site: a thumbnail somebody chose, the cover we took with its DESIGN.md, its og:image, our capture of its top
  const own = await stored(item.thumbnailUrl);
  if (own) return { data: own, page: false };
  const doc = await getDesignMd(item.web).catch(() => null);
  const data = await first(
    () => stored(doc?.topUrl ?? doc?.coverUrl),
    async () => remote(await ogImageOf(item.web)),
    () => getStoredShot(item.web),
  );
  return data && { data, page: true };
}

/** 1200×630 JPEG of the reference's picture, or null (the app's card stands in) */
export async function cardImage(item: SharedItem): Promise<Buffer | null> {
  if (staysInside(item)) return null;
  const pic = await pictureOf(item);
  if (!pic) return null;
  try {
    const sharp = (await import("sharp")).default;
    // A page is read from its top; a picture keeps its middle
    return await sharp(pic.data, { animated: false }).rotate()
      .resize(CARD.width, CARD.height, { fit: "cover", position: pic.page ? "top" : "centre" })
      .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  } catch (err) {
    log.warn("share_card.render_failed", { ref: item.id, err });
    return null;
  }
}
