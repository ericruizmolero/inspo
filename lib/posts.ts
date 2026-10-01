// Posts on X saved as inspos. X's pages need JavaScript and a login, so neither the screenshot
// nor the page text work: the post is read from the same public feed its embeds use
// (cdn.syndication.twimg.com, the one react-tweet reads), with api.fxtwitter.com as a fallback.
// Neither is an official API: if both fail, the item stays as it was (a typographic card).
//
// Like the DESIGN.md store, each post is saved once per URL and shared across workspaces
// (it is public): its JSON plus a copy of its photos, its frame and its video, so the
// reference outlives the post. Files: lib/storage.ts, under inspo/posts/<id>/.
import "server-only";
import { postOf } from "./url";
import { putFile, getJson, putJson, keyOf } from "./storage";

export const POSTS_PREFIX = "inspo/posts/";
const FETCH_TIMEOUT_MS = 8000;
/** The backup copy of a video must fit here (by bitrate × duration): the best variant that does.
 *  What plays is X's own best file; the copy takes over if the post disappears. */
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
const MAX_VIDEO_WIDTH = 1920;

export interface PostMedia {
  kind: "photo" | "video" | "gif";
  /** What shows or plays: a photo's copy, or X's best video file */
  src: string;
  /** Our copy of the video, lighter, for when X's file is gone */
  backup?: string;
  /** Frame of a video or gif (our copy) */
  poster?: string;
  w: number;
  h: number;
}

export interface Post {
  id: string;
  url: string;
  author: string;
  handle: string;
  avatar: string | null;
  text: string;
  createdAt: string | null;
  media: PostMedia[];
  savedAt: string;
}

/** What the feed says, before copying anything: remote URLs */
interface RawPost extends Omit<Post, "savedAt" | "media"> {
  media: { kind: PostMedia["kind"]; image: string; video?: { play: string; keep: string }; w: number; h: number }[];
}

// ─── Reading the post ────────────────────────────────────────────────────────

const timeout = () => AbortSignal.timeout(FETCH_TIMEOUT_MS);

/** The token the embed feed asks for (same formula as react-tweet) */
const tokenFor = (id: string) => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");

type Variant = { bitrate?: number; content_type: string; url: string };

