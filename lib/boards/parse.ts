// Raw platform answers -> pages of found items, and pages -> one board's entries (lib/boards/entries.ts).
// Pure: no network. Every answer is validated here; past this file the types are trusted.
import { z } from "zod";
import { hasOwnPage, mediaKindOf, normalizeWebUrl, webKeyOf } from "@/lib/url";
import { MAX_ENTRIES, MAX_TEXT, noneSkipped, type Entry, type SkipReason, type Skipped } from "./entries";

/** A link straight to an image file is an image, whatever the platform called it */
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|avif)$/i;
const TITLE_MAX = 120;

/** One item of a board as the platform describes it, before it is decided what Criterio makes of it.
 *  `page` is the item's own address on the platform; `link` the address it points to, when it points somewhere;
 *  `images` the files that show it, best first; `text` its words, when the item is a text. */
export type Found = { page: string; title?: string; link?: string; images: string[]; text?: string };
/** One page of a board: what was found, and what was left out at once and why */
export type Page = { found: Found[]; skipped: Partial<Skipped> };

/** The platform answered with something we do not understand: treated as the platform not answering */
export class BadAnswer extends Error {}

function parse<T>(schema: z.ZodType<T>, raw: unknown, what: string): T {
  const r = schema.safeParse(raw);
  if (!r.success) throw new BadAnswer(`${what}: ${r.error.issues[0]?.message ?? "unexpected shape"}`);
  return r.data;
}

/** A string, when there is one: platforms put other shapes in the same field for items that are not ours */
const text = z.unknown().optional().transform((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined));
const url = text;
const urls = (...list: (string | undefined | null)[]) => [...new Set(list.filter((s): s is string => !!s))];
const skip = (reason: SkipReason, skipped: Partial<Skipped>) => { skipped[reason] = (skipped[reason] ?? 0) + 1; };

// ─── Are.na (api.are.na/v3) ───────────────────────────────────────────────────

const ArenaChannel = z.object({ title: z.string() });
const ArenaContents = z.object({
  meta: z.object({ has_more_pages: z.boolean() }),
  data: z.array(z.object({
    id: z.number(),
    type: z.string(),
    title: text,
    source: z.object({ url }).nullish(),
    image: z.object({ src: url, large: z.object({ src: url }).nullish() }).nullish(),
    content: z.object({ markdown: text }).nullish(),
  })),
});

export const arenaChannel = (raw: unknown): { name: string } => ({ name: parse(ArenaChannel, raw, "are.na channel").title });

/** Link and Embed point somewhere (an Embed is a video), an Image is its file, a Text its words. An Attachment
 *  (a PDF) and a Channel inside the channel stay out. */
export function arenaPage(raw: unknown): Page & { more: boolean } {
  const r = parse(ArenaContents, raw, "are.na contents");
  const found: Found[] = [];
  const skipped: Partial<Skipped> = {};
  for (const b of r.data) {
    const page = `https://www.are.na/block/${b.id}`;
    const images = urls(b.image?.src, b.image?.large?.src);
    if (b.type === "Link" || b.type === "Embed") found.push({ page, title: b.title, link: b.source?.url, images });
    else if (b.type === "Image") found.push({ page, title: b.title, images });
    else if (b.type === "Text") found.push({ page, title: b.title, images: [], text: b.content?.markdown });
    else if (b.type === "Attachment") skip("file", skipped);
    else if (b.type === "Channel") skip("board", skipped);
    else skip("empty", skipped);
  }
  return { found, skipped, more: r.meta.has_more_pages };
}

// ─── Pinterest (the web app's own resource endpoints) ─────────────────────────

const PinImage = z.object({ url, width: z.number().nullish() }).nullish();
const PinterestBoard = z.object({ resource_response: z.object({ data: z.object({ id: z.string(), name: z.string() }) }) });
const PinterestFeed = z.object({
  resource_response: z.object({
    data: z.array(z.object({
      type: z.string().optional(),
      id: z.unknown(),
      link: url,
      title: text,
      grid_title: text,
      images: z.object({ orig: PinImage, "736x": PinImage }).partial().nullish(),
    })).nullish(),
    bookmark: z.string().nullish(),
  }),
});

/** An original wider than this is asked for at 1200 px, as the extension does (extension/chrome/pinterest-collect.js) */
const PIN_WIDE = 1600;

export function pinterestBoard(raw: unknown): { id: string; name: string } {
  const { id, name } = parse(PinterestBoard, raw, "pinterest board").resource_response.data;
  return { id, name };
}

/** A pin with a link points there; an uploaded pin (link null) is its image, and so is a video pin, by its cover.
 *  What is not a pin (a story, a section card) is neither and is not counted. `bookmark` is null at the end. */
export function pinterestPage(raw: unknown): Page & { bookmark: string | null } {
  const r = parse(PinterestFeed, raw, "pinterest feed").resource_response;
  const found: Found[] = [];
  for (const p of r.data ?? []) {
    if ((p.type && p.type !== "pin") || !/^\d+$/.test(String(p.id))) continue;
    const orig = p.images?.orig, mid = p.images?.["736x"];
    const whole = /\.gif$/i.test(orig?.url ?? "") || (orig?.width ?? 0) <= PIN_WIDE; // a GIF only moves in its original
    const images = whole ? urls(orig?.url, mid?.url) : urls(mid?.url?.replace("/736x/", "/1200x/"), mid?.url, orig?.url);
    found.push({ page: `https://www.pinterest.com/pin/${p.id}/`, title: p.grid_title || p.title, link: p.link, images });
  }
  const bookmark = r.bookmark && r.bookmark !== "-end-" ? r.bookmark : null;
  return { found, skipped: {}, bookmark };
}

