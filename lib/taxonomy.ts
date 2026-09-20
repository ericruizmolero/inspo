// Taxonomía compartida cliente/servidor. Solo datos, sin dependencias.
// Las descripciones van en inglés porque es el idioma principal de Jev.

export const TAXONOMY_VERSION = 2; // v2: añade descripción visual (Claude) al estado de Jev

/** Umbral a partir del cual un tag booleano se considera aplicado */
export const TAG_THRESHOLD = 0.6;

export interface Term {
  key: string;
  label: string;        // castellano, para la UI
  description: string;  // inglés, para Jev
}

export const SECTORES: Term[] = [
  { key: "estudio",   label: "Estudio / agencia", description: "A design, branding, motion or creative agency/studio presenting its services and work" },
  { key: "producto",  label: "Producto / SaaS",   description: "A software product, SaaS, app or startup landing page" },
  { key: "ecommerce", label: "Ecommerce",         description: "An online shop selling physical or digital goods" },
  { key: "portfolio", label: "Portfolio",         description: "A personal portfolio of an individual designer, developer, artist or photographer" },
  { key: "editorial", label: "Editorial / media", description: "A magazine, publication, blog, newsletter or media outlet" },
  { key: "cultura",   label: "Cultura / evento",  description: "Museum, festival, exhibition, music, film, cultural institution or event" },
  { key: "tool",      label: "Herramienta",       description: "A developer tool, resource library, template/asset marketplace or utility" },
  { key: "video",     label: "Vídeo / charla",    description: "A video, film, documentary, talk or podcast episode (YouTube, Vimeo, streaming)" },
  { key: "otro",      label: "Otro",              description: "None of the above" },
];

export const ESTILOS: Term[] = [
  { key: "minimal",    label: "Minimal",     description: "Lots of whitespace, restrained palette, few elements, quiet typography" },
  { key: "editorial",  label: "Editorial",   description: "Magazine-like layouts, strong typographic hierarchy, serif fonts, grids and columns" },
  { key: "brutalista", label: "Brutalista",  description: "Raw, unpolished, default-looking elements, harsh contrast, system/mono fonts, deliberate roughness" },
  { key: "playful",    label: "Playful",     description: "Bold colors, illustration, rounded shapes, humor, expressive and fun" },
  { key: "corporativo",label: "Corporativo", description: "Conventional business look, safe layout, stock imagery, standard components" },
  { key: "inmersivo",  label: "Inmersivo",   description: "3D, WebGL, full-screen video, scroll-driven cinematic experiences" },
  { key: "retro",      label: "Retro",       description: "Nostalgic references: 90s/Y2K web, pixel art, vintage print, old-school aesthetic" },
];

export const TAGS: Term[] = [
  { key: "tipografia",   label: "Tipografía",    description: "Typography is the hero: large display type or expressive/custom typefaces are the main visual element" },
  { key: "motion",       label: "Motion",        description: "Heavy use of animation, transitions or scroll-driven motion" },
  { key: "dark",         label: "Dark",          description: "Dark color scheme (dark background, light text) as the default look" },
  { key: "fotografia",   label: "Fotografía",    description: "Large photography or imagery dominates the page" },
  { key: "ilustracion",  label: "Ilustración",   description: "Illustration or hand-drawn graphics are a key part of the visual identity" },
  { key: "3d",           label: "3D / WebGL",    description: "3D, WebGL or generative/interactive canvas graphics" },
  { key: "grid",         label: "Grid / bento",  description: "Strong visible grid, bento boxes or modular card layout" },
  { key: "colorido",     label: "Colorido",      description: "Bold, saturated or unusual color palette" },
  { key: "monocromo",    label: "Monocromo",     description: "Monochrome or near-monochrome palette (black/white/greys or a single hue)" },
  { key: "humor",        label: "Humor",         description: "Playful or humorous tone of voice in the copy" },
  { key: "storytelling", label: "Storytelling",  description: "Narrative, long-scroll storytelling structure" },
];

export const labelOf = (list: Term[], key: string) => list.find((t) => t.key === key)?.label ?? key;
