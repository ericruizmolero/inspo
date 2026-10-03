"use client";
// Polish a project's board (step 3 of Curar). First the brief, one question per screen with the
// tabs as its index, the way a client is asked before a project starts; then the games, where a
// model proposes what repeats and what pulls away from the brief and the person decides. Nothing
// here deletes a reference: taking one out means it leaves the project and stays in the library.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import type { CommentMap, InspoItem, Project, TagMap } from "@/types/inspo";
import { BRIEF_KEYS, type DesignSpec } from "@/types/design";
import { AUDIENCES, BOARD_TARGET, BRIEF_TEXT_MAX, EMPTY_POLISH, TAKES, WHY_NOTE_MAX, gapsOf, pendingOf, type Audience, type Duel, type DupeGroup, type Light, type OffTone, type PolishBrief, type PolishState, type Take } from "@/types/polish";
import { SECTORS, STYLES } from "@/lib/taxonomy";
import { loadPolish, savePolishBrief, decidePolish, mergePolish, savePolishWhy } from "@/app/actions/polish";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { cachedCardImage } from "./InspoCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

const STEPS = ["project", "audience", "tone", "avoid", "seconds", "games"] as const;
type Step = (typeof STEPS)[number];

type Draft = Omit<PolishBrief, "updatedAt" | "updatedBy">;
const EMPTY_DRAFT: Draft = { sector: null, about: "", audience: [], audienceNote: "", tone: [], avoidItems: [], avoid: "", firstSeconds: "" };

interface Props {
  project: Project;
  /** The references in the project, as the grid shows them */
  board: InspoItem[];
  /** The whole library, for the tone examples when the board has none with that look */
  library: InspoItem[];
  tagMap: TagMap;
  imageOf: (item: InspoItem) => string | null;
  /** The threads, by item id: shown on a card's sheet */
  comments: CommentMap;
  /** Whether a DESIGN.md already exists for the site: the sheet only reads, never generates one */
  hasDesignMd: (web: string) => boolean;
  /** The project's archive: off the board, still the project's */
  archived: InspoItem[];
  /** To the archive (on) or back to the board (off). Resolves when done, throws when it failed. */
  onArchive: (items: InspoItem[], on: boolean) => Promise<void>;
  /** A gap to fill: search the library for it (closes the modal) */
  onSearch: (query: string) => void;
  /** The brief was saved: its intention line, for the project header */
  onBrief?: (about: string) => void;
  onClose: () => void;
}

/** public/polish/tone/<style>.jpg: one site per look, captured once, for a workspace that has none of its own */
const toneCover = (style: string) => `/polish/tone/${style}.jpg`;

