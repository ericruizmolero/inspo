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
  color: {
    black: "Negro", white: "Blanco", grey: "Gris", beige: "Beige", brown: "Marrón", red: "Rojo", orange: "Naranja",
    yellow: "Amarillo", green: "Verde", teal: "Turquesa", blue: "Azul", purple: "Morado", pink: "Rosa",
  },
  section: {
    hero: "Hero", nav: "Navegación", logos: "Logos de clientes", features: "Funcionalidades", bento: "Bento", stats: "Cifras",
    pricing: "Precios", testimonials: "Testimonios", faq: "Preguntas frecuentes", cta: "Llamada a la acción", team: "Equipo",
    work: "Proyectos / casos", gallery: "Galería", products: "Productos", blog: "Blog / noticias", newsletter: "Newsletter",
    contact: "Contacto", comparison: "Comparativa", integrations: "Integraciones", process: "Pasos / proceso", footer: "Footer",
  },
  element: {
    marquee: "Marquesina", carousel: "Carrusel", tabs: "Pestañas", accordion: "Acordeón", video: "Vídeo", "3d-object": "Objeto 3D",
    mockups: "Mockups", illustration: "Ilustración", photography: "Fotografía", icons: "Iconos", badges: "Etiquetas",
    form: "Formulario", code: "Código", charts: "Gráficos", map: "Mapa", gradient: "Degradado", glass: "Cristal", grain: "Grano",
    shapes: "Formas", collage: "Collage", emoji: "Emoji", cards: "Tarjetas",
  },
  type: {
    serif: "Serif", sans: "Sans serif", mono: "Mono", display: "Display", oversized: "Gigante", condensed: "Condensada",
    handwritten: "Manuscrita", caps: "Mayúsculas", outlined: "Contorno",
  },
  layout: {
    centered: "Centrado", split: "Dividido", asymmetric: "Asimétrico", "full-bleed": "A sangre", columns: "Columnas",
    dense: "Denso", airy: "Aireado", "long-scroll": "Scroll largo", sidebar: "Barra lateral",
  },
};
