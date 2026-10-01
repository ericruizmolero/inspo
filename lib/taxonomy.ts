// Taxonomy shared by client and server. Data only, no dependencies.
//
// `key` is the only thing stored in the database (inspo_item.tags_json).
// Visible labels are in lib/i18n/<locale>/taxonomy.ts; `description` is
// the classifier contract: it's in English on purpose and stays untouched, because
// changing it changes how the tagger classifies.

import type { InspoTags, UserTags } from "@/types/inspo";

export const TAXONOMY_VERSION = 4; // v4: the item's own metadata (lib/meta.ts). v3: one cheap vision call over the whole page, colours from the pixels

/** Threshold above which a boolean tag counts as applied */
export const TAG_THRESHOLD = 0.6;

export interface Term {
  key: string;
  description: string;  // English, for the tagger (classifier contract: don't touch)
}

export const SECTORS: Term[] = [
  { key: "studio",   description: "A design, branding, motion or creative agency/studio presenting its services and work" },
  { key: "product",  description: "A software product, SaaS, app or startup landing page" },
  { key: "ecommerce", description: "An online shop selling physical or digital goods" },
  { key: "portfolio", description: "A personal portfolio of an individual designer, developer, artist or photographer" },
  { key: "editorial", description: "A magazine, publication, blog, newsletter or media outlet" },
  { key: "culture",   description: "Museum, festival, exhibition, music, film, cultural institution or event" },
  { key: "tool",      description: "A developer tool, resource library, template/asset marketplace or utility" },
  { key: "video",     description: "A video, film, documentary, talk or podcast episode (YouTube, Vimeo, streaming)" },
  { key: "other",      description: "None of the above" },
];

export const STYLES: Term[] = [
  { key: "minimal",    description: "Lots of whitespace, restrained palette, few elements, quiet typography" },
  { key: "editorial",  description: "Magazine-like layouts, strong typographic hierarchy, serif fonts, grids and columns" },
  { key: "brutalist", description: "Raw, unpolished, default-looking elements, harsh contrast, system/mono fonts, deliberate roughness" },
  { key: "playful",    description: "Bold colors, illustration, rounded shapes, humor, expressive and fun" },
  { key: "corporate",description: "Conventional business look, safe layout, stock imagery, standard components" },
  { key: "immersive",  description: "3D, WebGL, full-screen video, scroll-driven cinematic experiences" },
  { key: "retro",      description: "Nostalgic references: 90s/Y2K web, pixel art, vintage print, old-school aesthetic" },
];

export const TAGS: Term[] = [
  { key: "typography",   description: "Typography is the hero: large display type or expressive/custom typefaces are the main visual element" },
  { key: "motion",       description: "Heavy use of animation, transitions or scroll-driven motion" },
  { key: "dark",         description: "Dark color scheme (dark background, light text) as the default look" },
  { key: "photography",   description: "Large photography or imagery dominates the page" },
  { key: "illustration",  description: "Illustration or hand-drawn graphics are a key part of the visual identity" },
  { key: "3d",           description: "3D, WebGL or generative/interactive canvas graphics" },
  { key: "grid",         description: "Strong visible grid, bento boxes or modular card layout" },
  { key: "colorful",     description: "Bold, saturated or unusual color palette" },
  { key: "monochrome",    description: "Monochrome or near-monochrome palette (black/white/greys or a single hue)" },
  { key: "humor",        description: "Playful or humorous tone of voice in the copy" },
  { key: "storytelling", description: "Narrative, long-scroll storytelling structure" },
];


// ─── v3 facets ────────────────────────────────────────────────────────────────
// Several can apply at once. The tagger only picks keys from these lists (strict schema); free words go
// in `keywords`. Filters use them with a prefix in ?tags= (see facetOf).

export const THEMES = ["light", "dark", "mixed"] as const;

