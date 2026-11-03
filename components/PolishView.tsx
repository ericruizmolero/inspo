"use client";
// Polish: the step between a project's board and its system. What is still undecided on the board turns as a
// tornado of cards (the maths of Osmo Supply's "3D cards tornado", run on requestAnimationFrame: GSAP is not in the
// project), and the card facing the screen is the one that can be decided: it takes more room than the rest.
// It is a slider, by hand always: the scroll, a drag or a decision move it, and it rests on a card. Every time the
// view opens a different card, picked at random, is the one in front.
// Alone in the workspace, Keep leaves the card on the board and Forget takes it out of the project and back to
// the Inbox (never deleted): the card leaves the tornado and is seen flying to where it goes, the Board tab of the
// top bar or the Inbox tab of the island, which takes it with a small bump.
// In a team it is a vote (lib/polish-votes.ts): each member says keep or forget, the card flies to the Polish tab
// and nothing leaves the board. With the whole board voted the view says what the votes add up to, lets the doubts
// (the references the team disagrees on) be gone through with everyone's vote in sight, and whoever manages the
// workspace closes the polish: what everyone forgot goes back to the Inbox then. What the others voted is only
// shown on a card this person has already voted.
// With nothing left to decide, the board that was kept turns behind the step to the system.
// Only the cards near the screen are mounted, so a board of hundreds costs the same as one of thirty. Votes are
// kept on the server, per person, so coming back only asks about what is new.
// It zooms as the board does (the same pill in the same corner, a pinch or ctrl/⌘ + wheel): out to see more of the
// tornado at once, in to look at the card closer. The zoom is the size of the tornado's em, so it scales as one piece.
// The pill holds the app's optional music too (components/SoundControl.tsx), as everywhere else.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Clouds from "@/components/Clouds";
import type { InspoItem, PolishChoice, PolishVote, Project } from "@/types/inspo";
import { finishedOf, openVotes, outcomeOf } from "@/lib/polish-tally";
import { fmtDate } from "@/lib/i18n/format";
import { keyOf } from "@/lib/board";
import { MORPH_MS, peekHandoff, takeHandoff } from "./view-morph";
import { mediaKindOf } from "@/lib/url";
import { Busy, Button, EmptyState, Icon, IconButton, Key } from "@/components/criterio";
import type { NoteCaption } from "./InspoCard";
import { AUTO_SPEED, ANGLE, CARD_H, EASE_OUT, EDGE_OFFSET, EDGE_SCALE, ORBIT, SCROLL_EASE, Y_SPACING, clamp, mod, nearest, paint, settleFromBoard, stillMotion, type Engine } from "./polish-tornado";
import { Face, Picture, postFromName, postHasMedia } from "./PolishFace";
import { usePost } from "./post-cache";
import Flyer, { FLY_MS, LAND, LANDING, bump, type Flight } from "./PolishFlyer";
import PersonAvatar from "./PersonAvatar";
import { useT } from "./I18nProvider";
import SoundControl from "./SoundControl";
import ZoomPill from "./ZoomPill";
import { cue } from "@/lib/ui-sounds";
import { TinoCorner, useLine } from "./HomeTino";
import ThemeToggle from "./ThemeToggle";
import type { TinoApi } from "./tino/engine";
import type { TinoMood } from "./tino/moods";
import "./PolishView.css";

// How it stops and goes
const GLIDE_MS = 150; // time constant of the glide to a card
const THROW_FRAMES = 10; // a released drag lands where its speed would take it in this many frames
const WHEEL_STEP = 1.4; // card gaps of scroll per card
const NO_FADE = { animation: "none" } as const, BAR_WAITS = { animationDelay: `${MORPH_MS * 0.5}ms` } as const;
const TICK_MS = 70; // the least between two ticks of the tornado turning under the hand: a fast spin is a purr, not a rattle
const DRAG_SLOP = 6; // px before a press is a drag
const SETTLE_MS = 140; // this long without a scroll, it rests on the nearest card
// The zoom: how big the tornado's em is drawn, 1 being its own size
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STOPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5]; // where the buttons stop; a pinch stops anywhere
const ZOOM_MS = 110; // time constant of the glide from one size to another
const PINCH_GAIN = 0.01; // how much a pixel of pinch (or of ctrl + wheel) zooms
const PINCH_MAX = 24; // and the most one event counts for: a mouse wheel's notch is a step, not a jump

