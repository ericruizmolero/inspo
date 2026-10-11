// Canonical public URL: the same as BETTER_AUTH_URL on Vercel (criterio.design since 22/09/2026).
// The metadata, robots.txt and the sitemap all name the site by it.
export const SITE = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.criterio.design";
