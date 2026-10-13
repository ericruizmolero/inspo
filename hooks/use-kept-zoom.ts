"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { DEFAULT_ZOOM } from "@/components/Grid";

/** The zoom (columns away from the usual number, see components/Grid.tsx), kept for the next visit */
// ":4": everyone opens again at the default (three columns, 100%: 13-10); a zoom kept before is dropped
const ZOOM_KEY = "inspo:board-zoom:4";
// The zoom: 100% unless the person left it elsewhere. Read before the first paint (a layout effect),
// so the server's markup matches and the board, which draws nothing until measured, opens at the kept zoom.
export function useKeptZoom() {
  const [zoom, setZoomState] = useState(DEFAULT_ZOOM);
  useLayoutEffect(() => {
    try {
      const kept = localStorage.getItem(ZOOM_KEY);
      const z = kept === null ? NaN : Number(kept);
      if (Number.isInteger(z) && Math.abs(z) < 8) setZoomState(z);
    } catch { /* no storage */ }
  }, []);
  const setZoom = useCallback((z: number) => {
    setZoomState(z);
    try { localStorage.setItem(ZOOM_KEY, String(z)); } catch { /* no storage */ }
  }, []);
  return [zoom, setZoom] as const;
}