/** The card each project's view last opened on, so the next time it opens on another */
const lastFront = new Map<string, string>();
const KEPT_KEY = (projectId: string) => `inspo:polish-kept:${projectId}`;
const ZOOM_KEY = "inspo:polish-zoom";

const pctOf = (zoom: number) => Math.round(zoom * 100);
/** The zoom kept from the last visit, the same for every project */
function keptZoom(): number {
  try {
    const z = Number(localStorage.getItem(ZOOM_KEY));
    if (z >= ZOOM_MIN && z <= ZOOM_MAX) return z;
  } catch { /* no storage */ }
  return 1;
}

/** One answer, to take back: `prev` is this person's vote before it (a doubt voted again); `ruled` is a doubt
 *  whoever closes decided, which is not a vote */
type Step = { kind: PolishChoice; item: InspoItem; prev?: PolishChoice | null; ruled?: boolean };

const NOTE_MAX = 280; // characters of a note that reach the page: two lines show, and a long one is read on its sheet
/** Cards this far from the one in front ask for their post; further round the orbit the name's words do */
const POST_NEAR = 3;
/** Tino after an answer: the line holds this long, and every third plain answer gets nothing (silence is his too) */
const REACT_MS = 1400;
const SILENT_EVERY = 3;
/** "Champ" once a week per person, at most */
const CHAMP_KEY = "criterio:tino-champ";
/** Where he looks over a button: towards Forget, towards Keep */
const LEAN_LEFT = 70, LEAN_RIGHT = 150;
const thisWeek = () => String(Math.floor(Date.now() / (7 * 864e5)));
/** An index into the list at random, never the one holding `not` when there is another */
function randomBut(list: string[], not: string | undefined): number {
  const at = Math.floor(Math.random() * list.length);
  return list.length > 1 && list[at] === not ? (at + 1) % list.length : at;
}

