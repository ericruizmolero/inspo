// Raw platform answers -> pages of candidate websites, and pages -> one board's websites.
// Pure: no network. Every answer is validated here; past this file the types are trusted.
import { z } from "zod";
import { hasOwnPage, normalizeWebUrl, webKeyOf } from "@/lib/url";

/** Websites one import brings at most */
export const MAX_WEBS = 500;
/** A link straight to an image file is an image, whatever the platform called it */
const IMAGE_FILE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

export type Web = { url: string; title?: string };
/** One page of a board as the platform gave it: candidate websites, and how many items were not websites */
export type Page = { webs: Web[]; skipped: number };

/** The platform answered with something we do not understand: treated as the platform not answering */
export class BadAnswer extends Error {}

function parse<T>(schema: z.ZodType<T>, raw: unknown, what: string): T {
  const r = schema.safeParse(raw);
  if (!r.success) throw new BadAnswer(`${what}: ${r.error.issues[0]?.message ?? "unexpected shape"}`);
  return r.data;
}

/** A title, when there is one: platforms put other shapes in the same field for items that are not ours */
const text = z.unknown().optional().transform((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined));

// ─── Are.na (api.are.na/v3) ───────────────────────────────────────────────────

const ArenaChannel = z.object({ title: z.string() });
const ArenaContents = z.object({
  meta: z.object({ has_more_pages: z.boolean() }),
  data: z.array(z.object({ type: z.string(), title: text, source: z.object({ url: z.string() }).nullish() })),
});

export const arenaChannel = (raw: unknown): { name: string } => ({ name: parse(ArenaChannel, raw, "are.na channel").title });

/** A Link block is a website; images, texts, attachments and embedded media are not */
export function arenaPage(raw: unknown): Page & { more: boolean } {
  const r = parse(ArenaContents, raw, "are.na contents");
  const webs: Web[] = [];
  let skipped = 0;
  for (const b of r.data) {
    if (b.type === "Link" && b.source?.url) webs.push({ url: b.source.url, title: b.title });
    else skipped++;
  }
  return { webs, skipped, more: r.meta.has_more_pages };
}

// ─── Pinterest (the web app's own resource endpoints) ─────────────────────────

const PinterestBoard = z.object({ resource_response: z.object({ data: z.object({ id: z.string(), name: z.string() }) }) });
const PinterestFeed = z.object({
  resource_response: z.object({
    data: z.array(z.object({ type: z.string().optional(), link: z.string().nullish(), title: text, grid_title: text })).nullish(),
    bookmark: z.string().nullish(),
  }),
});

export function pinterestBoard(raw: unknown): { id: string; name: string } {
  const { id, name } = parse(PinterestBoard, raw, "pinterest board").resource_response.data;
  return { id, name };
}

/** A pin with a link is a website; an uploaded pin (link null) is an image. What is not a pin (a story,
 *  a section card) is neither and is not counted. `bookmark` is null at the end of the board. */
export function pinterestPage(raw: unknown): Page & { bookmark: string | null } {
  const r = parse(PinterestFeed, raw, "pinterest feed").resource_response;
  const webs: Web[] = [];
  let skipped = 0;
  for (const p of r.data ?? []) {
    if (p.type && p.type !== "pin") continue;
    if (p.link) webs.push({ url: p.link, title: p.grid_title || p.title });
    else skipped++;
  }
  const bookmark = r.bookmark && r.bookmark !== "-end-" ? r.bookmark : null;
  return { webs, skipped, bookmark };
}

// ─── Cosmos (no public API: the page's own GraphQL) ───────────────────────────

const CosmosPage = z.object({
  data: z.object({
    clusterConnections: z.object({
      items: z.array(z.object({ element: z.object({ __typename: z.string(), source: z.object({ url: z.string().nullish() }).nullish(), websiteTitle: text }).nullish() })),
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

/** A WebsiteElementTile is a website; images, videos, products and texts are not */
export function cosmosPage(raw: unknown): Page & { cursor: string | null } {
  const r = parse(CosmosPage, raw, "cosmos cluster").data.clusterConnections;
  const webs: Web[] = [];
  let skipped = 0;
  for (const { element } of r.items) {
    if (!element) continue;
    if (element.__typename === "WebsiteElementTile" && element.source?.url) webs.push({ url: element.source.url, title: element.websiteTitle });
    else skipped++;
  }
  return { webs, skipped, cursor: r.meta.nextPageCursor || null };
}

// ─── Pages -> the board's websites ────────────────────────────────────────────

/**
 * Gathers a board's websites page by page: normalized, once each (`webKeyOf`), at most MAX_WEBS.
 * An address that is not a site of its own (an image file, a video, a post on X) counts as skipped.
 * Stops asking for pages as soon as the cap is passed, which is what `capped` says.
 */
export async function collect(pages: AsyncIterable<Page> | Iterable<Page>): Promise<{ webs: Web[]; skipped: number; capped: boolean }> {
  const webs: Web[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for await (const page of pages) {
    skipped += page.skipped;
    for (const w of page.webs) {
      const url = normalizeWebUrl(w.url);
      if (!url || !hasOwnPage(url) || IMAGE_FILE.test(new URL(url).pathname)) { skipped++; continue; }
      const key = webKeyOf(url);
      if (seen.has(key)) continue;
      if (webs.length >= MAX_WEBS) return { webs, skipped, capped: true };
      seen.add(key);
      webs.push(w.title ? { url, title: w.title.slice(0, 120) } : { url });
    }
  }
  return { webs, skipped, capped: false };
}