/** Colour families. Never asked to the model: lib/palette.ts reads them from the pixels. */
export const COLORS: Term[] = [
  { key: "black",  description: "#111" },
  { key: "white",  description: "#fafafa" },
  { key: "grey",   description: "#9a9a9a" },
  { key: "beige",  description: "#e6d8bd" },
  { key: "brown",  description: "#7a5232" },
  { key: "red",    description: "#e0312b" },
  { key: "orange", description: "#f07a1a" },
  { key: "yellow", description: "#f4cf1f" },
  { key: "green",  description: "#2f9e4f" },
  { key: "teal",   description: "#169c9c" },
  { key: "blue",   description: "#2563eb" },
  { key: "purple", description: "#7c3aed" },
  { key: "pink",   description: "#ec4899" },
];

export const SECTIONS: Term[] = [
  { key: "hero",         description: "Opening hero: the first screen with the main headline or visual" },
  { key: "nav",          description: "A visible navigation bar or menu" },
  { key: "logos",        description: "A row or wall of client/partner logos (social proof)" },
  { key: "features",     description: "A features or benefits section, usually icons or cards with short text" },
  { key: "bento",        description: "A bento grid: mixed-size tiles showing several things at once" },
  { key: "stats",        description: "Big numbers or metrics" },
  { key: "pricing",      description: "Pricing plans or a price table" },
  { key: "testimonials", description: "Quotes, reviews or testimonials from people" },
  { key: "faq",          description: "Frequently asked questions, usually an accordion" },
  { key: "cta",          description: "A closing call-to-action band (sign up, buy, contact)" },
  { key: "team",         description: "Team members or people with portraits" },
  { key: "work",         description: "A list or grid of projects, case studies or portfolio pieces" },
  { key: "gallery",      description: "A gallery of images, products or artworks" },
  { key: "products",     description: "A product listing or product detail with buy buttons" },
  { key: "blog",         description: "A list of articles, posts or news" },
  { key: "newsletter",   description: "A newsletter or email sign-up block" },
  { key: "contact",      description: "Contact details, a contact form or an address" },
  { key: "comparison",   description: "A comparison table or before/after" },
  { key: "integrations", description: "Integrations, partners or an app/tool grid" },
  { key: "process",      description: "Steps, a timeline or a how-it-works sequence" },
  { key: "footer",       description: "A designed footer (more than a line of small print)" },
];

export const ELEMENTS: Term[] = [
  { key: "marquee",      description: "Scrolling ticker or marquee text/logos" },
  { key: "carousel",     description: "Carousel or slider with arrows or dots" },
  { key: "tabs",         description: "Tabs or a segmented switcher" },
  { key: "accordion",    description: "Accordion or expandable rows" },
  { key: "video",        description: "Embedded video or a video player frame" },
  { key: "3d-object",    description: "A 3D render or object" },
  { key: "mockups",      description: "Device or product UI mockups (screens, phones, laptops)" },
  { key: "illustration", description: "Illustrations or drawn graphics" },
  { key: "photography",  description: "Photographs" },
  { key: "icons",        description: "A visible icon set" },
  { key: "badges",       description: "Badges, pills, tags or labels" },
  { key: "form",         description: "An input form (search, email, sign-up, contact)" },
  { key: "code",         description: "Code snippets or a terminal" },
  { key: "charts",       description: "Charts, graphs or data visualisation" },
  { key: "map",          description: "A map" },
  { key: "gradient",     description: "Noticeable colour gradients" },
  { key: "glass",        description: "Glassmorphism: blurred translucent panels" },
  { key: "grain",        description: "Grain, noise or texture overlay" },
  { key: "shapes",       description: "Abstract or geometric shapes as decoration" },
  { key: "collage",      description: "Collage, cut-outs or layered scrapbook images" },
  { key: "emoji",        description: "Emoji or stickers" },
  { key: "cards",        description: "Repeated cards as the main component" },
];

export const TYPE: Term[] = [
  { key: "serif",       description: "Serif typefaces are prominent" },
  { key: "sans",        description: "Sans-serif typefaces are prominent" },
  { key: "mono",        description: "Monospaced type is prominent" },
  { key: "display",     description: "Expressive or custom display typefaces" },
  { key: "oversized",   description: "Huge headline type filling the width" },
  { key: "condensed",   description: "Condensed or narrow type" },
  { key: "handwritten", description: "Handwritten or script type" },
  { key: "caps",        description: "All-caps headings or labels as a system" },
  { key: "outlined",    description: "Outlined, stroked or hollow letters" },
];

