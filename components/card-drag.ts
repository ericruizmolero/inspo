// A reference's card dragged onto a project's tab (components/Island.tsx): it is filed there too, and stays where it
// was. The browser's own drag carries it, so a click, the rectangle and the scroll are left alone; what travels is
// the card's id, and the page decides whether the whole selection goes with it (InspoClient's dropOnProject).
import type { DragEvent } from "react";

/** Only our cards carry this: a file or a link dragged in from outside never lights a tab */
export const REF_TYPE = "application/x-criterio-ref";
/** The ghost's width under the pointer, in px: small enough to see the tabs it is going to */
const GHOST_W = 112;
const GHOST_MAX_H = 140;

// How many cards are picked right now: a picked card drags them all, and its ghost says how many
let picked = 0;
export const setPickedCount = (n: number) => { picked = n; };

export const carriesRef = (e: { dataTransfer: DataTransfer }) => e.dataTransfer.types.includes(REF_TYPE);
export const droppedRef = (e: { dataTransfer: DataTransfer }) => e.dataTransfer.getData(REF_TYPE) || null;

/** The card's picture, small, with the count when several travel: drawn on a canvas, which is ready in the same
 *  frame the browser takes its snapshot (a cloned <img> may not be decoded yet) */
function ghostOf(tile: HTMLElement, count: number) {
  const ghost = document.createElement("div");
  ghost.className = "ref-ghost";
  const media = tile.querySelector<HTMLElement>(".tile__media");
  const pic = media?.querySelector<HTMLImageElement | HTMLVideoElement>("img.tile__img:not(.is-hidden), video.tile__img:not(.is-hidden)");
  const box = media?.getBoundingClientRect();
  const h = Math.round(Math.min(GHOST_MAX_H, box && box.width ? (GHOST_W * box.height) / box.width : GHOST_W * 0.62));
  ghost.style.width = `${GHOST_W}px`;
  ghost.style.height = `${h}px`;
  const nw = pic instanceof HTMLImageElement ? pic.naturalWidth : pic?.videoWidth ?? 0;
  const nh = pic instanceof HTMLImageElement ? pic.naturalHeight : pic?.videoHeight ?? 0;
  if (pic && nw && nh) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvas = document.createElement("canvas");
    canvas.width = GHOST_W * dpr;
    canvas.height = h * dpr;
    // The top of the picture, as the card shows it (object-fit: cover, from the top)
    const sh = Math.min(nh, (nw * h) / GHOST_W);
    try { canvas.getContext("2d")?.drawImage(pic, 0, 0, nw, sh, 0, 0, canvas.width, canvas.height); ghost.append(canvas); } catch { /* a plain ghost */ }
  }
  if (count > 1) {
    const n = document.createElement("span");
    n.className = "ref-ghost__n";
    n.textContent = String(count);
    ghost.append(n);
  }
  return ghost;
}

/** On the card's dragstart: what it carries, how it looks, and the page told that a card is in the air */
export function startCardDrag(e: DragEvent<HTMLElement>, id: string, selected: boolean) {
  // A finger's long press is not a drag here: the Island (the tabs) is desktop only
  if (!window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); return; }
  const dt = e.dataTransfer, tile = e.currentTarget;
  // Without what the browser added for the picture under the pointer (its link): dropped elsewhere, it is nothing
  dt.clearData();
  dt.setData(REF_TYPE, id);
  dt.effectAllowed = "copy";
  const ghost = ghostOf(tile, selected ? Math.max(1, picked) : 1);
  document.body.append(ghost);
  dt.setDragImage(ghost, GHOST_W / 2, 24);
  setTimeout(() => ghost.remove(), 0);
  const root = document.documentElement;
  // After the snapshot, so the card itself fades and not its ghost
  requestAnimationFrame(() => { root.dataset.refDrag = ""; tile.dataset.dragging = ""; });
  const end = () => {
    requestAnimationFrame(() => { delete root.dataset.refDrag; delete tile.dataset.dragging; });
    window.removeEventListener("dragend", end, true);
    window.removeEventListener("drop", end, true);
    window.removeEventListener("pointermove", end, true);
  };
  // dragend is lost if the card leaves the page mid-drag (the board is windowed): the next pointer move ends it too
  window.addEventListener("dragend", end, true);
  window.addEventListener("drop", end, true);
  window.addEventListener("pointermove", end, true);
}
