// Visible taxonomy labels. The key is the same one the database stores
// in inspo_item.tags_json. Grouped by list because "editorial" is both a
// sector and a style, and they mean different things.
//
// The `description` fields in lib/taxonomy.ts are left out on purpose: they are the
// classifier's contract, always in English, and changing them changes how Jev classifies.
export const taxonomy = {
  sector: {
    studio: "Studio / agency",
    product: "Product / SaaS",
    ecommerce: "Ecommerce",
    portfolio: "Portfolio",
    editorial: "Editorial / media",
    culture: "Culture / event",
    tool: "Tool",
    video: "Video / talk",
    other: "Other",
  },
  style: {
    minimal: "Minimal",
    editorial: "Editorial",
    brutalist: "Brutalist",
    playful: "Playful",
    corporate: "Corporate",
    immersive: "Immersive",
    retro: "Retro",
  },
  tag: {
    typography: "Typography",
    motion: "Motion",
    dark: "Dark",
    photography: "Photography",
    illustration: "Illustration",
    "3d": "3D / WebGL",
    grid: "Grid / bento",
    colorful: "Colourful",
    monochrome: "Monochrome",
    humor: "Humour",
    storytelling: "Storytelling",
  },
};
