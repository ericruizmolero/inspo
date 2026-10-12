// The resources (the places we look for references) as Discover lists them. One source for the app and the marketing
// site: marketing-site/src/resources.ts holds the list and its text in both languages, and the marketing site serves
// each site's thumbnail at /resources/<slug>.jpg. Here, only what Discover adds on top: what we feature, what came in
// lately, and where a thumbnail is.
import { MARKETING_URL } from "@/lib/site";
import { readableDomain } from "@/lib/url";
import { RESOURCES, isNew, resourceHost, resourceSlug, type Resource, type ResourceGroup } from "../marketing-site/src/resources";

export { RESOURCES, type Resource, type ResourceGroup };

/** Lowercase, without accents, for looking through the list: "diseño" finds "Diseno" and the other way round */
export const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "https://www.are.na" → "are.na", shown as a reader reads it */
export const siteHost = (url: string) => { try { return readableDomain(resourceHost(url)); } catch { return url; } };

/** The site's hero, as the marketing site captured it (marketing-site/public/resources/, made by its scripts/resource-shots.ts) */
export const siteShot = (url: string) => `${MARKETING_URL}/resources/${resourceSlug(url)}.jpg`;

/** Joined the list in the last 30 days (NEW_DAYS in the marketing site's file) */
export const isNewSite = (r: Resource, now = Date.now()) => isNew(r, now);

/** What Discover features: the galleries we open most, picked by hand and in this order. One leaving the list just disappears */
export const FEATURED_URLS: readonly string[] = [
  "https://recent.design",
  "https://curated.design",
  "https://goatedui.dev",
  "https://landing.love",
  "https://mobbin.com",
  "https://supahero.io",
  "https://styles.refero.design",
];
