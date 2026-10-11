// English by default at /, Spanish at /es/. Same two languages as the app; the body text is the app's own guest copy.
export const APP_URL = "https://app.criterio.design";

export type Locale = "en" | "es";

// Every page, by its path in each language: the header's language switch, hreflang, the footer and the sitemap read it.
export const PAGES = {
  home: { en: "/", es: "/es/" },
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
    footer: { privacy: "Privacy", terms: "Terms", extension: "Extension privacy" },
  },
  es: {
    lang: "es",
    other: { lang: "en", label: "English" },
    login: { label: "Entrar", href: `${APP_URL}/login?lang=es` },
    title: "criterio.design",
    headline: "Tus referencias, escritas como decisiones.",
    body: "Guarda las referencias de un proyecto. Criterio las lee y escribe las decisiones de diseño en criterio.md, un fichero que tu agente o tu equipo lee antes de construir.",
    footer: { privacy: "Privacidad", terms: "Términos", extension: "Privacidad de la extensión" },
  },
} as const satisfies Record<Locale, unknown>;
