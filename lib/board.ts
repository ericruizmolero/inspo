// What the board (components/Grid.tsx) and the stored page copies agree on. Pure: no DOM, no React.

import type { InspoItem } from "@/types/inspo";

/** Height/width the stored copies of a page are cut at: 1440 × 2880, about three screens (lib/page-shots.ts) */
export const PAGE_MAX_RATIO = 2;
/** Height/width a card is cut at on the board: the top of the page, never a strip three screens tall */
export const BOARD_MAX_RATIO = 1.3;
/** Height/width of a card whose media is still unmeasured (the 16:10 cover) */
export const DEFAULT_RATIO = 0.625;

/** The key a card is laid out by: its id once saved, its address while it is still being added */
export const keyOf = (item: InspoItem) => item.id ?? item.web;

/** The board's copy of a stored picture: the same image CARD_WIDTH wide as WebP, next to it in the bucket. A card is
 *  at most 380px wide on a 2x screen, and the originals are photos and screenshots of up to 20 MB. GIFs keep their
 *  animation and stay whole. Made the first time it is asked for (app/api/files) or ahead of time (scripts/card-copies.ts) */
export const CARD_WIDTH = 720;
const CARD_SUFFIX = ".card.webp";
const RESIZABLE = /\.(jpe?g|png|webp|avif)$/i;
export function cardCopyOf(path: string | null | undefined): string | null {
  if (!path?.startsWith("/api/files/") || path.includes("?") || path.endsWith(CARD_SUFFIX) || !RESIZABLE.test(path)) return null;
  return path + CARD_SUFFIX;
}
/** The stored key a card copy was made from, or null when `key` is not a card copy */
export const originalOfCard = (key: string): string | null => (key.endsWith(CARD_SUFFIX) ? key.slice(0, -CARD_SUFFIX.length) : null);
