// Vercel blobs are private: they're served through the proxy. Locally they're /public paths.
export function proxiedSrc(url: string): string {
  return url.startsWith("https://") ? `/api/thumbnail/img?url=${encodeURIComponent(url)}` : url;
}

/** Like proxiedSrc, but only our own blobs go through the proxy: a video's frame on YouTube or
 *  a post's file on X (public hosts) load as they are. */
export function ownSrc(url: string): string {
  return /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url) ? `/api/thumbnail/img?url=${encodeURIComponent(url)}` : url;
}
