// English by default at /, Spanish at /es/. Same two languages as the app; the body text is the app's own guest copy.
export const APP_URL = "https://app.criterio.design";

export type Locale = "en" | "es";

// Every page: its path in each language and, for the ones the footer lists, its name there. The header's language
// switch, canonical, hreflang, the footer and the sitemap all read this table, in this order.
export const PAGES = {
  home: { path: { en: "/", es: "/es/" } },
  resources: { path: { en: "/resources/", es: "/es/resources/" }, nav: { en: "Resources", es: "Recursos" } },
  skills: { path: { en: "/skills/", es: "/es/skills/" }, nav: { en: "Skills", es: "Skills" } },
  privacy: { path: { en: "/privacy/", es: "/es/privacy/" }, nav: { en: "Privacy", es: "Privacidad" } },
  terms: { path: { en: "/terms/", es: "/es/terms/" }, nav: { en: "Terms", es: "Términos" } },
  extensionPrivacy: { path: { en: "/extension/privacy/", es: "/es/extension/privacy/" }, nav: { en: "Extension privacy", es: "Privacidad de la extensión" } },
} as const satisfies Record<string, { path: Record<Locale, string>; nav?: Record<Locale, string> }>;

export type PageKey = keyof typeof PAGES;

export const copy = {
  en: {
    lang: "en",
    other: { lang: "es", label: "Español" },
    login: { label: "Log in", href: `${APP_URL}/login` },
    title: "criterio.design",
    headline: "Your references, written down as decisions.",
    body: "Save the references for a project. Criterio reads them and writes down the design decisions in criterio.md, a file your agent or your team reads before building.",
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
    skills: {
      title: "Skills",
      headline: "Skills for your agent",
      lead: (n: number) => `${n} skills for Claude, Cursor or Codex, grouped by what they build. The ones by criterio.design read your project's criterio.md and build with its numbers.`,
      search: "Search skills",
      all: "All topics",
      topic: "Topic",
      new: "New",
      by: (author: string) => `by ${author}`,
      copy: "Copy",
      copied: "Copied",
      copyLabel: (command: string) => `Copy ${command}`,
      inCriterio: "In criterio.md",
      inCriterioHint: "Also a skill of criterio.md: switch it on from Skills in your project",
      none: "No skill by that name. Try another word, or pick all topics.",
    },
  },
  es: {
    lang: "es",
    other: { lang: "en", label: "English" },
    login: { label: "Entrar", href: `${APP_URL}/login?lang=es` },
    title: "criterio.design",
    headline: "Tus referencias, escritas como decisiones.",
    body: "Guarda las referencias de un proyecto. Criterio las lee y escribe las decisiones de diseño en criterio.md, un fichero que tu agente o tu equipo lee antes de construir.",
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
    skills: {
      title: "Skills",
      headline: "Skills para tu agente",
      lead: (n: number) => `${n} skills para Claude, Cursor o Codex, agrupadas por lo que construyen. Las de criterio.design leen el criterio.md de tu proyecto y construyen con sus números.`,
      search: "Buscar skills",
      all: "Todos los temas",
      topic: "Tema",
      new: "Nuevo",
      by: (author: string) => `de ${author}`,
      copy: "Copiar",
      copied: "Copiado",
      copyLabel: (command: string) => `Copiar ${command}`,
      inCriterio: "En criterio.md",
      inCriterioHint: "También es una skill de criterio.md: actívala desde Skills en tu proyecto",
      none: "Ninguna skill con ese nombre. Prueba con otra palabra o elige todos los temas.",
    },
  },
} as const satisfies Record<Locale, unknown>;
