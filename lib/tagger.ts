// Tags an item with one call to a cheap vision model, over the whole page. Server only.
//
// What it costs, per item: one model call (image + a few hundred words in, ~250 out). The colours
// come from the pixels (lib/palette.ts) and cost nothing. A site already tagged in another workspace
// is copied, not tagged again: curator notes never reach the prompt, so tags belong to the URL.
import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { llm, llmEnabled, type LlmInput, type LlmResult } from "./llm";
import { prompt } from "./prompts";
import { fetchSiteText, videoTitleWithin, type SiteText } from "./extract";
import { getStoredPost, ensurePost, postThumb } from "./posts";
import { textTags } from "./text-refs";
import { getDesignMd } from "./design-store";
import { getPageIndex } from "./page-shots";
import { captureNewPage, getStoredShot, hasStoredShot, shotFile } from "./screenshot";
import { getFile, keyOf } from "./storage";
import { paletteOf } from "./palette";
import { imageMeta, metaLines, postMeta } from "./meta";
import { mediaKindOf, normalizeWebUrl, postOf, webKeyOf } from "./url";
import { billOf, recordUsage, type UsageCtx } from "./usage";
import { SECTORS, STYLES, TAGS, SECTIONS, ELEMENTS, TYPE, LAYOUT, TAXONOMY_VERSION } from "./taxonomy";
import type { InspoItem, InspoLook, InspoTags } from "@/types/inspo";
import { log } from "./log";

export const taggerEnabled = llmEnabled;

const CAPTURE_TIMEOUT_MS = 60_000;
/** What the model sees: 768 wide, cut at five screens. Enough to read every section, ~1.5k image tokens. */
const MODEL_W = 768;
const MODEL_MAX_H = 3840;

// Domains where a capture shows a login wall or a player, not a design
const SKIP = ["youtube.com", "youtu.be", "vimeo.com", "x.com", "twitter.com", "instagram.com", "linkedin.com", "primevideo.com", "netflix.com", "loom.com"];

// ─── Schema: the contract with the model ─────────────────────────────────────

const keys = <T extends { key: string }>(terms: T[]) => terms.map((t) => t.key) as [string, ...string[]];
const list = (terms: { key: string; description: string }[]) => terms.map((t) => `- ${t.key}: ${t.description}`).join("\n");

const words = (n: number) => `one sentence of at most ${n} words, "" when the picture shows nothing for it`;
const LookSchema = z.object({
  imagery: z.string().describe(words(25)),
  typography: z.string().describe(words(25)),
  color: z.string().describe(words(25)),
  logo: z.string().describe(words(25)),
});

const TagSchema = z.object({
  sector: z.enum(keys(SECTORS)),
  style: z.enum(keys(STYLES)),
  style_fit: z.enum(["weak", "clear", "strong"]).describe("How clearly the page shows that style"),
  traits: z.array(z.enum(keys(TAGS))),
  sections: z.array(z.enum(keys(SECTIONS))),
  elements: z.array(z.enum(keys(ELEMENTS))),
  type: z.array(z.enum(keys(TYPE))),
  layout: z.array(z.enum(keys(LAYOUT))),
  keywords: z.array(z.string()).describe("5 to 10 lowercase English words or short phrases a designer would search for"),
  visual: z.string().describe("40 to 60 words, plain English prose"),
  look: LookSchema,
});
type TagOutput = z.infer<typeof TagSchema>;

const FIT = { weak: 0.5, clear: 0.75, strong: 1 } as const;

const lookOf = (l: z.infer<typeof LookSchema>): InspoLook => ({ imagery: l.imagery.trim(), typography: l.typography.trim(), color: l.color.trim(), logo: l.logo.trim() });

const LOOK = `- LOOK: what the picture shows, area by area, each one sentence of at most 25 words, and "" when the picture shows nothing for that area. Literal: only what is visible, no praise ("elegant", "striking"), no guess at intent.
  - imagery: the kind (photo, illustration, 3D, screen capture), its light, colour grade, crop and texture.
  - typography: what the letters look like: serif or sans, contrast, weight, case, tracking. Name a family only when you are certain of it.
  - color: how colour is used: the ground, the ink, the accent and its job.
  - logo: the mark, if one is visible: wordmark, symbol or monogram, and how it is drawn.`;

