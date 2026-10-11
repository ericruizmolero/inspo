import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Everything behind a session, and the shared links: a token in the path is for whoever was sent it.
// /extension/privacy stays open because the Chrome Web Store links to it; the longer rule wins over /extension/
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/extension/privacy"],
      disallow: ["/api/", "/s/", "/i/", "/settings", "/admin", "/library", "/invite/", "/extension/", "/mcp", "/unsubscribe", "/.well-known/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
