import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Everything behind a session. The shared links (/s/) stay crawlable on purpose: a blocked page never shows a
// crawler its noindex, so a link posted somewhere public could still be listed by its address.
// /extension/privacy stays open because the Chrome Web Store links to it; the longer rule wins over /extension/
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/extension/privacy"],
      disallow: ["/api/", "/i/", "/settings", "/admin", "/library", "/invite/", "/extension/", "/mcp", "/unsubscribe", "/.well-known/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
