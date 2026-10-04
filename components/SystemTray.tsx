"use client";
// The tray of the bento: the references at hand, beside it, as two wheels that turn on their own in opposite
// directions, so the bento keeps the whole screen. The pointer on a wheel stops it; an up-and-down flick (or the
// scroll wheel) spins it, and it keeps turning the way it was last spun. A reference pulled sideways off a wheel is
// carried to a tile and filed in that area on release; one from the Inbox is filed in the project on the way.
// A plain click opens its card.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { InspoItem } from "@/types/inspo";
import type { SystemArea } from "@/types/system";
import { useT } from "./I18nProvider";
import { Thumb } from "./SystemStage";
import { Avatar } from "./CommentsPanel";
import type { NoteCaption } from "./InspoCard";

const SPEED = 28;       // px/s of the wheel turning on its own
const EASE = 1.6;       // how fast a spin settles back into that pace (1/s)
const MAX_SPIN = 4000;  // px/s
const SLOP = 6;         // px before a press becomes a spin or a carry

const FOLD_KEY = "criterio:tray-folded";
/** A panel at the right edge with an arrow: fold it away, or bring it back (flipped) */
const IcFold = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2.5" /><path d="M10 2.75v10.5" /><path d="M5 6.25 6.75 8 5 9.75" />
  </svg>
);

/** The tile under a point: tiles carry their area in data-area */
const areaAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest("[data-area]") as HTMLElement | null)?.dataset.area as SystemArea | undefined ?? null;

type CardProps = {
  imageOf: (item: InspoItem) => string | null;
  carrying: InspoItem | null;
  noteOf?: (item: InspoItem) => NoteCaption | null;
  pending: Set<string>;
};

/** One wheel: its set repeated as many times as it takes to never show its end, moved by hand in a frame loop.
 *  `dir` is the way it turns on its own: -1 up, 1 down */
