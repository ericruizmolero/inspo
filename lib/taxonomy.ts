// Taxonomy shared by client and server. Data only, no dependencies.
//
// `key` is the only thing stored in the database (inspo_item.tags_json).
// Visible labels are in lib/i18n/<locale>/taxonomy.ts; `description` is
// the classifier contract: it's in English on purpose and stays untouched, because
// changing it changes how the tagger classifies.

import type { InspoTags, UserTags } from "@/types/inspo";
import type { SystemArea } from "@/types/system";

export const TAXONOMY_VERSION = 5; // v5: signals per area of the system (SIGNALS) and the page's fonts, for the system to count. v4: the item's own metadata (lib/meta.ts). v3: one cheap vision call over the whole page, colours from the pixels

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

// ─── v5 signals: what a reference shows for each area of the system ─────────────
// A closed vocabulary per area, so two references with the same trait get the same key and the system can
// count them ("in 12 of 40") by grouping keys, with no model pass to group free words. Keys are unique across
// areas. The tagger picks 1 or 2 per area it can see, with the visible specifics as evidence.

export const SIGNALS: Record<SystemArea, Term[]> = {
  typography: [
    { key: "display-serif-high-contrast", description: "Headlines in a high-contrast display serif" },
    { key: "serif-text", description: "A serif for body or reading text" },
    { key: "geometric-sans", description: "Geometric sans: round o, even strokes (Futura-like)" },
    { key: "grotesk-neutral", description: "Neutral grotesque sans (Helvetica, Inter-like) as the main voice" },
    { key: "humanist-sans", description: "Humanist sans: open, calligraphic, warm" },
    { key: "condensed-display", description: "Condensed or compressed display headlines" },
    { key: "mono-accents", description: "Monospaced type for labels, numbers or small accents" },
    { key: "oversized-headlines", description: "Huge headlines filling the width or the first screen" },
    { key: "quiet-small-type", description: "Small, quiet type; hierarchy by weight or space, not size" },
    { key: "single-family", description: "One family does everything" },
    { key: "serif-sans-pair", description: "A serif and a sans paired with clear roles" },
    { key: "script-lettering", description: "Script, handwritten or hand-lettered type" },
    { key: "caps-labels", description: "All-caps labels, eyebrows or navigation as a system" },
  ],
  color: [
    { key: "dark-one-accent", description: "Dark ground with a single bright accent" },
    { key: "light-one-accent", description: "Light ground with a single accent colour" },
    { key: "monochrome", description: "Black, white and greys, no hue" },
    { key: "warm-neutrals", description: "Warm neutral grounds: cream, beige, sand" },
    { key: "cool-neutrals", description: "Cool greys and off-whites" },
    { key: "pastel", description: "Soft pastel colours" },
    { key: "saturated-multi", description: "Several saturated colours together" },
    { key: "earthy", description: "Earthy tones: olive, terracotta, ochre, brown" },
    { key: "gradient-led", description: "Gradients carry the colour (grounds, glows, mesh)" },
    { key: "color-blocking", description: "Large flat blocks of strong colour, section by section" },
    { key: "duotone", description: "Two colours only, used as a pair" },
  ],
  layout: [
    { key: "strict-grid", description: "A visible, strict column grid" },
    { key: "bento-grid", description: "Bento: tiles of mixed sizes" },
    { key: "editorial-columns", description: "Magazine layout: text columns, varied blocks" },
    { key: "asymmetric-broken", description: "Asymmetric or broken grid, overlapping elements" },
    { key: "centered-column", description: "One centred column, narrow measure" },
    { key: "split-screen", description: "Split screen: text one side, visual the other" },
    { key: "full-bleed-sections", description: "Full-bleed images or colour sections edge to edge" },
    { key: "generous-whitespace", description: "Generous whitespace, few elements per screen" },
    { key: "dense-information", description: "Dense: much content packed tight" },
    { key: "card-based", description: "Repeated cards as the main unit" },
    { key: "sharp-corners", description: "Square corners, no radius" },
    { key: "rounded-soft", description: "Large radii, soft rounded shapes" },
    { key: "app-shell", description: "A persistent sidebar or app-like shell" },
  ],
  motion: [
    { key: "scroll-storytelling", description: "A long page told section by section, scroll-driven" },
    { key: "marquee-ticker", description: "Scrolling marquee or ticker" },
    { key: "webgl-3d", description: "A 3D or WebGL scene" },
    { key: "video-hero", description: "A video or animated hero" },
    { key: "kinetic-type", description: "Animated or kinetic type" },
    { key: "custom-cursor", description: "A custom cursor" },
    { key: "carousel-slider", description: "Carousels or sliders" },
    { key: "ui-states", description: "Visible interface states: toggles, tabs, hovers, animated buttons" },
    { key: "still-quiet", description: "Still and quiet: nothing suggests motion" },
  ],
  iconography: [
    { key: "line-icons", description: "Thin outline icons" },
    { key: "filled-icons", description: "Solid filled icons" },
    { key: "duotone-icons", description: "Two-tone icons" },
    { key: "illustrated-icons", description: "Small illustrations or 3D icons in place of glyphs" },
    { key: "emoji-icons", description: "Emoji used as icons" },
    { key: "geometric-pictograms", description: "Geometric pictograms, signage-like" },
    { key: "contained-icons", description: "Icons in coloured squares or circles" },
    { key: "arrows-only", description: "No icon set: arrows or simple marks only" },
  ],
  logo: [
    { key: "wordmark", description: "A wordmark: the name set in type" },
    { key: "symbol-wordmark", description: "A symbol beside the name" },
    { key: "symbol-only", description: "A symbol alone" },
    { key: "monogram", description: "A monogram or initials" },
    { key: "custom-lettering", description: "Custom-drawn or modified lettering" },
    { key: "serif-wordmark", description: "A wordmark in a serif" },
    { key: "sans-wordmark", description: "A wordmark in a sans" },
    { key: "oversized-logo", description: "The logo set huge, as a graphic" },
    { key: "one-colour-logo", description: "The logo in one ink" },
  ],
  imagery: [
    { key: "documentary-photo", description: "Candid photos of real people and places" },
    { key: "studio-product-photo", description: "Clean studio product photos" },
    { key: "editorial-portraits", description: "Editorial portraits" },
    { key: "black-white-photo", description: "Black and white photography" },
    { key: "flat-illustration", description: "Flat vector illustration" },
    { key: "hand-drawn-illustration", description: "Hand-drawn or textured illustration" },
    { key: "3d-renders", description: "3D renders" },
    { key: "ui-screenshots", description: "Product UI screenshots or device mockups" },
    { key: "abstract-graphics", description: "Abstract shapes, patterns or generative graphics" },
    { key: "collage-cutouts", description: "Collage, cut-outs, layered images" },
    { key: "grain-texture", description: "Grain, noise or print texture" },
    { key: "small-framed-images", description: "Small framed images as detail, not as hero" },
  ],
  voice: [
    { key: "terse-confident", description: "Short, confident lines, few words" },
    { key: "playful-witty", description: "Playful and witty" },
    { key: "technical-precise", description: "Technical and precise: numbers, specs" },
    { key: "warm-personal", description: "Warm, first person, personal" },
    { key: "manifesto", description: "Manifesto statements, big claims" },
    { key: "long-form-editorial", description: "Long-form editorial writing" },
    { key: "formal-corporate", description: "Formal, corporate" },
    { key: "benefit-led", description: "Benefit-led marketing copy with clear calls to action" },
    { key: "casual-lowercase", description: "Casual, lowercase, internet-native" },
    { key: "poetic", description: "Poetic and evocative, mood over information" },
  ],
};

/** The area a signal key belongs to */
export const SIGNAL_AREA: Record<string, SystemArea> = Object.fromEntries(
  (Object.entries(SIGNALS) as [SystemArea, Term[]][]).flatMap(([area, terms]) => terms.map((t) => [t.key, area])),
);

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
