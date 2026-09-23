// Vercel blobs are private: they're served through the proxy. Locally they're /public paths.
export function proxiedSrc(url: string): string {
  return url.startsWith("https://") ? `/api/thumbnail/img?url=${encodeURIComponent(url)}` : url;
}
