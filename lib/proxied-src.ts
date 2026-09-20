// Los blobs de Vercel son privados: se sirven a través del proxy. En local son rutas de /public.
export function proxiedSrc(url: string): string {
  return url.startsWith("https://") ? `/api/thumbnail/img?url=${encodeURIComponent(url)}` : url;
}
