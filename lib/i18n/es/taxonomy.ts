import type { taxonomy as EnTaxonomy } from "../en/taxonomy";

export const taxonomy: typeof EnTaxonomy = {
  sector: {
    studio: "Estudio / agencia",
    product: "Producto / SaaS",
    ecommerce: "Ecommerce",
    portfolio: "Portfolio",
    editorial: "Editorial / media",
    culture: "Cultura / evento",
    tool: "Herramienta",
    video: "Vídeo / charla",
    other: "Otro",
  },
  style: {
    minimal: "Minimal",
    editorial: "Editorial",
    brutalist: "Brutalista",
    playful: "Playful",
    corporate: "Corporativo",
    immersive: "Inmersivo",
    retro: "Retro",
  },
  tag: {
    typography: "Tipografía",
    motion: "Motion",
    dark: "Dark",
    photography: "Fotografía",
    illustration: "Ilustración",
    "3d": "3D / WebGL",
    grid: "Grid / bento",
    colorful: "Colorido",
    monochrome: "Monocromo",
    humor: "Humor",
    storytelling: "Storytelling",
  },
};
