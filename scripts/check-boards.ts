// Importing a board from Are.na, Pinterest or Cosmos (lib/boards): which addresses are a board, and
// what of a board comes in. The parsers run on answers saved from each platform (scripts/fixtures/boards).
// Not a test framework: assert.
//   npm run check:boards           pure checks, no network
//   npm run check:boards -- --live also reads real boards and prints what they bring, by kind
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { boardOf } from "../lib/boards/match";
import { arenaChannel, arenaPage, collect, cosmosCluster, cosmosPage, entryOf, pinterestBoard, pinterestPage, BadAnswer, type Page } from "../lib/boards/parse";
import { batchesOf, KINDS, MAX_ENTRIES, noneSkipped, type Entry } from "../lib/boards/entries";
import { MAX_IMAGES_PER_BATCH, MAX_PER_BATCH } from "../lib/batch-limits";
import { staysInside } from "../lib/url";

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
/** How many entries of each kind */
const kinds = (entries: Entry[]) => Object.fromEntries(KINDS.map((k) => [k, entries.filter((e) => e.kind === k).length]));

assert.deepEqual(arenaChannel(json("arena-channel.json")), { name: "Arena Influences" });
const arena = arenaPage(json("arena-contents.json"));
assert.equal(arena.found.length, 96, "Link, Embed, Image and Text blocks are found");
assert.deepEqual(arena.skipped, { file: 2, board: 2 }, "a PDF and a channel inside the channel stay out");
assert.equal(arena.more, true);

assert.deepEqual(pinterestBoard(json("pinterest-board.json")), { id: "59883938734401152", name: "Illustration" });
const pinPage = pinterestPage(json("pinterest-feed.json"));
assert.equal(pinPage.found.length, 100, "every pin is found; the story is not a pin");
assert.ok(pinPage.found.every((f) => /^https:\/\/www\.pinterest\.com\/pin\/\d+\/$/.test(f.page) && f.images.length), "a pin is its page and its images");
assert.ok(pinterestPage(json("pinterest-feed.json")).found.some((f) => f.images[0]?.includes("/1200x/")), "a wide original is asked for at 1200 px");
assert.ok(pinPage.bookmark?.startsWith("Y2JZakk0ZUUx"));
assert.equal(pinterestPage({ resource_response: { data: [], bookmark: "-end-" } }).bookmark, null, "-end- ends the board");

assert.deepEqual(cosmosCluster(fixture("cosmos-cluster.html")), { id: 1082975211, name: "World Wide Web" });
assert.equal(cosmosCluster("<html>no cluster here</html>"), null);
const cos = cosmosPage(json("cosmos-page.json"));
assert.equal(cos.found.length, 100);
assert.equal(cos.cursor, "eyJ2MSI6MTg1LjAsInYyIjo3MjAyMjg5fQ==");
const motion = cosmosPage(json("cosmos-motion.json"));
assert.equal(motion.found.length, 22);
assert.equal(motion.cursor, null);
assert.ok(motion.found.every((f) => /^https:\/\/www\.cosmos\.so\/e\/\d+$/.test(f.page) && !f.link), "a media tile is its image, on its Cosmos page");
assert.ok(motion.found.every((f) => f.images.length === 1 && !/\.mp4$/.test(f.images[0])), "a video tile is its cover, never its file");
const base = cosmosPage({ data: { clusterConnections: { meta: {}, items: [
  { element: { __typename: "BaseElementTile", id: 1225489700, source: { url: "https://euphemia.com/" }, product: null } },
  { element: { __typename: "SomethingNew", id: 2 } },
] } } });
assert.deepEqual(base.found, [{ page: "https://www.cosmos.so/e/1225489700", link: "https://euphemia.com/", images: [] }], "a tile still capturing is its site");
assert.deepEqual(base.skipped, { empty: 1 });

// An answer we do not understand is the platform not answering, never a half-read board
assert.throws(() => arenaPage({ data: "nope" }), BadAnswer);
assert.throws(() => pinterestBoard({ resource_response: {} }), BadAnswer);
assert.throws(() => cosmosPage({ errors: [{ message: "x" }] }), BadAnswer);

