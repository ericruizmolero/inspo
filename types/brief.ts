// A project's brief: the team's words about it and, for a redesign, which reference is the client's current site.
// The fields, their questions and where each comes from are decided in
// docs/design-system/decisiones/2026-10-10-el-brief-pide-una-frase-y-el-resto-se-rellena-solo.md.
// Shared by client and server; stored as one JSON in project.brief.

export const PRICE_RANGES = ["affordable", "mid", "premium"] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];
export const PLATFORMS = ["web", "ios", "android", "print"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const A11Y_LEVELS = ["AA", "AAA"] as const;
export type A11yLevel = (typeof A11Y_LEVELS)[number];
/** What of the client's current brand stays as it is */
export const KEEP_PARTS = ["logo", "colors", "type"] as const;
export type KeepPart = (typeof KEEP_PARTS)[number];
/** The fields a model may draft from the client's site or an imported document */
export const DRAFT_FIELDS = ["sector", "product", "markets", "traits", "keep", "voiceSamples"] as const;
export type DraftField = (typeof DRAFT_FIELDS)[number];
/** Whether a draftable field says anything */
export const draftFilled = (b: Pick<Brief, DraftField>, k: DraftField) =>
  k === "sector" ? !!b.sector : k === "product" ? !!(b.product.what || b.product.price) : b[k].length > 0;

export interface Brief {
  /** What the project is and for whom, in the team's words: the one question asked */
  about: string;
  /** A SECTORS key, or null when none fits */
  sector: string | null;
  product: { what: string; price: PriceRange | null };
  /** BCP 47 tags: es-ES, en-GB */
  markets: string[];
  /** URLs of sites it competes with, at most three. They never enter the board */
  competitors: string[];
  /** How it must not look like them */
  competitorsNote: string;
  /** Three words for the brand */
  traits: string[];
  /** Something the brand would never say */
  neverSay: string;
  /** What a visitor must understand in the first five seconds */
  firstSeconds: string;
  platforms: Platform[];
  /** What it is built with: Tailwind, Figma, SwiftUI… */
  stack: string[];
  /** Null: nobody chose, and AA applies (Color asks when it needs it) */
  a11y: A11yLevel | null;
  keep: KeepPart[];
  /** Real copy of the brand */
  voiceSamples: string[];
  /** Fields a model wrote that nobody has touched yet: the prompts read them as a draft, not as the team's word */
  drafted: DraftField[];
  /** A redesign: the reference on the board that is the client's current site. Its copy, typefaces, logo and figures are the source of truth */
  clientItemId?: string | null;
  /** ISO */
  updatedAt: string;
  updatedBy?: string;
}

/** Not a limit anyone writing a brief meets: the screens show none. A ceiling on what the server keeps and sends to
 *  the models, so a whole file pasted by mistake is not stored and billed on every reading. */
export const BRIEF_TEXT_MAX = 20_000;
export const BRIEF_LIMITS = { markets: 12, competitors: 3, traits: 3, stack: 12, voiceSamples: 10, word: 60, url: 500 } as const;

const text = (v: unknown, max: number = BRIEF_TEXT_MAX) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const texts = (v: unknown, n: number, max?: number) => [...new Set((Array.isArray(v) ? v : []).map((x) => text(x, max)).filter(Boolean))].slice(0, n);
const oneOf = <T extends string>(keys: readonly T[], v: unknown): v is T => keys.includes(v as T);
const keysOf = <T extends string>(keys: readonly T[], v: unknown) => [...new Set(Array.isArray(v) ? v.filter((x): x is T => oneOf(keys, x)) : [])];
const BCP47 = /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i;
/** A market as readBrief keeps it: a BCP 47 tag */
export const isMarketTag = (m: string) => BCP47.test(m);
const httpUrl = (u: string) => { try { return /^https?:$/.test(new URL(u).protocol); } catch { return false; } };

/** A brief as stored, read into the current shape: a brief saved before a field existed reads it empty, and the
 *  fields that were dropped (tone, audience, avoid) are left behind. Null when nothing was ever saved */
export function readBrief(v: unknown): Brief | null {
  if (!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  const product = (b.product && typeof b.product === "object" ? b.product : {}) as Record<string, unknown>;
  return {
    about: text(b.about),
    sector: text(b.sector, 40) || null,
    product: { what: text(product.what), price: oneOf(PRICE_RANGES, product.price) ? product.price : null },
    markets: texts(b.markets, BRIEF_LIMITS.markets, 35).filter(isMarketTag),
    competitors: texts(b.competitors, BRIEF_LIMITS.competitors, BRIEF_LIMITS.url).filter(httpUrl),
    competitorsNote: text(b.competitorsNote),
    traits: texts(b.traits, BRIEF_LIMITS.traits, BRIEF_LIMITS.word),
    neverSay: text(b.neverSay),
    firstSeconds: text(b.firstSeconds),
    platforms: keysOf(PLATFORMS, b.platforms),
    stack: texts(b.stack, BRIEF_LIMITS.stack, BRIEF_LIMITS.word),
    a11y: oneOf(A11Y_LEVELS, b.a11y) ? b.a11y : null,
    keep: keysOf(KEEP_PARTS, b.keep),
    voiceSamples: texts(b.voiceSamples, BRIEF_LIMITS.voiceSamples),
    drafted: keysOf(DRAFT_FIELDS, b.drafted),
    clientItemId: typeof b.clientItemId === "string" && b.clientItemId ? b.clientItemId.slice(0, 40) : null,
    updatedAt: text(b.updatedAt, 40),
    ...(typeof b.updatedBy === "string" ? { updatedBy: b.updatedBy } : {}),
  };
}
