// Captures the first screen of each site on the resources page once and saves it as a static thumbnail in
// public/resources/<slug>.jpg (committed). Runs on Node's own TypeScript support, with the local Chrome:
//   npm run shots                    → only the missing ones
//   npm run shots -- --force         → recaptures all of them
//   npm run shots -- godly           → only those containing "godly"
//   --visible  → opens a real Chrome window: needed for sites behind Vercel's "Security Checkpoint",
//                which blocks headless browsers.
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { RESOURCES, resourceShot, type Resource } from "../src/resources.ts";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "resources");
// A 1440 × 900 screen drawn at half density: the file comes out 720 wide, as the page shows it
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 0.5 };
const QUALITY = 74;
const SETTLE_MS = 1500;
// Below this it's usually a blank page or a "verifying your browser"
const MIN_BYTES = 8 * 1024;
const CHROME = process.env.CHROME_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
// The usual consent and cookie layers, hidden so the hero is what gets captured
const HIDE_CSS = `
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [id*="gdpr" i], [class*="gdpr" i], [aria-label*="cookie" i],
  #onetrust-consent-sdk, .cc-window, .cky-consent-container, #CybotCookiebotDialog,
  .w-webflow-badge, a[href*="webflow.com"] { display: none !important; }
`;

const args = process.argv.slice(2);
const force = args.includes("--force");
const visible = args.includes("--visible");
const needle = args.find((a) => !a.startsWith("--"))?.toLowerCase();

const exists = (p: string) => access(p).then(() => true, () => false);

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: !visible, defaultViewport: VIEWPORT,
  args: ["--disable-blink-features=AutomationControlled", "--hide-scrollbars"],
});

async function one(r: Resource) {
  const { name, url } = r;
  const file = join(OUT, `${resourceShot(r)}.jpg`);
  if (!force && (await exists(file))) { console.log(`· ${name} (already exists)`); return; }
  const page = await browser.newPage();
  try {
    await page.setUserAgent({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" });
    // Sites with long-polling never go idle: capture whatever is there
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    if (visible) {
      for (let i = 0; i < 30 && /security checkpoint/i.test(await page.title().catch(() => "")); i++) await new Promise((r) => setTimeout(r, 1000));
    }
    await page.addStyleTag({ content: HIDE_CSS }).catch(() => {});
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    const jpeg = await page.screenshot({ type: "jpeg", quality: QUALITY });
    if (jpeg.length < MIN_BYTES) { console.log(`✗ ${name}: screenshot nearly empty (${(jpeg.length / 1024).toFixed(0)}kB), not saved`); return; }
    await writeFile(file, jpeg);
    console.log(`✓ ${name} ${(jpeg.length / 1024).toFixed(0)}kB`);
  } catch (e) {
    console.log(`✗ ${name}: ${e instanceof Error ? e.message : e}`);
  } finally {
    await page.close();
  }
}

await mkdir(OUT, { recursive: true });
const queue = RESOURCES.flatMap((g) => g.items).filter((r) => !needle || `${r.name} ${r.url}`.toLowerCase().includes(needle));
await Promise.all(Array.from({ length: visible ? 1 : 2 }, async () => {
  while (queue.length) { const r = queue.shift()!; await one(r); }
}));
await browser.close();
