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

/** What a project needs at its start, in the order Tino brings it up on a board that is empty or just starting (Eric,
 *  16-11: "empezaría por las cosas importantes al empezar un proyecto, tipografía", "alguna librería de detalles tipo
 *  botones", "paletas de colores... o referencias web"). A topic is not a Discover group: it picks by name across
 *  the whole list (`names`; without them, the first of its group), and `group` is the Discover group "See all" opens.
 *  A name that leaves the list just drops out; a topic left with none is skipped. */
export interface StartTopic { key: string; title: Record<"en" | "es", string>; hint: Record<"en" | "es", string>; group: string; names?: string[] }
export const START_TOPICS: readonly StartTopic[] = [
  { key: "type", group: "type", title: { en: "Typography", es: "Tipografía" }, hint: { en: "Foundries whose specimens are a lesson.", es: "Fundiciones cuyos specimens son una lección." } },
  { key: "color", group: "resources", names: ["Gradientool", "Colir"], title: { en: "Color", es: "Color" }, hint: { en: "Somewhere to start a palette from.", es: "De dónde sacar una paleta." } },
  { key: "sites", group: "sites", names: ["Recent.design", "Curated.design", "Landing.love"], title: { en: "Reference sites", es: "Webs de referencia" }, hint: { en: "The galleries we open most.", es: "Las galerías que más abrimos." } },
  { key: "details", group: "code", names: ["shadcn/ui", "Uiverse", "Magic UI"], title: { en: "Buttons and details", es: "Botones y detalles" }, hint: { en: "Components to look at closely, with their code.", es: "Componentes para mirar de cerca, con su código." } },
  { key: "sections", group: "sections", names: ["The Component Gallery", "Supahero", "Navbar Gallery"], title: { en: "Sections", es: "Secciones" }, hint: { en: "Heroes, navbars and pricing, one piece at a time.", es: "Heros, navbars y precios, pieza a pieza." } },
  { key: "motion", group: "motion", title: { en: "Motion", es: "Movimiento" }, hint: { en: "How things move when they are done well.", es: "Cómo se mueve lo que está bien hecho." } },
  { key: "icons", group: "resources", names: ["Icon Museum", "3dicons", "Svgl"], title: { en: "Icons", es: "Iconos" }, hint: { en: "Icons with a hand of their own.", es: "Iconos con mano propia." } },
  { key: "brand", group: "graphics", names: ["Logo System", "Logggos", "Brand Guidelines"], title: { en: "Logo and brand", es: "Logo y marca" }, hint: { en: "Marks and the guides that hold them.", es: "Marcas y las guías que las sostienen." } },
  { key: "mood", group: "moodboards", names: ["Savee", "Cosmos", "Are.na"], title: { en: "Images and mood", es: "Imagen y ambiente" }, hint: { en: "Where the look of a thing gets collected.", es: "Donde se junta el aire de las cosas." } },
];
/** A starting topic and up to `n` of its resources; null when the topic or its resources are gone */
export function startPicks(key: string, n = 3): { topic: StartTopic; picks: Resource[] } | null {
  const topic = START_TOPICS.find((x) => x.key === key);
  if (!topic) return null;
  const all = RESOURCES.flatMap((g) => g.items);
  const picks = (topic.names ? topic.names.flatMap((name) => all.find((r) => r.name === name) ?? []) : RESOURCES.find((g) => g.key === topic.group)?.items ?? []).slice(0, n);
  return picks.length ? { topic, picks } : null;
}
/** The starting topics that have something to show, in order */
export const START_KEYS: readonly string[] = START_TOPICS.filter((x) => startPicks(x.key)).map((x) => x.key);

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
