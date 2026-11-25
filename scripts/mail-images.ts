// The pictures the emails load from criterio.design (marketing-site/public/assets/correo/), made from what the site
// already has. A mail client in dark mode paints over an email's colors but not its pictures, so whatever a picture
// needs behind it is drawn in it.
//
//   npm run mail:images     tino.png       the mark on a white tile (LOGO_URL in lib/mail-layout.ts)
//                           equipo.png     the three partners
//                           video-*.jpg    the minute-long video's poster with its play key, per language
import { mkdir, readFile } from "node:fs/promises";
import sharp from "sharp";

const ASSETS = "marketing-site/public/assets", OUT = `${ASSETS}/correo`;
const INK = "#1B1B18", EMBER = "#E8892B";
const svg = (w: number, h: number, inner: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`);

async function tino() {
  const d = /<path[^>]* d="([^"]+)"/.exec(await readFile(`${ASSETS}/marca/conejo-icono.svg`, "utf8"))![1];
  const size = 160, mark = 112, at = (size - mark) / 2;
  await sharp(svg(size, size, `<rect width="${size}" height="${size}" rx="40" fill="#FFFFFF"/><path transform="translate(${at} ${at}) scale(${mark / 24})" fill="${INK}" shape-rendering="crispEdges" d="${d}"/>`)).png().toFile(`${OUT}/tino.png`);
}

async function equipo() {
  const size = 144, step = 112, ring = 8, people = ["eric", "andoni", "alberto"];
  const disc = svg(size, size, `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/>`);
  const faces = await Promise.all(people.map((p) =>
    sharp(`${ASSETS}/vault/equipo/${p}.jpg`).resize(size, size, { position: "top" }).composite([{ input: disc, blend: "dest-in" }]).png().toBuffer()));
  const w = step * (people.length - 1) + size + ring * 2, h = size + ring * 2;
  await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(faces.flatMap((input, i) => [
      { input: svg(h, h, `<circle cx="${h / 2}" cy="${h / 2}" r="${h / 2}" fill="#FFFFFF"/>`), left: i * step, top: 0 },
      { input, left: i * step + ring, top: ring },
    ])).png().toFile(`${OUT}/equipo.png`);
}

async function video(locale: "es" | "en") {
  const w = 960, h = 540, key = 112, x = (w - key) / 2, y = (h - key) / 2;
  await sharp(`${ASSETS}/vault/video/poster-${locale}.jpg`).resize(w, h)
    .composite([{ input: svg(w, h, `<rect x="${x}" y="${y + 8}" width="${key}" height="${key}" rx="26" fill="${INK}"/><rect x="${x}" y="${y}" width="${key}" height="${key}" rx="26" fill="${EMBER}" stroke="${INK}" stroke-width="4"/><path d="M${x + 43} ${y + 34}v44l37-22z" fill="${INK}"/>`) }])
    .jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/video-${locale}.jpg`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await Promise.all([tino(), equipo(), video("es"), video("en")]);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
