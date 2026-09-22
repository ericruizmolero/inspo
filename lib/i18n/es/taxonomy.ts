import type { taxonomy as EnTaxonomy } from "../en/taxonomy";

export const taxonomy: typeof EnTaxonomy = {
  sector: {
    estudio: "Estudio / agencia",
    producto: "Producto / SaaS",
    ecommerce: "Ecommerce",
    portfolio: "Portfolio",
    editorial: "Editorial / media",
    cultura: "Cultura / evento",
    tool: "Herramienta",
    video: "Vídeo / charla",
    otro: "Otro",
  },
  estilo: {
    minimal: "Minimal",
    editorial: "Editorial",
    brutalista: "Brutalista",
    playful: "Playful",
    corporativo: "Corporativo",
    inmersivo: "Inmersivo",
    retro: "Retro",
  },
  tag: {
    tipografia: "Tipografía",
    motion: "Motion",
    dark: "Dark",
    fotografia: "Fotografía",
    ilustracion: "Ilustración",
    "3d": "3D / WebGL",
    grid: "Grid / bento",
    colorido: "Colorido",
    monocromo: "Monocromo",
    humor: "Humor",
    storytelling: "Storytelling",
  },
};
