// URL utilities shared by client and server (no Node dependencies).

const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com)$/i;
const VIDEO_FILE = /\.(mp4|webm|mov|m4v)$/i;
// Uploaded images are stored files (lib/storage.ts): /api/files/inspo/<workspace>/media/<name>
const MEDIA_FILE = /^\/api\/files\/inspo\/[^/]+\/media\//;
const POST_HOST = /^(www\.|mobile\.)?(x|twitter)\.com$/i;

/** Accepts "linear.app", "www.x.com/y" or a full URL. Returns the URL with scheme, or null if invalid. */
export function normalizeWebUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    // One post, one address: twitter.com, ?s=20 or /photo/1 are all the same x.com/<user>/status/<id>
    const post = postOf(u.href);
    if (post) return `https://x.com/${post.user}/status/${post.id}`;
    return u.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/** "https://www.linear.app/features" → "linear.app" */
export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./i, ""); } catch { return url; }
}

/** Fallback name from the domain: "linear.app" → "Linear", "studio-x.co.uk" → "Studio X" */
export function nameFromHost(url: string): string {
  const host = hostOf(url);
  const parts = host.split(".");
  // strip TLDs (and second level like co.uk / com.br)
  while (parts.length > 1 && (parts[parts.length - 1].length <= 3 || /^(com|net|org|info|design|studio|agency|dev|app|io|xyz)$/i.test(parts[parts.length - 1]))) {
    parts.pop();
    if (parts.length > 1 && /^(co|com|org|net|ac|gov)$/i.test(parts[parts.length - 1])) parts.pop();
  }
  const label = parts[parts.length - 1] ?? host;
  return label.split(/[-_]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || host;
}

/** Default collection by domain: videos if it is a video link. */
export function typeFromUrl(url: string): "inspiration" | "videos" {
  return mediaKindOf(url) === "video" ? "videos" : "inspiration";
}

// ─── Media: uploaded images and video links ──────────────────────────────────
// An item is still one address (`web`): a site, a video link, or the file of an
// uploaded image. What it is comes from the address itself, so no column says it.

export type MediaKind = "web" | "image" | "video" | "post";

/** "blob:" is the optimistic card of an image still uploading. */
export function mediaKindOf(web: string): MediaKind {
  if (web.startsWith("blob:") || MEDIA_FILE.test(web)) return "image";
  try {
    const u = new URL(web);
    if (postOf(web)) return "post";
    if (VIDEO_HOSTS.test(u.hostname) || VIDEO_FILE.test(u.pathname)) return "video";
  } catch { /* not a URL */ }
  return "web";
}

/** A post on X: "https://x.com/euboid/status/2097…" → { user: "euboid", id: "2097…" } */
export function postOf(web: string): { user: string; id: string } | null {
  try {
    const u = new URL(web);
    if (!POST_HOST.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/(\w{1,15})\/status(?:es)?\/(\d{1,25})/);
    return m ? { user: m[1], id: m[2] } : null;
  } catch { return null; }
}

/** A post's thumbnail says what the post carries: its file is named poster-video, poster-gif or photo-N */
export function postThumbKind(thumb: string | undefined): "video" | "gif" | null {
  const m = thumb?.match(/\/poster-(video|gif)\.\w+$/);
  return m ? (m[1] as "video" | "gif") : null;
}

export const isGif = (web: string) => /\.gif$/i.test(web.split("?")[0]);

export interface VideoEmbed {
  provider: "youtube" | "vimeo" | "loom" | "file";
  /** What plays: the player's iframe, or the file itself */
  src: string;
  /** A frame to show before playing, when the provider gives one without asking it */
  poster?: string;
}

/** How to play a video link inside the app; null if it is not one we know how to play. */
export function videoEmbedOf(web: string): VideoEmbed | null {
  let u: URL;
  try { u = new URL(web); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./i, "").toLowerCase();
  const path = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    const id = host === "youtu.be" ? path[0]
      : u.searchParams.get("v") ?? (["shorts", "embed", "live", "v"].includes(path[0]) ? path[1] : undefined);
    if (!id || !/^[\w-]{6,}$/.test(id)) return null;
    const start = parseInt(u.searchParams.get("t") ?? u.searchParams.get("start") ?? "", 10);
    return {
      provider: "youtube",
      src: `https://www.youtube-nocookie.com/embed/${id}?rel=0${start > 0 ? `&start=${start}` : ""}`,
      poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  if (host.endsWith("vimeo.com")) {
    const i = path.findIndex((p) => /^\d+$/.test(p));
    if (i < 0) return null;
    const hash = path[i + 1] && /^[\da-f]+$/i.test(path[i + 1]) ? path[i + 1] : u.searchParams.get("h");
    return { provider: "vimeo", src: `https://player.vimeo.com/video/${path[i]}${hash ? `?h=${hash}` : ""}` };
  }
  if (host.endsWith("loom.com")) {
    const id = ["share", "embed"].includes(path[0]) ? path[1] : undefined;
    return id ? { provider: "loom", src: `https://www.loom.com/embed/${id}` } : null;
  }
  if (VIDEO_FILE.test(u.pathname)) return { provider: "file", src: web };
  return null;
}

/** Name of an uploaded image from its file: "hero-final_v2.png" → "Hero final v2" */
export function nameFromFile(file: string): string {
  const base = file.replace(/\.[a-z0-9]+$/i, "").replace(/_+|(?<!\d)-+|-+(?!\d)/g, " ").replace(/\s+/g, " ").trim().slice(0, 48).trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}

const GENERIC = /^(home|homepage|inicio|welcome|bienvenidos?|index|untitled|official (web)?site|sitio oficial)$/i;

/**
 * Name from what the site itself says.
 * Priority: og:site_name → the <title> chunk that sounds like a brand → domain.
 */
export function guessName(url: string, site?: { title?: string; siteName?: string } | null): string {
  const fromHost = nameFromHost(url);
  const clip = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 48).trim();
  const title = site?.title?.trim();
  // For videos the video title identifies it, not the platform
  if (videoEmbedOf(url)?.provider === "file" && !title) {
    try { return nameFromFile(decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "")) || fromHost; } catch { return fromHost; }
  }
  if (typeFromUrl(url) === "videos" && title) {
    const t = title.replace(/\s*(-|–|\|)\s*YouTube$/i, "").replace(/\s+on Vimeo$/i, "").replace(/\s*(\||-)\s*Loom$/i, "").trim();
    return t ? (t.length > 48 ? clip(t).replace(/\s+\S*$/, "") + "…" : t) : fromHost;
  }
  if (site?.siteName && !GENERIC.test(site.siteName.trim())) return clip(site.siteName);
  if (!title) return fromHost;
  const segments = title.split(/\s*(?:\||–|—|·|•|::|\s-\s|\s:\s)\s*/).map((s) => s.trim()).filter((s) => s && !GENERIC.test(s));
  if (!segments.length) return fromHost;
  const key = fromHost.toLowerCase().replace(/\s+/g, "");
  const brand = segments.find((s) => s.toLowerCase().replace(/\s+/g, "").includes(key));
  const pick = brand ?? segments.reduce((a, b) => (b.length < a.length ? b : a));
  return pick.length > 48 ? fromHost : clip(pick);
}

/**
 * Stable key to identify one address, whatever case or trailing slash it was typed
 * or saved with. This is the one normalizer: item dedup (webKey), the DESIGN.md
 * store and the screenshot store all hash this same string for their own keys,
 * instead of each normalizing the URL its own way.
 */
export function webKeyOf(raw: string): string {
  const s = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
  } catch {
    return s.toLowerCase();
  }
}

// Videos and social posts are not sites of their own: no DESIGN.md, no page capture
const NOT_A_SITE = ["youtube.com", "youtu.be", "vimeo.com", "x.com", "twitter.com", "instagram.com", "linkedin.com", "tiktok.com", "primevideo.com", "netflix.com"];

/** A website whose page can be read and captured (not an image, a video or a social post) */
export function hasOwnPage(web: string): boolean {
  if (mediaKindOf(web) !== "web") return false;
  try {
    const host = new URL(web).hostname.replace(/^www\./, "");
    return !NOT_A_SITE.some((d) => host === d || host.endsWith(`.${d}`));
  } catch { return false; }
}
