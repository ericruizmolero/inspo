// English by default at /, Spanish at /es/. Same two languages as the app; the body text is the app's own guest copy.
export const LOGIN_URL = "https://app.criterio.design/login";

export const copy = {
  en: {
    lang: "en",
    home: "/",
    other: { href: "/es/", label: "Español" },
    login: { label: "Log in", href: LOGIN_URL },
    title: "criterio.design",
    headline: "Your references, written down as decisions.",
    body: "Save the references for a project. Criterio reads them and writes down the design decisions in criterio.md, a file your agent or your team reads before building.",
  },
  es: {
    lang: "es",
    home: "/es/",
    other: { href: "/", label: "English" },
    login: { label: "Entrar", href: `${LOGIN_URL}?lang=es` },
    title: "criterio.design",
    headline: "Tus referencias, escritas como decisiones.",
    body: "Guarda las referencias de un proyecto. Criterio las lee y escribe las decisiones de diseño en criterio.md, un fichero que tu agente o tu equipo lee antes de construir.",
  },
} as const;

export type Locale = keyof typeof copy;
