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
export const MORPH_STEP_MS = 16;
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
/** The flight itself: the wind takes a card at a walking pace, carries it fastest a quarter of the way in, and sets
 *  it down over the second half. (`--ease-out` has 80% of the travel over in the first 200 ms, the rest is standing.) */
export const EASE_WIND = "cubic-bezier(0.3, 0.2, 0.1, 1)";

export interface Shot { x: number; y: number; w: number; h: number; radius: string; image: string | null }
type View = "board" | "polish";
export interface Handoff { shots: Map<string, Shot>; /** The card that was facing the screen, leaving Polish */ front?: string }
/** What the view leaving left behind: measured at the click (Polish, whose cards stand still) or when the other view
 *  takes it (the board, whose cards are already on their way), and the departure to call off once taken */
let pending: { from: View; at: number; hand: Handoff | null; measure: () => Handoff; cancel: () => void } | null = null;

const stillMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const onScreen = (r: DOMRect) => r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth && r.width > 0;
/** The picture a card is showing, for its copy: its media only, never the faces of its caption; the bigger copy
 *  when there is one (Polish lays it over the small one) */
const pictureOf = (box: HTMLElement) => {
  const imgs = Array.from(box.querySelectorAll<HTMLImageElement>("img")).filter((i) => i.currentSrc && !i.classList.contains("is-hidden") && !i.closest(".cr-avatar"));
  return imgs.at(-1)?.currentSrc ?? box.querySelector<HTMLVideoElement>("video")?.poster ?? null;
};
const shotOf = (box: HTMLElement, r: DOMRect): Shot => ({ x: r.left, y: r.top, w: r.width, h: r.height, radius: getComputedStyle(box).borderRadius, image: pictureOf(box) });
const boardTiles = () => Array.from(document.querySelectorAll<HTMLElement>(".board-tile[data-key]"), (tile) => ({ key: tile.dataset.key!, inner: (tile.firstElementChild as HTMLElement | null) ?? tile }));

/** The board, as Polish is asked for: its cards stay where they are until the tornado takes them, each from its own
 *  place (drawing them towards the middle first read as the cards bunching up before the wind), and are measured
 *  then */
export function leaveBoard() {
  if (stillMotion()) { pending = null; return; }
  if (pending?.from === "board" && performance.now() - pending.at < 400) return;
  pending?.cancel();
  const measure = () => {
    const shots = new Map<string, Shot>();
    for (const { key, inner } of boardTiles()) {
      const r = inner.getBoundingClientRect();
      if (onScreen(r)) shots.set(key, shotOf(inner.querySelector<HTMLElement>(".tile__media") ?? inner, r));
    }
    return { shots };
  };
  pending = { from: "board", at: performance.now(), hand: null, measure, cancel: () => {} };
}

/** Polish, as the board is asked for: its cards come into focus at once (the wind takes them), and are measured
 *  now, where they stand, since the tornado does not move for it */
export function leavePolish() {
  if (stillMotion()) { pending = null; return; }
  if (pending?.from === "polish" && performance.now() - pending.at < 400) return;
  pending?.cancel();
  const shots = new Map<string, Shot>(), flights: Animation[] = [];
  let front: string | undefined;
  // Nearest the front first: with few references the orbit shows each card more than once, and the board takes
  // each from the copy at the front
  const cards = Array.from(document.querySelectorAll<HTMLElement>(".polish__card[data-node]"));
  const frontK = Number(cards.find((c) => c.hasAttribute("data-front"))?.dataset.k ?? 0);
  cards.sort((a, b) => Math.abs(Number(a.dataset.k) - frontK) - Math.abs(Number(b.dataset.k) - frontK));
  for (const card of cards) {
    if (card.style.visibility === "hidden") continue;
    const key = card.dataset.node!.slice(0, card.dataset.node!.lastIndexOf("#"));
    if (shots.has(key)) continue;
    const r = card.getBoundingClientRect();
    if (!onScreen(r)) continue;
    shots.set(key, shotOf(card.querySelector<HTMLElement>(".polish__in") ?? card, r));
    if (card.hasAttribute("data-front")) front = key;
    flights.push(card.animate([{ filter: card.style.filter || "blur(0px)" }, { filter: "blur(0px)" }], { duration: MORPH_MS * 0.5, easing: EASE_OUT, fill: "forwards" }));
    const fog = card.querySelector<HTMLElement>(".polish__fog");
    if (fog) flights.push(fog.animate([{ opacity: fog.style.opacity || "0" }, { opacity: 0 }], { duration: MORPH_MS * 0.5, easing: EASE_OUT, fill: "forwards" }));
  }
  const hand = { shots, front };
  pending = { from: "polish", at: performance.now(), hand, measure: () => hand, cancel: () => { for (const f of flights) f.cancel(); } };
}

