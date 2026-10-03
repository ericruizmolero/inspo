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
