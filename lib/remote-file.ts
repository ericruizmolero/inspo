// A file fetched from somewhere else to be kept as the workspace's own: an image or a video saved from the
// extension (app/api/ext/v1/media) or by an AI client over MCP (lib/mcp/pieces.ts).
import "server-only";

/** Addresses this server must never be sent to fetch: its own machine and the private network */
const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|\[?f[cd])/i;

/** The file at `src`, asked for as the page that shows it would (some sites refuse a bare request).
 *  null unless it is one of `types` and weighs at most `maxBytes`. */
export async function fetchFile(src: string, page: string | undefined, types: (type: string) => boolean, maxBytes: number): Promise<{ body: Buffer; type: string } | null> {
  let u: URL;
  try { u = new URL(src); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (process.env.NODE_ENV === "production" && PRIVATE_HOST.test(u.hostname)) return null;
  try {
    const res = await fetch(u, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*", ...(page ? { Referer: page } : {}) },
      redirect: "follow", signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok || !res.body) return null;
    let type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase().replace("image/jpg", "image/jpeg");
    // A video served as a plain download still says what it is by its name
    if (!types(type) && /^(application\/octet-stream|binary\/octet-stream|)$/.test(type)) {
      const ext = u.pathname.match(/\.(mp4|m4v|webm|mov)$/i)?.[1].toLowerCase();
      if (ext) type = ext === "webm" ? "video/webm" : ext === "mov" ? "video/quicktime" : "video/mp4";
    }
    if (!types(type) || Number(res.headers.get("content-length") ?? 0) > maxBytes) { await res.body.cancel(); return null; }
    const body = Buffer.from(await res.arrayBuffer());
    return body.byteLength > 0 && body.byteLength <= maxBytes ? { body, type } : null;
  } catch (e) {
    console.warn("remote file: not fetched", src, e instanceof Error ? e.message : e);
    return null;
  }
}
