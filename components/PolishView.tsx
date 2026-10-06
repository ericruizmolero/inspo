"use client";
// Polish: the step between a project's board and its system. What is still undecided on the board turns as a
// tornado of cards (the maths of Osmo Supply's "3D cards tornado", run on requestAnimationFrame: GSAP is not in the
// project), and the card facing the screen is the one that can be decided: it takes more room than the rest.
// It is a slider, by hand always: the scroll, a drag or a decision move it, and it rests on a card. Every time the
// view opens a different card, picked at random, is the one in front.
// Keep leaves the card on the board; Forget takes it out of the project and back to the Inbox (never deleted).
// Either way the card leaves the tornado and is seen flying to where it goes: the Board tab of the top bar or the
// Inbox tab of the island, which takes it with a small bump. With nothing left to decide, the board that was kept
// turns behind the step to the system.
// Only the cards near the screen are mounted, so a board of hundreds costs the same as one of thirty. What was
// kept is remembered in the browser, per project, so coming back only asks about what is new.
// It zooms as the board does (the same pill in the same corner, a pinch or ctrl/⌘ + wheel): out to see more of the
// tornado at once, in to look at the card closer. The zoom is the size of the tornado's em, so it scales as one piece.
// The pill holds the app's optional music too (components/SoundControl.tsx), as everywhere else.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import type { InspoItem, Project } from "@/types/inspo";
import { keyOf } from "@/lib/board";
import { mediaKindOf, videoEmbedOf } from "@/lib/url";
import { Button } from "@/components/ui/button";
import { cachedCardImage } from "./InspoCard";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import SoundControl from "./SoundControl";
import ZoomPill from "./ZoomPill";
import "./PolishView.css";

// The tornado, in Osmo's own terms
const ANGLE = 30; // degrees between one card and the next
const Y_SPACING = 0.3; // how far down the next card sits, in card heights
const EDGE_OFFSET = 2; // card heights past the screen's edge before a card starts to shrink
const EDGE_SCALE = 0.5; // card heights it takes to shrink to nothing
const ORBIT = 35; // radius of the orbit, in em
const AUTO_SPEED = 0.00325; // cards per frame it turns at on its own
const SCROLL_EASE = 0.1; // how fast it picks its own speed up again
const BACK_FOG = 0.5; // how far the cards at the back sink into the page: nearly all the way
const BACK_BLUR = 0.6; // em of blur at the very back
const CARD_H = 15; // em: the nominal card the spacing is counted in (Osmo's is 22.5 tall; a board is mostly sites, 16:10)
// Ours: the card facing the screen takes more room, and its neighbours step aside
const CARD_W = 18; // em: a card's width on the orbit
const FRONT_W = 30; // em: its width facing the screen. Cards are laid out at this width (.polish__card) and drawn smaller on the orbit, so the one in front is sharp
const FRONT_PUSH = 6; // em it comes towards the eye
const FRONT_SCALE = 1 - FRONT_PUSH / 75; // what undoes the perspective's own enlargement (the stage's is 75em)
const SPREAD = 0.5; // card steps its neighbours move away
const SIDE_FOG = 0.46; // the others, well into the page: with the blur, what says which card is being decided
const NEAR_BLUR = 0.42; // em of blur on the nearest of the others: only the card in front is in focus, and the rest read as out of it at a glance
// How it stops and goes
const GLIDE_MS = 150; // time constant of the glide to a card
const CLOSE_MS = 130; // and of the gap closing when a card leaves the board
const THROW_FRAMES = 10; // a released drag lands where its speed would take it in this many frames
const WHEEL_STEP = 1.4; // card gaps of scroll per card
const DRAG_SLOP = 6; // px before a press is a drag
const SETTLE_MS = 140; // this long without a scroll, it rests on the nearest card
const FLY_MS = 640;
const LAND = 0.8; // the part of the flight after which the card is on its tab: the tab bumps, and a forgotten card is taken out of the project then, so the Inbox counts it as it arrives
// The zoom: how big the tornado's em is drawn, 1 being its own size
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STOPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5]; // where the buttons stop; a pinch stops anywhere
const ZOOM_MS = 110; // time constant of the glide from one size to another
const PINCH_GAIN = 0.01; // how much a pixel of pinch (or of ctrl + wheel) zooms
const PINCH_MAX = 24; // and the most one event counts for: a mouse wheel's notch is a step, not a jump
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_FLY = "cubic-bezier(0.55, 0, 0.25, 1)";
/** Where a decided card lands: the tab that stands for the place it goes to */
const LANDING = { inbox: '.island a[href*="in=inbox"]', board: '.topbar__modes [role="tab"]' } as const;

