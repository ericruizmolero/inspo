// Captures the home page of each site in the Directory once and saves it
// as a static thumbnail in public/directory/<slug>.jpg (committed).
//   npx tsx scripts/directory-shots.ts          → only the missing ones
//   npx tsx scripts/directory-shots.ts --force  → recaptures all of them
//   npx tsx scripts/directory-shots.ts godly    → only those containing "godly"
//   --visible  → opens real Chrome (not headless): needed for sites behind
//                Vercel's "Security Checkpoint", which blocks headless browsers.
import { promises as fs } from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { DIRECTORY, siteSlug } from "../lib/directory";
import { captureHero } from "../lib/screenshot";

const OUT = path.join(process.cwd(), "public", "directory");
const WIDTH = 720;
const QUALITY = 74;
const CONCURRENCY = 2; // 1 with --visible
// Below this it's usually a blank page or a "verifying your browser".
const MIN_BYTES = 8 * 1024;

const args = process.argv.slice(2);
const force = args.includes("--force");
const visible = args.includes("--visible");
const CHROME = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const needle = args.find((a) => !a.startsWith("--"))?.toLowerCase();

async function exists(p: string) { try { await fs.access(p); return true; } catch { return false; } }

// Windowed Chrome: gets past Vercel's checkpoint by waiting for the title to change.
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
  const file = path.join(OUT, `${siteSlug(url)}.jpg`);
  if (!force && (await exists(file))) { console.log(`· ${name} (already exists)`); return; }
  try {
    const raw = visible ? await captureVisible(url) : await captureHero(url);
    const jpeg = await sharp(raw).resize({ width: WIDTH }).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
    if (jpeg.length < MIN_BYTES) { console.log(`✗ ${name}: screenshot nearly empty (${(jpeg.length / 1024).toFixed(0)}kB), not saved`); return; }
    await fs.writeFile(file, jpeg);
    console.log(`✓ ${name} ${(jpeg.length / 1024).toFixed(0)}kB`);
  } catch (e) {
    console.log(`✗ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const all = DIRECTORY.flatMap((g) => g.items).filter((r) => !needle || `${r.name} ${r.url}`.toLowerCase().includes(needle));
  const queue = [...all];
  await Promise.all(Array.from({ length: visible ? 1 : CONCURRENCY }, async () => {
    while (queue.length) { const r = queue.shift()!; await one(r.name, r.url); }
  }));
}
main();
