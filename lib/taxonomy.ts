// Taxonomía compartida cliente/servidor. Solo datos, sin dependencias.
//
// `key` es lo único que se guarda en la base de datos (inspo_item.tags_json).
// Las etiquetas visibles están en lib/i18n/<idioma>/taxonomy.ts; `description` es
// el contrato del clasificador: está en inglés a propósito y no se toca, porque
// cambiarla cambia cómo clasifica Jev.

export const TAXONOMY_VERSION = 2; // v2: añade descripción visual (Claude) al estado de Jev

/** Umbral a partir del cual un tag booleano se considera aplicado */
export const TAG_THRESHOLD = 0.6;

export interface Term {
  key: string;
  description: string;  // inglés, para Jev (contrato del clasificador: no tocar)
}

export const SECTORES: Term[] = [
  { key: "estudio",   description: "A design, branding, motion or creative agency/studio presenting its services and work" },
  { key: "producto",  description: "A software product, SaaS, app or startup landing page" },
  { key: "ecommerce", description: "An online shop selling physical or digital goods" },
  { key: "portfolio", description: "A personal portfolio of an individual designer, developer, artist or photographer" },
  { key: "editorial", description: "A magazine, publication, blog, newsletter or media outlet" },
  { key: "cultura",   description: "Museum, festival, exhibition, music, film, cultural institution or event" },
  { key: "tool",      description: "A developer tool, resource library, template/asset marketplace or utility" },
  { key: "video",     description: "A video, film, documentary, talk or podcast episode (YouTube, Vimeo, streaming)" },
  { key: "otro",      description: "None of the above" },
];

export const ESTILOS: Term[] = [
  { key: "minimal",    description: "Lots of whitespace, restrained palette, few elements, quiet typography" },
  { key: "editorial",  description: "Magazine-like layouts, strong typographic hierarchy, serif fonts, grids and columns" },
  { key: "brutalista", description: "Raw, unpolished, default-looking elements, harsh contrast, system/mono fonts, deliberate roughness" },
  { key: "playful",    description: "Bold colors, illustration, rounded shapes, humor, expressive and fun" },
  { key: "corporativo",description: "Conventional business look, safe layout, stock imagery, standard components" },
  { key: "inmersivo",  description: "3D, WebGL, full-screen video, scroll-driven cinematic experiences" },
  { key: "retro",      description: "Nostalgic references: 90s/Y2K web, pixel art, vintage print, old-school aesthetic" },
];

export const TAGS: Term[] = [
  { key: "tipografia",   description: "Typography is the hero: large display type or expressive/custom typefaces are the main visual element" },
  { key: "motion",       description: "Heavy use of animation, transitions or scroll-driven motion" },
  { key: "dark",         description: "Dark color scheme (dark background, light text) as the default look" },
  { key: "fotografia",   description: "Large photography or imagery dominates the page" },
  { key: "ilustracion",  description: "Illustration or hand-drawn graphics are a key part of the visual identity" },
  { key: "3d",           description: "3D, WebGL or generative/interactive canvas graphics" },
  { key: "grid",         description: "Strong visible grid, bento boxes or modular card layout" },
  { key: "colorido",     description: "Bold, saturated or unusual color palette" },
  { key: "monocromo",    description: "Monochrome or near-monochrome palette (black/white/greys or a single hue)" },
  { key: "humor",        description: "Playful or humorous tone of voice in the copy" },
  { key: "storytelling", description: "Narrative, long-scroll storytelling structure" },
];