export const SYSTEM = `You tag saved design references (websites, images, posts) for a designer's inspiration library. The tags power search and filters, so be literal and precise: tag only what is visible in the image or stated in the page text.

WHAT YOU GET
- The image, when there is one: the page from top to bottom, or the saved image itself.
- The page text, and lines like Author, Publisher, Declared type and Its own keywords from the item's own metadata. Use the metadata as evidence for the sector and the keywords when it agrees with what you see. Page keywords are often generic SEO lists: keep only the specific ones.

CLOSED LISTS
Use only these keys. Pick every key that clearly applies, and none that is doubtful.

SECTOR (one):
${list(SECTORS)}

STYLE (one):
${list(STYLES)}

TRAITS (any):
${list(TAGS)}

SECTIONS of the page (any, only the ones you can see):
${list(SECTIONS)}

ELEMENTS (any):
${list(ELEMENTS)}

TYPE (any):
${list(TYPE)}

LAYOUT (any):
${list(LAYOUT)}

FREE TEXT (always in English: it feeds search, whatever the page's language)
- KEYWORDS: 5 to 10 lowercase search words for what makes this reference worth saving and is not already covered by the lists: the subject, the mood, a specific technique, the industry ("coffee roaster", "swiss grid", "risograph texture", "pastel", "car configurator"). No generic words like "website", "design" or "modern". Never a person or brand name: names are kept apart.
- VISUAL: 40 to 60 words of plain prose on what the page looks like: colours, type, imagery, layout, mood.
${LOOK}`;

// ─── Inputs ──────────────────────────────────────────────────────────────────

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    p.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
}

const readKey = async (k: string | null) => k ? (await getFile(k).catch((err) => { log.warn("storage.read_failed", { ref: k, err }); return null; }))?.body ?? null : null;
const keyOfUrl = (u: string | null | undefined) => u ? keyOf(u) : null;

/** A site whose capture shows a design, not a login wall or a player */
function capturable(web: string): boolean {
  try { const host = new URL(web).hostname.replace(/^www\./, ""); return !SKIP.some((d) => host === d || host.endsWith(`.${d}`)); } catch { return false; }
}

/** The stored whole page of a site: the DESIGN.md's capture, then the canvas's */
async function pageKey(web: string): Promise<string | null> {
  return keyOfUrl((await getDesignMd(web))?.screenshotUrl) ?? keyOfUrl((await getPageIndex())[normalizeWebUrl(web) ?? web]?.shotUrl);
}

/** Where the picture the model looks at is stored: what `capture: false` reads. A site with no whole page stored
 *  falls back to the card's first screen, if /api/shot made one. null: nothing stored, or nothing to look at */
export async function pictureKey(web: string): Promise<string | null> {
  const kind = mediaKindOf(web);
  if (kind === "image") return keyOf(web);
  if (kind === "post") { const post = await getStoredPost(postOf(web)?.id ?? ""); return keyOfUrl(post && postThumb(post)); }
  if (kind !== "web" || !capturable(web)) return null;
  return (await pageKey(web)) ?? ((await hasStoredShot(web)) ? shotFile(web) : null);
}

/** A stored picture (pictureKey) as the model gets it. Only reads */
export async function pictureAt(key: string | null): Promise<Buffer | null> {
  const image = await readKey(key);
  return image ? forModel(image).catch(() => null) : null;
}