// ─── Cosmos (no public API: the page's own GraphQL) ───────────────────────────

const CosmosMedia = z.object({ __typename: z.string().optional(), url, thumbnail: z.object({ url }).nullish() }).nullish();
const CosmosPage = z.object({
  data: z.object({
    clusterConnections: z.object({
      items: z.array(z.object({ element: z.object({
        __typename: z.string(),
        id: z.number(),
        source: z.object({ url }).nullish(),
        media: CosmosMedia,
        websiteTitle: text,
        productTitle: text,
        text,
        product: z.object({ offers: z.array(z.object({ url })).nullish() }).nullish(),
      }).nullish() })),
      meta: z.object({ nextPageCursor: z.string().nullish() }),
    }),
  }),
});

/** The cluster's id and name, from its public page's HTML (the id is in the page's own GraphQL calls) */
export function cosmosCluster(html: string): { id: number; name: string } | null {
  const id = html.match(/"clusterId":(\d+)/)?.[1];
  if (!id) return null;
  const name = html.match(new RegExp(`"id":${id},"name":"((?:[^"\\\\]|\\\\.)*)"`))?.[1];
  const title = html.match(/<meta property="og:title" content="([^"]*?)(?: — by @[^"]*)?"/)?.[1];
  let decoded = "";
  try { decoded = name ? JSON.parse(`"${name}"`) : ""; } catch { /* the title below names it */ }
  return { id: Number(id), name: decoded || unescapeHtml(title ?? "") || "Cosmos" };
}

const unescapeHtml = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** A website or a product points to its site; a media tile is its image (a video, by its cover), whatever site it
 *  was found on; a text tile is its words */
export function cosmosPage(raw: unknown): Page & { cursor: string | null } {
  const r = parse(CosmosPage, raw, "cosmos cluster").data.clusterConnections;
  const found: Found[] = [];
  const skipped: Partial<Skipped> = {};
  for (const { element: e } of r.items) {
    if (!e) continue;
    const page = `https://www.cosmos.so/e/${e.id}`;
    const images = e.media?.__typename === "Video" ? urls(e.media.thumbnail?.url) : urls(e.media?.url);
    if (e.__typename === "WebsiteElementTile") found.push({ page, title: e.websiteTitle, link: e.source?.url, images });
    else if (e.__typename === "ProductElementTile") found.push({ page, title: e.productTitle, link: e.product?.offers?.[0]?.url ?? e.source?.url, images });
    else if (e.__typename === "MediaElementTile") found.push({ page, images });
    else if (e.__typename === "TextElementTile") found.push({ page, images: [], text: e.text });
    // A BaseElementTile is a site whose capture never finished: only its address is there
    else if (e.source?.url) found.push({ page, link: e.source.url, images });
    else skip("empty", skipped);
  }
  return { found, skipped, cursor: r.meta.nextPageCursor || null };
}

// ─── Found items -> the board's entries ───────────────────────────────────────

/**
 * What Criterio makes of one found item. Its link decides first: a site with a page of its own, a video or a
 * post on X is saved as that address; a link to an image file is that image. An item that points nowhere we can
 * save (no link, or a profile on Instagram) is its image when it has one, and its words when it is a text.
 */
export function entryOf(f: Found): Entry | SkipReason {
  const title = f.title?.replace(/\s+/g, " ").slice(0, TITLE_MAX).trim() || undefined;
  const link = f.link ? normalizeWebUrl(f.link) : null;
  if (link) {
    if (IMAGE_FILE.test(new URL(link).pathname)) return { kind: "image", images: urls(link, ...f.images), page: f.page, title };
    const kind = mediaKindOf(link);
    if (kind === "video" || kind === "post") return { kind, url: link, title };
    if (kind === "web" && hasOwnPage(link)) return { kind: "web", url: link, title };
  }
  if (f.text?.trim()) return { kind: "text", text: f.text.trim().slice(0, MAX_TEXT), page: f.page, title };
  if (f.images.length) return { kind: "image", images: f.images, page: f.page, title };
  if (link) return { kind: "web", url: link, title };
  return "empty";
}

/** The same thing twice in a board comes in once: an address by its key, an image by its file, a text by its page */
const keyOf = (e: Entry) => (e.kind === "image" ? `image ${e.images[0]}` : e.kind === "text" ? `text ${e.page}` : webKeyOf(e.url));

/**
 * Gathers a board's entries page by page, once each, at most MAX_ENTRIES, and counts what stays out and why.
 * Stops asking for pages as soon as the cap is passed, which is what `capped` says.
 */
export async function collect(pages: AsyncIterable<Page> | Iterable<Page>): Promise<{ entries: Entry[]; skipped: Skipped; capped: boolean }> {
  const entries: Entry[] = [];
  const seen = new Set<string>();
  const skipped = noneSkipped();
  for await (const page of pages) {
    for (const [reason, n] of Object.entries(page.skipped) as [SkipReason, number][]) skipped[reason] += n;
    for (const f of page.found) {
      const entry = entryOf(f);
      if (typeof entry === "string") { skipped[entry]++; continue; }
      const key = keyOf(entry);
      if (seen.has(key)) continue;
      if (entries.length >= MAX_ENTRIES) return { entries, skipped, capped: true };
      seen.add(key);
      entries.push(entry);
    }
  }
  return { entries, skipped, capped: false };
}
