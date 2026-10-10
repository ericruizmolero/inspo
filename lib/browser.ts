// Every Chromium this process launches: screenshots, DESIGN.md extraction, the scripts that check it.
// One gate for all of them. On Vercel each function had its own machine; on one server they all share its CPU
// and memory, and each Chromium takes 300–500 MB. CHROME_CONCURRENCY raises it on a bigger server (default 1).
import "server-only";
import fs from "fs";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { guardPage } from "./safe-fetch";
import { egressArgs } from "./egress-proxy";

// ─── Gate ────────────────────────────────────────────────────────────────────

const MAX = Math.max(1, Number(process.env.CHROME_CONCURRENCY) || 1);
let active = 0;
const waiters: (() => void)[] = [];
// Past this many in line, a new job fails at once instead of waiting minutes behind the others
const MAX_WAITING = 20;
/** The gate was full: the site itself did not fail */
export class QueueFull extends Error { constructor() { super("browser queue full"); } }

function acquire(): Promise<void> {
  if (active < MAX) { active++; return Promise.resolve(); }
  if (waiters.length >= MAX_WAITING) return Promise.reject(new QueueFull());
  return new Promise((resolve) => waiters.push(() => { active++; resolve(); }));
}

function release() {
  active--;
  waiters.shift()?.();
}

/** Launches a browser once a slot is free. The slot frees itself when the browser goes away (close, a crash, or an abort that closes it). */
async function gatedLaunch(launch: () => Promise<Browser>): Promise<Browser> {
  await acquire();
  let freed = false;
  const free = () => { if (!freed) { freed = true; release(); } };
  try {
    const browser = await launch();
    browser.once("disconnected", free);
    return browser;
  } catch (e) {
    free();
    throw e;
  }
}

// ─── Launch ──────────────────────────────────────────────────────────────────
// Screenshots and extraction grew their own launches, and their captures depend on them (flags, WebGL,
// which Chrome is found). They stay two until someone compares what each one captures.

const VIEWPORT = { width: 1440, height: 900 };
const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  MAC_CHROME,
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

async function launchForShots(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
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
      await fs.promises.access(candidate);
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

async function launchForExtraction(): Promise<Browser> {
  const local = process.env.CHROME_PATH || (process.platform === "darwin" && fs.existsSync(MAC_CHROME) ? MAC_CHROME : null);

  if (local && !process.env.VERCEL) {
    return puppeteer.launch({
      executablePath: local,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required", ...(await egressArgs())],
    });
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  chromium.setGraphicsMode = false;
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: [...chromium.args, "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", ...(await egressArgs())],
    headless: true,
    defaultViewport: VIEWPORT,
  });
}

const LAUNCH = { shot: launchForShots, extract: launchForExtraction };

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Runs `use` on a fresh page of its own Chromium, behind the gate (it throws QueueFull when the line is full),
 * then closes the browser whatever happened. The page only reaches public addresses (lib/safe-fetch.ts).
 * `signal`: aborting closes Chromium at once, so whatever step is pending fails and the caller's error reports it.
 */
export async function withPage<T>(launch: keyof typeof LAUNCH, use: (page: Page) => Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  const browser = await gatedLaunch(LAUNCH[launch]);
  const onAbort = () => { void browser.close().catch(() => {}); };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const page = await browser.newPage();
    await guardPage(page);
    // Reduced motion: sites that hold the page behind an intro or reveal it on scroll show everything at once.
    // Light: the same capture on any machine, not the dark mode of the Mac that runs it.
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }]);
    return await use(page);
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await browser.close().catch(() => {}); // cleanup: a crashed browser has nothing to close
  }
}
