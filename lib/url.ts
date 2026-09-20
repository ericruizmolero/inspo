// Utilidades de URL compartidas entre cliente y servidor (sin dependencias de Node).

const TIPOS_VIDEO = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/i;

/** Acepta "linear.app", "www.x.com/y" o una URL completa. Devuelve la URL con esquema o null si no es válida. */
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

/** Nombre de emergencia a partir del dominio: "linear.app" → "Linear", "studio-x.co.uk" → "Studio X" */
export function nameFromHost(url: string): string {
  const host = hostOf(url);
  const parts = host.split(".");
  // quitar TLDs (y segundo nivel tipo co.uk / com.br)
  while (parts.length > 1 && (parts[parts.length - 1].length <= 3 || /^(com|net|org|info|design|studio|agency|dev|app|io|xyz)$/i.test(parts[parts.length - 1]))) {
    parts.pop();
    if (parts.length > 1 && /^(co|com|org|net|ac|gov)$/i.test(parts[parts.length - 1])) parts.pop();
  }
  const label = parts[parts.length - 1] ?? host;
  return label.split(/[-_]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || host;
}

/** Colección por defecto según el dominio: vídeos si es YouTube/Vimeo. */
export function tipoFromUrl(url: string): "Inspiración" | "Videos" {
  return TIPOS_VIDEO.test(hostOf(url)) ? "Videos" : "Inspiración";
}

const GENERIC = /^(home|homepage|inicio|welcome|bienvenidos?|index|untitled|official (web)?site|sitio oficial)$/i;

/**
 * Nombre a partir de lo que dice la propia web.
 * Prioridad: og:site_name → el trozo del <title> que suena a marca → dominio.
 */
export function guessEmpresa(url: string, site?: { title?: string; siteName?: string } | null): string {
  const fromHost = nameFromHost(url);
  const clip = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 48).trim();
  const title = site?.title?.trim();
  // En vídeos lo que identifica es el título del vídeo, no la plataforma
  if (tipoFromUrl(url) === "Videos" && title) {
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

/** Clave estable para detectar duplicados: host en minúsculas, sin barra final. */
export function webKeyOf(raw: string): string {
  const s = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return s.toLowerCase();
  }
}
