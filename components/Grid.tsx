"use client";

// The library as a board: a masonry of the references, newest first (while searching, the results in the
// order they rank), scrolled like a page. The layout is numbers: each card's column and offset come from
// ratios the index or an earlier measurement already gave, so no card is measured to be placed. Only the
// cards within a screen of the viewport are mounted: a board of 300 or 3000 costs what a few screens cost.
// A card that changes place glides there (a CSS transition on its transform, so a key pressed mid-way
// retargets instead of restarting); a new result arrives a beat after the one ranked before it.
// Zooming changes how many columns there are: out to see more at once, in to look closer. 100% is the usual
// number for the screen, cards about as wide as a page drawn at a quarter.

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EASE_OUT, MORPH_MS, coverWhileFlying, ghostsOut, peekHandoff, takeHandoff } from "./view-morph";
import type { InspoItem } from "@/types/inspo";
import { keyOf } from "@/lib/board";
import { useT } from "./I18nProvider";
import SoundControl from "./SoundControl";
import ZoomPill from "./ZoomPill";

/** Which copy of the page a card draws, by how wide it is on screen (the stored copies: 288, 720 and 1440px) */
export type ShotLevel = "thumb" | "tile" | "full";
const screenPx = (w: number) => w * (typeof window === "undefined" ? 2 : Math.min(2, window.devicePixelRatio || 1));
const levelFor = (col: number): ShotLevel => (screenPx(col) <= 300 ? "thumb" : screenPx(col) <= 760 ? "tile" : "full");

/** What floats over the board on each side (the bars, the island, the panel): the cards keep clear of it */
export interface Insets { top: number; left: number; right: number; bottom: number }

/** The zoom is columns away from the usual number: positive is closer (fewer columns). A phone takes its own from its width.
 *  The board opens one step out (one column more than 100%): more of the library at a glance. */
export const DEFAULT_ZOOM = -1;
/** How wide a card aims to be at 100%: the usual number of columns is however many of these fit */
const BASE_COL = 360;
const MIN_COLS = 2;
const MAX_COLS = 8;
/** Narrower than this a card can't be read: the zoom stops before */
const MIN_COL = 180;
/** Narrower than this the note under a card is a few words a line: only the pages remain */
const BARE_COL = 220;
const PAD = 12;
const GAP = 10;
/** Under the media: the note line, two lines at most, in a fixed box (CSS .board .tile__note) so no card is measured */
const CAPTION_H = 44;
/** A pinch (or ctrl + wheel) moves one column each time it adds up to this much */
const PINCH_STEP = 40;
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

/** What the page can ask of the board */
export interface GridHandle {
  /** Bring a card into view, clear of the bars and the dock */
  focus: (key: string) => void;
  /** Take the cards Polish left as it closed over the board: they fly onto it (components/view-morph.ts) */
  receive: () => void;
}

interface Slot { item: InspoItem; key: string; x: number; y: number; w: number; h: number }
interface Layout { slots: Slot[]; byKey: Map<string, Slot>; height: number; col: number }

/** Columns, shortest first: the next card goes under the column that ends highest */
function layoutBoard(items: InspoItem[], ratioOf: (item: InspoItem) => number, col: number, cols: number, padL: number, padTop: number, captionOf: (item: InspoItem) => number): Layout {
  const bottoms = new Array<number>(cols).fill(padTop);
  const slots: Slot[] = [];
  const byKey = new Map<string, Slot>();
  for (const item of items) {
    let c = 0;
    for (let i = 1; i < cols; i++) if (bottoms[i] < bottoms[c] - 0.5) c = i;
    const h = col * ratioOf(item) + captionOf(item);
    const slot = { item, key: keyOf(item), x: padL + c * (col + GAP), y: bottoms[c], w: col, h };
    slots.push(slot);
    byKey.set(slot.key, slot);
    bottoms[c] += h + GAP;
  }
  return { slots, byKey, height: Math.max(padTop, ...bottoms) - GAP, col };
}

