// Where each card sits on the canvas, in canvas units. Pure: no DOM, no React.
// Saved positions win; the rest are packed in columns (shortest first, as the old masonry did),
// either from the origin or, when some cards were already arranged by hand, to the right of them.

import type { InspoItem } from "@/types/inspo";

/** Width of a card on the canvas: a 1440px page drawn at a quarter */
export const TILE_W = 360;
/** Room under the image for the note line */
export const CAPTION_H = 60;
export const GAP = 48;
/** Height/width a page is cut at on the canvas: 1440 × 2880, about three screens (the stored copies are cut there) */
export const CANVAS_MAX_RATIO = 2;
/** Height/width of a card whose page height is still unknown (the 16:10 cover) */
export const DEFAULT_RATIO = 0.625;
/** The packed block aims for this shape, so a fresh canvas fits a screen without a long strip */
const TARGET_ASPECT = 16 / 10;

export interface Slot { x: number; y: number; w: number; h: number }
export interface Rect { x: number; y: number; w: number; h: number }

/** The key a card is laid out by: its id once saved, its address while it is still being added */
export const keyOf = (item: InspoItem) => item.id ?? item.web;

export function layoutCanvas(
  items: InspoItem[],
  saved: Record<string, { x: number; y: number }> | undefined,
  imageHeight: (item: InspoItem) => number,
): Map<string, Slot> {
  const out = new Map<string, Slot>();
  const loose: InspoItem[] = [];
  for (const item of items) {
    const h = imageHeight(item) + CAPTION_H;
    const p = item.id ? saved?.[item.id] : undefined;
    if (p) out.set(keyOf(item), { x: p.x, y: p.y, w: TILE_W, h });
    else loose.push(item);
  }
  if (!loose.length) return out;

  const placed = boundsOf([...out.values()]);
  const ox = placed ? placed.x + placed.w + GAP * 2 : 0;
  const oy = placed ? placed.y : 0;
  // Columns so the block comes out about TARGET_ASPECT wide: n/c cards of average height per column
  const avgH = loose.reduce((s, i) => s + imageHeight(i) + CAPTION_H, 0) / loose.length;
  const cols = Math.max(1, Math.min(loose.length, Math.round(Math.sqrt((TARGET_ASPECT * loose.length * (avgH + GAP)) / (TILE_W + GAP)))));
  const colY = new Array<number>(cols).fill(0);
  for (const item of loose) {
    let c = 0;
    for (let i = 1; i < cols; i++) if (colY[i] < colY[c] - 0.5) c = i;
    const h = imageHeight(item) + CAPTION_H;
    out.set(keyOf(item), { x: ox + c * (TILE_W + GAP), y: oy + colY[c], w: TILE_W, h });
    colY[c] += h + GAP;
  }
  return out;
}

export function boundsOf(slots: Iterable<Slot>): Rect | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of slots) {
    x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y);
    x1 = Math.max(x1, s.x + s.w); y1 = Math.max(y1, s.y + s.h);
  }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
