// How a reference's page is built: its columns, what stays put while the rest scrolls, where the navigation sits.
// A closed vocabulary, so the structures the team keeps saving can be counted across the board ("a narrow column
// on the left, fixed, in 7 of 9") with no model pass to group them. Read by lib/composition.ts; pure, so the
// browser builds criterio.md from it too.
import type { RefComposition } from "@/types/inspo";

/** Bump when the vocabulary or the reading changes: a reference read with an older one is read again */
export const COMPOSITION_VERSION = 1;

interface Term { key: string; description: string }

/** What the reference shows, as a page */
export const PAGE_KINDS: Term[] = [
  { key: "home", description: "A home or landing page" },
  { key: "about", description: "An about page: a person or a studio telling who they are" },
  { key: "work-index", description: "A list or grid of projects, products or posts" },
  { key: "case-study", description: "One project, product or story told in depth" },
  { key: "article", description: "A long read: an article, an essay, a post" },
  { key: "pricing", description: "Plans and prices" },
  { key: "contact", description: "A contact or booking page" },
  { key: "docs", description: "Documentation or a help centre" },
  { key: "app-screen", description: "A screen of an app or a dashboard" },
  { key: "fragment", description: "A part of a page only: one section, one component, one card" },
  { key: "not-a-page", description: "Not a page: a photo, an illustration, a logo, a poster, a type specimen" },
];

/** How the page is divided across its width */
export const STRUCTURES: Term[] = [
  { key: "single-column", description: "One column, sections stacked full width" },
  { key: "centered-narrow", description: "One narrow centred column of reading width, wide margins" },
  { key: "aside-left", description: "A narrower column on the LEFT (a fifth to two fifths of the width) beside a wider main column" },
  { key: "aside-right", description: "A narrower column on the RIGHT beside a wider main column" },
  { key: "split-even", description: "Two halves of about the same width" },
  { key: "multi-column", description: "Three or more columns of content side by side" },
  { key: "tile-grid", description: "The page itself is a grid or masonry of tiles" },
  { key: "full-bleed-stack", description: "Edge-to-edge bands (images, colour) stacked down the page" },
  { key: "freeform", description: "Elements placed freely, overlapping, no readable column" },
  { key: "none", description: "No page layout to read (not a page)" },
];

/** What stays where it is while the rest of the page scrolls */
export const FIXED: Term[] = [
  { key: "aside", description: "The narrower column stays put while the main one scrolls (in a full-page capture: its content ends early while the other column runs long)" },
  { key: "top-bar", description: "A bar across the top stays put" },
  { key: "bottom-bar", description: "A bar across the bottom stays put" },
  { key: "none", description: "Everything scrolls together" },
  { key: "unclear", description: "A still picture cannot tell" },
];

/** Where the navigation is */
export const NAV: Term[] = [
  { key: "top-bar", description: "Links across the top" },
  { key: "in-aside", description: "Inside the side column" },
  { key: "bottom", description: "At the bottom of the screen" },
  { key: "menu-button", description: "Behind a menu button" },
  { key: "none", description: "No navigation in sight" },
];

/** What the first screen leads with */
export const OPENING: Term[] = [
  { key: "big-type", description: "A large headline or statement" },
  { key: "big-image", description: "A large image or video" },
  { key: "split", description: "Words on one side, a picture on the other" },
  { key: "content-first", description: "The content itself (projects, a list, the article) straight away" },
  { key: "none", description: "Not a page" },
];

export const keysOf = (terms: Term[]) => terms.map((t) => t.key) as [string, ...string[]];

/** A whole page with columns to read, as against a picture with none or a single section of one */
export const isPage = (c: RefComposition | undefined): c is RefComposition => !!c && c.structure !== "none" && c.page !== "not-a-page" && c.page !== "fragment";

/** How most websites are built: repeated, it says the team saved websites, not that it chose a structure */
export const ORDINARY = new Set(["single-column"]);

/** A structure the board keeps coming back to: which references show it, and what most of them share */
export interface CompositionPattern {
  structure: string;
  /** Item ids (or board codes, for the system pass) of the references that show it */
  refs: string[];
  /** Of how many references that read as a page */
  of: number;
  /** The narrower column's share of the width, the median of the references that have one (0 when none) */
  share: number;
  /** What stays put and where the navigation is, when most of the references agree; null when they do not */
  fixed: string | null;
  nav: string | null;
  opening: string | null;
  /** The structure most websites have (ORDINARY): it opens nothing on its own */
  ordinary: boolean;
}

/** The value most of `values` share, when it is more than half of them; null otherwise */
function most(values: string[]): string | null {
  const by = new Map<string, number>();
  for (const v of values) by.set(v, (by.get(v) ?? 0) + 1);
  const [top] = [...by].sort((a, b) => b[1] - a[1]);
  return top && top[1] * 2 > values.length ? top[0] : null;
}

/** A structure repeats when at least 2 references show it and they are at least a quarter of the ones that read as a page */
export const REPEATS = { min: 2, share: 0.25 };

/**
 * The structures that repeat across the board, most shown first. Pure counting: a reference counts once, by the
 * structure it was read with; "fixed" is only said when most of the ones that could tell agree.
 */
export function compositionPatterns(refs: { id: string; composition?: RefComposition }[]): CompositionPattern[] {
  const pages = refs.filter((r) => isPage(r.composition)) as { id: string; composition: RefComposition }[];
  const by = new Map<string, typeof pages>();
  for (const r of pages) by.set(r.composition.structure, [...(by.get(r.composition.structure) ?? []), r]);
  return [...by].map(([structure, rs]) => {
    const shares = rs.map((r) => r.composition.share).filter((s) => s > 0).sort((a, b) => a - b);
    const told = rs.map((r) => r.composition.fixed).filter((f) => f !== "unclear");
    return {
      structure, refs: rs.map((r) => r.id), of: pages.length,
      share: shares.length ? shares[Math.floor(shares.length / 2)] : 0,
      fixed: told.length * 2 >= rs.length ? most(told) : null,
      nav: most(rs.map((r) => r.composition.nav)),
      opening: most(rs.map((r) => r.composition.opening)),
      ordinary: ORDINARY.has(structure),
    };
  }).filter((p) => p.refs.length >= REPEATS.min && p.refs.length >= p.of * REPEATS.share)
    .sort((a, b) => b.refs.length - a.refs.length);
}

/** The share as a fraction a designer says out loud: 1/4, 1/3, 2/5 */
export function fractionOf(share: number): string {
  const options: [number, string][] = [[20, "1/5"], [25, "1/4"], [33, "1/3"], [40, "2/5"], [50, "1/2"]];
  return options.reduce((best, o) => (Math.abs(o[0] - share) < Math.abs(best[0] - share) ? o : best))[1];
}
