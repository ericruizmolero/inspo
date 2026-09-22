// Escaparate del login: imágenes fijas de public/showcase, elegidas a mano.
// Se sirven como estáticos (/showcase/NN.jpg), así que la página no toca base de
// datos ni Blob y carga al instante. Para cambiarlas basta con poner o quitar
// archivos .jpg/.png/.webp en esa carpeta: se pintan por orden de nombre.
import { promises as fs } from "fs";
import path from "path";

export const SHOWCASE_MAX = 18; // 3 columnas × 6
const DIR = path.join(process.cwd(), "public", "showcase");

let cache: string[] | null = null;

/** Rutas públicas de las imágenes del escaparate, por orden de nombre. */
export async function showcaseImages(): Promise<string[]> {
  if (cache) return cache;
  try {
    const files = (await fs.readdir(DIR)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
    cache = files.slice(0, SHOWCASE_MAX).map((f) => `/showcase/${f}`);
  } catch {
    cache = [];
  }
  return cache;
}
