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
// Screenshots and extraction start the same Chromium the same way: one binary, the same flags, WebGL on.
// Extraction adds one flag so the recorder can play media.

const VIEWPORT = { width: 1440, height: 900 };
/** A whole-page capture stops here: past about 16384px Chromium cannot paint the page in one screenshot */
export const PAGE_MAX_H = 16000;

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
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

async function chrome(): Promise<{ executablePath: string; args: string[] }> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return { executablePath: await serverlessExecutablePath(), args: chromium.args };
  }
  const executablePath = process.env.CHROME_EXECUTABLE_PATH || LOCAL_CHROME_CANDIDATES.find((c) => fs.existsSync(c));
  if (!executablePath) throw new Error("No local Chrome found. Set CHROME_EXECUTABLE_PATH.");
  return { executablePath, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] };
}

const EXTRA_ARGS = {
  shot: [],
  extract: ["--autoplay-policy=no-user-gesture-required"],
};

async function launch(kind: keyof typeof EXTRA_ARGS): Promise<Browser> {
  const { executablePath, args } = await chrome();
  return puppeteer.launch({
    executablePath,
    args: [...args, ...EXTRA_ARGS[kind], ...(await egressArgs())],
    defaultViewport: VIEWPORT,
    headless: true,
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

/**
 * Runs `run` on a fresh page of its own Chromium, behind the gate (it throws QueueFull when the line is full),
 * then closes the browser whatever happened. The page only reaches public addresses (lib/safe-fetch.ts).
 * `signal`: aborting closes Chromium at once, so whatever step is pending fails and the caller's error reports it.
 */
export async function withPage<T>(kind: keyof typeof EXTRA_ARGS, run: (page: Page) => Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  const browser = await gatedLaunch(() => launch(kind));
  const onAbort = () => { void browser.close().catch(() => {}); };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const page = await browser.newPage();
    await guardPage(page);
    // Reduced motion: sites that hold the page behind an intro or reveal it on scroll show everything at once.
    // Light: the same capture on any machine, not the dark mode of the Mac that runs it.
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }]);
    return await run(page);
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await browser.close().catch(() => {}); // cleanup: a crashed browser has nothing to close
  }
}
