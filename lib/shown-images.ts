// Pictures already decoded in this tab (shown by a card, or decoded off screen before a swap), shared by
// every card. A card that mounts again (it scrolls back into view, a search brings it back, a zoom
// turns the light card into the full one) finds its picture here: it is decoded before the first paint
// (decoding="sync", cheap because the browser still holds it) and drawn at once, no fade. Without this,
// the new <img> decodes a frame or two late and the card shows its placeholder colour meanwhile, which
// on dark pages reads as a black flicker. hooks/use-decoded-src.ts also falls back to another copy of
// the same page that is here, while the one it wants loads.
const shown = new Set<string>();

export const wasShown = (src: string | null | undefined): boolean => !!src && shown.has(src);
export const markShown = (src: string | null | undefined): void => { if (src) shown.add(src); };