/** The card each project's view last opened on, so the next time it opens on another */
const lastFront = new Map<string, string>();
const KEPT_KEY = (projectId: string) => `inspo:polish-kept:${projectId}`;
const ZOOM_KEY = "inspo:polish-zoom";

const mod = (a: number, n: number) => ((a % n) + n) % n;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2); // power2.inOut
const smooth = (x: number) => x * x * (3 - 2 * x);
/** The position nearest to `p` where the card at `index` of a board of `n` sits */
const nearest = (index: number, p: number, n: number) => index + n * Math.round((p - index) / n);
const stillMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pctOf = (zoom: number) => Math.round(zoom * 100);
/** The zoom kept from the last visit, the same for every project */
function keptZoom(): number {
  try {
    const z = Number(localStorage.getItem(ZOOM_KEY));
    if (z >= ZOOM_MIN && z <= ZOOM_MAX) return z;
  } catch { /* no storage */ }
  return 1;
}

interface CardNode { el: HTMLElement; fog: HTMLElement; key: string; k: number; off: number; rel: number; z: number; blur: number; shown: boolean }
interface Engine {
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

/** One frame: every mounted card to its place on the orbit */
function paint(e: Engine, dt: number) {
  const cardH = CARD_H * e.em, gap = cardH * Y_SPACING, radius = ORBIT * e.em;
  const fadeStart = e.h / 2 + cardH * EDGE_OFFSET, fadeLen = cardH * EDGE_SCALE;
  const decay = Math.exp(-dt / CLOSE_MS), rest = CARD_W / FRONT_W;
  for (const nd of e.nodes) {
    if (nd.off) {
      nd.off *= decay;
      if (Math.abs(nd.off) < 0.002) nd.off = 0;
    }
    const rel = nd.k - e.p + nd.off;
    nd.rel = rel;
    // The card facing the screen comes forward and grows; the ones either side of it stand a little further off
    const front = smooth(clamp(1 - Math.abs(rel), 0, 1)) * e.lift;
    const at = rel + SPREAD * clamp(rel, -1, 1) * e.lift;
    const y = at * gap;
    const edge = easeInOut(clamp((fadeStart - Math.abs(y)) / fadeLen, 0, 1));
    if (edge < 0.001) {
      if (nd.shown) { nd.el.style.visibility = "hidden"; nd.shown = false; }
      continue;
    }
    if (!nd.shown) { nd.el.style.visibility = ""; nd.shown = true; }
    const deg = at * ANGLE, rad = (deg * Math.PI) / 180, cos = Math.cos(rad);
    const scale = edge * (rest + front * (FRONT_SCALE - rest));
    nd.el.style.transform = `translate3d(${(Math.sin(rad) * radius).toFixed(2)}px,${y.toFixed(2)}px,${((cos - 1) * radius).toFixed(2)}px) rotateY(${deg.toFixed(3)}deg) translateZ(${(front * FRONT_PUSH * e.em).toFixed(2)}px) scale(${scale.toFixed(4)})`;
    const back = (1 - cos) / 2;
    nd.fog.style.opacity = Math.min(0.9, back * BACK_FOG + (1 - front) * SIDE_FOG).toFixed(3);
    // Blur in half pixels: the card is only drawn again when it crosses a step
    // (with the board done the whole tornado is out of focus as one picture, in CSS: no card needs its own)
    const blur = e.done ? 0 : Math.round(((1 - front) * NEAR_BLUR + back * BACK_BLUR) * e.em * 2) / 2;
    if (blur !== nd.blur) { nd.blur = blur; nd.el.style.filter = blur ? `blur(${blur}px)` : ""; }
    const zi = Math.round((cos + 1) * 500 + front * 100);
    if (zi !== nd.z) { nd.z = zi; nd.el.style.zIndex = String(zi); }
  }
}

/** The reference's picture, with the fallbacks a small thumbnail has (components/Thumb.tsx), or its initial */
function Picture({ item, image, large }: { item: InspoItem; image: string | null; /** A bigger copy, laid over it once it loads (the card in front) */ large?: string | null }) {
  const [at, setAt] = useState(0);
  const [noLarge, setNoLarge] = useState(false);
  const embed = mediaKindOf(item.web) === "video" ? videoEmbedOf(item.web) : null;
  const srcs = [image, embed?.poster, cachedCardImage(item.web), `/api/og?url=${encodeURIComponent(item.web)}`].filter((x): x is string => !!x);
  const src = srcs[at];
  if (!src) return <span className="polish__initial" aria-hidden>{item.name.slice(0, 1).toUpperCase()}</span>;
  return (
    <>
      <img key={src} src={src} alt="" draggable={false} decoding="async" onError={() => setAt((i) => i + 1)} />
      {large && large !== src && !noLarge && <img key={large} className="polish__hi" src={large} alt="" draggable={false} decoding="async" onError={() => setNoLarge(true)} />}
    </>
  );
}

type Flight = { id: number; item: InspoItem; to: keyof typeof LANDING; x: number; y: number; w: number; h: number };

/** A decided card on its way: a copy of it, from where it stood to the tab of the place it goes to (the board for
 *  one kept, the Inbox for one forgotten), which takes it with a small bump. The card itself has already left the tornado */
function Flyer({ flight, image, text, onGone }: { flight: Flight; image: string | null; text: string; onGone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let anim: Animation;
    if (stillMotion()) anim = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
    else {
      // Where the tab is not on screen (the island on a phone), to the corner the menu opens from
      const tab = document.querySelector<HTMLElement>(LANDING[flight.to]);
      const to = tab && tab.offsetParent ? tab.getBoundingClientRect() : null;
      const r = el.getBoundingClientRect();
      const dx = (to ? to.left + to.width / 2 : 32) - (r.left + r.width / 2), dy = (to ? to.top + to.height / 2 : 28) - (r.top + r.height / 2);
      const landed = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${flight.to === "inbox" ? -8 : 8}deg) scale(${Math.max(0.03, 28 / r.width).toFixed(3)})`;
      anim = el.animate([
        { transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)", opacity: 1 },
        { transform: landed, opacity: 1, offset: 0.9 },
        { transform: landed, opacity: 0 },
      ], { duration: FLY_MS, easing: EASE_FLY, fill: "forwards" });
      if (to && tab) window.setTimeout(() => tab.animate([{ transform: "scale(1)" }, { transform: "scale(1.16)" }, { transform: "scale(1)" }], { duration: 380, easing: EASE_OUT }), FLY_MS * LAND);
    }
    void anim.finished.then(onGone, onGone);
    // Once, when it mounts: it only exists to leave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className="polish__fly" aria-hidden style={{ left: flight.x, top: flight.y, width: flight.w, height: flight.h }}>
      {mediaKindOf(flight.item.web) === "text" ? <div className="polish__text"><b>{flight.item.name}</b><p>{text}</p></div> : <Picture item={flight.item} image={image} />}
    </div>
  );
}

type Step = { kind: "keep" | "forget"; item: InspoItem };

export default function PolishView({ project, items, imageOf, largeImageOf, ratioOf, textOf, active, onForget, onRestore, onOpenItem, onBoard, onSystem }: {
  project: Project;
  /** The project's board, in the board's order */
  items: InspoItem[];
  /** A small picture (every card) and the largest one stored (laid over the cards nearest the front) */
  imageOf: (item: InspoItem) => string | null;
  largeImageOf: (item: InspoItem) => string | null;
  /** Height / width of what the card shows */
  ratioOf: (item: InspoItem) => number;
  /** The first lines of a text reference */
  textOf: (item: InspoItem) => string;
  /** False while a sheet is open over the view: the keys rest */
  active: boolean;
  /** Out of the project, back to the Inbox */
  onForget: (item: InspoItem) => void | Promise<void>;
  /** A forgotten reference, back on the board (undo) */
  onRestore: (item: InspoItem) => void | Promise<void>;
  onOpenItem: (item: InspoItem) => void;
  onBoard: () => void;
  onSystem: () => void | Promise<void>;
}) {
  const { t } = useT();
  const s = t.polish;
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const forgetRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const eng = useRef<Engine>({ p: 0, v: AUTO_SPEED, target: 0, dir: 1, dragging: false, scrolled: 0, lift: 1, done: false, still: false, em: 14, h: 800, base: 0, zoom: 1, zoomTo: 1, baseEm: 14, rested: null, nodes: [] });
  /** The position facing the screen, and how many cards are mounted either side of it */
  const [base, setBase] = useState(0);
  const [side, setSide] = useState(16);
  /** The zoom asked for, in hundredths: what the pill says */
  const [zoom, setZoom] = useState(keptZoom);
  /** The position the tornado is resting on, if it is: only that card loads its bigger picture, never one going by */
  const [rested, setRested] = useState<number | null>(null);
  const [kept, setKept] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState(false);
  /** The decided cards on their way to their tab, for as long as the flight takes */
  const [flights, setFlights] = useState<Flight[]>([]);
  /** Forgotten, and still in the air: already out of the tornado, not yet out of the project */
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const outbox = useRef(new Map<string, { item: InspoItem; timer: number }>());
  const [history, setHistory] = useState<Step[]>([]);
  const [forgot, setForgot] = useState(0);
  const [busy, setBusy] = useState(false);
  const flightId = useRef(0);
  const prevKeys = useRef<string[] | null>(null);
  /** After the tornado's cards change: the card to bring to the front (one taken back) */
  const focusKey = useRef<string | null>(null);

  const staying = leaving.size ? items.filter((i) => !leaving.has(keyOf(i))) : items;
  const pending = staying.filter((i) => !kept.has(keyOf(i)));
  const done = loaded && staying.length > 0 && pending.length === 0;
  // What turns: the cards still to decide. With none left, the board that was kept
  const list = done ? staying : pending;
  const ln = list.length;
  const current = ln ? list[mod(base, ln)] : null;

  const glideTo = (k: number) => {
    const e = eng.current;
    e.target = k; e.v = 0;
    if (e.still) e.p = k;
  };
  /** The card a decision is about: the one it is stopping on, or the one facing the screen */
  const frontAt = () => Math.round(eng.current.target ?? eng.current.p);
  const saveKept = (next: Set<string>) => {
    setKept(next);
    try { localStorage.setItem(KEPT_KEY(project.id), JSON.stringify([...next])); } catch { /* no storage */ }
  };
  const press = (el: HTMLElement | null) => el?.animate([{ transform: "scale(0.96)" }, { transform: "scale(1)" }], { duration: 220, easing: EASE_OUT });

  // What was kept last time, read before the first paint: only what is still undecided turns
  useLayoutEffect(() => {
    let stored: string[] = [];
    try { const raw = JSON.parse(localStorage.getItem(KEPT_KEY(project.id)) ?? "[]"); if (Array.isArray(raw)) stored = raw.filter((x): x is string => typeof x === "string"); } catch { /* no storage */ }
    const here = new Set(items.map(keyOf));
    const was = new Set(stored.filter((k) => here.has(k)));
    setKept(was);
    setLoaded(true);
    const e = eng.current;
    e.still = stillMotion();
    // A different card in front every time the view opens: one of the undecided, at random, never the last one's
    const open = items.filter((i) => !was.has(keyOf(i))).map(keyOf);
    let at = Math.floor(Math.random() * open.length);
    if (open.length > 1 && open[at] === lastFront.get(project.id)) at = (at + 1) % open.length;
    if (open.length) lastFront.set(project.id, open[at]);
    e.v = 0;
    e.p = e.target = e.base = at;
    setBase(at);
    // Only when the project opens: the cards changing later is the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  // The tornado's cards changed (one decided and gone, one taken back, the board itself): the card facing the screen
  // stays there, or hands over to the next one still here, and the others close the gap from where they were drawn
  useLayoutEffect(() => {
    if (!loaded) return;
    const e = eng.current, prev = prevKeys.current, keys = list.map(keyOf);
    if (prev && prev.length === keys.length && prev.every((k, i) => k === keys[i])) return;
    prevKeys.current = keys;
    if (!prev) return;
    if (!prev.length || !keys.length) {
      focusKey.current = null;
      e.p = 0; e.target = e.done ? null : 0;
      if (e.base !== 0) { e.base = 0; setBase(0); }
      return;
    }
    const pn = prev.length, at = Math.round(e.p), from = mod(at, pn);
    const where = new Map(keys.map((k, x) => [k, x] as const));
    let to = 0, laps = Math.floor(at / pn), same = false;
    for (let i = 0; i < pn; i++) {
      const x = where.get(prev[(from + i) % pn]);
      if (x === undefined) continue;
      to = x; same = i === 0; if (from + i >= pn) laps += 1;
      break;
    }
    const p = laps * keys.length + to + (same ? e.p - at : 0);
    e.p = p;
    const front = Math.round(p);
    const back = focusKey.current ? where.get(focusKey.current) : undefined;
    focusKey.current = null;
    if (back !== undefined) e.target = nearest(back, p, keys.length);
    else if (!e.done) e.target = front;
    if (e.still && e.target !== null) e.p = e.target;
    if (front !== e.base) { e.base = front; setBase(front); }
  });

  // After every render: which cards are mounted, each gliding from where it was last drawn
  useLayoutEffect(() => {
    const e = eng.current, stage = stageRef.current;
    if (!stage) return;
    const before = new Map(e.nodes.map((nd) => [nd.key, nd] as const));
    e.nodes = Array.from(stage.querySelectorAll<HTMLElement>("[data-k]"), (el) => {
      const key = el.dataset.node ?? "", k = Number(el.dataset.k), old = before.get(key);
      let off = old ? old.rel - (k - e.p) : 0;
      if (e.still || Math.abs(off) < 0.002 || Math.abs(off) > 4) off = 0;
      const same = !!old && old.el === el;
      return { el, fog: el.querySelector<HTMLElement>(".polish__fog") ?? el, key, k, off, rel: k - e.p + off, z: same ? old.z : -1, blur: same ? old.blur : -1, shown: same ? old.shown : true };
    });
    paint(e, 0);
  });

  // The size of things: the em the cards are drawn in, and how many fit either side of the screen
  /** How many cards to mount: as many as fit at the smaller of the zoom on screen and the one it is gliding to */
  const fit = useCallback(() => {
    const e = eng.current, cardH = CARD_H * e.baseEm * Math.min(e.zoom, e.zoomTo);
    setSide(Math.ceil((e.h / 2 + cardH * (EDGE_OFFSET + EDGE_SCALE)) / (cardH * Y_SPACING)) + 1);
  }, []);
  useLayoutEffect(() => {
    const stage = stageRef.current, sky = stage?.parentElement;
    if (!stage || !sky) return;
    const e = eng.current;
    e.zoom = e.zoomTo = keptZoom();
    stage.style.setProperty("--polish-zoom", String(e.zoom));
    const measure = () => {
      // The sky has the em before the zoom (CSS), the stage the one after
      e.baseEm = parseFloat(getComputedStyle(sky).fontSize) || 14;
      e.em = e.baseEm * e.zoom;
      e.h = stage.clientHeight || 800;
      fit();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [fit]);
  /** Sends the tornado to another size: the loop takes it there */
  const zoomTo = useCallback((z: number) => {
    const e = eng.current, next = clamp(z, ZOOM_MIN, ZOOM_MAX);
    if (next === e.zoomTo) return;
    e.zoomTo = next;
    fit();
    const kept = pctOf(next) / 100;
    setZoom(kept);
    try { localStorage.setItem(ZOOM_KEY, String(kept)); } catch { /* no storage */ }
  }, [fit]);

  // The loop. It glides to the card it is sent to; a moment after the last
  // scroll it rests on the nearest one; and with everything decided it turns on its own
  useEffect(() => {
    const e = eng.current;
    let raf = 0, last = performance.now();
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(48, t - last), f = dt / 16.67;
      last = t;
      if (e.dragging) { /* the hand moves it */ }
      else if (e.target !== null) {
        const d = e.target - e.p;
        if (Math.abs(d) < 0.0008) {
          e.p = e.target;
          if (e.rested !== e.target) { e.rested = e.target; setRested(e.target); }
        } else e.p += d * (e.still ? 1 : 1 - Math.exp(-dt / GLIDE_MS));
      } else if (e.done) {
        e.v += (AUTO_SPEED * e.dir - e.v) * (1 - (1 - SCROLL_EASE) ** f);
        e.p += e.v * f;
      } else if (t - e.scrolled > SETTLE_MS) e.target = Math.round(e.p);
      if (e.zoom !== e.zoomTo) {
        const dz = e.zoomTo - e.zoom;
        e.zoom = e.still || Math.abs(dz) < 0.002 ? e.zoomTo : e.zoom + dz * (1 - Math.exp(-dt / ZOOM_MS));
        e.em = e.baseEm * e.zoom;
        stageRef.current?.style.setProperty("--polish-zoom", e.zoom.toFixed(4));
        // There: what no longer fits either side of the screen can go
        if (e.zoom === e.zoomTo) fit();
      }
      const lift = e.done ? 0 : 1;
      if (e.lift !== lift) e.lift = e.still || Math.abs(lift - e.lift) < 0.004 ? lift : e.lift + (lift - e.lift) * (1 - Math.exp(-dt / 220));
      const front = Math.round(e.p);
      if (front !== e.base) { e.base = front; setBase(front); }
      paint(e, dt);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fit]);

  // Leaving the view with a card still in the air: its decision is not lost
  const onForgetRef = useRef(onForget);
  useEffect(() => { onForgetRef.current = onForget; });
  useEffect(() => {
    const waiting = outbox.current;
    return () => { for (const { item, timer } of waiting.values()) { window.clearTimeout(timer); void onForgetRef.current(item); } waiting.clear(); };
  }, []);

  // With everything decided nothing holds it: it turns behind the words
  useEffect(() => {
    const e = eng.current;
    e.done = done;
    if (done && !e.still) { e.target = null; e.v = 0; }
  }, [done]);

  // Scroll walks the board. Native, to be able to keep the page (and the browser's back swipe) still
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const e = eng.current;
      // A pinch on the trackpad, or ctrl/⌘ + wheel, zooms the tornado instead of the page, as on the board:
      // pinching in is further away
      if (ev.ctrlKey || ev.metaKey) {
        if (!e.done) zoomTo(e.zoomTo * Math.exp(-clamp(ev.deltaY * (ev.deltaMode === 1 ? 32 : 1), -PINCH_MAX, PINCH_MAX) * PINCH_GAIN));
        return;
      }
      const d = (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY) * (ev.deltaMode === 1 ? 32 : 1);
      if (!d) return;
      e.dir = d > 0 ? 1 : -1;
      e.p += d / (CARD_H * e.em * Y_SPACING * WHEEL_STEP);
      e.v = 0; e.target = null; e.scrolled = performance.now();
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  // ─── Deciding ───────────────────────────────────────────────────────────────
  /** The card leaves the tornado at once; a copy of it, from where it stands, is what is seen flying to its tab */
  const send = (at: number, item: InspoItem, to: Flight["to"]) => {
    const el = eng.current.nodes.find((nd) => nd.k === at)?.el, root = rootRef.current;
    if (!el || !root) return;
    const r = el.getBoundingClientRect(), o = root.getBoundingClientRect();
    setFlights((all) => [...all, { id: ++flightId.current, item, to, x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height }]);
  };
  const keep = () => {
    if (!current || done) return;
    const at = frontAt(), item = list[mod(at, ln)];
    send(at, item, "board");
    const next = new Set(kept);
    next.add(keyOf(item));
    saveKept(next);
    setHistory((h) => [...h, { kind: "keep", item }]);
    press(keepRef.current);
  };
  const forget = () => {
    if (!current || done) return;
    const at = frontAt(), item = list[mod(at, ln)];
    send(at, item, "inbox");
    setHistory((h) => [...h, { kind: "forget", item }]);
    setForgot((c) => c + 1);
    press(forgetRef.current);
    // Out of the tornado now; out of the project when it lands on the Inbox tab, so the Inbox counts it as it arrives
    const key = keyOf(item);
    setLeaving((all) => new Set(all).add(key));
    const timer = window.setTimeout(() => {
      outbox.current.delete(key);
      void Promise.resolve(onForget(item)).finally(() => landed(key));
    }, eng.current.still ? 0 : FLY_MS * LAND);
    outbox.current.set(key, { item, timer });
  };
  /** The flight is over, whatever came of it: saved, the card is off the board; refused, it is back in the tornado */
  const landed = (key: string) => setLeaving((all) => { const next = new Set(all); next.delete(key); return next; });
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    const key = keyOf(last.item);
    // It comes back to the tornado, and to the front
    focusKey.current = key;
    if (last.kind === "keep") {
      const next = new Set(kept);
      next.delete(key);
      saveKept(next);
    } else {
      setForgot((c) => Math.max(0, c - 1));
      // Still in the air: it never left the project
      const flying = outbox.current.get(key);
      if (flying) { window.clearTimeout(flying.timer); outbox.current.delete(key); landed(key); }
      else void onRestore(last.item);
    }
  };
  const again = () => {
    saveKept(new Set());
    setHistory([]);
  };
  const open = () => { if (ln && !done) onOpenItem(list[mod(frontAt(), ln)]); };
  const toSystem = async () => {
    if (busy) return;
    setBusy(true);
    try { await onSystem(); } finally { setBusy(false); }
  };

  // The keys: ← forgets, → keeps, Enter opens the card, ⌘Z takes the last one back. Never inside a field or under a dialog
  const acts = useRef({ keep, forget, undo, open });
  useEffect(() => { acts.current = { keep, forget, undo, open }; });
  useEffect(() => {
    if (!active) return;
    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target;
      if (ev.defaultPrevented || ev.altKey) return;
      if (el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      // A focused button or link keeps its own Enter
      if (ev.key === "Enter" && el instanceof HTMLElement && el.closest("button, a")) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')) return;
      if ((ev.metaKey || ev.ctrlKey) && !ev.shiftKey && ev.key.toLowerCase() === "z") { ev.preventDefault(); acts.current.undo(); return; }
      if (ev.metaKey || ev.ctrlKey || ev.repeat) return;
      if (ev.key === "ArrowLeft") { ev.preventDefault(); acts.current.forget(); }
      else if (ev.key === "ArrowRight") { ev.preventDefault(); acts.current.keep(); }
      else if (ev.key === "Enter") { ev.preventDefault(); acts.current.open(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  // ─── The pointer: pressed on the tornado it drags it; a click brings a card to the front, or opens the one in front
  const drag = useRef<{ id: number; x: number; y: number; lastX: number; lastY: number; lastT: number; axis: "x" | "y" | null; k: number | null } | null>(null);
  const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (ev.button !== 0) return;
    const card = (ev.target as HTMLElement).closest<HTMLElement>("[data-k]");
    drag.current = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, lastX: ev.clientX, lastY: ev.clientY, lastT: ev.timeStamp, axis: null, k: card ? Number(card.dataset.k) : null };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };
  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current, e = eng.current;
    if (!d || d.id !== ev.pointerId) return;
    if (!d.axis) {
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (Math.hypot(dx, dy) < DRAG_SLOP) return;
      // One axis per drag, the one it started along
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      e.dragging = true; e.target = null; e.v = 0;
      ev.currentTarget.classList.add("is-grabbing");
    }
    // The card under the hand follows it: down the tornado's height, or round its orbit
    const gap = CARD_H * e.em * Y_SPACING, turn = ORBIT * e.em * Math.sin((ANGLE * Math.PI) / 180);
    const dp = d.axis === "y" ? -(ev.clientY - d.lastY) / gap : -(ev.clientX - d.lastX) / turn;
    e.p += dp;
    e.v = e.v * 0.6 + ((dp / Math.max(1, ev.timeStamp - d.lastT)) * 16.67) * 0.4;
    d.lastX = ev.clientX; d.lastY = ev.clientY; d.lastT = ev.timeStamp;
  };
  const onPointerUp = (ev: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current, e = eng.current;
    if (!d || d.id !== ev.pointerId) return;
    drag.current = null;
    ev.currentTarget.classList.remove("is-grabbing");
    if (d.axis) {
      e.dragging = false;
      if (ev.timeStamp - d.lastT > 80) e.v = 0; // held still before letting go: no throw
      if (Math.abs(e.v) > 0.001) e.dir = e.v > 0 ? 1 : -1;
      e.target = Math.round(e.p + e.v * THROW_FRAMES);
      e.v = 0;
      return;
    }
    if (ev.type !== "pointerup" || d.k === null || !ln || done) return;
    // A click: the card in front opens, any other comes to the front
    if (d.k === frontAt()) onOpenItem(list[mod(d.k, ln)]);
    else glideTo(d.k);
  };

  // ─── The cards of the tornado near the screen ───────────────────────────────
  const cards = [];
  if (ln) {
    for (let k = base - side; k <= base + side; k++) {
      const item = list[mod(k, ln)], node = `${keyOf(item)}#${Math.floor(k / ln)}`;
      const kind = mediaKindOf(item.web);
      const ratio = kind === "text" ? 1 : clamp(ratioOf(item), 0.5, 1.2);
      cards.push(
        <div key={node} className="polish__card" data-k={k} data-node={node} style={{ aspectRatio: `1 / ${ratio}` }}>
          <div className="polish__in">
            {kind === "text" ? <div className="polish__text"><b>{item.name}</b><p>{textOf(item)}</p></div>
              : <Picture item={item} image={imageOf(item)} large={k === rested ? largeImageOf(item) : null} />}
            <i className="polish__fog" />
          </div>
        </div>,
      );
    }
  }

