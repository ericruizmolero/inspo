// Captura una vez la portada de cada web del directorio de Recursos y la guarda
// como miniatura estática en public/recursos/<slug>.jpg (se commitea).
//   npx tsx scripts/recursos-shots.ts          → solo las que faltan
//   npx tsx scripts/recursos-shots.ts --force  → vuelve a capturar todas
//   npx tsx scripts/recursos-shots.ts godly    → solo las que contengan "godly"
//   --visible  → abre Chrome de verdad (no headless): necesario para webs con el
//                "Security Checkpoint" de Vercel, que bloquea el navegador headless.
import { promises as fs } from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { RECURSOS, recursoSlug } from "../lib/recursos";
import { captureHero } from "../lib/screenshot";

const OUT = path.join(process.cwd(), "public", "recursos");
const WIDTH = 720;
const QUALITY = 74;
const CONCURRENCY = 2; // con --visible se usa 1
// Por debajo de esto suele ser una página en blanco o un "verificando tu navegador".
const MIN_BYTES = 8 * 1024;

const args = process.argv.slice(2);
const force = args.includes("--force");
const visible = args.includes("--visible");
const CHROME = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const needle = args.find((a) => !a.startsWith("--"))?.toLowerCase();

async function exists(p: string) { try { await fs.access(p); return true; } catch { return false; } }

// Chrome con ventana: pasa el checkpoint de Vercel esperando a que cambie el título.
async function captureVisible(url: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: false, defaultViewport: { width: 1440, height: 900 },
    args: ["--disable-blink-features=AutomationControlled", "--window-size=1440,900", "--hide-scrollbars"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    for (let i = 0; i < 30; i++) {
      const t = await page.title().catch(() => "");
      if (t && !/security checkpoint/i.test(t)) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    await new Promise((r) => setTimeout(r, 3000));
    return Buffer.from(await page.screenshot({ type: "jpeg", quality: 80 }));
  } finally {
    await browser.close();
  }
}

async function one(name: string, url: string) {
  const file = path.join(OUT, `${recursoSlug(url)}.jpg`);
  if (!force && (await exists(file))) { console.log(`· ${name} (ya existe)`); return; }
  try {
    const raw = visible ? await captureVisible(url) : await captureHero(url);
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
  await Promise.all(Array.from({ length: visible ? 1 : CONCURRENCY }, async () => {
    while (queue.length) { const r = queue.shift()!; await one(r.name, r.url); }
  }));
}
main();
