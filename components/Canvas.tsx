"use client";

// The library as a canvas the size of its layout: every reference as its whole page, in columns
// (newest first). The layout is always the automatic one: cards are not moved by hand.
// Only the cards near the screen are mounted, and each draws its page at the size it is seen
// (288, 720 or 1440px wide). Moving the camera never re-renders React (hooks/use-canvas-camera.ts):
// React only hears which cards are near the screen, and the zoom level once the camera rests.
// Only the cards near the screen get the sharper copy; the others keep the one they have.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { InspoItem } from "@/types/inspo";
import { boundsOf, intersects, keyOf, type Rect, type Slot } from "@/lib/canvas-layout";
import { useCanvasCamera, type Insets, type View } from "@/hooks/use-canvas-camera";
import { useT } from "./I18nProvider";

/** Which copy of the page a card draws, by how wide it is on screen */
export type ShotLevel = "thumb" | "tile" | "full";
const LEVELS: ShotLevel[] = ["thumb", "tile", "full"];
// Screen px (at the device's density) where a sharper copy is needed, and lower ones where a smaller
// copy is enough again: the gap keeps a zoom hovering near a threshold from swapping back and forth.
const UP = [300, 760];
const DOWN = [240, 620];
const screenPx = (z: number) => 360 * z * (typeof window === "undefined" ? 2 : Math.min(2, window.devicePixelRatio || 1));
function nextLevel(cur: ShotLevel, z: number): ShotLevel {
  const px = screenPx(z);
  let i = LEVELS.indexOf(cur);
  while (i < 2 && px > UP[i]) i++;
  while (i > 0 && px < DOWN[i - 1]) i--;
  return LEVELS[i];
}
const firstLevel = (z: number): ShotLevel => (screenPx(z) <= UP[0] ? "thumb" : screenPx(z) <= UP[1] ? "tile" : "full");

// Cards already shown once in this tab: a card that comes back into view never animates in again
const seen = new Set<string>();

// Search results (CSS in app/globals.css .canvas-tile[data-arrive] / [data-leave], same values)
const ARRIVE_MS = 220;
const LEAVE_MS = 150;
/** Up to this many new results arrive one after another, 30 ms apart, the last within 180 ms */
const STAGGER_MAX = 24;
const STAGGER_MS = 30;
const STAGGER_CAP_MS = 180;
/** Up to this many cards the canvas mounts them all; past it, only those near the screen */
const MOUNT_ALL_MAX = 600;
/** More than this leaving at once just vanish: a fade over a hundred cards is noise, and costs frames */
const MAX_LEAVING = 40;

export interface CanvasHandle {
  /** Glides to a card, keeping it clear of what covers the screen (the panel on the right) */
  focus: (key: string) => void;
  fitAll: () => void;
}

