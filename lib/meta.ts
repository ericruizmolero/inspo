// What an item says about itself, read without a model (no cost): a page's meta tags and JSON-LD, a post's
// author and hashtags, an image's EXIF/XMP/IPTC. The tagger hands it to the model as evidence and keeps it
// with the tags, so search finds an item by who made it or by the words its author chose.
import type { InspoMeta } from "@/types/inspo";

const MAX_KEYWORDS = 20;

const decode = (s: string) => s
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const clean = (s: unknown) => (typeof s === "string" ? decode(s).replace(/\s+/g, " ").trim() : "");
const words = (list: unknown[]) => [...new Set(list.flatMap((k) => clean(k).split(/\s*[,;|]\s*/))
  .map((k) => k.replace(/^#/, "").trim().toLowerCase()).filter((k) => k.length > 1 && k.length < 50))].slice(0, MAX_KEYWORDS);

/** "Framer 31f3ac5", "WordPress 6.4.2" → "Framer", "WordPress": the tool, not its build */
const tool = (s: string) => s.replace(/\s+(v?\d[\w.-]*|[0-9a-f]{6,})(\s.*)?$/i, "").trim();

/** Drops empty fields, so a page with nothing to say leaves nothing */
function compact(m: InspoMeta): InspoMeta | undefined {
  const out = Object.fromEntries(Object.entries(m).filter(([, v]) => (Array.isArray(v) ? v.length : !!v))) as InspoMeta;
  return Object.keys(out).length ? out : undefined;
}

// ─── Pages ───────────────────────────────────────────────────────────────────

function metaTag(html: string, key: string): string {
  const a = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${key}["']`, "i");
  return clean(html.match(a)?.[1] ?? html.match(b)?.[1] ?? "");
}
const metaTags = (html: string, key: string) =>
  [...html.matchAll(new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']*)["']`, "gi"))].map((m) => m[1]);

type Ld = Record<string, unknown>;
const nameOf = (v: unknown): string =>
  typeof v === "string" ? clean(v) : Array.isArray(v) ? nameOf(v[0]) : v && typeof v === "object" ? clean((v as Ld).name) : "";

/** Every JSON-LD object on the page, @graph and arrays flattened. Broken blocks are skipped. */
function jsonLd(html: string): Ld[] {
  const out: Ld[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") { out.push(v as Ld); if ((v as Ld)["@graph"]) walk((v as Ld)["@graph"]); }
  };
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(m[1].trim())); } catch { /* a broken block says nothing */ }
  }
  return out;
}

// The types that say what the page is, most specific first: a site's WebSite/WebPage come last
const GENERIC = new Set(["WebSite", "WebPage", "BreadcrumbList", "ListItem", "SiteNavigationElement", "ImageObject", "SearchAction", "EntryPoint", "ReadAction"]);

export function pageMeta(html: string): InspoMeta | undefined {
  const ld = jsonLd(html);
  const typeOf = (o: Ld) => [o["@type"]].flat().filter((x): x is string => typeof x === "string")[0] ?? "";
  const main = ld.find((o) => typeOf(o) && !GENERIC.has(typeOf(o))) ?? ld[0];
  const org = ld.find((o) => /Organization|Corporation|LocalBusiness|ProfessionalService/.test(typeOf(o)));
  const person = ld.find((o) => typeOf(o) === "Person");
  const address = (org?.address ?? main?.address) as Ld | undefined;
  return compact({
    author: metaTag(html, "author") || nameOf(main?.author) || nameOf(main?.creator) || clean(person?.name) || metaTag(html, "article:author"),
    publisher: nameOf(main?.publisher) || clean(org?.name) || metaTag(html, "og:site_name"),
    handle: metaTag(html, "twitter:creator") || metaTag(html, "twitter:site"),
    // og:type "website" is every site's: only a more specific one says something
    kind: (main && typeOf(main) && !GENERIC.has(typeOf(main)) ? typeOf(main) : "") || metaTag(html, "og:type").replace(/^website$/i, ""),
    keywords: words([metaTag(html, "keywords"), ...metaTags(html, "article:tag"), metaTag(html, "article:section"), ...[main?.keywords].flat()]),
    date: metaTag(html, "article:published_time") || clean(main?.datePublished) || clean(main?.dateCreated),
    generator: tool(metaTag(html, "generator")),
    place: address ? [clean(address.addressLocality), clean(address.addressCountry && nameOf(address.addressCountry))].filter(Boolean).join(", ") : "",
  });
}

// ─── Posts on X ──────────────────────────────────────────────────────────────

export function postMeta(post: { author: string; handle: string; text: string; createdAt: string | null }): InspoMeta | undefined {
  return compact({
    author: clean(post.author),
    handle: post.handle ? `@${post.handle.replace(/^@/, "")}` : "",
    keywords: words([...post.text.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1])),
    date: post.createdAt ?? "",
  });
}

// ─── Images ──────────────────────────────────────────────────────────────────

/** EXIF, XMP and IPTC of an uploaded image. Screenshots and pasted images usually carry none. */
export async function imageMeta(data: Buffer): Promise<InspoMeta | undefined> {
  try {
    const exifr = (await import("exifr")).default;
    const m = (await exifr.parse(data, { tiff: true, exif: true, xmp: true, iptc: true, gps: false, mergeOutput: true })) as Ld | undefined;
    if (!m) return undefined;
    const date = m.DateTimeOriginal ?? m.CreateDate;
    return compact({
      author: nameOf(m.Artist) || nameOf(m.creator) || nameOf(m.Byline) || nameOf(m["By-line"]),
      copyright: nameOf(m.Copyright) || nameOf(m.rights) || nameOf(m.CopyrightNotice),
      keywords: words([m.Keywords, m.subject].flat()),
      date: date instanceof Date ? date.toISOString() : clean(date),
      generator: tool(clean(m.Software) || clean(m.CreatorTool)),
      camera: [clean(m.Make), clean(m.Model)].filter(Boolean).join(" ").replace(/^(\w+) \1\b/i, "$1"),
      place: [clean(m.City), clean(m.Country) || clean(m["Country-PrimaryLocationName"])].filter(Boolean).join(", "),
    });
  } catch {
    return undefined;
  }
}

/** The metadata as lines for the model's prompt */
export function metaLines(m: InspoMeta | undefined): string[] {
  if (!m) return [];
  const l: string[] = [];
  if (m.author) l.push(`Author: ${m.author}`);
  if (m.publisher) l.push(`Publisher: ${m.publisher}`);
  if (m.handle) l.push(`Handle: ${m.handle}`);
  if (m.kind) l.push(`Declared type: ${m.kind}`);
  if (m.keywords?.length) l.push(`Its own keywords: ${m.keywords.join(", ")}`);
  if (m.place) l.push(`Place: ${m.place}`);
  if (m.camera) l.push(`Camera: ${m.camera}`);
  if (m.generator) l.push(`Made with: ${m.generator}`);
  return l;
}