export default memo(function Grid({ under = false, items, ratioOf, hasNote, insets, zoom, onZoom, fitKey, focusKey, renderCard, handleRef }: {
  /** Under Polish: kept laid out but inert, out of reach and without its corner */
  under?: boolean;
  /** The cards to lay out: the whole space, or the search's results in the order they rank */
  items: InspoItem[];
  /** Height/width of what each card shows, known before it loads (the page's height from the index, or a measurement) */
  ratioOf: (item: InspoItem) => number;
  /** Whether a card has a line under it (a note, or a reply standing in for one): a card without sits flush on the next */
  hasNote: (item: InspoItem) => boolean;
  insets: Insets;
  /** Columns away from the usual number for the screen (positive: fewer, closer) */
  zoom: number;
  onZoom: (zoom: number) => void;
  /** Changes when the board should start from the top again (another space, another search) */
  fitKey: string;
  /** The open card, brought into view when it opens */
  focusKey: string | null;
  renderCard: (item: InspoItem, level: ShotLevel) => ReactNode;
  handleRef?: React.RefObject<GridHandle | null>;
}) {
  const { t } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  /** The flight from Polish: done for this arrival, and the board already scrolled round the card that was in front */
  const morphed = useRef(false), placed = useRef(false);
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
  const phone = !!width && width < 801;
  const maxCols = Math.max(MIN_COLS, Math.min(MAX_COLS, Math.floor((room + GAP) / (MIN_COL + GAP))));
  const clampCols = (n: number) => Math.min(maxCols, Math.max(MIN_COLS, n));
  const base = clampCols(Math.round((room + GAP) / (BASE_COL + GAP)));
  const cols = phone ? (width <= 520 ? 1 : 2) : clampCols(base - zoom);
  const col = (room - (cols - 1) * GAP) / cols;
  const level = levelFor(col);
  const bare = !phone && col < BARE_COL;
  const captionOf = useCallback(
    (item: InspoItem) => (bare ? 0 : (hasNote(item) ? CAPTION_H : 0) + (touch ? TOUCH_CAPTION_H : 0)),
    [bare, touch, hasNote],
  );
  const pct = Math.round((base / cols) * 100);
  // A step from the columns on screen, not from the kept number: past either end the buttons don't pile up steps
  const stepRef = useRef((_by: number) => {});
  stepRef.current = (by) => {
    const next = clampCols(cols + by);
    if (!phone && next !== cols) onZoom(base - next);
  };
  const layout = useMemo(() => (width ? layoutBoard(items, ratioOf, col, cols, padL, padTop, captionOf) : null), [items, ratioOf, width, col, cols, padL, padTop, captionOf]);

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
  // A pinch on the trackpad, or ctrl/⌘ + wheel, zooms the board instead of the page: pinching in is more columns
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let sum = 0, last = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.timeStamp - last > 300) sum = 0;
      last = e.timeStamp;
      sum += e.deltaY;
      if (Math.abs(sum) < PINCH_STEP) return;
      stepRef.current(sum > 0 ? 1 : -1);
      sum = 0;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  // A change of columns (a zoom, a narrower window) keeps the eye where it was: the same fraction of
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
  // A card comes into view, clear of the bars and the dock: the open one, or the one the page points at
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  const focus = useCallback((key: string) => {
    const el = scrollRef.current, s = layoutRef.current?.byKey.get(key), ins = insetsRef.current;
    if (!el || !s) return;
    const top = el.scrollTop + ins.top, bottom = el.scrollTop + el.clientHeight - ins.bottom;
    if (s.y >= top && s.y + s.h <= bottom) return;
    el.scrollTo({ top: Math.max(0, s.y - ins.top - PAD), behavior: "smooth" });
  }, []);
  // A render of its own for the flight to run in, once the refs are reset
  const [, setArriving] = useState(0);
  const receive = useCallback(() => { morphed.current = false; placed.current = false; setArriving((n) => n + 1); }, []);
  useEffect(() => { if (handleRef) handleRef.current = { focus, receive }; }, [handleRef, focus, receive]);
  const lastFocus = useRef<string | null>(null);
  useEffect(() => {
    const open = focusKey && focusKey !== lastFocus.current;
    lastFocus.current = focusKey;
    if (open) focus(focusKey);
  }, [focusKey, focus]);

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

  // ─── Coming from Polish ─────────────────────────────────────────────────────
  // The tornado's cards were measured as it left (components/view-morph.ts). The board opens round the card that
  // was in front, at the height it had on the screen, so the cards round it on the orbit are the ones on screen;
  // then each card that was on the orbit flies from the box it projected there to its place on the board, the rest
  // fade in, and copies of the orbit's cards with no place on screen fade where they stood. Read all, then write all.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (morphed.current || under || !visible.length || !layout || !el) return;
    const hand = peekHandoff("polish");
    if (!hand) { morphed.current = true; return; }
    if (!placed.current) {
      placed.current = true;
      const slot = hand.front ? layout.byKey.get(hand.front) : undefined, shot = hand.front ? hand.shots.get(hand.front) : undefined;
      if (slot && shot) {
        const er = el.getBoundingClientRect(), vh = el.clientHeight;
        const top = Math.max(0, Math.min(el.scrollHeight - vh, slot.y + slot.h / 2 - (shot.y + shot.h / 2 - er.top)));
        if (Math.abs(top - el.scrollTop) > 1) {
          el.scrollTop = top;
          // A window further away is another render, with the cards round there: the flight waits for it
          const lo = top - vh * OVERSCAN, hi = top + vh * (1 + OVERSCAN);
          if (!win || Math.abs(win.lo - lo) >= vh / 4 || Math.abs(win.hi - hi) >= vh / 4) { update(); return; }
        }
      }
    }
    morphed.current = true;
    const { shots } = takeHandoff("polish") ?? hand;
    const reads = Array.from(el.querySelectorAll<HTMLElement>(".board-tile[data-key]"), (tile) => {
      const inner = (tile.firstElementChild as HTMLElement | null) ?? tile;
      return { inner, key: tile.dataset.key!, r: inner.getBoundingClientRect() };
    });
    const used = new Set<string>();
    for (const { inner, key, r } of reads) {
      if (r.bottom < 0 || r.top > window.innerHeight || !r.width) continue;
      const shot = shots.get(key);
      if (shot) {
        used.add(key);
        const media = inner.querySelector<HTMLElement>(".tile__media");
        if (media) coverWhileFlying(media, shot, MORPH_MS);
        const dx = shot.x + shot.w / 2 - (r.left + r.width / 2), dy = shot.y + shot.h / 2 - (r.top + r.height / 2);
        inner.animate([
          { transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${(shot.w / r.width).toFixed(4)}, ${(shot.h / r.height).toFixed(4)})` },
          { transform: "translate3d(0, 0, 0) scale(1, 1)" },
        ], { duration: MORPH_MS, easing: EASE_OUT });
      } else {
        inner.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "scale(1)" }], { duration: MORPH_MS * 0.6, delay: MORPH_MS * 0.3, easing: EASE_OUT, fill: "backwards" });
      }
    }
    // The orbit's other cards have their place off screen: a copy of each fades where it stood
    ghostsOut(Array.from(shots, ([k, from]) => (used.has(k) ? null : from)).filter((m) => !!m));
  });

  return (
    <>
      <div ref={scrollRef} className="board" data-bare={bare ? "" : undefined} inert={under || undefined} aria-hidden={under || undefined}>
        <div className="board__world" style={{ height: layout ? layout.height + padBottom : "100%" }}>
          {visible.map((s) => {
            const enter = seen.has(s.key) ? undefined : entrance.current?.get(s.key);
            const at = enter === undefined ? arrivals.current.get(s.key) : undefined;
            const arrive = at === undefined ? undefined : Math.max(0, at - now);
            return (
              <div
                key={s.item.web}
                className="board-tile"
                data-key={s.key}
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
      </div>

      {/* Outside the scroller, so it stays in its corner while the board moves */}
      {/* The corner pill: the system's chrome pill with the zoom (minus, %, plus) and the music after a hairline */}
      {!under && <ZoomPill
        className="board-zoom"
        zoom={{
          pct,
          label: t.zoom.columns(cols),
          canOut: cols < maxCols,
          canIn: cols > MIN_COLS,
          onOut: () => stepRef.current(1),
          onIn: () => stepRef.current(-1),
          onReset: () => onZoom(DEFAULT_ZOOM),
        }}
      >
        <SoundControl />
      </ZoomPill>}
    </>
  );
});
