"use client";

import { useCallback, useLayoutEffect, useState } from "react";

const FOLD_KEY = "inspo:dock-folded";
// The board's bottom bar folded into its tab (components/InspoClient.tsx .dock__tab), kept for the next visit. Read
// before the first paint, like the zoom (hooks/use-kept-zoom.ts), so the board doesn't open with the bar and then drop it.
export function useKeptFold() {
  const [folded, setFoldedState] = useState(false);
  useLayoutEffect(() => {
    try { if (localStorage.getItem(FOLD_KEY) === "1") setFoldedState(true); } catch { /* no storage */ }
  }, []);
  const setFolded = useCallback((on: boolean) => {
    setFoldedState(on);
    try { if (on) localStorage.setItem(FOLD_KEY, "1"); else localStorage.removeItem(FOLD_KEY); } catch { /* no storage */ }
  }, []);
  return [folded, setFolded] as const;
}
