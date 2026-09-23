// Taxonomy shared by client and server. Data only, no dependencies.
//
// `key` is the only thing stored in the database (inspo_item.tags_json).
// Visible labels are in lib/i18n/<locale>/taxonomy.ts; `description` is
// the classifier contract: it's in English on purpose and stays untouched, because
// changing it changes how Jev classifies.

export const TAXONOMY_VERSION = 2; // v2: adds visual description (Claude) to Jev's state

/** Threshold above which a boolean tag counts as applied */
export const TAG_THRESHOLD = 0.6;

export interface Term {
  key: string;
  description: string;  // English, for Jev (classifier contract: don't touch)
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

