// The tornado of PolishView: where each card stands on the orbit, the engine that turns it, and how the board's
// cards settle into it on arriving (components/view-morph.ts).
import { gust } from "@/lib/ui-sounds";
import { EASE_WIND, GHOST_MS, MORPH_MS, MORPH_STEP_MS, coverWhileFlying, type Shot } from "./view-morph";

// The tornado, in Osmo's own terms
export const ANGLE = 30; // degrees between one card and the next
export const Y_SPACING = 0.3; // how far down the next card sits, in card heights
export const EDGE_OFFSET = 2; // card heights past the screen's edge before a card starts to shrink
export const EDGE_SCALE = 0.5; // card heights it takes to shrink to nothing
export const ORBIT = 35; // radius of the orbit, in em
export const AUTO_SPEED = 0.00325; // cards per frame it turns at on its own
export const SCROLL_EASE = 0.1; // how fast it picks its own speed up again
const BACK_FOG = 0.5; // how far the cards at the back sink into the page: nearly all the way
const BACK_BLUR = 0.6; // em of blur at the very back
export const CARD_H = 15; // em: the nominal card the spacing is counted in (Osmo's is 22.5 tall; a board is mostly sites, 16:10)
// Ours: the card facing the screen takes more room, and its neighbours step aside
const CARD_W = 18; // em: a card's width on the orbit
export const FRONT_W = 30; // em: its width facing the screen. Cards are laid out at this width (.polish__card) and drawn smaller on the orbit, so the one in front is sharp
const FRONT_PUSH = 6; // em it comes towards the eye
const FRONT_SCALE = 1 - FRONT_PUSH / 75; // what undoes the perspective's own enlargement (the stage's is 75em)
const SPREAD = 0.5; // card steps its neighbours move away
const SIDE_FOG = 0.46; // the others, well into the page: with the blur, what says which card is being decided
const NEAR_BLUR = 0.42; // em of blur on the nearest of the others: only the card in front is in focus, and the rest read as out of it at a glance
const CLOSE_MS = 130; // time constant of the gap closing when a card leaves the board
const MORPH_ROUND = 1.5; // card steps further round the orbit a card comes in from, arriving from the board (components/view-morph.ts)
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export const mod = (a: number, n: number) => ((a % n) + n) % n;
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2); // power2.inOut
const smooth = (x: number) => x * x * (3 - 2 * x);
/** The position nearest to `p` where the card at `index` of a board of `n` sits */
export const nearest = (index: number, p: number, n: number) => index + n * Math.round((p - index) / n);
export const stillMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface CardNode { el: HTMLElement; fog: HTMLElement; key: string; k: number; off: number; rel: number; z: number; blur: number; shown: boolean }
export interface Engine {
  /** Which position of the tornado faces the screen (a card every whole number), its speed in cards per frame, and
   *  the card it is gliding to, if any */
  p: number; v: number; target: number | null;
  /** The way it turns on its own: the way it was last pushed */
  dir: 1 | -1;
  dragging: boolean;
  /** When the last scroll was: a moment later it rests on the nearest card */
  scrolled: number;
  /** How much room the card in front takes: 1 while there is something to decide, 0 once the board is done */
  lift: number; done: boolean;
  still: boolean; em: number; h: number; base: number;
  /** The zoom on screen and the one it is gliding to; `em` is the stage's own em (`baseEm`) times the first */
  zoom: number; zoomTo: number; baseEm: number;
  /** The position it last came to rest on: that card gets its bigger picture */
  rested: number | null;
  nodes: CardNode[];
}

/** Where a card stands `rel` card steps from the front: its transform, how far it has sunk into the page (fog),
 *  its blur in half pixels, its depth order, and how much of it is left at the screen's edge (0: out of sight) */
function pose(e: Engine, rel: number) {
  const cardH = CARD_H * e.em, gap = cardH * Y_SPACING, radius = ORBIT * e.em;
  const fadeStart = e.h / 2 + cardH * EDGE_OFFSET, fadeLen = cardH * EDGE_SCALE, rest = CARD_W / FRONT_W;
  // The card facing the screen comes forward and grows; the ones either side of it stand a little further off
  const front = smooth(clamp(1 - Math.abs(rel), 0, 1)) * e.lift;
  const at = rel + SPREAD * clamp(rel, -1, 1) * e.lift;
  const y = at * gap;
  const edge = easeInOut(clamp((fadeStart - Math.abs(y)) / fadeLen, 0, 1));
  const deg = at * ANGLE, rad = (deg * Math.PI) / 180, cos = Math.cos(rad);
  const scale = edge * (rest + front * (FRONT_SCALE - rest));
  const transform = `translate3d(${(Math.sin(rad) * radius).toFixed(2)}px,${y.toFixed(2)}px,${((cos - 1) * radius).toFixed(2)}px) rotateY(${deg.toFixed(3)}deg) translateZ(${(front * FRONT_PUSH * e.em).toFixed(2)}px) scale(${scale.toFixed(4)})`;
  const back = (1 - cos) / 2;
  const fog = Math.min(0.9, back * BACK_FOG + (1 - front) * SIDE_FOG);
  // (with the board done the whole tornado is out of focus as one picture, in CSS: no card needs its own)
  const blur = e.done ? 0 : Math.round(((1 - front) * NEAR_BLUR + back * BACK_BLUR) * e.em * 2) / 2;
  const z = Math.round((cos + 1) * 500 + front * 100);
  return { transform, fog, blur, z, edge };
}