// ── entryOf: what Criterio makes of one item ───────────────────────────────
const page = "https://www.are.na/block/1";
assert.deepEqual(entryOf({ page, link: "https://Linear.app/", title: "Linear", images: ["https://img/1.png"] }), { kind: "web", url: "https://linear.app", title: "Linear" });
assert.deepEqual(entryOf({ page, link: "https://youtu.be/aIQOozd0kqE", images: [] }), { kind: "video", url: "https://youtu.be/aIQOozd0kqE", title: undefined });
assert.deepEqual(entryOf({ page, link: "https://twitter.com/TheTedNelson/status/963634699418685440", images: [] }),
  { kind: "post", url: "https://x.com/TheTedNelson/status/963634699418685440", title: undefined });
assert.deepEqual(entryOf({ page, link: "https://cdn.example.com/shot.PNG", images: ["https://img/1.png"] }),
  { kind: "image", images: ["https://cdn.example.com/shot.PNG", "https://img/1.png"], page, title: undefined }, "a link to an image file is that image");
assert.deepEqual(entryOf({ page, link: "https://www.instagram.com/p/abc/", images: ["https://img/1.png"] }),
  { kind: "image", images: ["https://img/1.png"], page, title: undefined }, "a link with no page of its own is the item's image");
assert.deepEqual(entryOf({ page, link: "https://www.instagram.com/p/abc/", images: [] }), { kind: "web", url: "https://www.instagram.com/p/abc", title: undefined }, "or the address, with no image");
assert.deepEqual(entryOf({ page, images: [], title: "  A   quote ", text: "  Any fact becomes important.  " }), { kind: "text", text: "Any fact becomes important.", page, title: "A quote" });
assert.equal(entryOf({ page, images: [], text: "   " }), "empty");
assert.equal(entryOf({ page, link: "javascript:alert(1)", images: [] }), "empty");