export const LAYOUT: Term[] = [
  { key: "centered",    description: "Centered, symmetric composition" },
  { key: "split",       description: "Split screen: text one side, visual the other" },
  { key: "asymmetric",  description: "Asymmetric or broken-grid composition" },
  { key: "full-bleed",  description: "Full-bleed images or colour blocks edge to edge" },
  { key: "columns",     description: "Editorial multi-column text" },
  { key: "dense",       description: "Dense: lots of content packed tightly" },
  { key: "airy",        description: "Airy: generous whitespace" },
  { key: "long-scroll", description: "A long page with many sections" },
  { key: "sidebar",     description: "A persistent sidebar" },
];

/** The filterable facets beyond sector/style/traits, with their prefix in ?tags= */
export const FACETS = [
  { prefix: "c", field: "palette", terms: COLORS },
  { prefix: "s", field: "sections", terms: SECTIONS },
  { prefix: "e", field: "elements", terms: ELEMENTS },
  { prefix: "y", field: "type", terms: TYPE },
  { prefix: "l", field: "layout", terms: LAYOUT },
] as const;
export type FacetField = (typeof FACETS)[number]["field"];

// ─── What an item's tags are, with the workspace's edits ─────────────────────
// Selectors name one tag: "s:pricing" (a facet, by its prefix), "k:coffee shop" (a keyword, the AI's or
// one somebody added) and a bare trait key ("dark"), which is what ?tags= has always held for traits.
// A removed trait is stored as "t:dark" so it can't clash with a keyword.


export interface TagView {
  palette: string[]; sections: string[]; elements: string[]; type: string[]; layout: string[];
  traits: string[];
  /** The AI's keywords and the ones people added, minus the removed */
  keywords: string[];
  /** Who made it, from its metadata: author, studio or publication, @handle */
  credits: string[];
}

/** A tag as people type it: lowercase, single spaces, no leading #, 40 characters at most */
export const cleanTag = (s: string) => s.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 40);
export const MAX_ADDED = 30;

/** The item's tags as everyone sees them: the AI's, minus what was removed, plus what was added */
export function viewOf(t: InspoTags | undefined, user: UserTags | undefined = t?.user): TagView | null {
  if (!t) return null;
  const gone = new Set(user?.removed ?? []);
  const keep = (prefix: string, list: string[] | undefined) => (list ?? []).filter((k) => !gone.has(`${prefix}:${k}`));
  return {
    palette: keep("c", t.palette), sections: keep("s", t.sections), elements: keep("e", t.elements),
    type: keep("y", t.type), layout: keep("l", t.layout),
    traits: keep("t", TAGS.filter((x) => (t.tags[x.key] ?? 0) >= TAG_THRESHOLD).map((x) => x.key)),
    keywords: keep("k", [...new Set([...(t.keywords ?? []), ...(user?.added ?? [])])]),
    credits: keep("a", [...new Set([t.meta?.author, t.meta?.publisher, t.meta?.handle].filter((x): x is string => !!x))]),
  };
}

/** "s:pricing" → { field: "sections", key: "pricing" }. "k:…" is a keyword, "a:…" a credit. A bare key is a trait (TAGS). */
export function facetOf(sel: string): { field: FacetField | "keywords" | "credits" | null; key: string } {
  const m = sel.match(/^([a-z]):(.+)$/);
  if (m?.[1] === "k") return { field: "keywords", key: m[2] };
  if (m?.[1] === "a") return { field: "credits", key: m[2] };
  const f = m && FACETS.find((x) => x.prefix === m[1]);
  return f ? { field: f.field, key: m![2] } : { field: null, key: sel };
}

/** Does an item with these tags match one selected filter (a trait key, a prefixed facet or a keyword)? */
export function hasFacet(t: InspoTags | undefined, sel: string): boolean {
  const v = viewOf(t);
  if (!v) return false;
  const { field, key } = facetOf(sel);
  return field ? v[field].includes(key) : v.traits.includes(key);
}