/** The picture the model looks at. With `capture`, a site with no page stored is captured and a post imported */
async function imageOf(web: string, capture: boolean): Promise<Buffer | null> {
  const kind = mediaKindOf(web);
  if (!capture || kind === "image") return readKey(await pictureKey(web));
  if (kind === "post") { const post = await ensurePost(web); return readKey(keyOfUrl(post && postThumb(post))); }
  if (kind !== "web" || !capturable(web)) return null;
  const stored = await readKey(await pageKey(web));
  if (stored) return stored;
  try {
    return await withTimeout(captureNewPage(web), CAPTURE_TIMEOUT_MS, "capture");
  } catch (e) {
    log.warn("tagger.no_capture", { ref: web, err: e });
    return getStoredShot(web); // the card's first screen, if /api/shot made one
  }
}

/** A saved post read as a page: author as title, its words as text */
async function postAsSite(web: string): Promise<SiteText | null> {
  const post = await getStoredPost(postOf(web)?.id ?? "");
  if (!post) return null;
  return {
    title: `${post.author} (@${post.handle}) on X`, description: post.text, siteName: "X", lang: "", headings: [], textSample: post.text,
    meta: postMeta(post),
    signals: { themeColor: null, fonts: [], colors: [], hasCanvas: false, hasVideo: post.media.some((m) => m.kind !== "photo"), imageCount: post.media.length, platform: "x" },
  };
}

async function textOf(web: string): Promise<SiteText | null> {
  const kind = mediaKindOf(web);
  if (kind === "image") return null;
  if (kind === "post") return postAsSite(web);
  if (kind === "video") {
    const title = await videoTitleWithin(web).catch(() => null);
    return title ? { title, description: "", siteName: "", lang: "", headings: [], textSample: "", signals: { themeColor: null, fonts: [], colors: [], hasCanvas: false, hasVideo: true, imageCount: 0, platform: null } } : null;
  }
  return fetchSiteText(web).catch(() => null);
}

