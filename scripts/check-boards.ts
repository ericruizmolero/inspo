// Importing a board from Are.na, Pinterest or Cosmos (lib/boards): which addresses are a board, and
// what of a board comes in. The parsers run on answers saved from each platform (scripts/fixtures/boards).
// Not a test framework: assert.
//   npm run check:boards           pure checks, no network
//   npm run check:boards -- --live also reads three real boards and prints their counts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { boardOf } from "../lib/boards/match";
import { arenaChannel, arenaPage, collect, cosmosCluster, cosmosPage, MAX_WEBS, pinterestBoard, pinterestPage, BadAnswer, type Page } from "../lib/boards/parse";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/boards/${name}`, import.meta.url), "utf8");
const json = (name: string): unknown => JSON.parse(fixture(name));

// ── boardOf: the addresses people paste ────────────────────────────────────
const pin = (raw: string) => { const r = boardOf(raw); return r?.platform === "pinterest" ? r : null; };
for (const raw of [
  "https://www.pinterest.com/awwwards/site-of-the-day/",
  "pinterest.com/awwwards/site-of-the-day",
  "https://www.pinterest.es/awwwards/site-of-the-day/",
  "https://es.pinterest.com/awwwards/site-of-the-day/",
  "https://www.pinterest.co.uk/awwwards/site-of-the-day/some-section/",
]) assert.deepEqual(pin(raw)?.board, { user: "awwwards", slug: "site-of-the-day" }, raw);
assert.equal(pin("https://www.pinterest.es/awwwards/site-of-the-day/")?.url, "https://www.pinterest.com/awwwards/site-of-the-day/");
assert.deepEqual(boardOf("https://pin.it/4ZsUd0Ewh"), { platform: "pinterest", url: "https://pin.it/4ZsUd0Ewh", board: null });
assert.deepEqual(boardOf("https://www.are.na/daniel-baer/interesting-web-design-and-ux"),
  { platform: "arena", url: "https://www.are.na/daniel-baer/interesting-web-design-and-ux", slug: "interesting-web-design-and-ux" });
assert.equal(boardOf("are.na/channel/interesting-web-design-and-ux")?.platform, "arena");
assert.deepEqual(boardOf("https://www.cosmos.so/matthew3000/world-wide-web"),
  { platform: "cosmos", url: "https://www.cosmos.so/matthew3000/world-wide-web", user: "matthew3000", slug: "world-wide-web" });
assert.equal(boardOf("cosmos.so/matthew3000/world-wide-web")?.platform, "cosmos");
for (const raw of [
  "https://www.pinterest.com/pin/181692166214214580/", // a pin
  "https://www.pinterest.com/awwwards/", // a profile
  "https://www.are.na/daniel-baer", // a profile
  "https://www.are.na/block/50822604", // a block
  "https://www.cosmos.so/e/156812015", // an element
  "https://www.cosmos.so/matthew3000", // a profile
  "https://linear.app", "https://notpinterest.com/a/b", "", "two words",
]) assert.equal(boardOf(raw), null, raw);

// ── Parsers on saved answers ───────────────────────────────────────────────
assert.deepEqual(arenaChannel(json("arena-channel.json")), { name: "Interesting Web Design and UX" });
const arena = arenaPage(json("arena-contents.json"));
assert.equal(arena.webs.length, 39, "a Link block is a website");
assert.equal(arena.skipped, 1, "the Text block is skipped");
assert.equal(arena.more, true);
assert.deepEqual(arena.webs[0], { url: "https://bencho.dev/blocks/step-player", title: "Bencho - UI interactive blocks" });

assert.deepEqual(pinterestBoard(json("pinterest-board.json")), { id: "181692234905713960", name: "Site of the Day" });
const pinPage = pinterestPage(json("pinterest-feed.json"));
assert.equal(pinPage.webs.length, 29, "a pin with a link is a candidate website");
assert.equal(pinPage.skipped, 11, "an uploaded pin (link null) is skipped");
assert.equal(pinPage.bookmark, "Y2JVSG81V2sxcmNHRlpWM1J");
assert.equal(pinterestPage({ resource_response: { data: [], bookmark: "-end-" } }).bookmark, null, "-end- ends the board");

assert.deepEqual(cosmosCluster(fixture("cosmos-cluster.html")), { id: 1082975211, name: "World Wide Web" });
assert.equal(cosmosCluster("<html>no cluster here</html>"), null);
const cos = cosmosPage(json("cosmos-page.json"));
assert.equal(cos.webs.length, 38, "a WebsiteElementTile is a website");
assert.equal(cos.skipped, 2, "media tiles are skipped");
assert.equal(cos.cursor, "eyJ2MSI6MTg1LjAsInYyIjo3MjAyMjg5fQ==");

// An answer we do not understand is the platform not answering, never a half-read board
assert.throws(() => arenaPage({ data: "nope" }), BadAnswer);
assert.throws(() => pinterestBoard({ resource_response: {} }), BadAnswer);
assert.throws(() => cosmosPage({ errors: [{ message: "x" }] }), BadAnswer);

// ── collect: pages -> the board's websites ─────────────────────────────────
async function main() {
  // Instagram links on the Pinterest page are not sites of their own: 29 candidates, 3 of them Instagram
  const fromPin = await collect([pinPage]);
  assert.equal(fromPin.webs.length, 26);
  assert.equal(fromPin.skipped, 11 + 3);
  assert.ok(fromPin.webs.every((w) => !/instagram\.com/.test(w.url)));

  const odd: Page = { skipped: 2, webs: [
    { url: "https://Linear.app/", title: "Linear" },
    { url: "https://linear.app" }, // the same site again: once, and not skipped
    { url: "not a url at all" },
    { url: "javascript:alert(1)" },
    { url: "https://cdn.example.com/shot.PNG" },
    { url: "https://www.youtube.com/watch?v=abc" },
    { url: "https://x.com/someone/status/123" },
  ] };
  const got = await collect([odd]);
  assert.deepEqual(got.webs, [{ url: "https://linear.app", title: "Linear" }]);
  assert.equal(got.skipped, 2 + 5);
  assert.equal(got.capped, false);

  // The cap stops reading: the page after it is never asked for
  let asked = 0;
  async function* many(): AsyncGenerator<Page> {
    for (let p = 0; p < 10; p++) {
      asked++;
      yield { skipped: 0, webs: Array.from({ length: 100 }, (_, i) => ({ url: `https://site-${p}-${i}.com` })) };
    }
  }
  const big = await collect(many());
  assert.equal(big.webs.length, MAX_WEBS);
  assert.equal(big.capped, true);
  assert.equal(asked, 6, "five full pages, and the sixth shows there is more");
  const exact = await collect([{ skipped: 0, webs: Array.from({ length: MAX_WEBS }, (_, i) => ({ url: `https://s${i}.com` })) }]);
  assert.equal(exact.capped, false, "exactly the cap is not capped");

  console.log("boards: pure checks pass");

  if (!process.argv.includes("--live")) return;
  const { readBoard } = await import("../lib/boards/read");
  for (const url of [
    "https://www.are.na/daniel-baer/interesting-web-design-and-ux",
    "https://www.pinterest.com/awwwards/site-of-the-day/",
    "https://pin.it/4ZsUd0Ewh",
    "https://www.cosmos.so/matthew3000/world-wide-web",
  ]) {
    const ref = boardOf(url);
    assert.ok(ref, url);
    const t = Date.now();
    try {
      const b = await readBoard(ref);
      console.log(`${b.platform.padEnd(9)} "${b.name}": ${b.webs.length} websites, ${b.skipped} skipped, capped ${b.capped} (${Date.now() - t} ms) ${url}`);
      console.log(`          first: ${b.webs.slice(0, 2).map((w) => w.url).join("  ")}`);
    } catch (e) {
      console.log(`${ref.platform.padEnd(9)} FAILED ${url}: ${e instanceof Error ? e.message : e}`);
    }
  }
  for (const url of ["https://www.are.na/nobody/this-channel-does-not-exist-xyz", "https://www.pinterest.com/awwwards/no-such-board-xyz/", "https://www.cosmos.so/matthew3000/no-such-cluster-xyz"]) {
    const reason = await readBoard(boardOf(url)!).then(() => "read", (e: { reason?: string }) => e.reason ?? String(e));
    console.log(`missing   ${reason.padEnd(10)} ${url}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
