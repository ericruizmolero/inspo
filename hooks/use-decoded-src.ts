"use client";

import { useEffect, useState } from "react";
import { markShown, wasShown } from "@/lib/shown-images";

/**
 * The picture a card shows, never a blank frame:
 * - the wanted copy when it was already shown in this tab;
 * - else another copy of the same picture that was (`alternates`: a page drawn at 288, 720 or 1440px),
 *   while the wanted one loads and decodes off screen, then takes its place;
 * - else the wanted one, loading normally (the card paints its colour until it arrives).
 * A search or a zoom changes which copy a card wants, and whether it is the light card or the full one:
 * either way the card keeps showing what it already had until the new copy is ready.
 */
export function useDecodedSrc(src: string | undefined, alternates?: (string | null | undefined)[]): string | undefined {
  const [shown, setShown] = useState(() => {
    if (!src || wasShown(src)) return src;
    return alternates?.find((a): a is string => wasShown(a)) ?? src;
  });
  useEffect(() => {
    if (!src || src === shown) return;
    if (!shown) { setShown(src); return; }
    let live = true;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.decode().then(() => { markShown(src); if (live) setShown(src); }, () => { if (live) setShown(src); });
    // A copy no longer wanted (the zoom moved on) stops downloading
    return () => { live = false; img.src = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new source starts a swap
  }, [src]);
  return shown;
}