// ── collect: pages -> the board's entries ──────────────────────────────────
async function main() {
  const fromArena = await collect([arena]);
  assert.deepEqual(kinds(fromArena.entries), { web: 21, image: 45, video: 6, post: 1, text: 23 }, "everything on the channel Criterio can hold");
  assert.deepEqual(fromArena.skipped, { file: 2, board: 2, empty: 0 });
  const arenaImage = fromArena.entries.find((e) => e.kind === "image");
  assert.ok(arenaImage?.kind === "image" && /^https:\/\/www\.are\.na\/block\/\d+$/.test(arenaImage.page) && arenaImage.images.length === 2, "an image keeps its block as its page, original first");

  const fromPin = await collect([pinPage]);
  assert.deepEqual(kinds(fromPin.entries), { web: 88, image: 6, video: 0, post: 0, text: 0 }, "a pin with a link is its site (94 pins, 88 sites), an uploaded pin its image");
  assert.deepEqual(fromPin.skipped, noneSkipped());

  const fromCosmos = await collect([cos, motion]);
  assert.deepEqual(kinds(fromCosmos.entries), { web: 98, image: 24, video: 0, post: 0, text: 0 });

  // The same thing twice comes in once: an address by its key, an image by its file, a text by its page
  const twice: Page = { skipped: {}, found: [
    { page: "https://www.are.na/block/1", link: "https://linear.app/", images: [] },
    { page: "https://www.are.na/block/2", link: "https://Linear.app", images: [] },
    { page: "https://www.are.na/block/3", images: ["https://img/a.png"] },
    { page: "https://www.are.na/block/4", images: ["https://img/a.png", "https://img/b.png"] },
    { page: "https://www.are.na/block/5", images: [], text: "one" },
    { page: "https://www.are.na/block/5", images: [], text: "one" },
  ] };
  assert.deepEqual(kinds((await collect([twice])).entries), { web: 1, image: 1, video: 0, post: 0, text: 1 });

  // The cap stops reading: the page after it is never asked for
  let asked = 0;
  async function* many(): AsyncGenerator<Page> {
    for (let p = 0; p < 10; p++) {
      asked++;
      yield { skipped: {}, found: Array.from({ length: 100 }, (_, i) => ({ page: `https://www.are.na/block/${p}-${i}`, link: `https://site-${p}-${i}.com`, images: [] })) };
    }
  }
  const big = await collect(many());
  assert.equal(big.entries.length, MAX_ENTRIES);
  assert.equal(big.capped, true);
  assert.equal(asked, 6, "five full pages, and the sixth shows there is more");
  const exact = await collect([{ skipped: {}, found: Array.from({ length: MAX_ENTRIES }, (_, i) => ({ page: `p${i}`, images: [`https://img/${i}.png`] })) }]);
  assert.equal(exact.capped, false, "exactly the cap is not capped");

  // ── batchesOf: what one request carries ─────────────────────────────────
  const web = (i: number): Entry => ({ kind: "web", url: `https://s${i}.com` });
  const image = (i: number): Entry => ({ kind: "image", images: [`https://img/${i}.png`], page: `https://www.are.na/block/${i}` });
  const sizes = (list: Entry[]) => batchesOf(list).map((b) => b.length);
  assert.deepEqual(sizes(Array.from({ length: 60 }, (_, i) => web(i))), [MAX_PER_BATCH, MAX_PER_BATCH, 10]);
  assert.deepEqual(sizes(Array.from({ length: 23 }, (_, i) => image(i))), [MAX_IMAGES_PER_BATCH, MAX_IMAGES_PER_BATCH, 3]);
  assert.deepEqual(sizes([...Array.from({ length: 12 }, (_, i) => web(i)), image(0), web(99)]), [12, 2], "an image closes a batch that is already full for images");
  const mixed = [...fromArena.entries, ...fromPin.entries];
  const batches = batchesOf(mixed);
  assert.deepEqual(batches.flat(), mixed, "every entry once, in order");
  assert.ok(batches.every((b) => b.length <= (b.some((e) => e.kind === "image") ? MAX_IMAGES_PER_BATCH : MAX_PER_BATCH)), "no batch over its limit");

  // ── staysInside: copies from a board are never handed out ───────────────
  assert.equal(staysInside({ web: "/api/files/inspo/w/media/from-1.png", source: "https://www.are.na/block/1" }), true);
  assert.equal(staysInside({ web: "/api/files/inspo/w/media/from-1.png", source: "https://www.cosmos.so/e/1" }), true);
  assert.equal(staysInside({ web: "/api/files/inspo/w/text/from-1.md", source: "https://www.are.na/block/1" }), true);
  assert.equal(staysInside({ web: "/api/files/inspo/w/media/from-1.png", source: "https://www.pinterest.com/pin/1/" }), true);
  assert.equal(staysInside({ web: "https://linear.app" }), false);
  assert.equal(staysInside({ web: "/api/files/inspo/w/media/1.png", source: "https://notcosmos.so/e/1" }), false);

  console.log("boards: pure checks pass");

  if (!process.argv.includes("--live")) return;
  const { readBoard } = await import("../lib/boards/read");
  for (const url of [
    "https://www.are.na/chad-mazzola/arena-influences",
    "https://www.are.na/daniel-baer/interesting-web-design-and-ux",
    "https://www.pinterest.com/awwwards/site-of-the-day/",
    "https://www.pinterest.com/behance/illustration/",
    "https://pin.it/4ZsUd0Ewh",
    "https://www.cosmos.so/matthew3000/world-wide-web",
    "https://www.cosmos.so/matthew3000/motion",
  ]) {
    const ref = boardOf(url);
    assert.ok(ref, url);
    const t = Date.now();
    try {
      const b = await readBoard(ref);
      const by = Object.entries(kinds(b.entries)).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ");
      const out = Object.entries(b.skipped).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ") || "none";
      console.log(`${b.platform.padEnd(9)} "${b.name}": ${by}. skipped: ${out}. capped ${b.capped} (${Date.now() - t} ms) ${url}`);
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
