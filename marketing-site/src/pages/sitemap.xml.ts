import type { APIRoute } from "astro";
import { PAGES } from "../i18n";

// Every page in both languages, each with its alternates (PAGES in src/i18n.ts)
export const GET: APIRoute = ({ site }) => {
  const at = (path: string) => new URL(path, site).href;
  const urls = Object.values(PAGES).flatMap(({ path: paths }) =>
    Object.values(paths).map((path) => `  <url>
    <loc>${at(path)}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${at(paths.en)}"/>
    <xhtml:link rel="alternate" hreflang="es" href="${at(paths.es)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${at(paths.en)}"/>
  </url>`));
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
