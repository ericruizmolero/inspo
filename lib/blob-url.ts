// Las URLs de Blob se piden con BLOB_READ_WRITE_TOKEN, así que la pertenencia se comprueba
// sobre la URL parseada y nunca con un substring: "https://evil.tld/inspo/<ws>/thumbs/x" no pasa.
import "server-only";

const BLOB_HOST = /\.blob\.vercel-storage\.com$/i;

/** ¿Es `url` una URL de Vercel Blob cuya ruta empieza por `prefix`? */
export function isBlobUrlUnder(url: string, prefix: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && BLOB_HOST.test(u.hostname) && u.pathname.startsWith(`/${prefix}`) && !u.pathname.includes("..");
  } catch {
    return false;
  }
}

export const isBlobUrl = (url: string) => isBlobUrlUnder(url, "");
