"use client";

// The library as a board: a masonry of the references, newest first (while searching, the results in the
// order they rank), scrolled like a page. The layout is numbers: each card's column and offset come from
// ratios the index or an earlier measurement already gave, so no card is measured to be placed. Only the
// cards within a screen of the viewport are mounted: a board of 300 or 3000 costs what a few screens cost.
// A card that changes place glides there (a CSS transition on its transform, so a key pressed mid-way
// retargets instead of restarting); a new result arrives a beat after the one ranked before it.
// The layout is a number of columns to choose from: more of them to see more at once, fewer to look closer.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { InspoItem } from "@/types/inspo";
import { keyOf } from "@/lib/board";
import { useT } from "./I18nProvider";

/** Which copy of the page a card draws, by how wide it is on screen (the stored copies: 288, 720 and 1440px) */
export type ShotLevel = "thumb" | "tile" | "full";
const screenPx = (w: number) => w * (typeof window === "undefined" ? 2 : Math.min(2, window.devicePixelRatio || 1));
const levelFor = (col: number): ShotLevel => (screenPx(col) <= 300 ? "thumb" : screenPx(col) <= 760 ? "tile" : "full");

/** What floats over the board on each side (the bars, the island, the panel): the cards keep clear of it */
export interface Insets { top: number; left: number; right: number; bottom: number }

/** The layouts to choose from: how many columns. A phone takes its own from its width. */
export const COLUMNS = [2, 3, 4, 5];
export const DEFAULT_ZOOM = 2;
/** Narrower than this a card can't be read: with the panel open, fewer columns than chosen */
const MIN_COL = 180;
const PAD = 20;
const GAP = 16;
/** Under the media: the note line, two lines at most, in a fixed box (CSS .tile--board .tile__note) so no card is measured */
const CAPTION_H = 48;
/** Touch devices show the title and the actions under the tile too (CSS .tile__caption) */
const TOUCH_CAPTION_H = 42;
/** Screens above and below the viewport that stay mounted, so a flick of the wheel never meets a hole */
const OVERSCAN = 1;
/** Cards shown before the scroller is measured: enough for any first screen */
const FIRST_CARDS = 24;

// Search results (CSS in app/globals.css .board-tile[data-arrive], same values)
const ARRIVE_MS = 220;
/** Up to this many new results arrive one after another, 30 ms apart, the last within 180 ms */
const STAGGER_MAX = 24;
const STAGGER_MS = 30;
const STAGGER_CAP_MS = 180;
/** The first paint: the cards arrive top down, a few ms apart */
const ENTER_MS = 20;
const ENTER_CAP_MS = 280;

// Cards already shown once in this tab: a card that comes back into view never animates in again
const seen = new Set<string>();

interface Slot { item: InspoItem; key: string; x: number; y: number; w: number; h: number }
interface Layout { slots: Slot[]; byKey: Map<string, Slot>; height: number; col: number }

/** Columns, shortest first: the next card goes under the column that ends highest */
function layoutBoard(items: InspoItem[], ratioOf: (item: InspoItem) => number, col: number, cols: number, padL: number, padTop: number, captionH: number): Layout {
  const bottoms = new Array<number>(cols).fill(padTop);
  const slots: Slot[] = [];
  const byKey = new Map<string, Slot>();
  for (const item of items) {
    let c = 0;
    for (let i = 1; i < cols; i++) if (bottoms[i] < bottoms[c] - 0.5) c = i;
    const h = col * ratioOf(item) + captionH;
    const slot = { item, key: keyOf(item), x: padL + c * (col + GAP), y: bottoms[c], w: col, h };
    slots.push(slot);
    byKey.set(slot.key, slot);
    bottoms[c] += h + GAP;
  }
  return { slots, byKey, height: Math.max(padTop, ...bottoms) - GAP, col };
}

