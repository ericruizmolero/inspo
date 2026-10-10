"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_RATIO, BOARD_MAX_RATIO } from "@/lib/board";
import type { InspoItem, PageShot } from "@/types/inspo";

/** Measured height/width of media whose page height the index doesn't give (images, og:images, video frames) */
const RATIOS_KEY = "inspo:ratios";
// Height/width of what each card shows: the page height from the index, else measured once and kept
export function useBoardRatios(pageShots: Record<string, PageShot>, thumbMap: Record<string, string>) {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RATIOS_KEY) || "{}");
      if (saved && typeof saved === "object") setRatios(saved);
    } catch { /* no storage */ }
  }, []);
  // Cards that load together measure together: their ratios are applied once per frame (one new layout,
  // not one per image) and saved a moment after the last one
  const pendingRatios = useRef<Record<string, number> | null>(null);
  const saveRatios = useRef<number | undefined>(undefined);
  const measure = useCallback((web: string, r: number) => {
    const first = !pendingRatios.current;
    pendingRatios.current = { ...pendingRatios.current, [web]: r };
    if (!first) return;
    requestAnimationFrame(() => {
      const batch = pendingRatios.current!;
      pendingRatios.current = null;
      setRatios((prev) => {
        const changed = Object.entries(batch).filter(([w, v]) => prev[w] === undefined || Math.abs(prev[w] - v) >= 0.01);
        if (!changed.length) return prev;
        const next = { ...prev, ...Object.fromEntries(changed) };
        window.clearTimeout(saveRatios.current);
        saveRatios.current = window.setTimeout(() => {
          try { localStorage.setItem(RATIOS_KEY, JSON.stringify(next)); } catch { /* no storage */ }
        }, 500);
        return next;
      });
    });
  }, []);
  const ratioOf = useCallback((item: InspoItem) => {
    const shot = pageShots[item.web];
    // A site is its first screen, the height of its cover (16:10), unless someone chose a thumbnail for it:
    // the stored copy of the page is cut there, and only a page shorter than a screen makes a shorter card
    if (shot && !thumbMap[item.web]) return Math.min(shot.shotH / 1440, DEFAULT_RATIO);
    // Anything else keeps its own shape, cut at the board's maximum height; unmeasured, it arrives as a cover
    return Math.min(ratios[item.web] ?? DEFAULT_RATIO, BOARD_MAX_RATIO);
  }, [pageShots, thumbMap, ratios]);
  return { measure, ratioOf };
}
