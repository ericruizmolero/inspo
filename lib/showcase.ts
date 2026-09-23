// Login showcase: fixed images from public/showcase, picked by hand.
// Served as static files (/showcase/NN.jpg), so the page touches neither the
// database nor Blob and loads instantly. To change them just add or remove
// .jpg/.png/.webp files in that folder: they render in name order.
import { promises as fs } from "fs";
import path from "path";

export const SHOWCASE_MAX = 18; // 3 columns × 6
const DIR = path.join(process.cwd(), "public", "showcase");

let cache: string[] | null = null;

/** Public paths of the showcase images, in name order. */
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