export default function Grid({ items, ratioOf, insets, zoom, onZoom, fitKey, focusKey, renderCard }: {
  /** The cards to lay out: the whole space, or the search's results in the order they rank */
  items: InspoItem[];
  /** Height/width of what each card shows, known before it loads (the page's height from the index, or a measurement) */
  ratioOf: (item: InspoItem) => number;
  insets: Insets;
  /** Index into COLUMNS */
  zoom: number;
  onZoom: (zoom: number) => void;
  /** Changes when the board should start from the top again (another space, another search) */
  fitKey: string;
  /** The open card, brought into view when it opens */
  focusKey: string | null;
  renderCard: (item: InspoItem, level: ShotLevel) => ReactNode;
}) {
  const { t } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [touch, setTouch] = useState(false);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    setTouch(window.matchMedia("(hover: none)").matches);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── The layout, as numbers ─────────────────────────────────────────────────
  const padL = PAD + insets.left, padR = PAD + insets.right, padTop = insets.top + PAD / 2, padBottom = insets.bottom + PAD;
  const room = Math.max(0, width - padL - padR);
  const fit = Math.max(1, Math.floor((room + GAP) / (MIN_COL + GAP)));
  const cols = width && width < 801 ? (width <= 520 ? 1 : 2) : Math.min(COLUMNS[zoom], fit);
  const col = (room - (cols - 1) * GAP) / cols;
  const level = levelFor(col);
  // Zoomed far out the note is smaller than its line: only the pages remain
  const captionH = level === "thumb" ? 0 : CAPTION_H + (touch ? TOUCH_CAPTION_H : 0);
  const layout = useMemo(() => (width ? layoutBoard(items, ratioOf, col, cols, padL, padTop, captionH) : null), [items, ratioOf, width, col, cols, padL, padTop, captionH]);

  // ─── The window: which cards exist ──────────────────────────────────────────
  // The scroller's position, refreshed once it has moved a quarter of a screen: with a screen of overscan
  // either way, a wheel's flick never re-renders and never meets a hole.
  const [win, setWin] = useState<{ lo: number; hi: number } | null>(null);
  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const vh = el.clientHeight, top = el.scrollTop;
    const lo = top - vh * OVERSCAN, hi = top + vh * (1 + OVERSCAN);
    setWin((cur) => (cur && Math.abs(cur.lo - lo) < vh / 4 && Math.abs(cur.hi - hi) < vh / 4 ? cur : { lo, hi }));
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
    el.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(raf); el.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [update]);
  // A new layout can leave the scroller shorter than it was: the window follows
  useLayoutEffect(() => { update(); }, [layout, update]);

  const visible = useMemo(() => {
    if (!layout) return [];
    if (!win) return layout.slots.slice(0, FIRST_CARDS);
    return layout.slots.filter((s) => s.y < win.hi && s.y + s.h > win.lo);
  }, [layout, win]);

  // ─── Where the scroller stands ──────────────────────────────────────────────
  // Another space or another search starts from the top
  const firstFit = useRef(true);
  useLayoutEffect(() => {
    if (firstFit.current) { firstFit.current = false; return; }
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [fitKey]);
  // A change of columns (a zoom, the island, the panel) keeps the eye where it was: the same fraction of
  // the board stays under it
  const lastCols = useRef(cols);
  const lastHeight = useRef(0);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const h = layout?.height ?? 0;
    if (el && cols !== lastCols.current && lastHeight.current && h && el.scrollTop) {
      el.scrollTop = (el.scrollTop / lastHeight.current) * h;
    }
    lastCols.current = cols;
    lastHeight.current = h;
  }, [layout, cols]);
  // The open card comes into view, clear of the bars and the dock; the panel's width is already in the insets
  const lastFocus = useRef<string | null>(null);
  useEffect(() => {
    const open = focusKey && focusKey !== lastFocus.current;
    lastFocus.current = focusKey;
    const el = scrollRef.current, s = focusKey ? layout?.byKey.get(focusKey) : undefined;
    if (!open || !el || !s) return;
    const top = el.scrollTop + insets.top, bottom = el.scrollTop + el.clientHeight - insets.bottom;
    if (s.y >= top && s.y + s.h <= bottom) return;
    el.scrollTo({ top: Math.max(0, s.y - insets.top - PAD), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when a card opens, not when the layout moves under it
  }, [focusKey]);

  // ─── Arrivals ───────────────────────────────────────────────────────────────
  // New results arrive in the order they rank, worked out while rendering against what the last commit
  // showed, so an arriving card carries its delay from its very first style. The first paint arrives top down.
  const shownKeys = useRef<Set<string> | null>(null);
  const arrivals = useRef(new Map<string, number>());
  const now = Date.now();
  if (shownKeys.current) {
    const added = items.filter((i) => !shownKeys.current!.has(keyOf(i)));
    const step = added.length <= STAGGER_MAX ? STAGGER_MS : 0;
    added.forEach((i, n) => { if (!arrivals.current.has(keyOf(i))) arrivals.current.set(keyOf(i), now + Math.min(n * step, STAGGER_CAP_MS)); });
  }
  for (const [k, at] of arrivals.current) if (now - at > ARRIVE_MS + STAGGER_CAP_MS) arrivals.current.delete(k);
  useLayoutEffect(() => { shownKeys.current = new Set(items.map(keyOf)); }, [items]);
  const entrance = useRef<Map<string, number> | null>(null);
  if (!entrance.current && visible.length) {
    entrance.current = new Map(visible.map((s, n) => [s.key, Math.min(n * ENTER_MS, ENTER_CAP_MS)]));
  }
  // Seen once their entrance is over (not before: the attribute leaving mid-way would cut the animation)
  useEffect(() => {
    const keys = visible.map((s) => s.key);
    setTimeout(() => { for (const k of keys) seen.add(k); }, ENTER_CAP_MS + 400);
  }, [visible]);

  return (
    <div ref={scrollRef} className="board" data-level={level}>
      <div className="board__world" style={{ height: layout ? layout.height + padBottom : "100%" }}>
        {visible.map((s) => {
          const enter = seen.has(s.key) ? undefined : entrance.current?.get(s.key);
          const at = enter === undefined ? arrivals.current.get(s.key) : undefined;
          const arrive = at === undefined ? undefined : Math.max(0, at - now);
          return (
            <div
              key={s.item.web}
              className="board-tile"
              data-enter={enter !== undefined ? "" : undefined}
              data-arrive={arrive !== undefined ? "" : undefined}
              style={{
                transform: `translate(${s.x}px, ${s.y}px)`, width: s.w,
                ...(enter !== undefined ? { "--enter": `${enter}ms` } : {}),
                ...(arrive !== undefined ? { "--arrive": `${arrive}ms` } : {}),
              } as React.CSSProperties}
            >
              {renderCard(s.item, level)}
            </div>
          );
        })}
      </div>

      <div className="board-zoom" role="group">
        {COLUMNS.map((n, i) => (
          <button key={n} type="button" className="board-zoom__n" aria-pressed={i === zoom} aria-label={t.zoom.columns(n)} title={t.zoom.columns(n)} onClick={() => onZoom(i)}>{n}</button>
        ))}
      </div>
    </div>
  );
}
