"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { markShown, wasShown } from "@/lib/shown-images";

/**
 * Whether a card's picture is drawn, and how to draw it, for one <img>:
 * - a picture already shown in this tab is ready at once, decoded before the first paint (`decoding`
 *   "sync") and drawn without a fade (`instant`): a card that mounts again looks the same as before;
 * - any other is ready once it loads. A cached one can finish before React attaches onLoad, so the
 *   element is checked once mounted.
 * Readiness belongs to the source: a new `src` starts not ready by itself, no reset to remember.
 */
export function useImageReady(src: string | null | undefined) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const instant = wasShown(src);
  useEffect(() => {
    const el = ref.current;
    if (src && el?.complete && el.naturalWidth > 0) { markShown(src); setLoaded(src); }
  }, [src]);
  const onLoad = useCallback(() => { if (src) { markShown(src); setLoaded(src); } }, [src]);
  return {
    ref,
    ready: !!src && (instant || loaded === src),
    instant,
    onLoad,
    decoding: (instant ? "sync" : "async") as "sync" | "async",
  };
}
