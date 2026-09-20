// Captura una vez la portada de cada web del directorio de Recursos y la guarda
// como miniatura estática en public/recursos/<slug>.jpg (se commitea).
//   npx tsx scripts/recursos-shots.ts          → solo las que faltan
//   npx tsx scripts/recursos-shots.ts --force  → vuelve a capturar todas
//   npx tsx scripts/recursos-shots.ts godly    → solo las que contengan "godly"
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { RECURSOS, recursoSlug } from "../lib/recursos";
import { captureHero } from "../lib/screenshot";

const OUT = path.join(process.cwd(), "public", "recursos");
const WIDTH = 720;
const QUALITY = 74;
const CONCURRENCY = 2;
// Por debajo de esto suele ser una página en blanco o un "verificando tu navegador".
const MIN_BYTES = 8 * 1024;

const args = process.argv.slice(2);
const force = args.includes("--force");
const needle = args.find((a) => !a.startsWith("--"))?.toLowerCase();

async function exists(p: string) { try { await fs.access(p); return true; } catch { return false; } }

async function one(name: string, url: string) {
  const file = path.join(OUT, `${recursoSlug(url)}.jpg`);
  if (!force && (await exists(file))) { console.log(`· ${name} (ya existe)`); return; }
  try {
    const raw = await captureHero(url);
    const jpeg = await sharp(raw).resize({ width: WIDTH }).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    if (jpeg.length < MIN_BYTES) { console.log(`✗ ${name}: captura casi vacía (${(jpeg.length / 1024).toFixed(0)}kB), no se guarda`); return; }
    await fs.writeFile(file, jpeg);
    console.log(`✓ ${name} ${(jpeg.length / 1024).toFixed(0)}kB`);
  } catch (e) {
    console.log(`✗ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const all = RECURSOS.flatMap((g) => g.items).filter((r) => !needle || `${r.name} ${r.url}`.toLowerCase().includes(needle));
  const queue = [...all];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) { const r = queue.shift()!; await one(r.name, r.url); }
  }));
}
main();
