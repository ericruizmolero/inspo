// The plans on /pricing/: a copy of the app's PLANS (lib/plans.ts), their text (lib/i18n/<locale>/plans.ts) and the
// lines its plan page says about price and payment (plans in lib/i18n/<locale>/ui.ts). The site cannot import the
// app; tests/marketing-site-copy.test.ts fails when this copy and the app drift apart.
import type { Locale } from "./i18n";

export type PlanKey = "free" | "personal" | "studio" | "agency";
export type SearchAllowance = { kind: "capped"; perMonth: number } | { kind: "fairUse"; ceiling: number };

export interface Plan {
  key: PlanKey;
  /** Same figures in EUR and USD, without VAT. Annual = 2 months free */
  price: { month: number; year: number };
  /** People in each workspace. null = unlimited. Every plan is collaborative: the smallest ones are 2 */
  members: number | null;
  /** Workspaces one plan holds. null = unlimited */
  workspaces: number | null;
  aiActionsPerMonth: number | null;
  searches: SearchAllowance;
  itemsMax: number | null;
  projectsMax: number | null;
  storageMaxBytes: number | null;
}

const paid = (key: PlanKey, month: number, members: number, workspaces: number, aiActionsPerMonth: number): Plan => ({
  key, price: { month, year: month * 10 }, members, workspaces, aiActionsPerMonth,
  searches: { kind: "fairUse", ceiling: 10 * aiActionsPerMonth }, itemsMax: null, projectsMax: null, storageMaxBytes: null,
});

export const PLANS: Plan[] = [
  {
    key: "free", price: { month: 0, year: 0 }, members: 2, workspaces: 1, aiActionsPerMonth: 30,
    searches: { kind: "capped", perMonth: 30 }, itemsMax: 12, projectsMax: 1, storageMaxBytes: 1024 ** 3,
  },
  paid("personal", 15, 2, 1, 300),
  paid("studio", 49, 5, 1, 500),
  paid("agency", 149, 15, 10, 2000),
];

export const isPaid = (p: Plan) => p.price.month > 0;

/** Each plan's name, line and what it includes, as the app's plan page has them */
export const PLAN_TEXT: Record<Locale, Record<PlanKey, { name: string; tagline: string; features: string[] }>> = {
  en: {
    free: {
      name: "Free",
      tagline: "To try it out.",
      features: ["You and one more person", "1 project with up to 12 references", "Automatic tags", "30 AI actions a month", "Your first criterio.md spends no AI actions", "30 different AI searches a month"],
    },
    personal: { name: "Personal", tagline: "For a designer on their own.", features: ["You and one more person", "Unlimited projects and references", "300 AI actions a month", "AI searches, fair use"] },
    studio: { name: "Studio", tagline: "For a design or product team.", features: ["Up to 5 people", "Unlimited projects and references", "500 AI actions a month", "AI searches, fair use"] },
    agency: {
      name: "Agency",
      tagline: "For an agency, one criterio per client.",
      features: ["Up to 15 people in each workspace", "10 workspaces on one plan", "2,000 AI actions a month", "AI searches, fair use"],
    },
  },
  es: {
    free: {
      name: "Gratis",
      tagline: "Para probarlo.",
      features: ["Tú y una persona más", "1 proyecto con hasta 12 referencias", "Etiquetas automáticas", "30 acciones de IA al mes", "Tu primer criterio.md no gasta acciones de IA", "30 búsquedas IA distintas al mes"],
    },
    personal: { name: "Personal", tagline: "Para quien diseña por su cuenta.", features: ["Tú y una persona más", "Proyectos y referencias sin límite", "300 acciones de IA al mes", "Búsquedas IA con uso justo"] },
    studio: { name: "Studio", tagline: "Para un equipo de diseño o de producto.", features: ["Hasta 5 personas", "Proyectos y referencias sin límite", "500 acciones de IA al mes", "Búsquedas IA con uso justo"] },
    agency: {
      name: "Agency",
      tagline: "Para una agencia, con un criterio por cliente.",
      features: ["Hasta 15 personas en cada espacio", "10 espacios con un solo plan", "2.000 acciones de IA al mes", "Búsquedas IA con uso justo"],
    },
  },
};

/** What the app's plan page says under the prices: the words for the period, and that there is no payment yet */
export const PLAN_LINES = {
  en: {
    forGood: "For good",
    perMonth: "a month",
    orYearly: (price: string) => `or ${price} a year, 2 months free`,
    foot: "Launch prices: during the beta, the annual plan is half price. There is no payment on the site yet: ask for a plan and we write back and switch it on the same day. Prices without VAT.",
  },
  es: {
    forGood: "Para siempre",
    perMonth: "al mes",
    orYearly: (price: string) => `o ${price} al año, 2 meses gratis`,
    foot: "Precios de lanzamiento: en la beta, el anual va a mitad de precio. Todavía no hay pago en la web: al pedir un plan te escribimos y lo activamos en el día. Precios sin IVA.",
  },
} satisfies Record<Locale, unknown>;

const INTL: Record<Locale, string> = { en: "en-GB", es: "es-ES" };

/** The same figure in dollars for English and in euros for Spanish, without VAT: "$1,490", "1.490 €" (fmtPrice in the app) */
export function fmtPrice(n: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL[locale], {
    style: "currency", currency: locale === "es" ? "EUR" : "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0, useGrouping: "always",
  } as Intl.NumberFormatOptions).format(n);
}

/** A count with the language's thousands separator: "2,000", "2.000" */
export const fmtCount = (n: number, locale: Locale) => new Intl.NumberFormat(INTL[locale], { useGrouping: "always" } as Intl.NumberFormatOptions).format(n);