function Thumb({ item, image, className = "" }: { item: InspoItem; image: string | null; className?: string }) {
  // The same ladder as the grid card (InspoCard): the picture the grid already has, else og:image,
  // else a screenshot of the hero taken server-side; only when all fail, the initial.
  // Recomputed for every reference shown here: the tone stage reuses one Thumb across tones
  const ladder = () => [image, cachedCardImage(item.web), `/api/og?url=${encodeURIComponent(item.web)}`, `/api/shot?url=${encodeURIComponent(item.web)}&v=2`].filter((x): x is string => !!x);
  const [srcs, setSrcs] = useState(ladder);
  const [at, setAt] = useState(0);
  useEffect(() => { setSrcs(ladder()); setAt(0); }, [item.web, image]); // eslint-disable-line react-hooks/exhaustive-deps
  const src = srcs[at];
  return (
    <span className={`polish-thumb ${className}`} aria-hidden>
      {src ? <img key={src} src={src} alt="" loading="lazy" decoding="async" onError={() => setAt((i) => i + 1)} /> : item.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

// Development only: one click fills a text field with a sample answer, so testing the flow does
// not mean typing a brief every time. Never rendered in production
const DEV_SAMPLES = process.env.NODE_ENV === "production" ? null : {
  about: "Web de un estudio pequeño de diseño que hace webs y marca para startups y empresas que quieren algo con criterio, no una plantilla. Tiene que enseñar trabajo real y transmitir que somos pocos y cercanos.",
  audienceNote: "Fundadores y responsables de marketing de startups que ya han pasado por una agencia grande y salieron quemados.",
  avoid: "Nada de 3D, degradados chillones ni animaciones que mareen. Sin fotos de stock de gente sonriendo.",
  firstSeconds: "Que es un estudio pequeño que hace webs muy bien hechas, con trabajo real a la vista y un botón claro para hablar con nosotros.",
};

// What the run does, with a rough time each step takes: the server does not stream progress, so the
// list advances on a clock and the last step waits for the answer. Above, the board shuffles
const WAIT_STEPS_MS = [600, 1600, 3200, 5200];
const SHUFFLE_MS = 900;
const FAN = 5;
/** Where each card of the fan sits, front to back: a hand of cards held slightly spread */
const fanSlot = (k: number, n: number) => {
  const c = k - (n - 1) / 2;
  return { x: c * 44, y: Math.abs(c) * 10, rotation: c * 7, scale: 1 - Math.abs(c) * 0.04, zIndex: n - Math.abs(Math.round(c)) };
};

/** The board as a hand of cards that keeps dealing: the front card drops out, the rest slide forward, a new one rises at the back */
function Fan({ board, imageOf }: { board: InspoItem[]; imageOf: (i: InspoItem) => string | null }) {
  const n = Math.min(FAN, board.length);
  const [hand, setHand] = useState<number[]>(() => Array.from({ length: n }, (_, k) => k));
  const [gone, setGone] = useState<number | null>(null);
  const refs = useRef(new Map<number, HTMLSpanElement>());
  const placed = useRef(new Set<number>());

  useEffect(() => {
    if (n < 2) return;
    const id = setInterval(() => setHand((h) => { setGone(h[0]); return [...h.slice(1), (h[h.length - 1] + 1) % board.length]; }), SHUFFLE_MS);
    return () => clearInterval(id);
  }, [n, board.length]);

  useLayoutEffect(() => {
    hand.forEach((idx, k) => {
      const el = refs.current.get(idx);
      if (!el) return;
      const to = fanSlot(k, n);
      if (!placed.current.has(idx)) {
        placed.current.add(idx);
        // Comes in from below the hand, at the back
        gsap.fromTo(el, { ...to, y: to.y + 70, opacity: 0, scale: to.scale - 0.08 }, { ...to, opacity: 1, duration: 0.7, ease: "power3.out" });
      } else {
        gsap.to(el, { ...to, duration: 0.7, ease: "power3.inOut" });
      }
    });
    if (gone !== null) {
      const el = refs.current.get(gone);
      if (el) gsap.to(el, { y: "+=90", x: "-=30", rotation: "-=12", opacity: 0, scale: 0.9, duration: 0.55, ease: "power2.in", onComplete: () => { placed.current.delete(gone); setGone((g) => (g === gone ? null : g)); } });
    }
  }, [hand, gone, n]);

  const shown = gone !== null && !hand.includes(gone) ? [gone, ...hand] : hand;
  return (
    <div className="polish-wait__fan" aria-hidden>
      {shown.map((idx) => {
        const i = board[idx];
        return (
          <span key={idx} className="polish-wait__card" ref={(el) => { if (el) refs.current.set(idx, el); else refs.current.delete(idx); }}>
            <Thumb item={i} image={imageOf(i)} />
          </span>
        );
      })}
    </div>
  );
}

function Waiting({ board, imageOf }: { board: InspoItem[]; imageOf: (i: InspoItem) => string | null }) {
  const { t } = useT();
  const steps = t.polish.waitSteps(board.length);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = WAIT_STEPS_MS.map((ms, i) => setTimeout(() => setStage(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="polish-wait" role="status" aria-live="polite">
      {board.length > 0 && <Fan board={board} imageOf={imageOf} />}
      <span className="polish-wait__bar" aria-hidden><span style={{ width: `${((stage + 0.5) / steps.length) * 100}%` }} /></span>
      <ol className="polish-wait__steps">
        {steps.map((label, i) => (
          <li key={label} className={`polish-wait__step${i < stage ? " is-done" : i === stage ? " is-now" : ""}`}>
            <span className="polish-wait__mark">{i < stage ? Icons.check : i === stage ? <span className="spinner" /> : null}</span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

const domainOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/**
 * What the team knows about one reference, over the card: note, labels, what the screenshot shows,
 * the DESIGN.md brief when one exists (read, never generated here), the thread, and the site itself
 * in a new tab so the game is not left.
 */
function Sheet({ item, tags, comments, hasDesignMd, onClose }: { item: InspoItem; tags: TagMap[string] | undefined; comments: CommentMap; hasDesignMd: boolean; onClose: () => void }) {
  const { t, locale } = useT();
  const [brief, setBrief] = useState<Partial<Record<(typeof BRIEF_KEYS)[number], string>> | null | "loading">(hasDesignMd ? "loading" : null);
  useEffect(() => {
    if (!hasDesignMd) return;
    const ctrl = new AbortController();
    fetch(`/api/design-md?url=${encodeURIComponent(item.web)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { spec?: DesignSpec } | null) => setBrief((locale === "es" && body?.spec?.es?.brief) || body?.spec?.brief || null))
      .catch(() => setBrief(null));
    return () => ctrl.abort();
  }, [item.web, hasDesignMd, locale]);
  const note = [item.note, item.subNote].map((x) => (x ?? "").trim()).filter(Boolean);
  const thread = (comments[item.id ?? ""] ?? []).slice(-5);
  const labels = tags ? [t.taxonomy.sector[tags.sector as keyof typeof t.taxonomy.sector] ?? tags.sector, t.taxonomy.style[tags.style as keyof typeof t.taxonomy.style] ?? tags.style].filter(Boolean) : [];
  return (
    <div className="polish-sheet" role="dialog" aria-label={item.name}>
      <div className="polish-sheet__head">
        <div className="polish-sheet__title">
          <span className="polish-card__name">{item.name}</span>
          <a className="polish-sheet__link" href={item.web} target="_blank" rel="noopener noreferrer">{domainOf(item.web)} {Icons.external}</a>
        </div>
        <Button variant="icon" aria-label={t.common.close} onClick={onClose}>{Icons.x}</Button>
      </div>
      <div className="polish-sheet__body">
        {labels.length > 0 && <p className="polish-sheet__labels">{labels.join(" · ")}</p>}
        {note.length > 0 && <section><h4 className="polish-sheet__h">{t.polish.sheetNote}</h4><p>{note.join(" — ")}</p></section>}
        {tags?.visual && <section><h4 className="polish-sheet__h">{t.polish.sheetSeen}</h4><p>{tags.visual}</p></section>}
        {brief === "loading" && <p className="polish-sheet__muted"><span className="spinner" /></p>}
        {brief && brief !== "loading" && (
          <section>
            <h4 className="polish-sheet__h">DESIGN.md</h4>
            <dl className="polish-sheet__brief">
              {BRIEF_KEYS.filter((k) => brief[k]).map((k) => <div key={k}><dt>{t.designMd.brief[k]}</dt><dd>{brief[k]}</dd></div>)}
            </dl>
          </section>
        )}
        <section>
          <h4 className="polish-sheet__h">{t.polish.sheetComments}</h4>
          {thread.length ? (
            <ul className="polish-sheet__thread">{thread.map((c) => <li key={c.id}><strong>{c.authorName}</strong> {c.body}</li>)}</ul>
          ) : <p className="polish-sheet__muted">{t.polish.sheetNoComments}</p>}
        </section>
      </div>
    </div>
  );
}

type Card =
  | { kind: "why"; key: string; id: string }
  | { kind: "tone"; key: string; o: OffTone }
  | { kind: "duel"; key: string; d: Duel }
  | { kind: "dupe"; key: string; g: DupeGroup }
  | { kind: "light"; key: string; l: Light }
  | { kind: "gap"; key: string; take: Take };
interface Tally { out: number; kept: number; merged: number; apart: number; why: number; gaps: number }
const EMPTY_TALLY: Tally = { out: 0, kept: 0, merged: 0, apart: 0, why: 0, gaps: 0 };
/** How long the answered card takes to fly off (GSAP, in answer() below) */
const LEAVE_MS = 320;

/**
 * The open questions as a deck of cards: the top one is answered, flies off (left: out of the
 * project, right: stays) and the next rises. Decisions are the modal's; the deck only sequences them.
 */
function Deck({ cards, done, tally, boardSize, noWhy, onSkipWhys, byId, imageOf, tagMap, comments, hasDesignMd, busy, onOut, onKeep, onKeepOne, onMerge, onApart, onWin, onBoth, onWhy, onLightOut, onLightKeep, onGapSearch, onGapOk, foot, archive }: {
  cards: Card[]; done: number; tally: Tally; boardSize: number; noWhy: number; onSkipWhys: () => void;
  byId: Map<string, InspoItem>; imageOf: (i: InspoItem) => string | null; tagMap: TagMap; comments: CommentMap; hasDesignMd: (web: string) => boolean; busy: (ids: string[]) => boolean;
  onOut: (o: OffTone) => Promise<void>; onKeep: (o: OffTone) => Promise<void>;
  onKeepOne: (g: DupeGroup, id: string) => Promise<void>; onMerge: (g: DupeGroup, id: string) => Promise<void>; onApart: (g: DupeGroup) => Promise<void>;
  onWin: (d: Duel, id: string) => Promise<void>; onBoth: (d: Duel) => Promise<void>;
  onWhy: (id: string, takes: Take[], note: string) => Promise<void>;
  onLightOut: (l: Light) => Promise<void>; onLightKeep: (l: Light) => Promise<void>;
  onGapSearch: (take: Take) => void; onGapOk: (take: Take) => Promise<void>;
  foot: React.ReactNode; archive: React.ReactNode;
}) {
  const { t } = useT();
  const leaving = useRef(false);
  // On a duplicates card, the reference picked to stay; confirmed with the button, cleared per card
  const [choice, setChoice] = useState<string | null>(null);
  // The reference whose sheet is open over the top card
  const [peek, setPeek] = useState<InspoItem | null>(null);
  // On a why card, what is ticked and written before saving
  const [takes, setTakes] = useState<Take[]>([]);
  const [whyNote, setWhyNote] = useState("");
  const top = cards[0];
  useEffect(() => { setChoice(null); setPeek(null); setTakes([]); setWhyNote(""); }, [top?.key]);
  const info = (i: InspoItem) => (
    <button type="button" className="polish-card__info" aria-label={t.polish.sheet} title={t.polish.sheet} onClick={(e) => { e.stopPropagation(); setPeek(i); }}>{Icons.info}</button>
  );
  const sheet = (isTop: boolean) => isTop && peek
    ? <Sheet item={peek} tags={tagMap[peek.web]} comments={comments} hasDesignMd={hasDesignMd(peek.web)} onClose={() => setPeek(null)} />
    : null;
  const total = done + cards.length;
  const topEl = useRef<HTMLElement | null>(null);
  const stampNo = useRef<HTMLSpanElement | null>(null);
  const stampYes = useRef<HTMLSpanElement | null>(null);

  // The card flies off first, the decision runs while it is off screen. If it fails, or if nothing
  // changed and the same card is still on top, the card comes back: an invisible card on top of the
  // deck would block everything
  const topKey = useRef<string | undefined>(undefined);
  topKey.current = top?.key;
  const answer = async (dir: "left" | "right", act: () => Promise<void>) => {
    if (leaving.current) return;
    leaving.current = true;
    const el = topEl.current;
    const key = topKey.current;
    const sign = dir === "left" ? -1 : 1;
    const back = () => { if (el && el.isConnected) gsap.to(el, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.45, ease: "back.out(1.4)" }); };
    if (el) await gsap.to(el, { x: sign * (el.offsetWidth + 240), rotation: sign * 14, opacity: 0, duration: LEAVE_MS / 1000, ease: "power2.in" });
    try { await act(); }
    catch { back(); return; }
    finally { leaving.current = false; }
    // Give React a frame to swap the top card; if it is still this one, nothing happened
    setTimeout(() => { if (topKey.current === key) back(); }, 200);
  };

  // What a swipe means on the top card: tone, left is out and right stays; duel, the side it goes to wins
  const swipeOf = (card: Card | undefined): { left: () => Promise<void>; right: () => Promise<void> } | null => {
    if (!card) return null;
    if (card.kind === "tone") return { left: () => onOut(card.o), right: () => onKeep(card.o) };
    if (card.kind === "duel") return { left: () => onWin(card.d, card.d.ids[0]), right: () => onWin(card.d, card.d.ids[1]) };
    if (card.kind === "light") return { left: () => onLightOut(card.l), right: () => onLightKeep(card.l) };
    return null;
  };

  // Tinder: drag the top card; past the threshold it goes, before it springs back
  const drag = useRef<{ id: number; x0: number; dx: number } | null>(null);
  const SWIPE = 110;
  const follow = (dx: number) => {
    const el = topEl.current; if (!el) return;
    gsap.set(el, { x: dx, rotation: dx / 18 });
    if (stampNo.current) gsap.set(stampNo.current, { opacity: Math.min(1, Math.max(0, -dx / SWIPE)) });
    if (stampYes.current) gsap.set(stampYes.current, { opacity: Math.min(1, Math.max(0, dx / SWIPE)) });
  };
  const onDown = (e: React.PointerEvent<HTMLElement>) => {
    if (leaving.current || peek || e.button !== 0 || (e.target as HTMLElement).closest("button, a, .polish-sheet")) return;
    drag.current = { id: e.pointerId, x0: e.clientX, dx: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    gsap.killTweensOf(e.currentTarget);
  };
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current.dx = e.clientX - drag.current.x0;
    follow(drag.current.dx);
  };
  const onUp = (e: React.PointerEvent<HTMLElement>, card: Card) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const dx = drag.current.dx; drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    const acts = swipeOf(card);
    if (acts && dx <= -SWIPE) { void answer("left", acts.left); return; }
    if (acts && dx >= SWIPE) { void answer("right", acts.right); return; }
    const el = topEl.current;
    if (el) gsap.to(el, { x: 0, rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.6)" });
    if (stampNo.current) gsap.to(stampNo.current, { opacity: 0, duration: 0.2 });
    if (stampYes.current) gsap.to(stampYes.current, { opacity: 0, duration: 0.2 });
  };
  useEffect(() => {
    const acts = swipeOf(top);
    if (!acts) return;
    const onKey = (e: KeyboardEvent) => {
      if (peek || (e.target instanceof HTMLElement && /^(input|textarea)$/i.test(e.target.tagName))) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); void answer("left", acts.left); }
      if (e.key === "ArrowRight") { e.preventDefault(); void answer("right", acts.right); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // every render: `answer` closes over the current top card

  if (!top) {
    return (
      <>
        <div className="polish-run">
          <span className="polish-clean__icon" aria-hidden>{Icons.check}</span>
          <h2 className="display polish-h">{t.polish.clean}</h2>
          <p className="polish-lead">{t.polish.boardNow(boardSize, noWhy)} {total ? t.polish.deckSummary(tally.out, tally.merged, tally.kept + tally.apart) : t.polish.cleanHint}</p>
          {foot}
        </div>
        {archive}
      </>
    );
  }
  return (
    <>
      <div className="polish-deck__head">
        <span className="polish-deck__kind">
          {top.kind === "why" ? t.polish.whyTitle : top.kind === "tone" ? t.polish.toneTitle : top.kind === "duel" ? t.polish.duelTitle : top.kind === "dupe" ? t.polish.dupesTitle : top.kind === "light" ? t.polish.lightTitle : t.polish.gapTitle}
          <span className={`polish-deck__target${boardSize > BOARD_TARGET ? " is-over" : ""}`} title={t.polish.lightHint(boardSize, BOARD_TARGET)}>{t.polish.target(boardSize, BOARD_TARGET)}</span>
        </span>
        <span className="polish-deck__n">
          {top.kind === "why" && <button type="button" className="polish-deck__skip" onClick={onSkipWhys}>{t.polish.whySkipAll(noWhy)}</button>}
          {t.polish.deckOf(done + 1, total)}
        </span>
        <span className="polish-deck__bar" aria-hidden><span style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} /></span>
      </div>
      <div className="polish-deck">
        {cards.slice(0, 3).map((card, depth) => {
          const isTop = depth === 0;
          const cardIds = card.kind === "tone" ? [card.o.id] : card.kind === "duel" ? card.d.ids : card.kind === "dupe" ? card.g.ids : card.kind === "light" ? [card.l.id] : card.kind === "why" ? [card.id] : [];
          const cls = `polish-card polish-card--${card.kind} polish-card--d${depth}${isTop && busy(cardIds) ? " is-busy" : ""}`;
          const refTop = (el: HTMLElement | null) => { if (isTop) topEl.current = el; };
          if (card.kind === "why") {
            const i = byId.get(card.id);
            if (!i) return null;
            return (
              <article key={card.key} ref={refTop} className={cls} aria-hidden={!isTop}>
                <span className="polish-card__shot"><Thumb item={i} image={imageOf(i)} className="polish-card__media" />{isTop && info(i)}</span>
                {sheet(isTop)}
                <div className="polish-card__body">
                  <span className="polish-card__name">{i.name}</span>
                  <p className="polish-card__hint">{t.polish.whyHint}</p>
                </div>
                <div className="polish-chips" role="group" aria-label={t.polish.whyTitle}>
                  {TAKES.map((k) => (
                    <Button key={k} variant={takes.includes(k) ? "primary" : "ghost"} className="polish-chip" aria-pressed={takes.includes(k)} disabled={!isTop}
                      onClick={() => setTakes((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}>{t.polish.takes[k]}</Button>
                  ))}
                </div>
                <input className="input polish-text polish-card__note" value={whyNote} maxLength={WHY_NOTE_MAX} placeholder={t.polish.whyNotePlaceholder} disabled={!isTop}
                  onChange={(e) => setWhyNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (takes.length || whyNote.trim())) void answer("right", () => onWhy(card.id, takes, whyNote)); }} />
                <div className="polish-card__actions">
                  <Button variant="ghost" disabled={!isTop} onClick={() => void answer("left", () => onWhy(card.id, [], ""))}>{t.polish.whySkip}</Button>
                  <Button variant="primary" disabled={!isTop || (!takes.length && !whyNote.trim())} onClick={() => void answer("right", () => onWhy(card.id, takes, whyNote))}>{Icons.check} {t.polish.whySave}</Button>
                </div>
              </article>
            );
          }
          if (card.kind === "light") {
            const i = byId.get(card.l.id);
            if (!i) return null;
            return (
              <article key={card.key} ref={refTop} className={`${cls} polish-card--swipe`} aria-hidden={!isTop}
                onPointerDown={isTop ? onDown : undefined} onPointerMove={isTop ? onMove : undefined}
                onPointerUp={isTop ? (e) => onUp(e, card) : undefined} onPointerCancel={isTop ? (e) => onUp(e, card) : undefined}>
                {isTop && <>
                  <span ref={stampNo} className="polish-card__stamp polish-card__stamp--no" aria-hidden>{t.polish.lightOut}</span>
                  <span ref={stampYes} className="polish-card__stamp polish-card__stamp--yes" aria-hidden>{t.polish.lightKeep}</span>
                </>}
                <span className="polish-card__shot"><Thumb item={i} image={imageOf(i)} className="polish-card__media" />{isTop && info(i)}</span>
                {sheet(isTop)}
                <div className="polish-card__body">
                  <span className="polish-card__name">{i.name}</span>
                  <p className="polish-card__reason">{card.l.reason}</p>
                  <p className="polish-card__hint">{t.polish.lightHint(boardSize, BOARD_TARGET)}</p>
                </div>
                <div className="polish-card__actions">
                  <Button variant="ghost" className="polish-card__no" disabled={!isTop} onClick={() => void answer("left", () => onLightOut(card.l))}>{Icons.x} {t.polish.lightOut}</Button>
                  <Button variant="primary" className="polish-card__yes" disabled={!isTop} onClick={() => void answer("right", () => onLightKeep(card.l))}>{Icons.check} {t.polish.lightKeep}</Button>
                </div>
              </article>
            );
          }
          if (card.kind === "gap") {
            return (
              <article key={card.key} ref={refTop} className={cls} aria-hidden={!isTop}>
                <div className="polish-card__gap" aria-hidden><span className="polish-card__gapmark">{Icons.search}</span></div>
                <div className="polish-card__body">
                  <span className="polish-card__name">{t.polish.gapOf(t.polish.takes[card.take])}</span>
                  <p className="polish-card__hint">{t.polish.gapHint}</p>
                </div>
                <div className="polish-card__actions">
                  <Button variant="ghost" disabled={!isTop} onClick={() => void answer("left", () => onGapOk(card.take))}>{t.polish.gapOk}</Button>
                  <Button variant="primary" disabled={!isTop} onClick={() => onGapSearch(card.take)}>{Icons.search} {t.polish.gapSearch}</Button>
                </div>
              </article>
            );
          }
          if (card.kind === "tone") {
            const i = byId.get(card.o.id);
            if (!i) return null;
            return (
              <article key={card.key} ref={refTop} className={`${cls} polish-card--swipe`} aria-hidden={!isTop}
                onPointerDown={isTop ? onDown : undefined} onPointerMove={isTop ? onMove : undefined}
                onPointerUp={isTop ? (e) => onUp(e, card) : undefined} onPointerCancel={isTop ? (e) => onUp(e, card) : undefined}>
                {isTop && <>
                  <span ref={stampNo} className="polish-card__stamp polish-card__stamp--no" aria-hidden>{t.polish.remove}</span>
                  <span ref={stampYes} className="polish-card__stamp polish-card__stamp--yes" aria-hidden>{t.polish.keep}</span>
                </>}
                <span className="polish-card__shot"><Thumb item={i} image={imageOf(i)} className="polish-card__media" />{isTop && info(i)}</span>
                {sheet(isTop)}
                <div className="polish-card__body">
                  <span className="polish-card__name">{i.name}</span>
                  <p className="polish-card__reason">{card.o.reason}</p>
                  <p className="polish-card__hint">{t.polish.outHint}</p>
                </div>
                <div className="polish-card__actions">
                  <Button variant="ghost" className="polish-card__no" disabled={!isTop} onClick={() => void answer("left", () => onOut(card.o))}>{Icons.x} {t.polish.remove}</Button>
                  <Button variant="primary" className="polish-card__yes" disabled={!isTop} onClick={() => void answer("right", () => onKeep(card.o))}>{Icons.check} {t.polish.keep}</Button>
                </div>
              </article>
            );
          }
          if (card.kind === "duel") {
            const [a, b] = card.d.ids.map((id) => byId.get(id));
            if (!a || !b) return null;
            return (
              <article key={card.key} ref={refTop} className={`${cls} polish-card--swipe`} aria-hidden={!isTop}
                onPointerDown={isTop ? onDown : undefined} onPointerMove={isTop ? onMove : undefined}
                onPointerUp={isTop ? (e) => onUp(e, card) : undefined} onPointerCancel={isTop ? (e) => onUp(e, card) : undefined}>
                {isTop && <>
                  <span ref={stampNo} className="polish-card__stamp polish-card__stamp--no polish-card__stamp--pick" aria-hidden>{a.name}</span>
                  <span ref={stampYes} className="polish-card__stamp polish-card__stamp--yes polish-card__stamp--pick" aria-hidden>{b.name}</span>
                </>}
                <div className="polish-card__duel">
                  {[a, b].map((i, side) => (
                    <span key={i.id} className="polish-card__shot">
                      <button type="button" className="polish-card__side" disabled={!isTop}
                        onClick={() => void answer(side === 0 ? "left" : "right", () => onWin(card.d, i.id!))}>
                        <Thumb item={i} image={imageOf(i)} />
                        <span className="polish-card__refname">{i.name}</span>
                        <span className="polish-card__pick">{t.polish.duelPick}</span>
                      </button>
                      {isTop && info(i)}
                    </span>
                  ))}
                  <span className="polish-card__vs" aria-hidden>vs</span>
                </div>
                {sheet(isTop)}
                <div className="polish-card__body">
                  <p className="polish-card__reason">{card.d.reason}</p>
                  <p className="polish-card__hint">{t.polish.duelHint}</p>
                </div>
                <div className="polish-card__actions">
                  <Button variant="ghost" disabled={!isTop} onClick={() => void answer("right", () => onBoth(card.d))}>{t.polish.keepBoth}</Button>
                </div>
              </article>
            );
          }
          const refs = card.g.ids.map((id) => byId.get(id)).filter((x): x is InspoItem => !!x);
          const chosen = isTop && choice && refs.some((i) => i.id === choice) ? choice : null;
          return (
            <article key={card.key} ref={refTop} className={cls} aria-hidden={!isTop}>
              <div className="polish-card__body">
                <p className="polish-card__reason">{card.g.reason}</p>
                <p className="polish-card__hint">{t.polish.dupesHint}</p>
              </div>
              <div className="polish-card__refs" role="radiogroup" aria-label={t.polish.keepThis}>
                {refs.map((i) => (
                  <span key={i.id} className="polish-card__shot">
                    <button type="button" role="radio" aria-checked={chosen === i.id} disabled={!isTop}
                      className={`polish-card__ref${chosen === i.id ? " is-on" : ""}`}
                      onClick={() => setChoice((c) => (c === i.id ? null : i.id!))}>
                      <Thumb item={i} image={imageOf(i)} />
                      <span className="polish-card__refname">{i.name}</span>
                      <span className="polish-card__tick" aria-hidden>{Icons.check}</span>
                    </button>
                    {isTop && info(i)}
                  </span>
                ))}
              </div>
              {sheet(isTop)}
              <div className="polish-card__actions">
                <Button variant="ghost" disabled={!isTop} onClick={() => void answer("left", () => onApart(card.g))}>{t.polish.notDupes}</Button>
                <span className="polish-card__pair">
                  <Button variant="ghost" disabled={!isTop || !chosen} title={t.polish.mergeHint} onClick={() => chosen && void answer("right", () => onMerge(card.g, chosen))}>{t.polish.merge}</Button>
                  <Button variant="primary" disabled={!isTop || !chosen} onClick={() => chosen && void answer("right", () => onKeepOne(card.g, chosen))}>{Icons.check} {t.polish.keepThis}</Button>
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {foot}
    </>
  );
}

function Counter({ value, sample, onFill }: { value: string; sample?: string; onFill?: (text: string) => void }) {
  const { t } = useT();
  return (
    <span className="polish-counter">
      {DEV_SAMPLES && sample && onFill && (
        <button type="button" className="polish-counter__fill" onClick={() => onFill(sample)}>Rellenar (dev)</button>
      )}
      {t.polish.counter(value.length, BRIEF_TEXT_MAX)}
    </span>
  );
}

export default function PolishModal({ project, board, library, tagMap, imageOf, comments, hasDesignMd, archived, onArchive, onSearch, onBrief, onClose }: Props) {
  const { t } = useT();
  const [state, setState] = useState<PolishState | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<Step>("project");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());

  // The saved brief opens on the games; a project without one starts at the first question
  useEffect(() => {
    let alive = true;
    loadPolish(project.id).then((r) => {
      if (!alive) return;
      if (!r.ok) { setError(r.error); setState(EMPTY_POLISH); return; }
      setState(r.data);
      if (r.data.brief) { const { updatedAt: _a, updatedBy: _b, ...rest } = r.data.brief; setDraft(rest); setStep("games"); }
    });
    return () => { alive = false; };
  }, [project.id]);

  const patch = useCallback((p: Partial<Draft>) => { setDraft((d) => ({ ...d, ...p })); setDirty(true); }, []);
  const toggleIn = (list: string[], key: string, max = Infinity) =>
    list.includes(key) ? list.filter((k) => k !== key) : list.length >= max ? [...list.slice(1), key] : [...list, key];

  const save = useCallback(async (): Promise<PolishState | null> => {
    setSaving(true); setError("");
    const r = await savePolishBrief(project.id, draft).catch((e) => ({ ok: false as const, error: String(e) }));
    setSaving(false);
    if (!r.ok) { setError(r.error); return null; }
    setState(r.data); setDirty(false);
    onBrief?.(r.data.brief?.about ?? "");
    return r.data;
  }, [project.id, draft]);

  const run = useCallback(async () => {
    setRunning(true); setError("");
    try {
      const res = await fetch("/api/polish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id }) });
      const json = await res.json().catch(() => ({})) as PolishState & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error || t.polish.failed);
      setState(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setRunning(false); }
  }, [project.id, t]);

  const go = async (next: Step) => {
    if (next === "games" && dirty) { if (!(await save())) return; }
    setStep(next);
  };
  const idx = STEPS.indexOf(step);
  const close = () => { if (dirty) void save(); onClose(); };
  // One scroll container for every step: a new step starts at its top, not where the last one was left
  const bodyEl = useRef<HTMLDivElement | null>(null);
  useEffect(() => { bodyEl.current?.scrollTo({ top: 0 }); }, [step]);

  // ─── Decisions ───────────────────────────────────────────────────────────
  const byId = useMemo(() => new Map(board.filter((i) => i.id).map((i) => [i.id!, i])), [board]);
  const boardIds = useMemo(() => new Set(byId.keys()), [byId]);
  const pending = useMemo(() => (state ? pendingOf(state, boardIds) : { dupes: [], offTone: [], duels: [], light: [] }), [state, boardIds]);
  // Shows the error and rethrows: the deck needs to know, to bring the card back
  const withBusy = async (ids: string[], fn: () => Promise<void>) => {
    setBusyIds((s) => new Set([...s, ...ids]));
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); throw e; }
    finally { setBusyIds((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; }); }
  };
  const decide = async (d: { notDupes?: string[]; keptTone?: string[]; keptDuel?: string[]; keptLight?: string[] }) => {
    const r = await decidePolish(project.id, d).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) throw new Error(r.error);
    setState(r.data);
  };
  const toArchive = (ids: string[]) => onArchive(ids.map((id) => byId.get(id)!).filter(Boolean), true);
  const keepOne = (g: DupeGroup, keep: string) => withBusy(g.ids, async () => { await toArchive(g.ids.filter((id) => id !== keep)); count("merged"); });
  const notDupes = (g: DupeGroup) => withBusy(g.ids, async () => { await decide({ notDupes: g.ids }); count("apart"); });
  const takeOut = (o: OffTone) => withBusy([o.id], async () => { await toArchive([o.id]); count("out"); });
  const keepTone = (o: OffTone) => withBusy([o.id], async () => { await decide({ keptTone: [o.id] }); count("kept"); });
  const mergeOne = (g: DupeGroup, keep: string) => withBusy(g.ids, async () => {
    const r = await mergePolish(project.id, keep, g.ids.filter((id) => id !== keep)).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) throw new Error(r.error);
    await toArchive(g.ids.filter((id) => id !== keep));
    count("merged");
  });
  const win = (d: Duel, keep: string) => withBusy(d.ids, async () => { await toArchive(d.ids.filter((id) => id !== keep)); count("out"); });
  const lightOut = (l: Light) => withBusy([l.id], async () => { await toArchive([l.id]); count("out"); });
  const lightKeep = (l: Light) => withBusy([l.id], async () => { await decide({ keptLight: [l.id] }); count("kept"); });
  const why = (id: string, takes: Take[], note: string) => withBusy([id], async () => {
    const r = await savePolishWhy(project.id, id, { takes, note }).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) throw new Error(r.error);
    setState(r.data); count("why");
  });
  // Gaps left as they are, and the whys skipped, for this sitting
  const [gapsOk, setGapsOk] = useState<Set<Take>>(() => new Set());
  const [whySkipped, setWhySkipped] = useState(false);
  const gapOk = async (take: Take) => { setGapsOk((x) => new Set([...x, take])); count("gaps"); };
  const restore = (i: InspoItem) => withBusy([i.id!], () => onArchive([i], false));
  const both = (d: Duel) => withBusy(d.ids, async () => { await decide({ keptDuel: d.ids }); count("kept"); });

  // ─── Tone examples: a reference of the team's with that look, the board first; a bundled cover when they have none ─
  const exampleFor = useCallback((style: string): InspoItem | null => {
    const pick = (list: InspoItem[]) => list
      .map((i) => ({ i, p: tagMap[i.web]?.style === style ? tagMap[i.web].styleP : 0 }))
      .filter((x) => x.p > 0).sort((a, b) => b.p - a.p)[0]?.i ?? null;
    return pick(board) ?? pick(library);
  }, [board, library, tagMap]);
  const [toneShown, setToneShown] = useState<string>(() => STYLES[0].key);
  useEffect(() => { if (draft.tone[0]) setToneShown(draft.tone[0]); }, [draft.tone]);

  const run0 = state?.run ?? null;
  const stale = !!(run0 && state?.brief && state.brief.updatedAt > run0.at);
  const newSince = run0 ? [...boardIds].filter((id) => !run0.itemIds.includes(id)).length : 0;

  // The deck: one card per open question. First the polishing (tone, a glance each; duels;
  // duplicates; size while the board is over the target), then a why for each reference that
  // survived (a dozen, not the whole board), and last the gaps those whys leave
  const noWhy = useMemo(() => board.filter((i) => i.id && !state?.whys[i.id] && !whySkipped).map((i) => i.id!), [board, state, whySkipped]);
  const gaps = useMemo(() => (state ? gapsOf(state.whys, boardIds).filter((g) => !gapsOk.has(g)) : []), [state, boardIds, gapsOk]);
  const cards = useMemo<Card[]>(() => [
    ...pending.offTone.map((o): Card => ({ kind: "tone", key: `t:${o.id}`, o })),
    ...pending.duels.map((d): Card => ({ kind: "duel", key: `v:${d.ids.join("|")}`, d })),
    ...pending.dupes.map((g): Card => ({ kind: "dupe", key: `d:${g.ids.join("|")}`, g })),
    ...pending.light.map((l): Card => ({ kind: "light", key: `l:${l.id}`, l })),
    ...noWhy.map((id): Card => ({ kind: "why", key: `w:${id}`, id })),
    ...gaps.map((take): Card => ({ kind: "gap", key: `g:${take}`, take })),
  ], [noWhy, pending, gaps]);
  // What this sitting decided, for the progress and the closing summary; a new run starts over
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  useEffect(() => { setTally(EMPTY_TALLY); setWhySkipped(false); }, [run0?.at]);
  const count = (k: keyof Tally, n = 1) => setTally((x) => ({ ...x, [k]: x[k] + n }));

  return (
    <Dialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="modal--polish" aria-busy={!state}>
        <div className="polish-head">
          {idx > 0 && step !== "games" ? (
            <Button variant="icon" aria-label={t.polish.back} onClick={() => setStep(STEPS[idx - 1])}><span className="polish-back">{Icons.arrow}</span></Button>
          ) : <span className="polish-head__spacer" />}
          <DialogTitle className="sr-only">{t.polish.title(project.name)}</DialogTitle>
          <nav className="polish-tabs" aria-label={t.polish.title(project.name)}>
            {STEPS.map((s) => (
              <button key={s} type="button" className={`polish-tab${s === step ? " is-active" : ""}`}
                disabled={!state || (s === "games" && !state.brief && !dirty)}
                aria-current={s === step ? "step" : undefined}
                onClick={() => void go(s)}>{t.polish.tabs[s]}</button>
            ))}
          </nav>
          <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
        </div>

        <div className="polish-body" ref={bodyEl}>
          {!state ? <div className="polish-loading"><span className="spinner" /></div> : <>
            {step === "project" && (
              <section className="polish-step">
                <h2 className="display polish-h">{t.polish.intro}</h2>
                <p className="polish-lead">{t.polish.introHint}</p>
                <div className="field">
                  <span className="field__label">{t.polish.sectorLabel}</span>
                  <div className="polish-sectors" role="group" aria-label={t.polish.sectorLabel}>
                    {SECTORS.map((s) => (
                      <button key={s.key} type="button" className={`polish-sector${draft.sector === s.key ? " is-on" : ""}`}
                        aria-pressed={draft.sector === s.key}
                        onClick={() => patch({ sector: draft.sector === s.key ? null : s.key })}>
                        {t.taxonomy.sector[s.key as keyof typeof t.taxonomy.sector]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="polish-about">{t.polish.aboutLabel}</label>
                  <textarea id="polish-about" className="input polish-text" rows={4} maxLength={BRIEF_TEXT_MAX} value={draft.about}
                    placeholder={t.polish.aboutPlaceholder} onChange={(e) => patch({ about: e.target.value })} />
                  <Counter value={draft.about} sample={DEV_SAMPLES?.about} onFill={(about) => patch({ about })} />
                </div>
              </section>
            )}

            {step === "audience" && (
              <section className="polish-step">
                <h2 className="display polish-h">{t.polish.audienceLabel}</h2>
                <p className="polish-lead">{t.polish.audienceHint}</p>
                <div className="polish-chips" role="group" aria-label={t.polish.audienceLabel}>
                  {AUDIENCES.map((a) => (
                    <button key={a} type="button" className={`chip polish-chip${draft.audience.includes(a) ? " is-active" : ""}`}
                      aria-pressed={draft.audience.includes(a)}
                      onClick={() => patch({ audience: toggleIn(draft.audience, a) as Audience[] })}>{t.polish.audiences[a]}</button>
                  ))}
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="polish-audience">{t.polish.audienceNoteLabel}</label>
                  <textarea id="polish-audience" className="input polish-text" rows={3} maxLength={BRIEF_TEXT_MAX} value={draft.audienceNote}
                    placeholder={t.polish.audienceNotePlaceholder} onChange={(e) => patch({ audienceNote: e.target.value })} />
                  <Counter value={draft.audienceNote} sample={DEV_SAMPLES?.audienceNote} onFill={(audienceNote) => patch({ audienceNote })} />
                </div>
              </section>
            )}

            {step === "tone" && (() => {
              const shown = STYLES.find((s) => s.key === toneShown) ?? STYLES[0];
              const example = exampleFor(shown.key);
              const on = draft.tone.includes(shown.key);
              return (
                <section className="polish-step polish-step--tone">
                  <h2 className="display polish-h">{t.polish.toneLabel}</h2>
                  <p className="polish-lead">{t.polish.toneHint}</p>
                  <div className={`polish-tone__stage${on ? " is-on" : ""}`}>
                    {example
                      ? <Thumb item={example} image={imageOf(example)} className="polish-tone__img" />
                      : <span className="polish-thumb polish-tone__img" aria-hidden><img src={toneCover(shown.key)} alt="" decoding="async" /></span>}
                    <div className="polish-tone__caption">
                      <span className="display polish-tone__name">{t.taxonomy.style[shown.key as keyof typeof t.taxonomy.style]}</span>
                      <span className="polish-tone__from">{example ? t.polish.toneFrom(example.name) : t.polish.toneNoExample}</span>
                    </div>
                    <Button variant={on ? "default" : "primary"} className="polish-tone__pick" aria-pressed={on}
                      onClick={() => patch({ tone: toggleIn(draft.tone, shown.key, 2) })}>
                      {on ? <>{Icons.check} {t.polish.toneUsed}</> : t.polish.toneUse}
                    </Button>
                  </div>
                  <div className="polish-tone__picker" role="tablist" aria-label={t.polish.toneLabel}>
                    {STYLES.map((s) => {
                      const ex = exampleFor(s.key);
                      const picked = draft.tone.includes(s.key);
                      return (
                        <button key={s.key} type="button" role="tab" aria-selected={s.key === toneShown}
                          className={`polish-tone__dot${s.key === toneShown ? " is-shown" : ""}${picked ? " is-on" : ""}`}
                          title={t.taxonomy.style[s.key as keyof typeof t.taxonomy.style]} onClick={() => setToneShown(s.key)}>
                          {ex ? <Thumb item={ex} image={imageOf(ex)} /> : <span className="polish-thumb" aria-hidden><img src={toneCover(s.key)} alt="" loading="lazy" decoding="async" /></span>}
                          {picked && <span className="polish-tone__tick">{Icons.check}</span>}
                          <span className="polish-tone__label">{t.taxonomy.style[s.key as keyof typeof t.taxonomy.style]}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            {step === "avoid" && (
              <section className="polish-step polish-step--wide">
                <h2 className="display polish-h">{t.polish.avoidLabel}</h2>
                <p className="polish-lead">{t.polish.avoidHint}</p>
                <div className="polish-picks" role="group" aria-label={t.polish.avoidLabel}>
                  {board.filter((i) => i.id).map((i) => {
                    const on = draft.avoidItems.includes(i.id!);
                    return (
                      <button key={i.id} type="button" className={`polish-pick${on ? " is-on" : ""}`} aria-pressed={on} title={i.name}
                        onClick={() => patch({ avoidItems: toggleIn(draft.avoidItems, i.id!) })}>
                        <Thumb item={i} image={imageOf(i)} />
                        <span className="polish-pick__name">{i.name}</span>
                        <span className="polish-pick__mark" aria-hidden>{Icons.x}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="polish-avoid">{t.polish.avoidNoteLabel}</label>
                  <textarea id="polish-avoid" className="input polish-text" rows={3} maxLength={BRIEF_TEXT_MAX} value={draft.avoid}
                    placeholder={t.polish.avoidNotePlaceholder} onChange={(e) => patch({ avoid: e.target.value })} />
                  <Counter value={draft.avoid} sample={DEV_SAMPLES?.avoid} onFill={(avoid) => patch({ avoid })} />
                </div>
              </section>
            )}

            {step === "seconds" && (
              <section className="polish-step">
                <h2 className="display polish-h">{t.polish.secondsLabel}</h2>
                <p className="polish-lead">{t.polish.secondsHint}</p>
                <div className="polish-chips" role="group" aria-label={t.polish.secondsLabel}>
                  {t.polish.secondsOptions.map((o) => (
                    <Button key={o} variant={draft.firstSeconds === o ? "primary" : "ghost"} className="polish-chip" aria-pressed={draft.firstSeconds === o} onClick={() => patch({ firstSeconds: o })}>{o}</Button>
                  ))}
                </div>
                <div className="field">
                  <textarea id="polish-seconds" className="input polish-text" rows={5} maxLength={BRIEF_TEXT_MAX} value={draft.firstSeconds}
                    aria-label={t.polish.secondsLabel} placeholder={t.polish.secondsPlaceholder} onChange={(e) => patch({ firstSeconds: e.target.value })} />
                  <Counter value={draft.firstSeconds} sample={DEV_SAMPLES?.firstSeconds} onFill={(firstSeconds) => patch({ firstSeconds })} />
                </div>
              </section>
            )}

            {step === "games" && (
              <section className="polish-step polish-step--wide polish-games">
                {running ? (
                  <Waiting board={board} imageOf={imageOf} />
                ) : !run0 || stale ? (
                  <div className="polish-run">
                    <h2 className="display polish-h">{t.polish.tabs.games}</h2>
                    {stale && <p className="polish-lead">{t.polish.briefChanged}</p>}
                    <p className="polish-lead">{board.length < 2 ? t.polish.tooFew : t.polish.runHint(board.length)}</p>
                    <Button variant="primary" onClick={() => void run()} disabled={board.length < 2}>{Icons.gem} {run0 ? t.polish.rerun : t.polish.run}</Button>
                  </div>
                ) : (
                  <Deck
                    cards={cards} done={tally.out + tally.kept + tally.merged + tally.apart + tally.why + tally.gaps} tally={tally} boardSize={board.length} noWhy={noWhy.length} onSkipWhys={() => setWhySkipped(true)}
                    byId={byId} imageOf={imageOf} tagMap={tagMap} comments={comments} hasDesignMd={hasDesignMd} busy={(ids) => ids.some((id) => busyIds.has(id))}
                    onOut={(o) => takeOut(o)} onKeep={(o) => keepTone(o)}
                    onKeepOne={(g, id) => keepOne(g, id)} onMerge={(g, id) => mergeOne(g, id)} onApart={(g) => notDupes(g)}
                    onWin={(d, id) => win(d, id)} onBoth={(d) => both(d)}
                    onWhy={(id, takes, note) => why(id, takes, note)}
                    onLightOut={(l) => lightOut(l)} onLightKeep={(l) => lightKeep(l)}
                    onGapSearch={(take) => { onSearch(t.polish.takes[take]); onClose(); }} onGapOk={gapOk}
                    archive={
                      <details className="polish-archive">
                        <summary className="polish-archive__sum">{t.polish.archive} <span className="polish-game__n">{archived.length}</span></summary>
                        <p className="polish-card__hint">{t.polish.archiveHint}</p>
                        {archived.length ? (
                          <ul className="polish-archive__list">
                            {archived.map((i) => (
                              <li key={i.id} className={busyIds.has(i.id!) ? "is-busy" : ""}>
                                <Thumb item={i} image={imageOf(i)} />
                                <span className="polish-card__refname">{i.name}</span>
                                <Button variant="ghost" size="sm" onClick={() => void restore(i)}>{t.polish.restore}</Button>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="polish-sheet__muted">{t.polish.archiveEmpty}</p>}
                      </details>
                    }
                    foot={
                      <div className="polish-again">
                        {newSince > 0 && <span className="polish-again__note">{t.polish.newSince(newSince)}</span>}
                        <Button variant="ghost" size="sm" onClick={() => void run()} disabled={board.length < 2}>{t.polish.rerun}</Button>
                      </div>
                    }
                  />
                )}
              </section>
            )}
          </>}
        </div>

        {state && step !== "games" && (
          <div className="polish-foot">
            {error && <p className="modal__error">{error}</p>}
            {state.brief && !dirty && <span className="polish-foot__saved">{t.polish.saved}</span>}
            {step === "seconds" ? (
              <Button variant="primary" disabled={saving} onClick={() => void go("games")}>{saving ? <span className="spinner" /> : null} {t.polish.saveAndPolish}</Button>
            ) : (
              <Button variant="primary" onClick={() => setStep(STEPS[idx + 1])}>{t.polish.continue} {Icons.arrow}</Button>
            )}
          </div>
        )}
        {state && step === "games" && error && <div className="polish-foot"><p className="modal__error">{error}</p></div>}
      </DialogContent>
    </Dialog>
  );
}
