const PROXY = "https://web-proxy-git-main-ericruizmoleros-projects.vercel.app/api/proxy";
const TTL = 60 * 60 * 24 * 30; // 30 días
const FETCH_TIMEOUT_MS = 6000;

function extractOgImage(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) {
      try { return new URL(m[1], baseUrl).href; } catch { continue; }
    }
  }
  return null;
}

function fetchWithTimeout(url: string, opts: RequestInit & { next?: { revalidate: number } }) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

const NO_CACHE = `public, s-maxage=${60 * 60 * 24 * 7}, stale-while-revalidate=${TTL}`;
const LONG_CACHE = `public, s-maxage=${TTL}, max-age=${TTL}, stale-while-revalidate=${TTL * 2}`;

// Que una web no tenga og:image es lo normal, no un error: se responde 204 (sin cuerpo)
// para que el navegador no llene la consola de "Failed to load resource" y la tarjeta
// pase a la captura. El motivo va en una cabecera por si hay que depurar.
const none = (reason: string, cache = "private, max-age=900") =>
  new Response(null, { status: 204, headers: { "X-Og": reason, "Cache-Control": cache } });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return new Response("missing url", { status: 400 });

  try {
    const proxyRes = await fetchWithTimeout(
      `${PROXY}?url=${encodeURIComponent(url)}`,
      { next: { revalidate: TTL } }
    );
    if (!proxyRes.ok) return none("proxy-error");

    const html = await proxyRes.text();
    const imageUrl = extractOgImage(html, url);

    if (!imageUrl) return none("no-image", NO_CACHE);

    const imgRes = await fetchWithTimeout(imageUrl, { next: { revalidate: TTL } });
    if (!imgRes.ok) return none("image-fetch-failed");

    const blob = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";

    return new Response(blob, {
      headers: { "Content-Type": contentType, "Cache-Control": LONG_CACHE },
    });
  } catch (e) {
    return none((e as Error).name === "AbortError" ? "timeout" : "error");
  }
}
