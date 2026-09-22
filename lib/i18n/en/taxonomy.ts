// Etiquetas visibles de la taxonomía. La clave es la misma que guarda la base de
// datos en inspo_item.tags_json. Van por lista porque "editorial" es a la vez un
// sector y un estilo, y no significan lo mismo.
//
// Las `description` de lib/taxonomy.ts no están aquí a propósito: son el contrato
// del clasificador, van siempre en inglés y cambiarlas cambia cómo clasifica Jev.
export const taxonomy = {
  sector: {
    estudio: "Studio / agency",
    producto: "Product / SaaS",
    ecommerce: "Ecommerce",
    portfolio: "Portfolio",
    editorial: "Editorial / media",
    cultura: "Culture / event",
    tool: "Tool",
    video: "Video / talk",
    otro: "Other",
  },
  estilo: {
    minimal: "Minimal",
    editorial: "Editorial",
    brutalista: "Brutalist",
    playful: "Playful",
    corporativo: "Corporate",
    inmersivo: "Immersive",
    retro: "Retro",
  },
  tag: {
    tipografia: "Typography",
    motion: "Motion",
    dark: "Dark",
    fotografia: "Photography",
    ilustracion: "Illustration",
    "3d": "3D / WebGL",
    grid: "Grid / bento",
    colorido: "Colourful",
    monocromo: "Monochrome",
    humor: "Humour",
    storytelling: "Storytelling",
  },
};
