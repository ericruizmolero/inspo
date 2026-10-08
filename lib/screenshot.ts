import { createHash } from "crypto";
import { promises as fs } from "fs";
import puppeteer, { Browser } from "puppeteer-core";
import { webKeyOf } from "./url";
import { getFile, fileExists, putFile } from "./storage";
import { gatedLaunch, QueueFull } from "./browser-gate";
import type { PageShot } from "@/types/inspo";
import { guardPage } from "./safe-fetch";
import { egressArgs } from "./egress-proxy";

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const VIEWPORT = { width: 1440, height: 900 };
const GOTO_TIMEOUT_MS = 20000;
const SETTLE_MS = 1500;
const JPEG_QUALITY = 78;
/** The whole page is cut here, as the DESIGN.md capture does */
const MAX_PAGE_H = 6000;

// ─── Storage ─────────────────────────────────────────────────────────────────
// One hero screenshot per site, shared across workspaces (lib/storage.ts, inspo/shots/).

export function shotKey(url: string): string {
  return createHash("sha1").update(webKeyOf(url)).digest("hex");
}

const shotFile = (url: string) => `inspo/shots/${shotKey(url)}.jpg`;

export async function getStoredShot(url: string): Promise<Buffer | null> {
  try { return (await getFile(shotFile(url)))?.body ?? null; } catch { return null; }
}

/** Is there a stored screenshot? Metadata only: doesn't download the image. */
export async function hasStoredShot(url: string): Promise<boolean> {
  try { return await fileExists(shotFile(url)); } catch { return false; }
}

async function storeShot(url: string, jpeg: Buffer): Promise<void> {
  await putFile(shotFile(url), jpeg, "image/jpeg");
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
      args: [...chromium.args, ...(await egressArgs())],
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
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars", ...(await egressArgs())],
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

/** The first screen of the site; with `full`, the whole page (up to 6000px tall), scrolled once so lazy parts load */
export async function captureHero(url: string, full = false): Promise<Buffer> {
  let browser: Browser | null = null;
  try {
    // Waits for a free slot in the shared gate (lib/browser-gate.ts)
    browser = await gatedLaunch(launchBrowser);
    const page = await browser.newPage();
    await guardPage(page);
    // Reduced motion: sites that hold the page behind an intro or reveal it on scroll show everything at once.
    // Light: the same capture on any machine, not the dark mode of the Mac that runs it.
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }]);
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

    if (full) {
      await page.evaluate(`(async () => {
        const h = document.documentElement.scrollHeight;
        for (let y = 0; y < Math.min(h, ${MAX_PAGE_H}); y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
        window.scrollTo(0, 0);
      })()`).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
      const h = (await page.evaluate("document.documentElement.scrollHeight").catch(() => VIEWPORT.height)) as number;
      const height = Math.max(VIEWPORT.height, Math.min(Number(h) || VIEWPORT.height, MAX_PAGE_H));
      const jpeg = await page.screenshot({ type: "jpeg", quality: 62, clip: { x: 0, y: 0, width: VIEWPORT.width, height }, captureBeyondViewport: true });
      return Buffer.from(jpeg);
    }
    const jpeg = await page.screenshot({ type: "jpeg", quality: JPEG_QUALITY, fullPage: false });
    return Buffer.from(jpeg);
  } finally {
    await browser?.close().catch(() => {});
  }
}

// A site that failed is not tried again for a while. The browser's own cache on the 204 is not enough:
// a client that ignores it would hold the only Chromium slot with sites that hang for 20 s each
const FAILED_FOR_MS = 15 * 60 * 1000;
const failedAt = new Map<string, number>();

/** `beforeCapture` runs only when the browser is about to be launched (a stored shot costs nothing) and may throw */
export async function getOrCaptureShot(url: string, beforeCapture?: () => Promise<void>): Promise<Buffer> {
  const cached = await getStoredShot(url);
  if (cached) return cached;
  const failed = failedAt.get(url);
  if (failed && Date.now() - failed < FAILED_FOR_MS) throw new Error("failed recently");
  await beforeCapture?.();
  try {
    const jpeg = await captureHero(url);
    failedAt.delete(url);
    await storeShot(url, jpeg);
    return jpeg;
  } catch (e) {
    if (failedAt.size > 5000) failedAt.clear();
    if (!(e instanceof QueueFull)) failedAt.set(url, Date.now());
    throw e;
  }
}

// ─── Whole page ──────────────────────────────────────────────────────────────
// Sites without a DESIGN.md get a full-page capture of their own, once (lib/page-shots.ts).

/** Captures the whole page and stores it with its canvas copies */
export async function capturePage(url: string): Promise<PageShot> {
  const { savePageShot } = await import("./page-shots");
  return savePageShot(url, shotKey(url), await captureHero(url, true));
}

/**
 * One browser run for everything a new site needs: the whole page with its canvas copies, and the card's
 * first screen cut from it when there is none yet. Returns the whole page (for the tagger).
 */
export async function captureNewPage(url: string): Promise<Buffer> {
  const full = await captureHero(url, true);
  const { savePageShot } = await import("./page-shots");
  const sharp = (await import("sharp")).default;
  await Promise.all([
    savePageShot(url, shotKey(url), full),
    hasStoredShot(url).then(async (has) => {
      if (has) return;
      const { width = VIEWPORT.width, height = VIEWPORT.height } = await sharp(full).metadata();
      const top = await sharp(full).extract({ left: 0, top: 0, width, height: Math.min(height, VIEWPORT.height) }).jpeg({ quality: JPEG_QUALITY }).toBuffer();
      await storeShot(url, top);
    }),
  ]);
  return full;
}
