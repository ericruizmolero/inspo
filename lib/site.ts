import type { Locale } from "@/lib/i18n/locale";

// Canonical public URL: the same as BETTER_AUTH_URL on Vercel (criterio.design since 22/09/2026).
// The metadata, robots.txt and the sitemap all name the site by it.
export const SITE = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.criterio.design";

// The marketing site (marketing-site/): the legal pages, the resources, the skills, the pricing and the extension's
// page live there, not in the app.
// In development it is the local one (`npm run dev` starts both), so a local app never sends you to criterio.design
export const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_URL || (process.env.NODE_ENV === "development" ? "http://localhost:4330" : "https://criterio.design");

/** A page of the marketing site in the reader's language: English at /, Spanish under /es/ */
export const marketingHref = (path: string, locale: Locale) => `${MARKETING_URL}${locale === "es" ? "/es" : ""}${path}`;
