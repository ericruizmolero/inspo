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
  color: {
    black: "Black", white: "White", grey: "Grey", beige: "Beige", brown: "Brown", red: "Red", orange: "Orange",
    yellow: "Yellow", green: "Green", teal: "Teal", blue: "Blue", purple: "Purple", pink: "Pink",
  },
  section: {
    hero: "Hero", nav: "Navigation", logos: "Logo wall", features: "Features", bento: "Bento grid", stats: "Stats",
    pricing: "Pricing", testimonials: "Testimonials", faq: "FAQ", cta: "Call to action", team: "Team",
    work: "Work / case studies", gallery: "Gallery", products: "Products", blog: "Blog / news", newsletter: "Newsletter",
    contact: "Contact", comparison: "Comparison", integrations: "Integrations", process: "Steps / process", footer: "Footer",
  },
  element: {
    marquee: "Marquee", carousel: "Carousel", tabs: "Tabs", accordion: "Accordion", video: "Video", "3d-object": "3D object",
    mockups: "Mockups", illustration: "Illustration", photography: "Photography", icons: "Icons", badges: "Badges",
    form: "Form", code: "Code", charts: "Charts", map: "Map", gradient: "Gradient", glass: "Glass", grain: "Grain",
    shapes: "Shapes", collage: "Collage", emoji: "Emoji", cards: "Cards",
  },
  type: {
    serif: "Serif", sans: "Sans serif", mono: "Mono", display: "Display", oversized: "Oversized", condensed: "Condensed",
    handwritten: "Handwritten", caps: "All caps", outlined: "Outlined",
  },
  layout: {
    centered: "Centered", split: "Split", asymmetric: "Asymmetric", "full-bleed": "Full bleed", columns: "Columns",
    dense: "Dense", airy: "Airy", "long-scroll": "Long scroll", sidebar: "Sidebar",
  },
};