/** The image as the model gets it: 768 wide, the top five screens, JPEG. Also gives a GIF's first frame. */
export async function forModel(image: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const resized = await sharp(image).resize({ width: MODEL_W, withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
  const { width, height } = resized.info;
  const cut = height > MODEL_MAX_H ? sharp(resized.data).extract({ left: 0, top: 0, width, height: MODEL_MAX_H }) : sharp(resized.data);
  return cut.jpeg({ quality: 70, mozjpeg: true }).toBuffer();
}

function promptText(item: InspoItem, site: SiteText | null, hasImage: boolean): string {
  const lines = [
    `Name: ${item.name}`,
    mediaKindOf(item.web) === "image" ? "Kind: an uploaded image" : `URL: ${item.web}`,
  ];
  if (site) {
    if (site.title) lines.push(`Title: ${site.title}`);
    if (site.description) lines.push(`Description: ${site.description.slice(0, 300)}`);
    if (site.headings.length) lines.push(`Headings: ${site.headings.slice(0, 12).join(" | ")}`);
    if (site.signals.fonts.length) lines.push(`Fonts in the CSS: ${site.signals.fonts.slice(0, 6).join(", ")}`);
    // What the page says about itself: the model weighs it like the text, never above what it sees
    lines.push(...metaLines(site.meta));
    if (!hasImage && site.textSample) lines.push(`Text: ${site.textSample.slice(0, 800)}`);
  }
  lines.push(hasImage ? "Tag it." : "There is no image: tag only what the words make certain, and leave the visual lists empty when unsure.");
  return lines.join("\n");
}

// ─── Tagging ─────────────────────────────────────────────────────────────────

/** v3 tags this URL already has in another workspace: same page, same tags. Never for uploads. */
async function tagsElsewhere(organizationId: string, web: string): Promise<InspoTags | null> {
  if (mediaKindOf(web) === "image") return null;
  const T = schema.inspoItem;
  const [r] = await db.select({ tags: T.tagsJson }).from(T)
    .where(and(eq(T.webKey, webKeyOf(web)), ne(T.organizationId, organizationId), sql`(${T.tagsJson}->>'v')::int = ${TAXONOMY_VERSION}`))
    .limit(1);
  return r?.tags ?? null;
}

export interface TagInputs { image: Buffer | null; site: SiteText | null }

/** What the model gets for an item: its picture (already sized for the model) and its words.
 *  `capture: false` only reads what is stored: no browser, nothing written. */
export async function inputsOf(web: string, { capture = true } = {}): Promise<TagInputs> {
  const [image, site] = await Promise.all([imageOf(web, capture).catch((err) => { log.warn("tagger.no_image", { ref: web, err }); return null; }), textOf(web)]);
  // An uploaded image speaks through its EXIF/XMP/IPTC, read from the original before it is resized
  const fromFile = mediaKindOf(web) === "image" && image ? await imageMeta(image) : undefined;
  const words: SiteText | null = fromFile
    ? { title: "", description: "", siteName: "", lang: "", headings: [], textSample: "", meta: fromFile, signals: { themeColor: null, fonts: [], colors: [], hasCanvas: false, hasVideo: false, imageCount: 1, platform: null } }
    : site;
  return { image: image ? await forModel(image).catch(() => null) : null, site: words };
}

/** One model call over prepared inputs. Returns the tags and the call's bill. */
export async function tagWith(item: InspoItem, { image, site }: TagInputs, over: Partial<Pick<LlmInput, "model" | "fallback">> = {}): Promise<{ tags: InspoTags } & LlmResult> {
  const [colours, res] = await Promise.all([
    image ? paletteOf(image).catch(() => null) : null,
    llm({ ...prompt("tag", { system: SYSTEM, text: promptText(item, site, !!image), image, schema: TagSchema }), ...over }),
  ]);
  const out = TagSchema.parse(JSON.parse(res.text)) as TagOutput;
  const uniq = (a: string[]) => [...new Set(a)];
  const tags: InspoTags = {
    sector: out.sector, sectorP: 1,
    style: out.style, styleP: FIT[out.style_fit],
    tags: Object.fromEntries(TAGS.map((t) => [t.key, out.traits.includes(t.key) ? 1 : 0])),
    summary: [site?.title, site?.description].filter(Boolean).join(" · ").slice(0, 300),
    visual: out.visual.trim() || undefined,
    look: image ? lookOf(out.look) : undefined,
    colors: colours?.colors ?? [],
    palette: colours?.palette ?? [],
    theme: colours?.theme,
    sections: uniq(out.sections),
    elements: uniq(out.elements),
    type: uniq(out.type),
    layout: uniq(out.layout),
    keywords: uniq(out.keywords.map((k) => k.trim().toLowerCase()).filter((k) => k && k.length < 40)).slice(0, 10),
    model: res.model,
    meta: site?.meta,
    at: new Date().toISOString(),
    v: TAXONOMY_VERSION,
  };
  return { tags, ...res };
}

const LookOnly = z.object({ look: LookSchema });
const LOOK_SYSTEM = `You describe the picture of a saved design reference (a website, an image, a post) for a designer's inspiration library, always in English, whatever the page's language. The page text and metadata only help you read what you see.
${LOOK}`;

/** Only the look of an item that has a picture, on the tag task's model: for tags made before it (npm run tags:look) */
export async function lookWith(item: InspoItem, { image, site }: TagInputs & { image: Buffer }): Promise<{ look: InspoLook } & LlmResult> {
  const res = await llm(prompt("tag", { system: LOOK_SYSTEM, text: promptText(item, site, true), image, schema: LookOnly }));
  return { look: lookOf(LookOnly.parse(JSON.parse(res.text)).look), ...res };
}

/** Tags one item. Throws when the model fails, so the item stays pending and is tried again. */
export async function tagItem(item: InspoItem, usage: UsageCtx, model?: string): Promise<InspoTags> {
  // A pasted text has no look: its first lines stand in for tags, with no model call
  if (mediaKindOf(item.web) === "text") return textTags(item.web);
  const copy = await tagsElsewhere(usage.organizationId, item.web);
  if (copy) return copy;
  const r = await tagWith(item, await inputsOf(item.web), model ? { model } : {});
  void recordUsage(usage, { action: "auto_tag", ...billOf(r), ref: item.web });
  return r.tags;
}
