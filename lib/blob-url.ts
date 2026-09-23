// Blob URLs are fetched with BLOB_READ_WRITE_TOKEN, so ownership is checked
// on the parsed URL and never with a substring: "https://evil.tld/inspo/<ws>/thumbs/x" fails.
import "server-only";

const BLOB_HOST = /\.blob\.vercel-storage\.com$/i;

/** Is `url` a Vercel Blob URL whose path starts with `prefix`? */
export function isBlobUrlUnder(url: string, prefix: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && BLOB_HOST.test(u.hostname) && u.pathname.startsWith(`/${prefix}`) && !u.pathname.includes("..");
  } catch {
    return false;
  }
}

export const isBlobUrl = (url: string) => isBlobUrlUnder(url, "");