export default function PolishView({ project, items, imageOf, largeImageOf, ratioOf, textOf, noteOf, commentsOf, active, votes, me, myName, members, canClose, onVote, onClose, onRestore, onOpenItem, onBoard, onSystem }: {
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
  /** What was said about it, as under its tile on the board: the note of whoever saved it, else the first comment */
  noteOf: (item: InspoItem) => NoteCaption | null;
  /** How many comments it has: forgetting one with comments, Tino asks first */
  commentsOf: (item: InspoItem) => number;
  /** False while a sheet is open over the view: the keys rest */
  active: boolean;
  /** The project's votes by reference, everyone's, open and settled */
  votes: Map<string, PolishVote[]>;
  /** This person, and the workspace's members: more than one and Polish is a vote */
  me: string;
  /** This person's name, as references carry who saved them: forgetting one's own idea, Tino asks first */
  myName: string;
  members: { id: string; name: string; image: string | null }[];
  /** Whoever manages the workspace closes the polish and decides its doubts */
  canClose: boolean;
  /** This person's vote on these references, or none (taken back). Alone in the workspace a forgotten one leaves the board with it */
  onVote: (items: InspoItem[], vote: PolishChoice | null) => void | Promise<void>;
  /** Settles what was voted (`resolve`: the doubts decided). Resolves to how many left the board, null if it failed */
  onClose: (resolve: Record<string, PolishChoice>) => Promise<number | null>;
  /** A forgotten reference, back on the board (undo) */
  onRestore: (item: InspoItem) => void | Promise<void>;
  onOpenItem: (item: InspoItem) => void;
  onBoard: () => void;
  onSystem: () => void | Promise<void>;
}) {
  const { t, locale } = useT();
  const s = t.polish;
  const team = members.length > 1;
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
  /** In a team, with the board voted: going through the doubts, everyone's vote in sight */
  const [mode, setMode] = useState<"vote" | "doubt">("vote");
  /** The doubts whoever closes has decided, until the polish is closed */
  const [ruled, setRuled] = useState<Record<string, PolishChoice>>({});
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

  const myVote = (i: InspoItem) => (i.id ? votes.get(i.id)?.find((v) => v.userId === me)?.vote ?? null : null);
  const staying = leaving.size ? items.filter((i) => !leaving.has(keyOf(i))) : items;
  const pending = staying.filter((i) => !myVote(i));
  // A team's doubts: what the open votes disagree on, less what whoever closes has already decided
  const doubts = team ? staying.filter((i) => !!i.id && outcomeOf(votes.get(i.id)) === "doubt" && !ruled[i.id]) : [];
  const reviewing = mode === "doubt" && doubts.length > 0;
  const done = staying.length > 0 && pending.length === 0 && !reviewing;
  // What turns: the doubts while they are gone through, else the cards still to decide. With none left, the board that was kept
  const list = reviewing ? doubts : done ? staying : pending;
  const ln = list.length;
  const current = ln ? list[mod(base, ln)] : null;
  // The last doubt gone: back to what the votes add up to
  useEffect(() => { if (mode === "doubt" && !doubts.length) setMode("vote"); }, [mode, doubts.length]);

  // What the open votes add up to, for a team with its board voted: what stays, what leaves when the polish closes,
  // what is in doubt, and who has still to vote
  const tally = { open: 0, stay: 0, out: 0, doubt: 0 };
  if (team) {
    for (const i of staying) {
      const raw = i.id ? outcomeOf(votes.get(i.id)) : null;
      if (!raw) continue;
      tally.open++;
      const o = raw === "doubt" ? ruled[i.id!] ?? "doubt" : raw;
      if (o === "keep") tally.stay++; else if (o === "forget") tally.out++; else tally.doubt++;
    }
  }
  const voting = team && tally.open > 0;
  const names = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
  const finished = team ? finishedOf(staying.map((i) => i.id).filter((x): x is string => !!x), votes, members.map((m) => m.id)) : new Set<string>();
  const waiting = members.filter((m) => !finished.has(m.id)).map((m) => m.name);
  // Who closed it last, and when
  let closed: PolishVote | null = null;
  if (team) for (const list of votes.values()) for (const v of list) if (v.closedAt && v.closedBy && (!closed || v.closedAt > closed.closedAt!)) closed = v;
  const closer = closed ? members.find((m) => m.id === closed!.closedBy)?.name : undefined;

  // The card in front says what it is itself (Face): the words under it are only what the team said
  const kind = current ? mediaKindOf(current.web) : null;
  // What the team said about it. A text reference's note is the text itself, already on the card
  const note = current && !done && mediaKindOf(current.web) !== "text" ? noteOf(current) : null;
  // A post shown as its photo or video alone (Face): who wrote it and how it starts go under it, as a note does
  // (Eric, 13-10: "que esté el inicio de lo que es el tuit escrito como cuando es un comentario de alguien").
  // The card in front has read it already (post-cache.ts); until then its name says the same
  const read = usePost(kind === "post" && current && !done ? current.web : null);
  const shown = kind === "post" && current && !done && (postHasMedia(imageOf(current)) || !!read?.post?.media.length) ? read?.post ?? postFromName(current) : null;
  const tweet = shown?.text.trim() ? shown : null;
  // What the team voted on the card in front. Only on a doubt gone through: there this person has already voted
  const said = reviewing && current?.id ? openVotes(votes.get(current.id)) : [];
  const voters = (choice: PolishChoice) => said.filter((v) => v.vote === choice).map((v) => members.find((m) => m.id === v.userId)).filter((m): m is NonNullable<typeof m> => !!m);

  // ─── Tino, in the corner: he asks about the card in front and holds the answers in his balloon (desktop; a phone
  // keeps the bar). The lines are the copy sheet's Polish, in t.tino.polish
  const p = t.tino.polish;
  const tino = useRef<TinoApi>(null);
  /** A line said after an answer, for a moment, before the next card's question */
  const [line, setLine] = useState<{ key: string; pool: readonly string[]; text?: string; mood: TinoMood } | null>(null);
  /** Forgetting a card with comments or one's own idea: he asks first */
  const [sure, setSure] = useState<{ key: string; champ: boolean; text: string } | null>(null);
  const [lean, setLean] = useState<number | null>(null);
  const said_ = useRef(0), answers = useRef(0);
  const react = (pool: readonly string[], mood: TinoMood, text?: string) => {
    setLine({ key: `${pool[0]}:${++said_.current}`, pool, text, mood });
    tino.current?.jump(0.5);
  };
  useEffect(() => {
    if (!line) return;
    const timer = window.setTimeout(() => setLine(null), REACT_MS);
    return () => window.clearTimeout(timer);
  }, [line]);
  /** Tino holds the answers only where his corner shows */
  const tinoHere = () => window.matchMedia("(min-width: 801px)").matches;
  // The card the view opened on: its question is the round's start
  const [firstKey, setFirstKey] = useState<string | null>(null);
  const currentKey = current ? keyOf(current) : null;
  useEffect(() => { if (!firstKey && currentKey) setFirstKey(currentKey); }, [firstKey, currentKey]);
  const others = team && !reviewing && current?.id ? openVotes(votes.get(current.id)).filter((v) => v.userId !== me) : [];
  const other = others[0] ? { name: members.find((m) => m.id === others[0].userId)?.name, vote: others[0].vote } : null;
  const sideA = reviewing ? voters("keep")[0]?.name : undefined, sideB = reviewing ? voters("forget")[0]?.name : undefined;
  const asking = sure && current && sure.key === keyOf(current) ? sure : null;
  const askKey = current ? (asking ? `sure:${asking.key}` : reviewing ? `split:${keyOf(current)}` : keyOf(current) === firstKey && !history.length ? `start:${keyOf(current)}` : `ask:${keyOf(current)}`) : undefined;
  const askPool = asking ? (asking.champ ? p.sureChamp : p.sure) : reviewing ? p.split : askKey?.startsWith("start") ? p.start : p.ask;
  const question = useLine(done ? "round:done" : line?.key ?? askKey, done ? p.round : line?.pool ?? askPool);

  const glideTo = (k: number) => {
    const e = eng.current;
    e.target = k; e.v = 0;
    if (e.still) e.p = k;
  };
  /** The card a decision is about: the one it is stopping on, or the one facing the screen */
  const frontAt = () => Math.round(eng.current.target ?? eng.current.p);
  const press = (el: HTMLElement | null) => el?.animate([{ transform: "scale(0.96)" }, { transform: "scale(1)" }], { duration: 220, easing: EASE_OUT });

  // Before the first paint: only what is still undecided turns
  /** Coming from the board, while the flight lasts: the cards mounted meanwhile have no fade of their own (`quiet`),
   *  the flight brings them in, and the answers wait until the cards have landed */
  const arriving = useRef(false), quiet = useRef(new Set<string>());
  useLayoutEffect(() => {
    // What this browser remembered as kept, from before votes were saved on the server: handed over as keep votes, once
    let stored: string[] = [];
    try { const raw = JSON.parse(localStorage.getItem(KEPT_KEY(project.id)) ?? "[]"); if (Array.isArray(raw)) stored = raw.filter((x): x is string => typeof x === "string"); localStorage.removeItem(KEPT_KEY(project.id)); } catch { /* no storage */ }
    const was = new Set(stored);
    const old = items.filter((i) => was.has(keyOf(i)) && !myVote(i));
    if (old.length) void onVote(old, "keep");
    const e = eng.current;
    e.still = stillMotion();
    // A different card in front every time the view opens: one of the undecided, at random, never the last one's.
    // Coming from the board, one of those the board was showing: the cards on screen are then the ones that settle
    // round it on the orbit (components/view-morph.ts)
    const open = items.filter((i) => !myVote(i) && !was.has(keyOf(i))).map(keyOf);
    const seen = peekHandoff("board")?.shots;
    arriving.current = !!seen;
    const shown = seen ? open.filter((k) => seen.has(k)) : [];
    const pool = shown.length ? shown : open;
    const pick = randomBut(pool, lastFront.get(project.id));
    const at = pool.length ? open.indexOf(pool[pick]) : 0;
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
  }, [list]);

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

  // ─── Coming from the board ──────────────────────────────────────────────────
  // The board's cards were measured as it left (components/view-morph.ts). On the first paint with cards, every card
  // the board was showing settles into its own place on the orbit: the ones with a place on screen fly there flat
  // and sharp (blur and fog come in on the last stretch); the ones whose place is further round the orbit go round
  // it and out of sight, as copies in the same 3D stage; the ones already decided, which the tornado no longer
  // turns, fade where they stood. The orbit's cards the board was not showing come in along the orbit from further
  // round it. The front settles first, the far ones a beat later. Read all, then write all.
  const morphed = useRef(false);
  useLayoutEffect(() => {
    const e = eng.current, stage = stageRef.current;
    // Not before the cards drawn are the ones round the card coming to the front (the first render has the ones round 0)
    if (morphed.current || !e.nodes.length || !stage || Math.round(e.p) !== base) return;
    morphed.current = true;
    const shots = takeHandoff("board")?.shots;
    setTimeout(() => { arriving.current = false; }, MORPH_MS + 200);
    if (!shots || e.still || !ln) return;
    settleFromBoard(e, stage, shots);
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
    let raf = 0, last = performance.now(), ticked = 0;
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
      if (front !== e.base) {
        // A card passing the front under the hand (a scroll, a drag) ticks, like a wheel's notch: never when it
        // glides there on its own after a decision, nor while it turns behind the words once the board is done
        if ((e.dragging || t - e.scrolled < SETTLE_MS) && !e.done && t - ticked > TICK_MS) { ticked = t; cue("tap", { emphasis: "subtle" }); }
        e.base = front; setBase(front);
      }
      paint(e, dt);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fit]);

  // Leaving the view with a card still in the air: its decision is not lost
  const onVoteRef = useRef(onVote);
  useEffect(() => { onVoteRef.current = onVote; });
  useEffect(() => {
    const waiting = outbox.current;
    return () => { for (const { item, timer } of waiting.values()) { window.clearTimeout(timer); void onVoteRef.current([item], "forget"); } waiting.clear(); };
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
  /** In a team: a vote, and the card goes to the Polish tab. On a doubt, whoever closes decides it; anyone else
   *  can only vote again, and the card moves on when that settles nothing */
  const vote = (choice: PolishChoice, at: number, item: InspoItem) => {
    const id = item.id;
    if (!id) return;
    if (!reviewing) {
      void onVote([item], choice);
      send(at, item, "polish");
      setHistory((h) => [...h, { kind: choice, item, prev: null }]);
    } else if (canClose) {
      setRuled((r) => ({ ...r, [id]: choice }));
      send(at, item, "polish");
      setHistory((h) => [...h, { kind: choice, item, ruled: true }]);
    } else {
      const prev = myVote(item);
      if (prev !== choice) {
        void onVote([item], choice);
        setHistory((h) => [...h, { kind: choice, item, prev }]);
      }
      // Still a doubt (someone else said otherwise, or nothing changed): on to the next one
      if (prev === choice || openVotes(votes.get(id)).some((v) => v.userId !== me && v.vote !== choice)) glideTo(at + 1);
      else send(at, item, "polish");
    }
  };
  const keep = () => {
    if (!current || done) return;
    const at = frontAt(), item = list[mod(at, ln)];
    press(keepRef.current);
    cue("select", { direction: "forward" });
    if (team) { vote("keep", at, item); return; }
    send(at, item, "board");
    void onVote([item], "keep");
    setHistory((h) => [...h, { kind: "keep", item }]);
  };
  /** Forget, asking first where it costs something: comments that go with it, or the person's own idea */
  const askForget = () => {
    if (!current || done) return;
    const item = list[mod(frontAt(), ln)];
    if (!asking && !reviewing && tinoHere()) {
      const n = commentsOf(item), own = !!myName && item.addedBy === myName;
      if (n > 0 || own) {
        const week = thisWeek();
        let champ = false;
        try { champ = own && localStorage.getItem(CHAMP_KEY) !== week; if (champ) localStorage.setItem(CHAMP_KEY, week); } catch { /* no storage: the plain line */ }
        setSure({ key: keyOf(item), champ, text: own ? p.sureOwn(project.name, team) : p.sureComments(n, team) });
        tino.current?.set("curiosa");
        return;
      }
    }
    const confirmed = !!asking;
    setSure(null);
    forget();
    if (confirmed) react(p.afterForget, "judge");
    else if (reviewing && sideB) react([p.sideForget(sideB)], "admirer");
    else if (++answers.current % SILENT_EVERY) react(p.reactForget, "admirer");
  };
  const answerKeep = () => {
    if (!current || done) return;
    const confirmed = !!asking;
    setSure(null);
    keep();
    if (confirmed) react(p.afterKeep, "judge");
    else if (reviewing && sideA) react([p.sideKeep(sideA)], "admirer");
    else if (++answers.current % SILENT_EVERY) react(p.reactKeep, "admirer");
  };
  const later = () => { glideTo(frontAt() + 1); react(p.saved, "watching"); };
  const takeBack = () => { if (!history.length) return; undo(); react(p.undone, "accomplice"); };
  const forget = () => {
    if (!current || done) return;
    const at = frontAt(), item = list[mod(at, ln)];
    press(forgetRef.current);
    cue("select", { direction: "back" });
    if (team) { vote("forget", at, item); return; }
    send(at, item, "inbox");
    setHistory((h) => [...h, { kind: "forget", item }]);
    setForgot((c) => c + 1);
    // Out of the tornado now; out of the project when it lands on the Inbox tab, so the Inbox counts it as it arrives
    const key = keyOf(item);
    setLeaving((all) => new Set(all).add(key));
    const timer = window.setTimeout(() => {
      outbox.current.delete(key);
      void Promise.resolve(onVote([item], "forget")).finally(() => landed(key));
    }, eng.current.still ? 0 : FLY_MS * LAND);
    outbox.current.set(key, { item, timer });
  };
  /** The flight is over, whatever came of it: saved, the card is off the board; refused, it is back in the tornado */
  const landed = (key: string) => setLeaving((all) => { const next = new Set(all); next.delete(key); return next; });
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    cue("navigate", { direction: "back" });
    setHistory((h) => h.slice(0, -1));
    const key = keyOf(last.item);
    // It comes back to the tornado, and to the front
    focusKey.current = key;
    if (last.ruled) {
      setRuled((r) => { const next = { ...r }; delete next[key]; return next; });
      setMode("doubt");
    } else if (team) {
      void onVote([last.item], last.prev ?? null);
      if (last.prev) setMode("doubt");
    } else if (last.kind === "keep") {
      void onVote([last.item], null);
    } else {
      setForgot((c) => Math.max(0, c - 1));
      // Still in the air: it never left the project
      const flying = outbox.current.get(key);
      if (flying) { window.clearTimeout(flying.timer); outbox.current.delete(key); landed(key); }
      else void onRestore(last.item);
    }
  };
  /** Everything this person voted here, taken back: the whole board turns again */
  const again = () => {
    void onVote(staying.filter((i) => myVote(i)), null);
    setHistory([]);
    setRuled({});
    setMode("vote");
    setFirstKey(null);
  };
  /** Whoever manages the workspace settles what was voted: what everyone forgot, and the doubts decided, leave for the Inbox */
  const close = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const gone = await onClose(ruled);
      if (gone === null) return;
      cue("success");
      setRuled({});
      setHistory([]);
      setForgot((c) => c + gone);
      const tab = gone ? document.querySelector<HTMLElement>(LANDING.inbox) : null;
      if (tab?.offsetParent) bump(tab);
    } finally { setBusy(false); }
  };
  const open = () => { if (ln && !done) onOpenItem(list[mod(frontAt(), ln)]); };
  const toSystem = async () => {
    if (busy) return;
    setBusy(true);
    try { await onSystem(); } finally { setBusy(false); }
  };

  // The keys: ← forgets, → keeps, Enter opens the card, ⌘Z takes the last one back. Never inside a field or under a dialog
  const acts = useRef({ keep: answerKeep, forget: askForget, undo: takeBack, open });
  useEffect(() => { acts.current = { keep: answerKeep, forget: askForget, undo: takeBack, open }; });
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
      const kind = mediaKindOf(item.web), image = imageOf(item);
      // A post that is only words is as tall as what it says (capped in CSS); the rest keep their picture's shape
      const wordy = kind === "post" && !postHasMedia(image);
      const ratio = kind === "text" ? 1 : clamp(ratioOf(item), 0.5, 1.2);
      if (arriving.current) quiet.current.add(node);
      cards.push(
        <div key={node} className={`polish__card${wordy ? " is-post" : ""}`} data-k={k} data-node={node} data-front={k === base ? "" : undefined} style={wordy ? undefined : { aspectRatio: `1 / ${ratio}` }}>
          <div className="polish__in" style={quiet.current.has(node) ? NO_FADE : undefined}>
            <Face item={item} image={image} large={k === rested ? largeImageOf(item) : null} text={textOf(item)} near={Math.abs(k - base) <= POST_NEAR} front={k === rested} />
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
      {/* The same clouds as the board (components/Clouds.tsx): the cards turn under the Island and under the
          bar, so the view fades into its background at both edges, always (Eric, 09-10: "en pulido también") */}
      <Clouds always top={64} bottom={112} />
      {flights.map((f) => (
        <Flyer key={f.id} flight={f} image={imageOf(f.item)} text={textOf(f.item)} onGone={() => setFlights((all) => all.filter((x) => x.id !== f.id))} />
      ))}

      {current && !done && (
        <div className="polish__bar" style={arriving.current ? BAR_WAITS : undefined}>
          {/* A post or a text says who and what on its own card: only the rest get their name here */}
          {(kind !== "post" && kind !== "text") || tweet || note || said.length > 0 ? (
          <div className={`t-small polish__now${tweet || note || said.length ? " has-words" : ""}`} role="status" aria-live="polite">
            {kind !== "post" && kind !== "text" && <b className="polish__name">{current.name}</b>}
            {tweet && (
              <p className="polish__say polish__say--note">
                <PersonAvatar name={tweet.author} image={tweet.avatar} size={18} />
                <span><b>{tweet.author}</b> {tweet.text.length > NOTE_MAX ? `${tweet.text.slice(0, NOTE_MAX).trimEnd()}…` : tweet.text}</span>
              </p>
            )}
            {note && (
              <p className="polish__say polish__say--note">
                {note.people.length > 1
                  ? <span className="polish__faces" aria-hidden>{note.people.map((p) => <PersonAvatar key={p.name} name={p.name} image={p.image} size={18} />)}</span>
                  : <PersonAvatar name={note.name} image={note.image} size={18} />}
                <span><b>{note.name}</b> {note.body.length > NOTE_MAX ? `${note.body.slice(0, NOTE_MAX).trimEnd()}…` : note.body}</span>
              </p>
            )}
            {said.length > 0 && (
              <p className="polish__votes">
                {(["keep", "forget"] as const).map((choice) => {
                  const who = voters(choice);
                  return who.length > 0 && (
                    <span key={choice} className="polish__voted" data-tip={names.format(who.map((m) => m.name))}>
                      <span className="polish__faces" aria-hidden>{who.map((m) => <PersonAvatar key={m.id} name={m.name} image={m.image} size={18} />)}</span>
                      {choice === "keep" ? s.votedKeep(who.length) : s.votedForget(who.length)}
                    </span>
                  );
                })}
              </p>
            )}
          </div>
          ) : null}
          {/* The two answers on one piece of chrome, each with the key that does the same (Key) and where the card goes */}
          <div className="polish__choice cr-on-chrome">
            <button ref={forgetRef} type="button" className="polish__btn" onClick={askForget}>
              <Key className="polish__key">←</Key>
              <span className="polish__btn-text"><b className="t-ui">{s.forget}</b><small className="t-label">{!team ? s.forgetSub : reviewing && canClose ? s.ruleOut : s.voteOut}</small></span>
            </button>
            <span className="polish__sep" aria-hidden />
            <button ref={keepRef} type="button" className="polish__btn polish__btn--keep" onClick={answerKeep}>
              <Key className="polish__key">→</Key>
              <span className="polish__btn-text"><b className="t-ui">{s.keep}</b><small className="t-label">{!team ? s.keepSub : reviewing && canClose ? s.ruleStay : s.voteStay}</small></span>
            </button>
            <IconButton className="polish__undo" icon="undo" label={s.undo} onClick={takeBack} disabled={history.length === 0} />
            {/* A team is told what its answer is here: a vote, settled among everyone */}
            {team && (
              <p className="t-label polish__team">
                {reviewing ? (canClose ? s.doubtRule : s.doubtVote) : s.teamRule}
                {reviewing && <Button variant="quiet" size="s" className="polish__back" onClick={() => setMode("vote")}>{s.back}</Button>}
              </p>
            )}
          </div>
        </div>
      )}

      {done && (
        <div className="polish__done">
          {/* What stays, tidied: a few of the kept references falling into a neat fan */}
          <div className="polish__fan" aria-hidden>
            {fan.map((item, i) => (
              <span key={keyOf(item)} className="polish__fan-card" style={{ "--i": i - (fan.length - 1) / 2, zIndex: 10 - Math.abs(i - (fan.length - 1) / 2) } as React.CSSProperties}>
                {mediaKindOf(item.web) === "text" ? <b className="t-label polish__fan-text">{item.name}</b> : <Picture item={item} image={imageOf(item)} />}
              </span>
            ))}
          </div>
          <h2 className="polish__done-title">{voting ? s.votedTitle : s.doneTitle}</h2>
          {voting ? (
            <>
              <p className="t-body polish__done-line">{s.tally(tally.stay, tally.out, tally.doubt)}</p>
              <p className="t-small polish__done-line polish__done-next">{waiting.length ? s.waiting(names.format(waiting), waiting.length) : s.everyoneVoted} {canClose ? s.closeHint : s.closesWho}</p>
            </>
          ) : (
            <>
              <p className="t-body polish__done-line">{s.doneStay(staying.length)}{forgot > 0 ? ` ${s.doneOut(forgot)}` : ""}</p>
              <p className="t-small polish__done-line polish__done-next">{closed && closer ? `${s.closedBy(closer, fmtDate(closed.closedAt!, locale))} ` : ""}{s.doneNext}</p>
            </>
          )}
          <div className="polish__done-actions">
            {voting && tally.doubt > 0 && <Button variant="primary" onClick={() => setMode("doubt")}>{canClose ? s.settleDoubts(tally.doubt) : s.seeDoubts(tally.doubt)}</Button>}
            {voting && canClose && <Button variant={tally.doubt > 0 ? "secondary" : "primary"} onClick={() => void close()} disabled={busy}>{busy && <Busy label={s.close} />}{s.close}</Button>}
            <Button variant={voting && (canClose || tally.doubt > 0) ? "secondary" : "primary"} iconEnd={!voting && busy ? undefined : "arrow-right"} onClick={() => void toSystem()} disabled={busy}>{!voting && busy && <Busy label={s.toSystem} />}{s.toSystem}</Button>
            <Button onClick={again}>{s.again}</Button>
            {history.length > 0 && <Button onClick={undo}>{s.undo}</Button>}
          </div>
        </div>
      )}

      {staying.length === 0 && flights.length === 0 && (
        <EmptyState className="empty empty--over" title={forgot > 0 ? s.allGoneTitle : s.emptyTitle}>
          {forgot > 0 ? s.doneOut(forgot) : s.emptyLead}
          <span className="polish__empty-actions">
            {history.length > 0 && <Button size="s" onClick={undo}>{s.undo}</Button>}
            <Button size="s" onClick={onBoard}>{s.toBoard}</Button>
          </span>
        </EmptyState>
      )}

      {/* Tino in the opposite corner: the question about the card in front, and the answers */}
      {staying.length > 0 && (
        <TinoCorner className="polish-tino" tinoRef={tino} bodyLabel={t.tino.talk} onBody={() => tino.current?.jump(1)}
          look={lean != null ? [lean, 0] : undefined}
          mood={line ? line.mood : asking ? "skeptic" : reviewing ? "suspect" : done ? "admirer" : "watching"}
          say={done ? {
            key: "round", title: question, text: p.roundText(team ? tally.stay : staying.length, team ? tally.out : forgot, team),
          } : current && {
            key: line?.key ?? askKey ?? "ask", title: question,
            top: !reviewing && !asking && !line ? `${staying.length - pending.length + 1} / ${staying.length}` : undefined,
            text: line ? line.text : asking ? asking.text : reviewing && sideA && sideB ? p.splitText(sideA, sideB) : other?.name ? (other.vote === "keep" ? p.keeps(other.name) : p.forgets(other.name)) : undefined,
            actions: line ? null : <>
              {/* Forget on the left and Keep on the right, as the arrow keys; asked first, keeping is the way out */}
              <button type="button" className="cr-btn cr-btn-secondary cr-btn-s polish-tino__btn" onClick={askForget}
                onPointerEnter={() => setLean(LEAN_LEFT)} onPointerLeave={() => setLean(null)}>
                <Icon name="arrow-left" size={16} />{asking ? p.forgetAnyway : reviewing && sideB ? p.withSide(sideB) : s.forget}
              </button>
              <button type="button" className={`cr-btn cr-btn-${asking ? "primary" : "secondary"} cr-btn-s polish-tino__btn`} onClick={answerKeep}
                onPointerEnter={() => setLean(LEAN_RIGHT)} onPointerLeave={() => setLean(null)}>
                {asking ? p.keepIt : reviewing && sideA ? p.withSide(sideA) : s.keep}<Icon name="arrow-right" size={16} />
              </button>
              <p className="tino-corner__foot">
                <span>{team ? p.foot : p.footSolo}</span>
                {reviewing && <button type="button" className="tino-corner__link" onClick={later}>{p.later}</button>}
                {history.length > 0 && <button type="button" className="tino-corner__link" onClick={takeBack}>{s.undo}</button>}
              </p>
            </>,
          }} />
      )}

      {/* The board's corner and its pill: the zoom where the board has it, and the music in the same piece. The
          theme button sits after it: the other corner is Tino's */}
      <div className="polish__corner home-corner">
      <ZoomPill
        zoom={current && !done ? {
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
      <ThemeToggle />
      </div>
    </section>
  );
}
