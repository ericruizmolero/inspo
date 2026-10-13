import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Everything behind a session. The shared links (/s/) stay crawlable on purpose: a blocked page never shows a
// crawler its noindex, so a link posted somewhere public could still be listed by its address.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // A file link handed out of the app (lib/file-links.ts): AI fetchers obey this file, and the link is meant for
      // them. Unsigned it still answers 401, and each file says noindex
      allow: ["/", "/api/files/"],
      disallow: ["/api/", "/i/", "/settings", "/admin", "/library", "/invite/", "/extension/", "/mcp", "/unsubscribe", "/.well-known/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
