import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { put, get, head } from "@vercel/blob";
import puppeteer, { Browser } from "puppeteer-core";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const VIEWPORT = { width: 1440, height: 900 };
const GOTO_TIMEOUT_MS = 20000;
const SETTLE_MS = 1500;
const JPEG_QUALITY = 78;

// ─── Storage ─────────────────────────────────────────────────────────────────

export function shotKey(url: string): string {
  return createHash("sha1").update(url.trim()).digest("hex");
}

const SHOTS_DIR = path.join(process.cwd(), "public", "shots");

export async function getStoredShot(url: string): Promise<Buffer | null> {
  const key = shotKey(url);
  if (USE_BLOB) {
    try {
      const res = await get(`inspo/shots/${key}.jpg`, { access: "private" });
      if (!res || !res.stream) return null;
      return Buffer.from(await new Response(res.stream).arrayBuffer());
    } catch {
      return null;
    }
  }
  try {
    return await fs.readFile(path.join(SHOTS_DIR, `${key}.jpg`));
  } catch {
    return null;
  }
}

/** Is there a stored screenshot? Metadata only: doesn't download the image. */
export async function hasStoredShot(url: string): Promise<boolean> {
  const key = shotKey(url);
  if (USE_BLOB) {
    try { await head(`inspo/shots/${key}.jpg`); return true; } catch { return false; }
  }
  try { await fs.access(path.join(SHOTS_DIR, `${key}.jpg`)); return true; } catch { return false; }
}

/** Public path of the screenshot locally (public/shots). In production it goes through private blob. */
export const localShotPath = (url: string) => `/shots/${shotKey(url)}.jpg`;

async function storeShot(url: string, jpeg: Buffer): Promise<void> {
  const key = shotKey(url);
  if (USE_BLOB) {
    await put(`inspo/shots/${key}.jpg`, jpeg, {
      access: "private",
      contentType: "image/jpeg",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await fs.mkdir(SHOTS_DIR, { recursive: true });
  await fs.writeFile(path.join(SHOTS_DIR, `${key}.jpg`), jpeg);
}

// ─── Browser ─────────────────────────────────────────────────────────────────

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

// On Vercel, executablePath() unpacks Chromium into /tmp the first time. If two
// requests ask at once, one runs the binary while the other is still writing it
// and the spawn fails with ETXTBSY. A single promise is shared per instance.
let serverlessChromePath: Promise<string> | null = null;
async function serverlessExecutablePath(): Promise<string> {
  if (!serverlessChromePath) {
    serverlessChromePath = import("@sparticuz/chromium")
      .then((m) => m.default.executablePath())
      .catch((e) => { serverlessChromePath = null; throw e; });
  }
  return serverlessChromePath;
}

async function launchBrowser(): Promise<Browser> {
  if (IS_SERVERLESS) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: VIEWPORT,
      executablePath: await serverlessExecutablePath(),
      headless: true,
    });
  }

  for (const candidate of LOCAL_CHROME_CANDIDATES) {
    try {
      await fs.access(candidate);
      return puppeteer.launch({
        executablePath: candidate,
        defaultViewport: VIEWPORT,
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
      });
    } catch { /* try next */ }
  }
  throw new Error("No local Chrome found. Set CHROME_EXECUTABLE_PATH.");
}

// Hide the usual consent / cookie layers so the hero is what we capture.
const HIDE_CSS = `
  [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
  [id*="gdpr" i], [class*="gdpr" i], [aria-label*="cookie" i],
  #onetrust-consent-sdk, .cc-window, .cky-consent-container, #CybotCookiebotDialog,
  .w-webflow-badge, a[href*="webflow.com"] { display: none !important; }
`;

const ACCEPT_TEXTS = ["aceptar", "accept", "agree", "allow", "ok", "got it", "entendido", "onartu"];

// In-process gate so we don't launch a dozen Chromes at once. In a serverless
// function memory allows one; locally, two.
let active = 0;
const waiters: (() => void)[] = [];
const MAX_CONCURRENT = IS_SERVERLESS ? 1 : 2;
async function acquire() {
  if (active < MAX_CONCURRENT) { active++; return; }
  await new Promise<void>((r) => waiters.push(r));
  active++;
}
function release() {
  active--;
  waiters.shift()?.();
}

export async function captureHero(url: string): Promise<Buffer> {
  await acquire();
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 InspoBot/1.0"
    );
    await page.setExtraHTTPHeaders({ "Accept-Language": "es-ES,es;q=0.9,en;q=0.8" });

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: GOTO_TIMEOUT_MS });
    } catch {
      // Sites with long-polling never go idle; capture whatever is there.
    }

    await page.addStyleTag({ content: HIDE_CSS }).catch(() => {});

    // Click a consent button if one is still visible.
    await page.evaluate((texts) => {
      const els = Array.from(document.querySelectorAll<HTMLElement>("button, a[role=button], [role=button]"));
      const hit = els.find((el) => {
        const t = (el.innerText || "").trim().toLowerCase();
        return t.length < 24 && texts.some((x) => t === x || t.startsWith(x + " "));
      });
      hit?.click();
    }, ACCEPT_TEXTS).catch(() => {});

    await page.evaluate(() => (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready).catch(() => {});
    await new Promise((r) => setTimeout(r, SETTLE_MS));

    const jpeg = await page.screenshot({ type: "jpeg", quality: JPEG_QUALITY, fullPage: false });
    return Buffer.from(jpeg);
  } finally {
    await browser?.close().catch(() => {});
    release();
  }
}

export async function getOrCaptureShot(url: string): Promise<Buffer> {
  const cached = await getStoredShot(url);
  if (cached) return cached;
  const jpeg = await captureHero(url);
  await storeShot(url, jpeg);
  return jpeg;
}
