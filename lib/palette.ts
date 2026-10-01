// The page's colours, read from the pixels: no model, no cost. Server only (sharp).
import "server-only";
import type { InspoColor } from "@/types/inspo";

const SIDE = 64;
const K = 6;
const ROUNDS = 8;
/** Below this share a colour is noise (an icon, a link) */
const MIN_SHARE = 0.03;

type RGB = [number, number, number];

const hex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function hsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}

/** The COLORS family a colour belongs to (lib/taxonomy.ts) */
export function familyOf(rgb: RGB): string {
  const [h, s, l] = hsl(rgb);
  if (l < 13) return "black";
  if (l > 93 && s < 60) return "white";
  if (s < 12 || (s < 20 && (l < 25 || l > 85))) return l > 80 ? "white" : l < 22 ? "black" : "grey";
  // Warm, pale and unsaturated: paper, sand, cream
  if (h >= 20 && h < 60 && l > 70 && s < 65) return "beige";
  if (h >= 10 && h < 45 && l < 45) return "brown";
  if (h < 12 || h >= 345) return l > 75 ? "pink" : "red";
  if (h < 40) return "orange";
  if (h < 66) return "yellow";
  if (h < 160) return "green";
  if (h < 195) return "teal";
  if (h < 255) return "blue";
  if (h < 290) return "purple";
  return "pink";
}

/** Up to K main colours of an image with their share, largest first, plus the families present. */
export async function paletteOf(image: Buffer): Promise<{ colors: InspoColor[]; palette: string[]; theme: "light" | "dark" | "mixed" }> {
  const sharp = (await import("sharp")).default;
  const { data } = await sharp(image).resize(SIDE, SIDE, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px: RGB[] = [];
  for (let i = 0; i < data.length; i += 3) px.push([data[i], data[i + 1], data[i + 2]]);

  // k-means, seeded across the image so the seeds are spread
  let centers: RGB[] = Array.from({ length: K }, (_, i) => [...px[Math.floor(((i + 0.5) * px.length) / K)]] as RGB);
  const owner = new Uint8Array(px.length);
  for (let round = 0; round < ROUNDS; round++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    px.forEach((p, i) => {
      let best = 0, bestD = Infinity;
      centers.forEach((c, k) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bestD) { bestD = d; best = k; }
      });
      owner[i] = best;
      const s = sum[best]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    });
    centers = centers.map((c, k) => (sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c) as RGB);
  }
  const counts = new Array(K).fill(0);
  for (const o of owner) counts[o]++;

  // Clusters that land in the same family merge: two greys are one grey
  const byFamily = new Map<string, InspoColor>();
  centers.forEach((c, k) => {
    const share = counts[k] / px.length;
    if (share < MIN_SHARE) return;
    const family = familyOf(c);
    const prev = byFamily.get(family);
    if (!prev) byFamily.set(family, { hex: hex(c), share, family });
    else { if (share > prev.share) prev.hex = hex(c); prev.share += share; }
  });
  const colors = [...byFamily.values()].sort((a, b) => b.share - a.share).map((c) => ({ ...c, share: Math.round(c.share * 100) / 100 }));

  // Theme from the average lightness weighted by area
  let dark = 0;
  centers.forEach((c, k) => { if (hsl(c)[2] < 35) dark += counts[k] / px.length; });
  const theme = dark > 0.6 ? "dark" : dark > 0.3 ? "mixed" : "light";
  return { colors, palette: colors.map((c) => c.family), theme };
}