  // The finished board in small: up to five of what stays, pictures before texts
  const fan = done ? [...staying.filter((i) => mediaKindOf(i.web) !== "text"), ...staying.filter((i) => mediaKindOf(i.web) === "text")].slice(0, 5) : [];

  return (
    <section ref={rootRef} className={`polish${done ? " is-done" : ""}`} aria-label={s.mode}>
      <div className="polish__sky" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div ref={stageRef} className="polish__stage">{cards}</div>
      </div>
      <div className="polish__veil" aria-hidden />
      {flights.map((f) => (
        <Flyer key={f.id} flight={f} image={imageOf(f.item)} text={textOf(f.item)} onGone={() => setFlights((all) => all.filter((x) => x.id !== f.id))} />
      ))}

      {current && !done && loaded && (
        <div className="polish__bar">
          <p className="polish__now" role="status" aria-live="polite">
            <b>{current.name}</b>
            <span>{s.left(pending.length)}</span>
          </p>
          <div className="polish__choice">
            <button ref={forgetRef} type="button" className="polish__btn" onClick={forget}>
              <i className="polish__key" aria-hidden>{Icons.arrow}</i>
              <span className="polish__btn-text"><b>{s.forget}</b><small>{s.forgetSub}</small></span>
            </button>
            <span className="polish__sep" aria-hidden />
            <button ref={keepRef} type="button" className="polish__btn polish__btn--keep" onClick={keep}>
              <i className="polish__key" aria-hidden>{Icons.arrow}</i>
              <span className="polish__btn-text"><b>{s.keep}</b><small>{s.keepSub}</small></span>
            </button>
            <button type="button" className="polish__undo" onClick={undo} disabled={history.length === 0} aria-label={s.undo} title={s.undo}><Undo2 size={16} strokeWidth={1.5} aria-hidden /></button>
          </div>
        </div>
      )}

      {done && (
        <div className="polish__done">
          {/* What stays, tidied: a few of the kept references falling into a neat fan */}
          <div className="polish__fan" aria-hidden>
            {fan.map((item, i) => (
              <span key={keyOf(item)} className="polish__fan-card" style={{ "--i": i - (fan.length - 1) / 2, zIndex: 10 - Math.abs(i - (fan.length - 1) / 2) } as React.CSSProperties}>
                {mediaKindOf(item.web) === "text" ? <b className="polish__fan-text">{item.name}</b> : <Picture item={item} image={imageOf(item)} />}
              </span>
            ))}
          </div>
          <h2 className="display polish__done-title">{s.doneTitle}</h2>
          <p className="polish__done-line">{s.doneStay(staying.length)}{forgot > 0 ? ` ${s.doneOut(forgot)}` : ""}</p>
          <p className="polish__done-line polish__done-next">{s.doneNext}</p>
          <div className="polish__done-actions">
            <Button variant="primary" onClick={() => void toSystem()} disabled={busy}>{busy && <span className="spinner spinner--sm" />}{s.toSystem} {Icons.arrow}</Button>
            <Button onClick={again}>{s.again}</Button>
            {history.length > 0 && <Button onClick={undo}>{s.undo}</Button>}
          </div>
        </div>
      )}

      {staying.length === 0 && flights.length === 0 && (
        <div className="empty empty--over">
          <span className="display">{forgot > 0 ? s.allGoneTitle : s.emptyTitle}</span>
          <span>{forgot > 0 ? s.doneOut(forgot) : s.emptyLead}</span>
          <span className="polish__empty-actions">
            {history.length > 0 && <Button size="sm" onClick={undo}>{s.undo}</Button>}
            <Button size="sm" onClick={onBoard}>{s.toBoard}</Button>
          </span>
        </div>
      )}

      {/* The board's corner and its pill: the zoom where the board has it, and the music in the same piece */}
      <ZoomPill
        className="polish__corner"
        zoom={current && !done && loaded ? {
          pct: pctOf(zoom),
          canOut: zoom > ZOOM_MIN,
          canIn: zoom < ZOOM_MAX,
          onOut: () => zoomTo([...ZOOM_STOPS].reverse().find((z) => z < zoom - 0.005) ?? ZOOM_MIN),
          onIn: () => zoomTo(ZOOM_STOPS.find((z) => z > zoom + 0.005) ?? ZOOM_MAX),
          onReset: () => zoomTo(1),
        } : null}
      >
        <SoundControl />
      </ZoomPill>
    </section>
  );
}
