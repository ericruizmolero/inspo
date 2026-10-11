// English by default at /, Spanish at /es/. Same two languages as the app; the body text is the app's own guest copy.
export const APP_URL = "https://app.criterio.design";

export type Locale = "en" | "es";

// Every page, by its path in each language: the header's language switch, hreflang, the footer and the sitemap read it.
export const PAGES = {
  home: { en: "/", es: "/es/" },
  resources: { en: "/resources/", es: "/es/resources/" },
  privacy: { en: "/privacy/", es: "/es/privacy/" },
  terms: { en: "/terms/", es: "/es/terms/" },
  extension: { en: "/extension/privacy/", es: "/es/extension/privacy/" },
} as const satisfies Record<string, Record<Locale, string>>;

export type PageKey = keyof typeof PAGES;

export const copy = {
  en: {
    lang: "en",
    other: { lang: "es", label: "Español" },
    login: { label: "Log in", href: `${APP_URL}/login` },
    title: "criterio.design",
    headline: "Your references, written down as decisions.",
    body: "Save the references for a project. Criterio reads them and writes down the design decisions in criterio.md, a file your agent or your team reads before building.",
    footer: { resources: "Resources", privacy: "Privacy", terms: "Terms", extension: "Extension privacy" },
    resources: {
      title: "Resources",
      headline: "Where to look",
      lead: (n: number) => `${n} sites we open before we start and while we work. Galleries, sections, motion, type, code, DESIGN.md for agents and AI tools. Picked by hand, each one once.`,
      search: "Search resources",
      all: "All kinds",
      kind: "Kind",
      new: "New",
      save: "Save to Criterio",
      saveLabel: (name: string) => `Save ${name} to Criterio`,
      none: "Nothing by that name. Try another word, or pick all kinds.",
    },
  },
  es: {
    lang: "es",
    other: { lang: "en", label: "English" },
    login: { label: "Entrar", href: `${APP_URL}/login?lang=es` },
    title: "criterio.design",
    headline: "Tus referencias, escritas como decisiones.",
    body: "Guarda las referencias de un proyecto. Criterio las lee y escribe las decisiones de diseño en criterio.md, un fichero que tu agente o tu equipo lee antes de construir.",
    footer: { resources: "Recursos", privacy: "Privacidad", terms: "Términos", extension: "Privacidad de la extensión" },
    resources: {
      title: "Recursos",
      headline: "Dónde mirar",
      lead: (n: number) => `${n} webs que abrimos antes de empezar y mientras trabajamos. Galerías, secciones, motion, tipografía, código, DESIGN.md para agentes y herramientas de IA. Elegidas a mano, ninguna repetida.`,
      search: "Buscar recursos",
      all: "Todos los tipos",
      kind: "Tipo",
      new: "Nuevo",
      save: "Guardar en Criterio",
      saveLabel: (name: string) => `Guardar ${name} en Criterio`,
      none: "Nada con ese nombre. Prueba con otra palabra o elige todos los tipos.",
    },
  },
} as const satisfies Record<Locale, unknown>;