/** play: the best mp4 up to MAX_VIDEO_WIDTH. keep: the best one whose weight (bitrate × duration) fits the backup cap. */
function pickVariants(variants: Variant[], durationMs: number | undefined): { play: string; keep: string } | null {
  const mp4 = variants.filter((v) => v.content_type === "video/mp4")
    .map((v) => ({ url: v.url, bitrate: v.bitrate ?? 0, width: Number(v.url.match(/\/(\d+)x\d+\//)?.[1] ?? 0) }))
    .sort((a, b) => b.bitrate - a.bitrate);
  if (!mp4.length) return null;
  const play = mp4.find((v) => !v.width || v.width <= MAX_VIDEO_WIDTH) ?? mp4[mp4.length - 1];
  const bytes = (b: number) => (durationMs ? (b / 8) * (durationMs / 1000) : 0);
  const keep = mp4.find((v) => v.bitrate <= play.bitrate && bytes(v.bitrate) <= MAX_VIDEO_BYTES) ?? mp4[mp4.length - 1];
  return { play: play.url, keep: keep.url };
}

/** The post's text as it reads on X: without the trailing media link, with t.co links expanded */
function cleanText(text: string, range: [number, number] | undefined, urls: { url: string; expanded_url?: string; display_url?: string }[]): string {
  let t = range ? Array.from(text).slice(range[0], range[1]).join("") : text;
  for (const u of urls) t = t.replace(u.url, u.display_url ?? u.expanded_url ?? u.url);
  // The trailing t.co link is the post's own media (old posts, http:// and no text range, included)
  return t.replace(/\s*https?:\/\/t\.co\/\w+\s*$/, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

async function fromSyndication(id: string, url: string): Promise<RawPost | null> {
  const res = await fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${tokenFor(id)}`, { signal: timeout() });
  if (!res.ok) return null;
  const d = await res.json().catch(() => null);
  if (!d?.user || typeof d.text !== "string") return null;
  type Detail = { type: string; media_url_https: string; original_info?: { width: number; height: number }; video_info?: { variants: Variant[]; duration_millis?: number } };
  const media = ((d.mediaDetails ?? []) as Detail[]).map((m) => {
    const kind = m.type === "animated_gif" ? "gif" : m.type === "video" ? "video" : "photo";
    const video = m.video_info ? pickVariants(m.video_info.variants, m.video_info.duration_millis ?? d.video?.durationMs) : null;
    return { kind, image: m.media_url_https, video: video ?? undefined, w: m.original_info?.width ?? 0, h: m.original_info?.height ?? 0 } as RawPost["media"][number];
  });
  return {
    id, url,
    author: d.user.name ?? d.user.screen_name,
    handle: d.user.screen_name,
    avatar: d.user.profile_image_url_https?.replace("_normal.", "_bigger.") ?? null,
    text: cleanText(d.text, d.display_text_range, d.entities?.urls ?? []),
    createdAt: d.created_at ?? null,
    media,
  };
}

async function fromFxTwitter(id: string, user: string, url: string): Promise<RawPost | null> {
  const res = await fetch(`https://api.fxtwitter.com/${user}/status/${id}`, { signal: timeout() });
  if (!res.ok) return null;
  const t = (await res.json().catch(() => null))?.tweet;
  if (!t?.author) return null;
  type Fx = { type: string; url: string; thumbnail_url?: string; width: number; height: number; duration?: number };
  const all = [...(t.media?.photos ?? []), ...(t.media?.videos ?? [])] as Fx[];
  return {
    id, url,
    author: t.author.name ?? t.author.screen_name,
    handle: t.author.screen_name,
    avatar: t.author.avatar_url ?? null,
    text: String(t.text ?? "").trim(),
    createdAt: t.created_at ?? null,
    media: all.map((m) => m.type === "photo"
      ? { kind: "photo", image: m.url, w: m.width, h: m.height }
      : { kind: m.type === "gif" ? "gif" : "video", image: m.thumbnail_url ?? "", video: { play: m.url, keep: m.url }, w: m.width, h: m.height }),
  };
}

const recent = new Map<string, { at: number; post: RawPost | null }>();

/** The post as X serves it (remote URLs). Kept a minute: adding names it and then imports it. */
export async function readPost(web: string): Promise<RawPost | null> {
  const ref = postOf(web);
  if (!ref) return null;
  const hit = recent.get(ref.id);
  if (hit && Date.now() - hit.at < 60_000) return hit.post;
  const url = `https://x.com/${ref.user}/status/${ref.id}`;
  let post: RawPost | null = null;
  try { post = await fromSyndication(ref.id, url); } catch { /* next */ }
  if (!post) { try { post = await fromFxTwitter(ref.id, ref.user, url); } catch { /* none */ } }
  recent.set(ref.id, { at: Date.now(), post });
  return post;
}

/** "Wilson · Ferndesk has been live for over a year now" */
export function postName(p: { author: string; text: string }): string {
  const words = p.text.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  const head = `${p.author} · ${words}`;
  if (!words) return p.author;
  return head.length > 48 ? head.slice(0, 48).replace(/\s+\S*$/, "") + "…" : head;
}

// ─── Store ───────────────────────────────────────────────────────────────────

/** Copies a remote file; null if it can't (the post then keeps X's URL). Held in memory
 *  while it goes up: MAX_VIDEO_BYTES caps a video, and imports run one post at a time. */
async function copy(remote: string, key: string, maxBytes: number): Promise<string | null> {
  try {
    const res = await fetch(remote, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok || !res.body) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > maxBytes) { await res.body.cancel(); return null; }
    const type = res.headers.get("content-type") ?? "application/octet-stream";
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length > maxBytes) return null;
    return await putFile(`${POSTS_PREFIX}${key}`, body, type);
  } catch (e) {
    console.warn("posts: not copied", remote, e instanceof Error ? e.message : e);
    return null;
  }
}

export async function getStoredPost(id: string): Promise<Post | null> {
  try { return await getJson<Post>(`${POSTS_PREFIX}${id}/post.json`); } catch { return null; }
}

const inflight = new Map<string, Promise<Post | null>>();

/** The saved post, importing it the first time (copies included). null if X doesn't give it. */
export function ensurePost(web: string): Promise<Post | null> {
  const ref = postOf(web);
  if (!ref) return Promise.resolve(null);
  const running = inflight.get(ref.id);
  if (running) return running;
  const job = (async () => {
    const stored = await getStoredPost(ref.id);
    if (stored) return stored;
    const raw = await readPost(web);
    if (!raw) return null;
    const ext = (u: string) => u.match(/\.(jpe?g|png|webp|gif)(\?|$)/i)?.[1].toLowerCase() ?? "jpg";
    const media: PostMedia[] = [];
    let photo = 0;
    for (const m of raw.media) {
      if (m.kind === "photo") {
        // name=large: the full photo, not the feed's small crop
        const big = m.image.includes("?") ? m.image : `${m.image}?name=large`;
        const src = await copy(big, `${raw.id}/photo-${photo++}.${ext(m.image)}`, 20 * 1024 * 1024);
        media.push({ kind: "photo", src: src ?? big, w: m.w, h: m.h });
        continue;
      }
      // The thumbnail's name tells the card what it is (lib/url.ts postThumbKind)
      const poster = m.image ? await copy(m.image, `${raw.id}/poster-${m.kind}.${ext(m.image)}`, 10 * 1024 * 1024) : null;
      const backup = m.video ? await copy(m.video.keep, `${raw.id}/${m.kind}.mp4`, MAX_VIDEO_BYTES) : null;
      media.push({ kind: m.kind, src: m.video?.play ?? backup ?? "", backup: backup ?? undefined, poster: poster ?? (m.image || undefined), w: m.w, h: m.h });
    }
    const post: Post = { ...raw, media, savedAt: new Date().toISOString() };
    await putJson(`${POSTS_PREFIX}${raw.id}/post.json`, post);
    return post;
  })().catch((e) => { console.error("posts: import failed", web, e); return null; })
    .finally(() => inflight.delete(ref.id));
  inflight.set(ref.id, job);
  return job;
}

/** The picture that stands for the post on its card: the first frame or photo we have a copy of */
/** The day the post was published, YYYY-MM-DD, from either source's wording of its date */
export function postDay(post: { createdAt: string | null }): string | undefined {
  if (!post.createdAt) return undefined;
  const t = new Date(post.createdAt).getTime();
  if (Number.isNaN(t) || t > Date.now()) return undefined;
  return new Date(t).toISOString().slice(0, 10);
}

export function postThumb(post: Post): string | null {
  const own = (u?: string) => (u && keyOf(u)?.startsWith(POSTS_PREFIX) ? u : null);
  for (const m of post.media) {
    const t = m.kind === "photo" ? own(m.src) : own(m.poster);
    if (t) return t;
  }
  return null;
}
