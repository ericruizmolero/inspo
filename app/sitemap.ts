import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// The pages a visitor without an account can open (proxy.ts PUBLIC), less the ones that need a token or a link.
// The home (/) is not one: signed out it redirects to /login
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/login"].map((path) => ({ url: `${SITE}${path}` }));
}
