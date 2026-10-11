// withPage (lib/browser.ts) against a fake Chromium: one at a time, a full line refused at once, the browser
// closed whatever happens, and an abort that closes it mid-run.
import { EventEmitter } from "node:events";
import { beforeEach, expect, test, vi } from "vitest";

class FakeBrowser extends EventEmitter {
  closed = false;
  async newPage() {
    return { setRequestInterception: async () => {}, on: () => {}, emulateMediaFeatures: async () => {} };
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    this.emit("disconnected");
  }
}

const launched: FakeBrowser[] = [];
vi.mock("puppeteer-core", () => {
  const launch = async () => { const b = new FakeBrowser(); launched.push(b); return b; };
  return { default: { launch }, launch };
});
vi.mock("@/lib/egress-proxy", () => ({ egressArgs: async () => [] }));

const { withPage, QueueFull } = await import("@/lib/browser");

process.env.CHROME_EXECUTABLE_PATH = "/chrome";
beforeEach(() => { launched.length = 0; });

function held() {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  return { gate, release };
}
const tick = () => new Promise((r) => setTimeout(r, 10));

test("returns what the run returns and closes the browser, also when the run throws", async () => {
  expect(await withPage("extract", async () => 42)).toBe(42);
  await expect(withPage("extract", async () => { throw new Error("site broke"); })).rejects.toThrow("site broke");
  expect(launched.map((b) => b.closed)).toEqual([true, true]);
});

test("a second run waits for the first one's browser to close", async () => {
  const first = held();
  const a = withPage("extract", () => first.gate);
  const b = withPage("extract", async () => "second");
  await tick();
  expect(launched.length, "one Chromium at a time").toBe(1);
  first.release();
  await a;
  expect(await b).toBe("second");
  expect(launched.length).toBe(2);
});

test("past 20 in line, a run fails at once with QueueFull and launches nothing", async () => {
  const first = held();
  const running = withPage("extract", () => first.gate);
  const waiting = Array.from({ length: 20 }, () => withPage("extract", async () => {}));
  await tick();
  await expect(withPage("extract", async () => {})).rejects.toBeInstanceOf(QueueFull);
  expect(launched.length).toBe(1);
  first.release();
  await Promise.all([running, ...waiting]);
  expect(launched.length).toBe(21);
});

test("an abort closes the browser mid-run, and an aborted signal never launches", async () => {
  const stop = new AbortController();
  const run = withPage("extract", () => new Promise((_, reject) => {
    launched[0].once("disconnected", () => reject(new Error("target closed")));
  }), stop.signal);
  await tick();
  stop.abort();
  await expect(run).rejects.toThrow("target closed");
  expect(launched[0].closed).toBe(true);

  await expect(withPage("extract", async () => {}, stop.signal)).rejects.toThrow();
  expect(launched.length).toBe(1);
});
