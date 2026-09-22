// Filtro de calidad para capturas de webs: decide si una imagen parece una portada
// de verdad o una pantalla que no merece escaparate (en blanco, "verificando tu
// navegador" de Cloudflare, un preloader con el logo solo, un render a medias…).
//
// Calibrado con las capturas del estudio: reducida a 96×60 y cuantizada a 32 niveles
// por canal, una portada real tiene 10 colores distintos o más; las malas se quedan
// en 1–8 (fondo + un texto o glifo). Una mitad completamente negra y plana es un
// render que se cortó a medias.
import sharp from "sharp";

const W = 96, H = 60;
const MIN_COLORS = 9;          // colores con al menos un 0,2 % de píxeles (ignora ruido JPEG)
const MIN_STDDEV = 6;          // desviación de luminancia: por debajo es una pantalla plana
const FLAT_HALF_STDDEV = 1.5;  // mitad "plana"…
const FLAT_HALF_BLACK = 12;    // …y casi negra: render a medias

export type ShotQuality = { ok: boolean; colors: number; stddev: number; flatBlackHalf: boolean };

export async function analyzeShot(img: Buffer): Promise<ShotQuality> {
  const { data } = await sharp(img).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = W * H;
  const lum = new Float32Array(N);
  const counts = new Map<number, number>();
  for (let i = 0; i < N; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const colors = [...counts.values()].filter((c) => c >= N * 0.002).length;
  const stddev = stats(lum, (i) => i < N).sd;

  const halves: ((i: number) => boolean)[] = [
    (i) => i < N / 2, (i) => i >= N / 2,             // arriba / abajo
    (i) => i % W < W / 2, (i) => i % W >= W / 2,     // izquierda / derecha
  ];
  const flatBlackHalf = halves.some((h) => { const s = stats(lum, h); return s.sd < FLAT_HALF_STDDEV && s.mean < FLAT_HALF_BLACK; });

  return { ok: colors >= MIN_COLORS && stddev >= MIN_STDDEV && !flatBlackHalf, colors, stddev, flatBlackHalf };
}

/** ¿Parece una portada real? (false = no enseñarla en el escaparate) */
export async function looksLikeRealPage(img: Buffer): Promise<boolean> {
  try { return (await analyzeShot(img)).ok; } catch { return false; }
}

function stats(lum: Float32Array, pick: (i: number) => boolean) {
  let n = 0, s = 0, s2 = 0;
  for (let i = 0; i < lum.length; i++) if (pick(i)) { n++; s += lum[i]; s2 += lum[i] * lum[i]; }
  const mean = s / n;
  return { mean, sd: Math.sqrt(Math.max(0, s2 / n - mean * mean)) };
}
