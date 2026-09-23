// URL utilities shared by client and server (no Node dependencies).

const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/i;

/** Accepts "linear.app", "www.x.com/y" or a full URL. Returns the URL with scheme, or null if invalid. */
export function normalizeWebUrl(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
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

/** Default collection by domain: videos if YouTube/Vimeo. */
export function typeFromUrl(url: string): "inspiration" | "videos" {
  return VIDEO_HOSTS.test(hostOf(url)) ? "videos" : "inspiration";
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
  if (typeFromUrl(url) === "videos" && title) {
    const t = title.replace(/\s*(-|–|\|)\s*YouTube$/i, "").replace(/\s+on Vimeo$/i, "").trim();
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

/** Stable key to detect duplicates: lowercase host, no trailing slash. */
export function webKeyOf(raw: string): string {
  const s = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return s.toLowerCase();
  }
}