/** What the other view left, if it is still warm: to look at (the new view may open round the same card) */
export function peekHandoff(from: View): Handoff | null {
  const p = pending;
  if (!p || p.from !== from || performance.now() - p.at > FRESH_MS || stillMotion()) return null;
  p.hand ??= p.measure();
  return p.hand;
}
/** The view that has just mounted takes what the other left, once; the departure is over, the flight goes on from it */
export function takeHandoff(from: View): Handoff | null {
  const hand = peekHandoff(from);
  pending?.cancel();
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

/** To and from the system there are no cards on the other side to fly to: the views cross-fade instead. At the
 *  click a still copy of the view leaving is laid over it (`ghostOf`) and starts to go, the board's cards one by
 *  one from the middle of the screen out (never drawing together); the new view is rendered at once underneath
 *  and comes into focus from the middle of the screen while the copy finishes going. One over the other, never one
 *  after the other: going out to nothing and then in left an empty screen in between, as long as the new view
 *  took to render. The copy moves by opacity and transform only, which the compositor keeps playing while the new
 *  view renders (a blur would not: it stuttered while the new view settled). The board stays mounted under the other views, so it arrives at once and quicker. */
type ProjectView = View | "system";
/** The copy's first step, at the click: a slow, steady going towards `DISTILL_HOLD`, so that it is still moving,
 *  never standing half seen, however long the new view takes to be ready (a quick drop to a half that then waited
 *  read as a flicker); the rest from wherever it has got to once the new view is there. The board arrives quicker
 *  (Eric: "que el tablón salga antes, más rápido") */
const DISTILL = { out: 700, rest: 420, in: 620, toBoardIn: 420 };
const DISTILL_HOLD = 0.3, EASE_STEADY = "cubic-bezier(0.25, 0.1, 0.5, 1)", EASE_REST = "cubic-bezier(0.4, 0.3, 0.2, 1)";
/** How far, from the middle of the screen out, the board's last card leaves after the first; and the system's last line */
const DISTILL_SPREAD_MS = 110, DISTILL_LINES_MS = 220;
const DISTILL_SCALE = 0.965;
let distilling: { from: ProjectView; to: ProjectView; at: number; ghost: HTMLElement | null } | null = null;
const ROOT: Record<ProjectView, string> = { board: ".board", polish: ".polish", system: ".spage" };
const live = (view: ProjectView) => document.querySelector<HTMLElement>(`${ROOT[view]}:not([data-ghost])`);

/** Whether going from one view to the other cross-fades this way (everything to and from the system) */
export const distills = (from: ProjectView, to: ProjectView) => from !== to && (from === "system" || to === "system");

/** A still copy of a view, laid over it in the same place: nothing in it answers or is found as the real thing */
function ghostOf(root: HTMLElement): HTMLElement {
  const g = root.cloneNode(true) as HTMLElement;
  g.dataset.ghost = "";
  g.setAttribute("aria-hidden", "true");
  g.removeAttribute("id");
  Object.assign(g.style, { pointerEvents: "none", zIndex: "1" });
  for (const el of g.querySelectorAll("[data-key], [data-node], [data-k], [data-front], [id]")) for (const at of ["data-key", "data-node", "data-k", "data-front", "id"]) el.removeAttribute(at);
  root.after(g);
  g.scrollTop = root.scrollTop;
  return g;
}
const dropGhost = (g: HTMLElement | null | undefined) => g?.remove();

/** The view leaving, at the click: its copy is laid over it and starts to go. Returns whether it did */
export function distillOut(from: ProjectView, to: ProjectView): boolean {
  if (!distills(from, to) || stillMotion()) return false;
  if (distilling && distilling.to === to && performance.now() - distilling.at < 400) return false;
  dropGhost(distilling?.ghost);
  const root = live(from);
  if (!root) { distilling = null; return false; }
  // The view arriving wears its first look in CSS from its first frame, whenever it has loaded: Polish fading in
  // (PolishView.css), the system out of sight until its file is there (SystemView.css; distillIn)
  if (to === "board") delete document.documentElement.dataset.distill;
  else document.documentElement.dataset.distill = to;
  const ghost = ghostOf(root), cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const opts = (delay = 0): KeyframeAnimationOptions => ({ duration: DISTILL.out - delay, delay, easing: EASE_STEADY, fill: "forwards" });
  if (from === "board") {
    const far = Math.hypot(cx, cy) || 1;
    for (const tile of ghost.querySelectorAll<HTMLElement>(".board-tile > *")) {
      const r = tile.getBoundingClientRect();
      if (!onScreen(r)) continue;
      const delay = (Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy) / far) * DISTILL_SPREAD_MS;
      tile.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: DISTILL_HOLD, transform: `scale(${DISTILL_SCALE})` }], opts(delay));
    }
  } else {
    ghost.style.transformOrigin = "50% 50%";
    ghost.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: DISTILL_HOLD, transform: "scale(0.985)" }], opts());
  }
  distilling = { from, to, at: performance.now(), ghost };
  // Never left behind if the new view does not come
  window.setTimeout(() => { if (distilling?.ghost === ghost) { dropGhost(ghost); distilling = null; delete document.documentElement.dataset.distill; } }, FRESH_MS);
  return true;
}

