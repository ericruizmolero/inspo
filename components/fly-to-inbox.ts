// A card taken out of a project on the board leaves the way a forgotten one does in Polish: a copy of it flies
// from where it stands to the Inbox tab of the island, which takes it with a small bump. The same flight as
// PolishView's Flyer (its numbers are these), drawn here without React because the card is about to unmount.

const FLY_MS = 640;
/** The part of the flight after which the card is on the tab: the tab bumps and the card leaves the project then */
const LAND = 0.8;
const EASE_FLY = "cubic-bezier(0.55, 0, 0.25, 1)";
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const INBOX_TAB = '.island a[href*="in=inbox"]';

/**
 * Flies a copy of the tile to the Inbox tab. Answers how long until it lands, in ms: the moment to take the card
 * out of the project, so the Inbox counts it as it arrives. 0 when nothing flies (reduced motion, or no tab on
 * screen, as on a phone): the card just goes.
 */
export function flyToInbox(tile: HTMLElement): number {
  const tab = document.querySelector<HTMLElement>(INBOX_TAB);
  if (!tab || !tab.offsetParent || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;
  const r = tile.getBoundingClientRect(), to = tab.getBoundingClientRect();
  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  ghost.className = "tile-fly";
  Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: getComputedStyle(tile).borderRadius });
  // The picture the card is showing; a text card flies as a plain sheet
  const shown = tile.querySelector<HTMLImageElement>("img")?.currentSrc ?? tile.querySelector<HTMLVideoElement>("video")?.poster;
  if (shown) ghost.style.backgroundImage = `url("${shown.replace(/"/g, "%22")}")`;
  document.body.append(ghost);
  const dx = to.left + to.width / 2 - (r.left + r.width / 2), dy = to.top + to.height / 2 - (r.top + r.height / 2);
  const landed = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(-8deg) scale(${Math.max(0.03, 28 / r.width).toFixed(3)})`;
  const flight = ghost.animate([
    { transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)", opacity: 1 },
    { transform: landed, opacity: 1, offset: 0.9 },
    { transform: landed, opacity: 0 },
  ], { duration: FLY_MS, easing: EASE_FLY, fill: "forwards" });
  const gone = () => ghost.remove();
  void flight.finished.then(gone, gone);
  window.setTimeout(() => tab.animate([{ transform: "scale(1)" }, { transform: "scale(1.16)" }, { transform: "scale(1)" }], { duration: 380, easing: EASE_OUT }), FLY_MS * LAND);
  return FLY_MS * LAND;
}
