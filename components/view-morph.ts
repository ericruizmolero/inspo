// The board turning into the tornado, and back. Switching a project from the Board to Polish is a change of
// ?view= through the router, so the two views are never on screen together: the one leaving is measured first,
// and when the other one has mounted its cards fly from where the same cards were to where they now stand.
// Read everything, then write everything (the curtain's pattern): one layout, however many cards. The cards
// only one view had leave or arrive as one, by opacity. WAAPI, transform and opacity only, as the system says.

const FRESH_MS = 2500;
export const MORPH_MS = 900;
/** How long what fades takes: the copies of cards the new view has no place for, and the covers once landed */
export const GHOST_MS = 420;
/** Delay per card step from the front: the front settles first, the far ones a beat later */
export const MORPH_STEP_MS = 24;
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export interface Shot { x: number; y: number; w: number; h: number; radius: string; image: string | null }
type View = "board" | "polish";
export interface Handoff { shots: Map<string, Shot>; /** The card that was facing the screen, leaving Polish */ front?: string }
let pending: { from: View; at: number; hand: Handoff } | null = null;

const stillMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const onScreen = (r: DOMRect) => r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth && r.width > 0;
/** The picture a card is showing, for its copy: its media only, never the faces of its caption; the bigger copy
 *  when there is one (Polish lays it over the small one) */
const pictureOf = (box: HTMLElement) => {
  const imgs = Array.from(box.querySelectorAll<HTMLImageElement>("img")).filter((i) => i.currentSrc && !i.classList.contains("is-hidden") && !i.closest(".cr-avatar"));
  return imgs.at(-1)?.currentSrc ?? box.querySelector<HTMLVideoElement>("video")?.poster ?? null;
};
const shotOf = (box: HTMLElement, r: DOMRect): Shot => ({ x: r.left, y: r.top, w: r.width, h: r.height, radius: getComputedStyle(box).borderRadius, image: pictureOf(box) });

/** Before the board leaves: where each card on screen is */
export function snapshotBoard() {
  if (stillMotion()) { pending = null; return; }
  const shots = new Map<string, Shot>();
  for (const tile of document.querySelectorAll<HTMLElement>(".board-tile[data-key]")) {
    const inner = (tile.firstElementChild as HTMLElement | null) ?? tile;
    const r = inner.getBoundingClientRect();
    if (onScreen(r)) shots.set(tile.dataset.key!, shotOf(inner.querySelector<HTMLElement>(".tile__media") ?? inner, r));
  }
  pending = { from: "board", at: performance.now(), hand: { shots } };
}

/** Before the tornado leaves: the box each of its cards projects on the screen */
export function snapshotPolish() {
  if (stillMotion()) { pending = null; return; }
  const shots = new Map<string, Shot>();
  let front: string | undefined;
  for (const card of document.querySelectorAll<HTMLElement>(".polish__card[data-node]")) {
    if (card.style.visibility === "hidden") continue;
    const key = card.dataset.node!.slice(0, card.dataset.node!.lastIndexOf("#"));
    if (shots.has(key)) continue;
    const r = card.getBoundingClientRect();
    if (!onScreen(r)) continue;
    shots.set(key, shotOf(card.querySelector<HTMLElement>(".polish__in") ?? card, r));
    if (card.hasAttribute("data-front")) front = key;
  }
  pending = { from: "polish", at: performance.now(), hand: { shots, front } };
}

/** What the other view left, if it is still warm: to look at (the new view may open round the same card) */
export function peekHandoff(from: View): Handoff | null {
  const p = pending;
  return p && p.from === from && performance.now() - p.at < FRESH_MS && !stillMotion() ? p.hand : null;
}
/** The view that has just mounted takes what the other left, once */
export function takeHandoff(from: View): Handoff | null {
  const hand = peekHandoff(from);
  pending = null;
  return hand;
}

/** The cards only the old view had: a copy of each fades where it stood, drawing in a little. (Flying them to
 *  their place in the new view, off screen, read as cards shooting away.) */
export function ghostsOut(shots: Iterable<Shot>) {
  const frag = document.createDocumentFragment(), ghosts: HTMLElement[] = [];
  for (const s of shots) {
    const g = document.createElement("div");
    g.setAttribute("aria-hidden", "true");
    g.className = "tile-fly tile-fly--ghost";
    Object.assign(g.style, { left: `${s.x}px`, top: `${s.y}px`, width: `${s.w}px`, height: `${s.h}px`, borderRadius: s.radius });
    if (s.image) g.style.backgroundImage = `url("${s.image.replace(/"/g, "%22")}")`;
    frag.append(g);
    ghosts.push(g);
  }
  if (!ghosts.length) return;
  document.body.append(frag);
  for (const g of ghosts) {
    const a = g.animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(0.94)", opacity: 0 }], { duration: GHOST_MS, easing: EASE_OUT, fill: "forwards" });
    const gone = () => g.remove();
    void a.finished.then(gone, gone);
  }
}

/** The picture a card showed in the view that left, laid over it while it flies, so it never flies blank while its
 *  own picture loads; it fades off once the card has landed */
export function coverWhileFlying(box: HTMLElement, shot: Shot, flight: number) {
  if (!shot.image) return;
  const c = document.createElement("i");
  c.className = "morph-cover";
  c.style.backgroundImage = `url("${shot.image.replace(/"/g, "%22")}")`;
  box.append(c);
  const a = c.animate([{ opacity: 1 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }], { duration: flight, easing: "linear", fill: "forwards" });
  const fade = () => { const f = c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: GHOST_MS, easing: EASE_OUT, fill: "forwards" }); const gone = () => c.remove(); void f.finished.then(gone, gone); };
  void a.finished.then(fade, fade);
}