function Wheel({ items, dir, carrying, onCarry, onOver, onDrop, onOpen, imageOf, noteOf, pending, ghostAt }: CardProps & {
  items: InspoItem[]; dir: 1 | -1;
  onCarry: (item: InspoItem | null) => void;
  onOver: (area: SystemArea | null) => void;
  onDrop: (area: SystemArea, item: InspoItem) => void;
  onOpen?: (item: InspoItem) => void;
  ghostAt: (x: number, y: number) => void;
}) {
  const viewport = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const firstSet = useRef<HTMLDivElement | null>(null);
  const [copies, setCopies] = useState(1);
  const m = useRef({ y: 0, v: dir * SPEED, dir: dir as number, setH: 0, loop: false, hover: false, held: false, carrying: false });
  m.current.carrying = !!carrying;

  useLayoutEffect(() => {
    const vp = viewport.current, set = firstSet.current;
    if (!vp || !set) return;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(track.current!).rowGap) || 0;
      const setH = set.offsetHeight + gap;
      const loop = setH > vp.clientHeight && items.length > 1;
      m.current.setH = setH; m.current.loop = loop;
      if (!loop) { m.current.y = 0; if (track.current) track.current.style.transform = ""; }
      setCopies(loop ? Math.ceil(vp.clientHeight / setH) + 1 : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp); ro.observe(set);
    return () => ro.disconnect();
  }, [items]);

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const w = m.current;
      if (w.loop && !w.held) {
        const target = w.hover || w.carrying || still ? 0 : w.dir * SPEED;
        w.v += (target - w.v) * (1 - Math.exp(-dt * EASE));
        w.y += w.v * dt;
      }
      if (w.loop && w.setH) {
        w.y %= w.setH; if (w.y > 0) w.y -= w.setH;
        if (track.current) track.current.style.transform = `translate3d(0,${w.y}px,0)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // The scroll wheel over it spins it
    const vp = viewport.current;
    const wheel = (e: WheelEvent) => {
      const w = m.current;
      if (!w.loop) return;
      e.preventDefault();
      w.v = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, w.v - e.deltaY * 6));
      w.y -= e.deltaY;
      if (Math.abs(e.deltaY) > 2) w.dir = e.deltaY > 0 ? -1 : 1;
    };
    vp?.addEventListener("wheel", wheel, { passive: false });
    return () => { cancelAnimationFrame(raf); vp?.removeEventListener("wheel", wheel); };
  }, []);

  // ─── A press on a reference: a click opens it, up and down spins the wheel, sideways it is carried to a tile ──
  const press = useRef<{ item: InspoItem; id: number; x0: number; y0: number; lastX: number; lastY: number; lastT: number; mode: "none" | "spin" | "carry" } | null>(null);
  const down = (e: React.PointerEvent, item: InspoItem) => {
    if (e.button !== 0) return;
    press.current = { item, id: e.pointerId, x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastY: e.clientY, lastT: performance.now(), mode: "none" };
    viewport.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x0, dy = e.clientY - p.y0;
    if (p.mode === "none") {
      if (Math.hypot(dx, dy) < SLOP) return;
      p.mode = Math.abs(dy) > Math.abs(dx) && m.current.loop ? "spin" : "carry";
      if (p.mode === "spin") m.current.held = true;
      else onCarry(p.item);
    }
    const now = performance.now();
    if (p.mode === "spin") {
      const step = e.clientY - p.lastY, dt = Math.max(1, now - p.lastT) / 1000;
      m.current.y += step;
      m.current.v = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, step / dt));
    } else {
      ghostAt(e.clientX, e.clientY);
      onOver(areaAt(e.clientX, e.clientY));
    }
    p.lastX = e.clientX; p.lastY = e.clientY; p.lastT = now;
  };
  const up = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    if (p.mode === "none") { onOpen?.(p.item); return; }
    if (p.mode === "spin") {
      const w = m.current;
      w.held = false;
      // Spun hard enough, it keeps turning that way
      if (Math.abs(w.v) > SPEED * 2) w.dir = w.v > 0 ? 1 : -1;
      return;
    }
    const area = areaAt(e.clientX, e.clientY);
    if (area) onDrop(area, p.item);
    else { onOver(null); onCarry(null); }
  };
  const cancel = () => { if (press.current?.mode === "carry") { onOver(null); onCarry(null); } m.current.held = false; press.current = null; };
  useLayoutEffect(() => { if (carrying && press.current) ghostAt(press.current.lastX, press.current.lastY); }, [carrying]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = (i: InspoItem, copy: number) => {
    const note = noteOf?.(i);
    return (
      <button key={`${copy}-${i.id}`} type="button" title={i.name} tabIndex={copy ? -1 : 0} aria-hidden={copy ? true : undefined}
        className={`syst-ref${carrying?.id === i.id ? " is-carried" : ""}${pending.has(i.id!) ? " is-busy" : ""}`}
        onPointerDown={(e) => down(e, i)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen?.(i); } }}
        onDragStart={(e) => e.preventDefault()}>
        <Thumb item={i} image={imageOf(i)} className="syst-ref__img" />
        <span className="syst-ref__name">{i.name}</span>
        {note && (
          <span className="syst-ref__note">
            <span className="tile__note-stack" aria-hidden>{note.people.map((p) => <Avatar key={p.name} name={p.name} image={p.image} size={14} />)}</span>
            <span className="syst-ref__note-text">{note.body}</span>
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`syst-wheel${carrying ? " is-carrying" : ""}`} ref={viewport}
      onPointerEnter={() => { m.current.hover = true; }} onPointerLeave={() => { m.current.hover = false; }}
      onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
      <div className="syst-track" ref={track}>
        {Array.from({ length: copies }, (_, c) => (
          <div key={c} className="syst-set" ref={c === 0 ? firstSet : undefined}>{items.map((i) => card(i, c))}</div>
        ))}
      </div>
    </div>
  );
}

export default function SystemTray({ board, inbox, imageOf, carrying, onCarry, onOver, onDrop, onOpen, noteOf, pending }: {
  board: InspoItem[];
  inbox: InspoItem[];
  imageOf: (item: InspoItem) => string | null;
  /** The reference being carried to a tile */
  carrying: InspoItem | null;
  onCarry: (item: InspoItem | null) => void;
  onOver: (area: SystemArea | null) => void;
  onDrop: (area: SystemArea, item: InspoItem) => void;
  onOpen?: (item: InspoItem) => void;
  /** Its note or first comment, and the people in its thread: shown under the thumbnail */
  noteOf?: (item: InspoItem) => NoteCaption | null;
  pending: Set<string>;
}) {
  const { t } = useT();
  const s = t.system.tray;
  const [from, setFrom] = useState<"inbox" | "board">(inbox.length ? "inbox" : "board");
  const [q, setQ] = useState("");
  // Folded, the tray is a thin rail at the right edge, like a sidebar; it stays as it was left on this machine
  const [folded, setFoldedNow] = useState(false);
  useEffect(() => { try { setFoldedNow(localStorage.getItem(FOLD_KEY) === "1"); } catch { /* private mode */ } }, []);
  const setFolded = (v: boolean) => { setFoldedNow(v); try { localStorage.setItem(FOLD_KEY, v ? "1" : "0"); } catch { /* it lasts the visit */ } };
  const list = from === "inbox" ? inbox : board;
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return list.filter((i) => i.id && (!k || i.name.toLowerCase().includes(k) || i.web.toLowerCase().includes(k))).slice(0, 120);
  }, [list, q]);
  // Dealt in turn to the two wheels, so neighbours on the list sit side by side
  const [left, right] = useMemo(() => [shown.filter((_, i) => i % 2 === 0), shown.filter((_, i) => i % 2 === 1)], [shown]);

  const ghost = useRef<HTMLDivElement | null>(null);
  const ghostAt = (x: number, y: number) => { if (ghost.current) ghost.current.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-60%) rotate(-3deg)`; };
  const wheel = { carrying, onCarry, onOver, onDrop, onOpen, imageOf, noteOf, pending, ghostAt };

  // Now and then a reference leans out towards the bento and goes back, so it is plain they can be taken there.
  // Once one has been carried, the tray has been understood and stops showing it
  const root = useRef<HTMLElement | null>(null);
  const [learnt, setLearnt] = useState(false);
  useEffect(() => { if (carrying) setLearnt(true); }, [carrying]);
  useEffect(() => {
    if (learnt || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const beckon = () => {
      const el = root.current;
      if (!el || el.matches(":hover") || document.hidden) return;
      const box = el.getBoundingClientRect();
      const cards = [...el.querySelectorAll<HTMLElement>(".syst-ref:not(.is-busy)")].filter((c) => {
        const r = c.getBoundingClientRect();
        return r.top > box.top + 60 && r.bottom < box.bottom - 20;
      });
      const card = cards[Math.floor(Math.random() * cards.length)];
      if (!card) return;
      card.classList.add("is-beckon");
      card.addEventListener("animationend", () => card.classList.remove("is-beckon"), { once: true });
    };
    const first = setTimeout(beckon, 1800);
    const every = setInterval(beckon, 9000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [learnt]);

  if (folded) return (
    <aside className="syst is-folded" aria-label={s.label}>
      <button type="button" className="syst-rail" onClick={() => setFolded(false)} aria-label={s.show} title={s.show}>
        <span className="syst-fold__icon is-flipped">{IcFold}</span>
        <span className="syst-rail__label">{s.label}</span>
        <b className="syst-rail__n">{inbox.length + board.length}</b>
      </button>
    </aside>
  );

  return (
    <aside ref={root} className="syst" aria-label={s.label} title={carrying ? s.carrying(carrying.name) : s.hint}>
      <header className="syst-head">
        <div className="syst-head__row">
        <div className="tt-modes syst-from" role="tablist">
          <button type="button" role="tab" aria-selected={from === "inbox"} className={`tt-mode${from === "inbox" ? " is-on" : ""}`} onClick={() => setFrom("inbox")} title={t.projects.unfiled}><span className="syst-from__label">{t.projects.unfiled}</span><b>{inbox.length}</b></button>
          <button type="button" role="tab" aria-selected={from === "board"} className={`tt-mode${from === "board" ? " is-on" : ""}`} onClick={() => setFrom("board")} title={t.system.stage.inProject}><span className="syst-from__label">{t.system.stage.inProject}</span><b>{board.length}</b></button>
        </div>
        <button type="button" className="syst-fold" onClick={() => setFolded(true)} aria-label={s.hide} title={s.hide}><span className="syst-fold__icon">{IcFold}</span></button>
        </div>
        <input className="syst-search" value={q} placeholder={t.system.stage.search} aria-label={t.system.stage.search} onChange={(e) => setQ(e.target.value)} />
      </header>
      {shown.length ? (
        <div className="syst-wheels">
          <Wheel key={`${from}-l`} items={left} dir={-1} {...wheel} />
          {right.length > 0 && <Wheel key={`${from}-r`} items={right} dir={1} {...wheel} />}
        </div>
      ) : <p className="syst-none">{q ? t.system.stage.nothing : s.empty}</p>}
      {carrying && (
        <div className="syst-ghost" ref={ghost} aria-hidden>
          <Thumb item={carrying} image={imageOf(carrying)} className="syst-ref__img" />
        </div>
      )}
    </aside>
  );
}