/** One frame: every mounted card to its place on the orbit */
export function paint(e: Engine, dt: number) {
  const decay = Math.exp(-dt / CLOSE_MS);
  for (const nd of e.nodes) {
    if (nd.off) {
      nd.off *= decay;
      if (Math.abs(nd.off) < 0.002) nd.off = 0;
    }
    const rel = nd.k - e.p + nd.off;
    nd.rel = rel;
    const p = pose(e, rel);
    if (p.edge < 0.001) {
      if (nd.shown) { nd.el.style.visibility = "hidden"; nd.shown = false; }
      continue;
    }
    if (!nd.shown) { nd.el.style.visibility = ""; nd.shown = true; }
    nd.el.style.transform = p.transform;
    nd.fog.style.opacity = p.fog.toFixed(3);
    // Blur in half pixels: the card is only drawn again when it crosses a step
    if (p.blur !== nd.blur) { nd.blur = p.blur; nd.el.style.filter = p.blur ? `blur(${p.blur}px)` : ""; }
    if (p.z !== nd.z) { nd.z = p.z; nd.el.style.zIndex = String(p.z); }
  }
}

export function settleFromBoard(e: Engine, stage: HTMLElement, shots: Map<string, Shot>) {
  const sr = stage.getBoundingClientRect(), cx = sr.left + sr.width / 2, cy = sr.top + sr.height * 0.46, cardW = FRONT_W * e.em;
  // Nearest the front first: with few references the orbit shows each card more than once, and the board's card
  // flies to the copy at the front, not to the first one found (the one furthest back, high up the orbit)
  const reads = e.nodes.map((nd) => ({ nd, w: nd.el.offsetWidth, h: nd.el.offsetHeight })).sort((a, b) => Math.abs(a.nd.k - e.p) - Math.abs(b.nd.k - e.p));
  /** The pose, flat and facing the screen, that covers a box of the board exactly */
  const flat = (shot: Shot, w: number, h: number) => `translate3d(${(shot.x + shot.w / 2 - cx).toFixed(2)}px,${(shot.y + shot.h / 2 - cy).toFixed(2)}px,0px) rotateY(0deg) translateZ(0px) scale(${(shot.w / w).toFixed(4)}, ${(shot.h / h).toFixed(4)})`;
  const timing = (rel: number): KeyframeAnimationOptions => ({ duration: MORPH_MS, delay: Math.min(Math.abs(rel), 6) * MORPH_STEP_MS, easing: EASE_WIND, fill: "backwards" });
  // Depth comes to every card at once, on the flight's own clock, whatever its own delay: the tornado's blur and fog
  // settle over all of them together as they land (left for after the landing, they read as a second change). The
  // cards the board was not showing come in over the first half, all together too (each on its own clock, the far
  // ones read as late, as if something had failed)
  const look: KeyframeAnimationOptions = { duration: MORPH_MS, easing: EASE_WIND, fill: "backwards" };
  const rise: KeyframeAnimationOptions = { duration: MORPH_MS * 0.5, easing: EASE_OUT, fill: "backwards" };
  const used = new Set<string>();
  // The wind, on the flight's clock: from the front card's start to the last one's landing
  gust(MORPH_MS + 6 * MORPH_STEP_MS);
  for (const { nd, w, h } of reads) {
    const key = nd.key.slice(0, nd.key.lastIndexOf("#")), rel = nd.k - e.p, end = pose(e, rel);
    const shot = used.has(key) ? undefined : shots.get(key);
    if (shot && w && h) {
      used.add(key);
      const box = nd.el.querySelector<HTMLElement>(".polish__in");
      if (box) coverWhileFlying(box, shot, MORPH_MS + Math.min(Math.abs(rel), 6) * MORPH_STEP_MS);
      nd.el.animate([{ transform: flat(shot, w, h) }, { transform: end.transform }], timing(rel));
    } else if (nd.shown) {
      const from = pose(e, rel + Math.sign(rel || 1) * MORPH_ROUND);
      nd.el.animate([{ transform: from.transform }, { transform: end.transform }], timing(rel));
      nd.el.animate([{ opacity: 0 }, { opacity: 1 }], rise);
    } else continue;
    nd.el.animate([{ filter: "blur(0px)" }, { filter: `blur(${end.blur}px)` }], look);
    nd.fog.animate([{ opacity: 0 }, { opacity: end.fog }], look);
  }
  // The board's other cards: the undecided have a place round the orbit out of sight, the decided none; either way
  // a copy fades where it stood, drawing in a little (copies flying off to their place read as cards shooting away)
  const ghosts: HTMLElement[] = [];
  for (const [key, shot] of shots) {
    if (used.has(key)) continue;
    const g = document.createElement("div");
    g.className = "polish__card polish__ghost";
    g.setAttribute("aria-hidden", "true");
    g.style.aspectRatio = `${shot.w} / ${shot.h}`;
    const sheet = document.createElement("i");
    sheet.className = "polish__ghost-in";
    if (shot.image) sheet.style.backgroundImage = `url("${shot.image.replace(/"/g, "%22")}")`;
    g.append(sheet);
    ghosts.push(g);
    const start = flat(shot, cardW, (cardW * shot.h) / shot.w);
    const a = g.animate([{ transform: start, opacity: 1 }, { transform: `${start} scale(0.94)`, opacity: 0 }], { duration: GHOST_MS, easing: EASE_OUT, fill: "forwards" });
    const gone = () => g.remove();
    void a.finished.then(gone, gone);
  }
  stage.append(...ghosts);
}