export default function Canvas({
  items, slots, insets, fitKey, focusKey, renderCard, handleRef,
}: {
  /** The cards to lay out: the whole space, or the search's results in the order they rank */
  items: InspoItem[];
  slots: Map<string, Slot>;
  /** What floats over the canvas on each side (bars, island, panel): fitting keeps clear of it */
  insets: Insets;
  /** Changes when the camera should frame everything again (another space, another search) */
  fitKey: string;
  /** The open card, framed when it opens */
  focusKey: string | null;
  renderCard: (item: InspoItem, level: ShotLevel) => ReactNode;
  handleRef?: React.RefObject<CanvasHandle | null>;
}) {
  const { t } = useT();
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const firstMount = useRef(true);
  const insetsRef = useRef(insets);
  insetsRef.current = insets;

  // What fitting frames: every card laid out (while searching, only the results are)
  const frameRect = useCallback((): Rect | null => boundsOf(slots.values()), [slots]);
  const frameRectRef = useRef(frameRect);
  frameRectRef.current = frameRect;

  const fitAll = useCallback((animate = true) => {
    const r = frameRectRef.current();
    if (r) camera.fitTo(r, insetsRef.current, { animate });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- camera is stable
  }, []);

  const allBounds = useMemo(() => boundsOf(slots.values()), [slots]);
  const allBoundsRef = useRef(allBounds);
  allBoundsRef.current = allBounds;
  // With every card mounted, a moving camera only matters to React when the copy must get smaller (the
  // level goes down at once); the rest waits for it to rest. The zoom % is written straight to the button.
  const pctRef = useRef<HTMLButtonElement>(null);
  const fitLabelRef = useRef(t.canvas.fit);
  fitLabelRef.current = t.canvas.fit;
  const levelRef = useRef<ShotLevel>("tile");
  const mountAllRef = useRef(true);
  const camera = useCanvasCamera(viewportRef, worldRef, {
    onView: (v) => {
      if (pctRef.current) {
        const pct = `${Math.round(v.z * 100)}%`;
        pctRef.current.textContent = pct;
        // The name says what the button does, and keeps the number it shows
        pctRef.current.setAttribute("aria-label", `${pct} · ${fitLabelRef.current}`);
      }
      const smaller = LEVELS.indexOf(nextLevel(levelRef.current, v.z)) < LEVELS.indexOf(levelRef.current);
      setView((cur) => (!cur || v.resting || smaller || !mountAllRef.current ? v : cur));
    },
    onFitAll: (animate) => fitAll(animate),
    getBounds: () => allBoundsRef.current,
    getInsets: () => insetsRef.current,
  });

  // Frame everything on the first paint, then whenever the space or the filters change. A layout
  // effect: the cards are placed (and their images asked for) before the browser paints at all.
  const firstFit = useRef(true);
  useLayoutEffect(() => {
    fitAll(!firstFit.current);
    firstFit.current = false;
  }, [fitKey, fitAll]);

  const focus = useCallback((key: string) => {
    const s = slots.get(key);
    const vp = viewportRef.current;
    if (!s || !vp) return;
    const ins = insetsRef.current;
    // Keep the zoom when the card already reads well; otherwise bring it to a comfortable size
    const z = camera.cam.current.z;
    const room = vp.clientWidth - ins.left - ins.right;
    const nz = z >= 0.45 && z <= 1.2 ? z : Math.min(1, Math.max(0.45, (room * 0.6) / s.w));
    const x = ins.left + (room - s.w * nz) / 2 - s.x * nz;
    const top = ins.top + 32;
    // Tall pages stay at their top; short ones sit in the middle
    const availH = vp.clientHeight - ins.top - ins.bottom - 64;
    const y = s.h * nz > availH ? top - s.y * nz : top + (availH - s.h * nz) / 2 - s.y * nz;
    camera.set({ x, y, z: nz }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- camera is stable
  }, [slots]);

  useEffect(() => { if (handleRef) handleRef.current = { focus, fitAll: () => fitAll() }; }, [handleRef, focus, fitAll]);

  // The open card comes into view beside the panel
  const lastFocus = useRef<string | null>(null);
  useEffect(() => {
    const open = focusKey && focusKey !== lastFocus.current;
    lastFocus.current = focusKey;
    if (!open) return;
    // Wait a frame: the panel's width is part of the insets
    const id = requestAnimationFrame(() => focus(focusKey));
    return () => cancelAnimationFrame(id);
  }, [focusKey, focus]);

  // ─── Level: the copy every card draws. Sharper copies only once the camera rests, so a zoom
  // gesture never starts dozens of downloads it flies past. Smaller ones can come at once.
  const [levelState, setLevel] = useState<ShotLevel | null>(null);
  // Before the first decision the zoom alone picks it, so the first frame asks for the right copies
  const level: ShotLevel = levelState ?? (view ? firstLevel(view.z) : "tile");
  levelRef.current = level;
  useEffect(() => {
    if (!view) return;
    setLevel((cur) => {
      if (!cur) return firstLevel(view.z);
      const want = nextLevel(cur, view.z);
      return LEVELS.indexOf(want) < LEVELS.indexOf(cur) || view.resting ? want : cur;
    });
  }, [view]);

  // ─── What is mounted. Every card, all the time (its picture, its note, its thread), in a fixed order so
  // moving the camera never re-renders the cards. Only a library past MOUNT_ALL_MAX culls: cards within
  // 0.6 of a screen around the view, unmounted only past 1.5, nearest the centre first.
  const mounted = useRef(new Set<string>());
  const mountAll = items.length <= MOUNT_ALL_MAX;
  mountAllRef.current = mountAll;
  const visibleKeys = useMemo(() => {
    // Nothing before the camera is placed: the first paint is the wave from the centre
    if (!view) return "";
    if (mountAll) {
      const keys = items.map(keyOf).filter((k) => slots.has(k));
      mounted.current = new Set(keys);
      return keys.join("\n");
    }
    const r = view.rect;
    const near = { x: r.x - r.w * 0.6, y: r.y - r.h * 0.6, w: r.w * 2.2, h: r.h * 2.2 };
    const far = { x: r.x - r.w * 1.5, y: r.y - r.h * 1.5, w: r.w * 4, h: r.h * 4 };
    const next = new Set<string>();
    for (const i of items) {
      const k = keyOf(i), s = slots.get(k);
      if (!s) continue;
      if (intersects(s, near) || (mounted.current.has(k) && intersects(s, far))) next.add(k);
    }
    mounted.current = next;
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const d = (k: string) => { const s = slots.get(k)!; return Math.hypot(s.x + s.w / 2 - cx, s.y + s.h / 2 - cy); };
    return [...next].sort((a, b) => d(a) - d(b)).join("\n");
    // The view only matters when culling: with every card mounted, a camera move changes nothing here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, slots, mountAll ? !!view : view]);
  const byKey = useMemo(() => new Map(items.map((i) => [keyOf(i), i])), [items]);
  const visible = useMemo(() => (visibleKeys ? visibleKeys.split("\n").map((k) => byKey.get(k)).filter((i): i is InspoItem => !!i) : []), [visibleKeys, byKey]);

  // ─── Search: the cards that stay glide to their new place (a CSS transition on the tile, so a key
  // pressed mid-way retargets instead of restarting); new results arrive in the order they rank; the
  // ones that no longer match fade where they stood, quickly, while the others move in. Worked out
  // while rendering, against what the last commit showed, so a leaving card keeps its DOM node (same
  // key, same list) and an arriving one carries its attribute from its very first style.
  const shown = useRef<{ keys: Set<string>; tiles: Map<string, { item: InspoItem; slot: Slot }> } | null>(null);
  const fading = useRef(new Map<string, { item: InspoItem; slot: Slot; at: number }>());
  const arrivals = useRef(new Map<string, number>());
  const [, tick] = useState(0);
  const now = Date.now();
  if (shown.current) {
    for (const [k, tile] of shown.current.tiles) {
      if (!byKey.has(k) && !fading.current.has(k) && fading.current.size < MAX_LEAVING) fading.current.set(k, { ...tile, at: now });
    }
    const added = items.filter((i) => !shown.current!.keys.has(keyOf(i)));
    if (added.length) {
      const step = added.length <= STAGGER_MAX ? STAGGER_MS : 0;
      added.forEach((i, n) => arrivals.current.set(keyOf(i), now + Math.min(n * step, STAGGER_CAP_MS)));
    }
  }
  for (const [k, f] of fading.current) if (byKey.has(k) || now - f.at > LEAVE_MS + 40) fading.current.delete(k);
  for (const [k, at] of arrivals.current) if (now - at > ARRIVE_MS + STAGGER_CAP_MS) arrivals.current.delete(k);
  useLayoutEffect(() => {
    const tiles = new Map<string, { item: InspoItem; slot: Slot }>();
    for (const i of visible) { const k = keyOf(i), slot = slots.get(k); if (slot) tiles.set(k, { item: i, slot }); }
    shown.current = { keys: new Set(byKey.keys()), tiles };
  });
  // Once the fades are over, one more render takes the faded cards away
  const fadingCount = fading.current.size;
  useEffect(() => {
    if (!fadingCount) return;
    const id = setTimeout(() => tick((n) => n + 1), LEAVE_MS + 60);
    return () => clearTimeout(id);
  }, [fadingCount]);

  // ─── Entrance: on the first paint the pages arrive in a soft wave from the centre, once ───
  const entrance = useRef(new Map<string, number>());
  if (firstMount.current && view && visible.length) {
    const r = view.rect, cx = r.x + r.w / 2, cy = r.y + r.h / 2, reach = Math.hypot(r.w, r.h) / 2 || 1;
    for (const i of visible) {
      const k = keyOf(i), s = slots.get(k)!;
      entrance.current.set(k, Math.round(Math.min(1, Math.hypot(s.x + s.w / 2 - cx, s.y + s.h / 2 - cy) / reach) * 240));
    }
  }
  useEffect(() => {
    if (!visible.length) return;
    firstMount.current = false;
    for (const i of visible) seen.add(keyOf(i));
  }, [visible]);

  // ─── The copy each card draws: the level's own only for the cards near the screen when the camera last
  // rested (half a screen around it). The others keep the copy they have, never above the level: with every
  // card mounted, a zoom that rests at "full" asks for a few 1440px pages, not for all of them.
  const granted = useRef(new Map<string, ShotLevel>());
  const levels = useMemo(() => {
    const out = new Map<string, ShotLevel>();
    if (!view) return out;
    const r = view.rect;
    const near = { x: r.x - r.w * 0.5, y: r.y - r.h * 0.5, w: r.w * 2, h: r.h * 2 };
    const cap = LEVELS.indexOf(level);
    for (const i of visible) {
      const k = keyOf(i), s = slots.get(k);
      const had = granted.current.get(k) ?? "thumb";
      out.set(k, s && intersects(s, near) ? level : LEVELS[Math.min(cap, LEVELS.indexOf(had))]);
    }
    // A result fading out keeps the copy it was drawing
    for (const k of fading.current.keys()) { const had = granted.current.get(k); if (had && !out.has(k)) out.set(k, had); }
    granted.current = out;
    return out;
  }, [visible, slots, view, level]);
  const levelOf = (key: string): ShotLevel => levels.get(key) ?? granted.current.get(key) ?? "thumb";

  return (
    <div ref={viewportRef} className="canvas" data-level={level}>
      <div ref={worldRef} className="canvas__world">
        {[
          ...visible.map((item) => {
            const key = keyOf(item);
            const s = slots.get(key)!;
            const delay = seen.has(key) ? undefined : entrance.current.get(key);
            const at = delay === undefined ? arrivals.current.get(key) : undefined;
            const arrive = at === undefined ? undefined : Math.max(0, at - now);
            return (
              <div
                key={item.web}
                className="canvas-tile"
                data-canvas-tile=""
                data-enter={delay !== undefined ? "" : undefined}
                data-arrive={arrive !== undefined ? "" : undefined}
                style={{
                  transform: `translate(${s.x}px, ${s.y}px)`, width: s.w,
                  ...(delay !== undefined ? { "--enter": `${delay}ms` } : {}),
                  ...(arrive !== undefined ? { "--arrive": `${arrive}ms` } : {}),
                } as React.CSSProperties}
              >
                {renderCard(item, levelOf(key))}
              </div>
            );
          }),
          // Results that stopped matching: same key in the same list, so the same node fades where it stood
          ...[...fading.current].map(([key, { item, slot }]) => (
            <div
              key={item.web}
              className="canvas-tile"
              data-leave=""
              aria-hidden
              style={{ transform: `translate(${slot.x}px, ${slot.y}px) scale(0.97)`, width: slot.w }}
            >
              {renderCard(item, levelOf(key))}
            </div>
          )),
        ]}
      </div>

      <div className="canvas-zoom" data-canvas-ignore="">
        <button type="button" className="canvas-zoom__btn" onClick={() => camera.zoomBy(1 / 1.4)} aria-label={t.canvas.zoomOut}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 6h7" /></svg>
        </button>
        <button ref={pctRef} type="button" className="canvas-zoom__pct" onClick={() => fitAll()} title={t.canvas.fitHint} />
        <button type="button" className="canvas-zoom__btn" onClick={() => camera.zoomBy(1.4)} aria-label={t.canvas.zoomIn}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 6h7M6 2.5v7" /></svg>
        </button>
      </div>
    </div>
  );
}