/** The copy of the view that left finishes going, from wherever it has got to, and is dropped */
function ghostAway(g: HTMLElement | null) {
  if (!g) return;
  const from = getComputedStyle(g).opacity, t = getComputedStyle(g).transform;
  for (const a of g.getAnimations({ subtree: true })) { a.commitStyles?.(); a.cancel(); }
  const a = g.animate([{ opacity: from, transform: t === "none" ? "scale(1)" : t }, { opacity: 0, transform: `scale(${DISTILL_SCALE})` }], { duration: DISTILL.rest, easing: EASE_REST, fill: "forwards" });
  const gone = () => g.remove();
  void a.finished.then(gone, gone);
}

/** The view arriving, once rendered and ready: in from the middle of the screen while the copy of the other goes; the
 *  system's lines a beat apart, top to bottom. Called on every change of view; does nothing unless a cross-fade is
 *  on its way to this one. Polish is loaded on demand: it is waited for a few frames */
export function distillIn(to: ProjectView, tries = 0) {
  const d = distilling;
  if (!d || d.to !== to) return;
  const root = live(to);
  // Polish once loaded; the system once its file has (before, its page is a shell that is drawn again whole)
  const ready = to === "polish" ? !!root?.querySelector(".polish__sky") : to === "system" ? !!root && root.getAttribute("aria-busy") !== "true" : true;
  if (!ready && tries < 90) { requestAnimationFrame(() => distillIn(to, tries + 1)); return; }
  distilling = null;
  ghostAway(d.ghost);
  const html = document.documentElement;
  if (!root) { delete html.dataset.distill; return; }
  if (to === "polish") {
    // Its first look is CSS, there from its first frame; the attribute goes once it has played
    window.setTimeout(() => { if (html.dataset.distill === "polish") delete html.dataset.distill; }, DISTILL.in + 100);
    return;
  }
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  if (to === "board") {
    const r = root.getBoundingClientRect(), origin = `${cx - r.left}px ${cy - r.top}px`;
    root.animate([{ opacity: 0, transform: `scale(${DISTILL_SCALE})`, transformOrigin: origin }, { opacity: 1, transform: "scale(1)", transformOrigin: origin }],
      { duration: DISTILL.toBoardIn, easing: EASE_OUT, fill: "backwards" });
    return;
  }
  // The system: its page scrolls, so the focus is on what is inside it
  const inner = root.querySelector<HTMLElement>(".spage-inner") ?? root;
  const r = inner.getBoundingClientRect(), origin = `${cx - r.left}px ${cy - r.top}px`;
  inner.animate(
    [{ opacity: 0, transform: `scale(${DISTILL_SCALE})`, transformOrigin: origin }, { opacity: 1, transform: "scale(1)", transformOrigin: origin }],
    { duration: DISTILL.in, easing: EASE_OUT, fill: "backwards" });
  const lines = Array.from(inner.querySelectorAll<HTMLElement>(".spage-head, .mdv-line"), (el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => onScreen(r));
  for (const { el, r: lr } of lines) {
    el.animate([{ opacity: 0, transform: "translate3d(0,8px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
      { duration: DISTILL.in - DISTILL_LINES_MS * 0.5, delay: (lr.top / window.innerHeight) * DISTILL_LINES_MS, easing: EASE_OUT, fill: "backwards" });
  }
  // Its animations hold it out of sight from here: the CSS that kept it there while it loaded can go
  if (html.dataset.distill === "system") delete html.dataset.distill;
}
