// One gate for every Chromium this process launches: screenshots, DESIGN.md extraction, the probe.
// On Vercel each function had its own machine; on one server they all share its CPU and memory,
// and each Chromium takes 300–500 MB. CHROME_CONCURRENCY raises it on a bigger server (default 1).
import "server-only";
import type { Browser } from "puppeteer-core";

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

/**
 * Launches a browser once a slot is free. The slot frees itself when the browser goes away
 * (close, a crash, or an abort that closes it), so callers keep closing it as they already do.
 */
export async function gatedLaunch(launch: () => Promise<Browser>): Promise<Browser> {
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
