import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// The pages a visitor without an account can open (proxy.ts PUBLIC), less the ones that need a token or a link
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/login", "/privacy", "/terms", "/extension/privacy"].map((path) => ({ url: `${SITE}${path}` }));
}
