"use client";
// Discover › Vault: the pieces we curate ourselves (types/vault.ts), as cards with their picture, sorted by what they
// are: a kind of section or a detail, laid as a masonry: a card with a loop takes the loop's own shape and plays it for as long as
// it is in view. The categories wait in a menu on the right of Discover's row, as the kinds of resource do, with how many each holds; a card
// opens the entry as a sheet over the grid (?entry=<slug>), the board's own Viewer: the piece on the stage and, down its right, what it is, its facts and its tags. On the stage the piece itself runs,
// in a sandboxed frame (app/api/vault/[entry]/preview), or its loop where it has one, and "Live preview" opens the piece alone in a tab. The documentation
// (the code, block by block) is a second view of the stage, for partners only: everyone else's agent reads it through the connector, which
// is where it is used. Entries are written from an agent (add_to_vault), not here.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Clouds from "@/components/Clouds";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Avatar, Button, Icon, IconButton, MenuItem, SegmentedControl, toneFor } from "@/components/criterio";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate } from "@/lib/i18n/format";
import { plain } from "@/lib/resources";
import { tokenLines } from "@/lib/code-tokens";
import type { VaultCard, VaultEntry } from "@/types/vault";
import { useT } from "./I18nProvider";
import { growFromPress, shrinkAway } from "./ItemPanel";
import LoopVideo from "./LoopVideo";
import SoundControl from "./SoundControl";
import ZoomPill from "./ZoomPill";
import "./Vault.css";

interface Listing { entries: VaultCard[]; partner: boolean; picks: Record<string, string[]> }
// Read once per visit: coming back from an entry, or from another section, shows the cards at once
let cache: Listing | null = null;

const entryInUrl = () => new URLSearchParams(window.location.search).get("entry");
function setEntryInUrl(slug: string | null) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("entry", slug); else url.searchParams.delete("entry");
  window.history.pushState(null, "", url);
}

export default function Vault({ query, head, projects }: { projects: readonly { id: string; name: string }[]; query: string; head: (lead: string, picker?: React.ReactNode) => React.ReactNode }) {
  const { t } = useT();
  const [data, setData] = useState<Listing | null>(cache);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  // The grid's node, held as state: it comes and goes with what is shown, and its width decides the columns
  const [grid, setGrid] = useState<HTMLUListElement | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!grid) return;
    const read = () => setWidth(grid.clientWidth);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [grid]);

  useEffect(() => {
    let alive = true;
    fetch("/api/vault").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((d: Listing) => { cache = d; if (alive) setData(d); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  // The open entry lives in the address, so Back closes it and a link opens it
  useEffect(() => {
    const read = () => setOpen(entryInUrl());
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  // The projects each entry is chosen for, as the team changes them from a card or a sheet: kept with the listing
  const setPicks = useCallback((id: string, projects: string[]) => setData((d) => { if (!d) return d; const next = { ...d, picks: { ...d.picks, [id]: projects } }; cache = next; return next; }), []);
  // The zoom, as on the board: columns away from the usual number (positive is closer, fewer columns), kept for the next visit
  const [zoom, setZoomState] = useState(0);
  useLayoutEffect(() => {
    try { const z = Number(localStorage.getItem(ZOOM_KEY) ?? NaN); if (Number.isInteger(z) && Math.abs(z) < 8) setZoomState(z); } catch { /* no storage */ }
  }, []);
  const setZoom = useCallback((z: number) => { setZoomState(z); try { localStorage.setItem(ZOOM_KEY, String(z)); } catch { /* no storage */ } }, []);
  // An entry's loop, as the team just changed it from its sheet, or its shape as a browser measured it (a loop whose file did not say)
  const patch = useCallback((id: string, fields: Partial<VaultCard>) => setData((d) => { if (!d) return d; const next = { ...d, entries: d.entries.map((x) => (x.id === id ? { ...x, ...fields } : x)) }; cache = next; return next; }), []);
  const show = useCallback((slug: string | null) => { setEntryInUrl(slug); setOpen(slug); }, []);
  // From one open entry to the next: the same sheet, and the same step of history (Back still closes it)
  const step = useCallback((slug: string) => { const url = new URL(window.location.href); url.searchParams.set("entry", slug); window.history.replaceState(null, "", url); setOpen(slug); }, []);

  const labelOf = useCallback((key: string) => (t.taxonomy.section as Record<string, string>)[key] ?? (t.vault.details as Record<string, string>)[key] ?? key, [t]);
  const entries = useMemo(() => data?.entries ?? [], [data]);
  // Only the categories that hold something, sections first and then details, each in the list's own order
  const rail = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    // One list by name: no split between sections and details
    return [...counts].map(([key, n]) => ({ key, n, label: labelOf(key) })).sort((x, y) => x.label.localeCompare(y.label));
  }, [entries, labelOf]);
  const shown = useMemo(() => {
    const words = plain(query).split(/\s+/).filter(Boolean);
    return entries.filter((e) => (!category || e.category === category) && words.every((w) => plain([e.title, labelOf(e.category), e.summary, e.tags.join(" ")].join(" ")).includes(w)));
  }, [entries, category, query, labelOf]);

  // How many columns: the usual number is as many as fit at 300 or more (100%), and the zoom moves away from it, down
  // to two and up to where a card can still be read. A phone takes its own from its width
  const fit = (min: number) => Math.floor((width + GRID_GAP) / (min + GRID_GAP));
  const phone = !!width && width < 640;
  const maxCols = Math.max(COLUMNS_MIN, Math.min(COLUMNS_MAX, fit(COLUMN_SMALLEST)));
  const clampCols = (n: number) => Math.min(maxCols, Math.max(COLUMNS_MIN, n));
  const base = clampCols(fit(COLUMN_MIN));
  const cols = phone ? Math.max(1, fit(COLUMN_MIN)) : clampCols(base - zoom);
  // A step from the columns on screen, not from the kept number: past either end the buttons don't pile up steps
  const stepZoom = useRef((_by: number) => {});
  stepZoom.current = (by) => { const next = clampCols(cols + by); if (!phone && width && next !== cols) setZoom(base - next); };
  // A pinch on the trackpad, or ctrl/⌘ + wheel, zooms the grid instead of the page: pinching in is more columns
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let sum = 0, last = 0;
    const onWheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      if (ev.timeStamp - last > 300) sum = 0;
      last = ev.timeStamp;
      sum += ev.deltaY;
      if (Math.abs(sum) < 40) return;
      stepZoom.current(sum > 0 ? 1 : -1);
      sum = 0;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  // The masonry, as the board lays its own: every card is one flat node, placed by transform from numbers known before
  // anything loads (the shot's shape, and a foot of a fixed height). Each card, in the list's order, goes to the
  // shortest column so far. A change of columns (a zoom, a narrower window) moves and resizes the same nodes, so the
  // cards glide to their new place and a loop goes on playing
  const foot = category ? FOOT_BARE : FOOT_FULL;
  const layout = useMemo(() => {
    if (!width) return null;
    const col = (width - GRID_GAP * (cols - 1)) / cols;
    const heights = Array.from({ length: cols }, () => 0);
    const at = new Map<string, { x: number; y: number }>();
    for (const e of shown) {
      let to = 0;
      for (let i = 1; i < cols; i++) if (heights[i] < heights[to] - 1) to = i;
      at.set(e.id, { x: to * (col + GRID_GAP), y: heights[to] });
      heights[to] += (col - CARD_EDGE) / shapeOf(e) + CARD_EDGE + foot + GRID_GAP;
    }
    return { col, at, height: Math.max(0, ...heights) - GRID_GAP };
  }, [shown, width, cols, foot]);
  // The first placement is not a move: the cards only glide once they have been somewhere
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!layout || settled) return;
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, [layout, settled]);

  const opened = open ? entries.find((e) => e.slug === open) ?? null : null;
  // The entries before and after the open one, in the order the grid lists them (the category and the search count)
  const at = open ? shown.findIndex((e) => e.slug === open) : -1;
  const before = at > 0 ? shown[at - 1] : null;
  const after = at >= 0 && at < shown.length - 1 ? shown[at + 1] : null;
  return (
    <>
      {open && data && (
        <VaultSheet slug={open} onPrev={before ? () => step(before.slug) : undefined} onNext={after ? () => step(after.slug) : undefined} card={opened} partner={data.partner} projects={projects} used={opened ? data.picks?.[opened.id] ?? [] : []} onPicks={(v) => { if (opened) setPicks(opened.id, v); }} labelOf={labelOf} onClose={() => show(null)}
          onPatch={(fields) => { if (opened) patch(opened.id, fields); }} onCategory={(c) => { setCategory(c); show(null); }} />
      )}
      <div className="disc-list" ref={scroller}>
        {head(t.vault.lead, rail.length > 0 && (
          // The categories wait in a menu on the right of the row, as the kinds of resource do: all of them, or one,
          // each with how many it holds. Only the ones that hold something
          <Popover open={menu} onOpenChange={setMenu}>
            <PopoverTrigger className={`cr-btn cr-btn-secondary cr-btn-s disc__group${category ? " is-pressed" : ""}`}>
              {category ? labelOf(category) : t.vault.categories} <Icon name="chevron-down" size={16} />
            </PopoverTrigger>
            <PopoverContent align="end" className="cr-menu disc__menu">
              <MenuItem checked={category === null} onClick={() => { setCategory(null); setMenu(false); }}>{t.vault.all}<span className="vault-menu__n">{entries.length}</span></MenuItem>
              {rail.map((c) => (
                <MenuItem key={c.key} checked={category === c.key} onClick={() => { setCategory(c.key); setMenu(false); }}>{c.label}<span className="vault-menu__n">{c.n}</span></MenuItem>
              ))}
            </PopoverContent>
          </Popover>
        ))}
        {!data ? (
          <p className="disc-list__none">{failed ? t.vault.failed : ""}</p>
        ) : !entries.length ? (
          <div className="vault-empty">
            <p className="t-title-m">{t.vault.emptyTitle}</p>
            <p>{data.partner ? t.vault.emptyPartner : t.vault.empty}</p>
          </div>
        ) : shown.length ? (
          <ul className={`vault-grid${settled ? " is-settled" : ""}`} ref={setGrid} style={{ height: layout?.height, "--foot": `${foot}px` } as React.CSSProperties}>
            {layout && shown.map((e) => {
              const p = layout.at.get(e.id)!;
              return (
                <li key={e.id} style={{ width: layout.col, transform: `translate(${p.x}px, ${p.y}px)` }}><VaultTile entry={e} kind={category ? null : labelOf(e.category)} blank={labelOf(e.category)} projects={projects} used={data.picks?.[e.id] ?? []} onPicks={(v) => setPicks(e.id, v)} onShape={(videoRatio) => patch(e.id, { videoRatio })} onOpen={() => show(e.slug)} /></li>
              );
            })}
          </ul>
        ) : <p className="disc-list__none">{t.vault.none}</p>}
      </div>
      <Clouds />
      {/* The corner pill, the board's own: the zoom (minus, %, plus) where there is a grid to zoom, and the music after a hairline */}
      <ZoomPill className="board-zoom" zoom={width && !phone && shown.length ? {
        pct: Math.round((base / cols) * 100), label: t.zoom.columns(cols),
        canOut: cols < maxCols, canIn: cols > COLUMNS_MIN,
        onOut: () => stepZoom.current(1), onIn: () => stepZoom.current(-1), onReset: () => setZoom(0),
      } : null}>
        <SoundControl />
      </ZoomPill>
    </>
  );
}

// The size a piece is shown at inside a card: the one its picture was taken at, scaled down to the card
const STAGE_W = 800;
const STAGE_H = 600;
// The grid's numbers, the same Vault.css draws with: the gap, the narrowest a column gets, what a card adds to its
// shot at the sides (padding and hairline) and under it (the foot with the name and the category)
const GRID_GAP = 16;
const COLUMN_MIN = 300;
/** Zoomed out, a column gets no narrower than this, and there are never fewer than two nor more than eight */
const COLUMN_SMALLEST = 200;
const COLUMNS_MIN = 2;
const COLUMNS_MAX = 8;
const ZOOM_KEY = "inspo:vault-zoom:1";
const CARD_EDGE = 18;
/** The foot under the shot, a fixed height so a card's is known without measuring it: with the name and the category,
 *  or the name alone when a category is chosen (Vault.css .vault-card__foot reads it as --foot) */
const FOOT_FULL = 64;
const FOOT_BARE = 46;
/** A card's shot, width over height: its loop's own shape, held between a tall phone and a wide strip; without a loop,
 *  the 4:3 its picture is taken at and its piece runs at */
const shapeOf = (e: VaultCard) => (e.video && e.videoRatio ? Math.min(2.4, Math.max(0.6, e.videoRatio)) : STAGE_W / STAGE_H);
/** How long the pointer rests on a card before its piece starts: passing over the grid starts nothing */
const PLAY_AFTER_MS = 140;

/** A card: a raised tile with the picture inside and the name under it. Resting on it with a mouse plays the piece
 *  itself over the picture (the sandboxed preview, scaled to the card): what moves by itself moves, and what answers
 *  to the pointer answers. An entry with a loop plays that instead, by itself and for as long as the card is in view,
 *  and the card takes the loop's shape. A click anywhere, the piece included, opens the entry */
function VaultTile({ entry: e, kind, blank, projects, used, onPicks, onShape, onOpen }: { entry: VaultCard; kind: string | null; blank: string; projects: readonly { id: string; name: string }[]; used: readonly string[]; onPicks: (projects: string[]) => void; onShape: (ratio: number) => void; onOpen: () => void }) {
  const { t } = useT();
  const shot = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const timer = useRef<number>(undefined);
  const [play, setPlay] = useState<{ scale: number } | null>(null);
  const [ready, setReady] = useState(false);
  const opened = useRef(onOpen);
  opened.current = onOpen;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // The piece says when it was clicked (lib/vault-preview.ts cardDoc): only this card's own frame is listened to
  useEffect(() => {
    if (!play) return;
    const heard = (m: MessageEvent) => { if (m.source === frame.current?.contentWindow && (m.data as { vault?: string } | null)?.vault === "open") opened.current(); };
    window.addEventListener("message", heard);
    return () => window.removeEventListener("message", heard);
  }, [play]);
  const enter = (ev: React.PointerEvent) => {
    if (ev.pointerType !== "mouse") return;
    if (e.video || !e.preview) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPlay({ scale: (shot.current?.clientWidth ?? STAGE_W) / STAGE_W }), PLAY_AFTER_MS);
  };
  const leave = () => { window.clearTimeout(timer.current); setPlay(null); setReady(false); };
  return (
    <a className="vault-card" href={`/?in=vault&entry=${encodeURIComponent(e.slug)}`} onPointerEnter={enter} onPointerLeave={leave}
      onClick={(ev) => {
        // A press in the folder's menu reaches here through React, though the menu is drawn elsewhere: not the card's
        if (!ev.currentTarget.contains(ev.target as Node)) return;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault(); onOpen();
      }}>
      <span className="vault-card__shot" ref={shot} style={{ aspectRatio: shapeOf(e) }}>
        {e.image ? <img src={e.image} alt="" loading="lazy" decoding="async" /> : <span className="vault-card__blank">{blank}</span>}
        {/* A loop, where the entry brings one (a piece that moves on scroll, or is heavy to start), in place of the piece:
            it plays by itself while the card is in view, over the picture until it has a frame to show. A loop whose
            file did not say its size tells the grid here, and the card takes its shape */}
        {e.video && <LoopVideo className="vault-card__loop" src={e.video} onSize={e.videoRatio ? undefined : (w, h) => onShape(w / h)} />}
        {play && !e.video && (
          <iframe ref={frame} className={`vault-card__live${ready ? " is-ready" : ""}`} src={`/api/vault/${encodeURIComponent(e.slug)}/preview?card=1${e.category === "buttons" ? "&hover=1" : ""}`} title="" aria-hidden tabIndex={-1}
            sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={() => setReady(true)}
            style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${play.scale})` }} />
        )}
        {/* A button at rest says nothing of what it does: the system's own arrow, drawn with its tip on the piece, says "put yours here". It leaves when the real one arrives */}
        {e.category === "buttons" && !e.video && <svg className="vault-card__hand" width="22" height="22" viewBox="0 0 24 24" aria-hidden focusable="false"><path d="M5 3v16.5l4.2-3.9 2.7 6.2 2.5-1.1-2.7-6.1h5.8z" /></svg>}
        {/* Over the picture on hover, bottom left: the action row a board card has, with its keys. The folder chooses the piece for a
            project, as a card is filed (ember once it is in one); the eye opens it alone in a tab. A press here is never the card's */}
        <span className="vault-card__tools" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); }}>
          <UseInProject slug={e.slug} projects={projects} used={used} onChange={onPicks} compact />
          {e.preview && <IconButton icon="eye" variant="strong" size="s" label={t.vault.live} onClick={() => window.open(`/api/vault/${encodeURIComponent(e.slug)}/preview`, "_blank", "noopener,noreferrer")} />}
        </span>
      </span>
      <span className="vault-card__foot">
        <span className="vault-card__text">
          <span className="vault-card__name">{e.title}</span>
          {kind && <span className="vault-card__kind">{kind}</span>}
        </span>
        <span className="vault-card__go" aria-hidden><Icon name="chevron-right" size={14} /></span>
      </span>
    </a>
  );
}

/** One entry, open: the board's own Viewer over the grid (.ip, .cr-viewer). The piece on the stage, at its loop's shape
 *  or filling it when it runs live; down the right, what it is, who made it, the ways to use it, its facts and tags.
 *  For partners the stage has a second view, its documentation. The arrows (and the keys, and a swipe on a phone) walk
 *  the grid in its order, in the same sheet. Esc, the veil or the cross close it */
function VaultSheet({ slug, card, partner, projects, used, onPicks, onPatch, labelOf, onClose, onCategory, onPrev, onNext }: {
  /** The entry before and after this one in the grid; absent at either end */
  onPrev?: () => void; onNext?: () => void;
  slug: string; card: VaultCard | null; partner: boolean; projects: readonly { id: string; name: string }[]; used: readonly string[]; onPicks: (projects: string[]) => void; onPatch: (fields: Partial<VaultCard>) => void; labelOf: (key: string) => string; onClose: () => void; onCategory: (c: string) => void;
}) {
  const { t, locale } = useT();
  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [missing, setMissing] = useState(false);
  const [view, setView] = useState<"piece" | "docs">("piece");
  // The piece runs on the stage from the start; the picture holds it until the frame has loaded
  const [running, setRunning] = useState(false);
  // The loop and its shape, as the team just set them from here (the entry's own until then)
  const [video, setVideo] = useState<string | null>(card?.video ?? null);
  const [shape, setShape] = useState<number | null>(card?.video ? card.videoRatio : null);
  // Another entry in the same sheet starts from its own card; the view (the piece or its documentation) stays
  const [shown, setShown] = useState(slug);
  if (shown !== slug) { setShown(slug); setEntry(null); setMissing(false); setRunning(false); setVideo(card?.video ?? null); setShape(card?.video ? card.videoRatio : null); }
  useEffect(() => { if (entry) { setVideo(entry.video); if (entry.videoRatio) setShape(entry.videoRatio); } }, [entry]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/vault/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((e: VaultEntry) => { if (alive) setEntry(e); }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [slug]);

  // It grows out of the card that was pressed and goes back into it; Escape, a key, closes at once
  const sheet = useRef<HTMLElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  useLayoutEffect(() => growFromPress(sheet.current), []);
  const close = useRef(onClose);
  close.current = onClose;
  const leave = () => {
    if (leaving.current) return;
    if (!sheet.current) { onClose(); return; }
    leaving.current = true;
    shrinkAway(sheet.current, dim.current, onClose);
  };
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape" || ev.defaultPrevented) return;
      if (document.querySelector("[role=dialog][data-open], .modal-backdrop")) return;
      close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The arrows walk the grid in its order, unless a field or another dialog has them
  const steps = useRef({ onPrev, onNext });
  steps.current = { onPrev, onNext };
  const navigable = !!(onPrev || onNext);
  useEffect(() => {
    if (!navigable) return;
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey || ev.shiftKey) return;
      if ((ev.target as HTMLElement | null)?.closest("input, textarea, select, pre, [contenteditable]:not([contenteditable=false]), [role=slider], [role=tablist]")) return;
      if (document.querySelector("[role=dialog][data-open], .modal-backdrop")) return;
      const go = ev.key === "ArrowLeft" ? steps.current.onPrev : steps.current.onNext;
      if (!go) return;
      ev.preventDefault();
      go();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigable]);
  // A phone: a horizontal swipe over the sheet steps too, as on the board
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (ev: React.TouchEvent) => { const t0 = ev.touches[0]; swipe.current = { x: t0.clientX, y: t0.clientY }; };
  const onTouchEnd = (ev: React.TouchEvent) => {
    const from = swipe.current; swipe.current = null;
    if (!from) return;
    const dx = ev.changedTouches[0].clientX - from.x, dy = ev.changedTouches[0].clientY - from.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    if (dx < 0) onNext?.(); else onPrev?.();
  };

  // The card's own fields paint at once; the rest arrives with the entry (never the one before's, while the next loads)
  const e = (entry?.slug === slug ? entry : null) ?? card;
  const previewUrl = `/api/vault/${encodeURIComponent(slug)}/preview`;
  const live = !!e && !video && e.preview;
  const when = e ? fmtDate(e.createdAt, locale, { day: "numeric", month: "long", year: "numeric" }) : "";
  return createPortal(
    <div className={`ip-layer${navigable ? " has-nav" : ""}`}>
      <div ref={dim} className="ip-dim" onClick={leave} aria-hidden />
      <aside ref={sheet} className="ip cr-viewer vault-ip" role="dialog" aria-modal="true" aria-label={e?.title ?? t.vault.name}>
        <header className="ip-bar cr-viewer-head">
          <span className="cr-avatar cr-avatar-chrome is-square ip-bar__source" aria-hidden>{(e?.title ?? t.vault.name).slice(0, 1).toUpperCase()}</span>
          <div className="cr-viewer-titles">
            <div className="cr-viewer-title">{e?.title ?? t.vault.name}</div>
            <Breadcrumb className="cr-viewer-crumb ip-bar__crumbs">
              <BreadcrumbList>
                <BreadcrumbItem><button type="button" className="ip-bar__crumb" onClick={leave}>{t.vault.name}</button></BreadcrumbItem>
                {e && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem><button type="button" className="ip-bar__crumb" onClick={() => onCategory(e.category)}>{labelOf(e.category)}</button></BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {/* The code is the team's to read here: everyone else's agent reads it through the connector */}
          {partner && e && (
            <SegmentedControl className="ip-bar__tabs" label={t.panel.views} items={[{ label: t.vault.piece }, { label: t.vault.docs }]}
              active={view === "piece" ? 0 : 1} onChange={(i) => setView(i === 0 ? "piece" : "docs")} />
          )}
          <IconButton icon="close" variant="quiet" size="m" className="ip-bar__close" label={t.common.close} onClick={leave} />
        </header>
        {!e ? (
          <div className="ip-bento cr-viewer-body"><div className="ip-stage cr-viewer-stage">{missing && <p className="disc-list__none">{t.vault.gone}</p>}</div></div>
        ) : (
          <div className="ip-bento cr-viewer-body" onTouchStart={navigable ? onTouchStart : undefined} onTouchEnd={navigable ? onTouchEnd : undefined}>
            <div className="ip-stage cr-viewer-stage">
              {navigable && <IconButton icon="chevron-left" variant="default" size="l" className="ip-nav is-prev" label={t.panel.previous} onClick={onPrev} disabled={!onPrev} />}
              {view === "docs" ? (
                <section className="vault-docs">
                  <header className="vault-docs__head">
                    <h2 className="t-title-m">{t.vault.docs}</h2>
                    {!!entry?.blocks?.length && <span className="vault-docs__count">{t.vault.steps(entry.blocks.length)}</span>}
                  </header>
                  {entry?.blocks?.length
                    ? <ol className="vault-steps">{entry.blocks.map((b, i) => <CodeBlock key={i} n={i + 1} title={b.title} lang={b.lang} code={b.code} note={b.note} />)}</ol>
                    : entry ? <p className="vault-sheet__note">{t.vault.noDocs}</p> : null}
                </section>
              ) : (
                // A loop gives the box its own shape, as large as the stage lets it be; the piece running fills the stage
                <div className={`vault-sheet__shot${live ? " is-live" : ""}`} style={video && shape ? ({ "--shape": shape } as React.CSSProperties) : undefined}>
                  {e.image ? <img src={e.image} alt="" decoding="async" /> : <span className="vault-card__blank">{labelOf(e.category)}</span>}
                  {/* With a loop, the box plays the loop, as its card does; the piece itself is one press away ("Live preview") */}
                  {video && <LoopVideo key={video} className="vault-sheet__loop" src={video} onSize={shape ? undefined : (w, h) => { setShape(w / h); onPatch({ videoRatio: w / h }); }} />}
                  {/* What the box holds, said in its corner: a loop (a film mark), or the piece itself, which asks to be tried.
                      The invitation leaves once the pointer is inside */}
                  {video ? <span className="vault-sheet__mark" aria-label={t.vault.isVideo} data-tip={t.vault.isVideo}><Icon name="film" size={16} /></span>
                    : e.preview ? <span className="vault-sheet__try" aria-hidden><i />{t.vault.tryIt}</span> : null}
                  {live && <iframe key={slug} className={`vault-sheet__live-frame${running ? " is-ready" : ""}`} src={previewUrl} title={`${e.title}: ${t.vault.live}`} sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={() => setRunning(true)} />}
                </div>
              )}
              {navigable && <IconButton icon="chevron-right" variant="default" size="l" className="ip-nav is-next" label={t.panel.next} onClick={onNext} disabled={!onNext} />}
            </div>
            {/* Down the right, where a reference has its conversation: what it is, who made it and when, the ways to see and use it, where it sits and its tags */}
            <section className="ip-card--talk cr-viewer-aside vault-sheet__side">
              {e.summary && <p className="vault-sheet__what">{e.summary}</p>}
              {entry?.by && (
                <div className="vault-by">
                  <Avatar initials={entry.by.slice(0, 1).toUpperCase()} name={entry.by} tone={toneFor(entry.by)} src={entry.byImage ?? undefined} size={36} />
                  <div className="vault-by__text">
                    <span className="vault-by__name">{entry.by}</span>
                    <span className="vault-by__when">{when}</span>
                  </div>
                </div>
              )}
              <div className="vault-sheet__actions">
                {/* The piece by itself, in a tab of its own: the same sandboxed page the stage shows. A quiet paper key: the ember is only in its eye, the same one a card shows */}
                {e.preview && <a className="cr-btn cr-btn-secondary cr-btn-s vault-sheet__go" href={previewUrl} target="_blank" rel="noopener noreferrer"><Icon name="eye" size={16} className="vault-sheet__eye" />{t.vault.live}<Icon name="arrow-up-right" size={16} /></a>}
                {e.liveUrl && <a className="cr-btn cr-btn-quiet cr-btn-s vault-sheet__go" href={e.liveUrl} target="_blank" rel="noopener noreferrer">{t.vault.site}<Icon name="arrow-up-right" size={18} /></a>}
                {/* For everyone: ask for this piece without ever holding its code. Choose it for a project (the project's
                    criterio.md then names it to the agent), or copy a line that names it for an agent with Criterio connected */}
                <UseInProject slug={slug} projects={projects} used={used} onChange={onPicks} />
                <CopyForAgent text={t.vault.prompt(e.title, e.slug, labelOf(e.category))} />
              </div>
              <dl className="vault-facts">
                <div><dt>{t.vault.category}</dt><dd><button type="button" className="vault-facts__link" onClick={() => onCategory(e.category)}>{labelOf(e.category)}</button></dd></div>
                {!entry?.by && <div><dt>{t.vault.published}</dt><dd>{when}</dd></div>}
                {entry?.sourceUrl && partner && <div><dt>{t.vault.source}</dt><dd><a className="vault-facts__link" href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">{hostOf(entry.sourceUrl)}</a></dd></div>}
              </dl>
              {e.tags.length > 0 && <ul className="vault-tags">{e.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>}
              {partner && entry?.use && (
                // What an agent reads to choose it, written in English for the agent: the team sees it here to check it, and
                // nobody else does. Set apart from the rest as a note: a moss rule on its left
                <section className="vault-use">
                  <h2 className="t-title-s">{t.vault.use}</h2>
                  <p>{entry.use}</p>
                </section>
              )}
              {entry && !partner && <p className="vault-sheet__note">{t.vault.docsViaAgent}</p>}
              {partner && entry && <VideoControl slug={slug} video={video} onChange={(v, ratio) => { setVideo(v); setShape(ratio); onPatch({ video: v, videoRatio: ratio }); }} />}
            </section>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}

/** "Use in a project": the system's project picker (the board's: a folder, the name and a checkbox per project), opened
 *  by the same key a board card files with. On a card it is the round folder alone, ember once the piece is in a project */
function UseInProject({ slug, projects, used, onChange, compact = false }: {
  slug: string; projects: readonly { id: string; name: string }[]; used: readonly string[]; onChange: (projects: string[]) => void; compact?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const toggle = async (projectId: string) => {
    const on = !used.includes(projectId);
    const before = [...used];
    // On screen first; the server's answer is what stays
    onChange(on ? [...before, projectId] : before.filter((x) => x !== projectId));
    const r = await fetch(`/api/vault/${encodeURIComponent(slug)}/projects`, { method: on ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) }).catch(() => null);
    const d = r?.ok ? ((await r.json().catch(() => null)) as { projects?: string[] } | null) : null;
    onChange(d?.projects ?? before);
  };
  const mine = used.filter((id) => projects.some((p) => p.id === id)).length;
  const label = mine ? t.projects.filedIn(mine) : t.vault.useIn;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      {compact ? (
        <PopoverTrigger className={`cr-iconbtn cr-iconbtn-strong cr-iconbtn-s${mine ? " is-filed" : ""}${open ? " is-open" : ""}`} disabled={!projects.length} aria-label={label} data-tip={open ? undefined : projects.length ? label : t.vault.noProjects}>
          <Icon name="folder" size={16} />
        </PopoverTrigger>
      ) : (
        <PopoverTrigger className={`cr-btn ${mine ? "cr-btn-primary" : "cr-btn-secondary"} cr-btn-s vault-sheet__go`} disabled={!projects.length} data-tip={projects.length ? undefined : t.vault.noProjects}>
          <Icon name="folder" size={16} />{mine ? t.vault.inProjects(mine) : t.vault.useIn}
        </PopoverTrigger>
      )}
      <PopoverContent align={compact ? "start" : "end"} className="pp pp--pick cr-picker">
        <ul className="cr-picker-list cr-scroll-fade" role="group" aria-label={t.vault.useIn}>
          {projects.map((p) => {
            const on = used.includes(p.id);
            return (
              <li key={p.id}>
                <button type="button" className={`cr-picker-item${on ? " is-checked" : ""}`} aria-pressed={on} onClick={() => void toggle(p.id)}>
                  <Icon name="folder" size={16} />
                  <span className="cr-picker-name" title={p.name}>{p.name}</span>
                  <span className="cr-check-box" aria-hidden>{on ? <Icon name="check" size={14} weight="bold" /> : null}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** "Copy for the AI": a line that names the piece, never its code. An agent with Criterio connected reads the rest */
function CopyForAgent({ text }: { text: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return <Button variant="quiet" size="s" className="vault-sheet__go" icon={copied ? "check" : "copy"} data-tip={t.vault.copyForAgentHint} onClick={() => void copy()}>{copied ? t.vault.copied : t.vault.copyForAgent}</Button>;
}

/** How much a file sent from here may weigh: more than this does not reach the server, and goes by link */
const VIDEO_FILE_MAX = 4 * 1024 * 1024;

/** For the team only: the loop the card plays in place of the piece. A link (the file, or a Screen Studio share) or
 *  an MP4 from disk puts one; "Remove" goes back to the piece itself */
function VideoControl({ slug, video, onChange }: { slug: string; video: string | null; onChange: (v: string | null, ratio: number | null) => void }) {
  const { t } = useT();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const send = async (init: RequestInit) => {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/vault/${encodeURIComponent(slug)}/video`, init);
      const out = (await r.json().catch(() => ({}))) as { video?: string | null; ratio?: number | null; error?: string };
      if (!r.ok) { setError(out.error ?? t.vault.video.failed); return; }
      onChange(out.video ?? null, out.ratio ?? null); setLink("");
    } catch { setError(t.vault.video.failed); } finally { setBusy(false); }
  };
  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > VIDEO_FILE_MAX) { setError(t.vault.video.tooBig); return; }
    void send({ method: "POST", headers: { "Content-Type": f.type || "video/mp4" }, body: f });
  };
  return (
    <div className="vault-video">
      <p className="vault-video__title">{t.vault.video.title}<span>{t.vault.video.team}</span></p>
      <p className="vault-video__hint">{video ? t.vault.video.has : t.vault.video.none}</p>
      <form className="vault-video__row" onSubmit={(ev) => { ev.preventDefault(); if (link.trim()) void send({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: link.trim() }) }); }}>
        <input className="cr-input cr-input-s" type="url" value={link} onChange={(ev) => setLink(ev.target.value)} placeholder={t.vault.video.link} aria-label={t.vault.video.link} disabled={busy} />
        <Button size="s" type="submit" disabled={busy || !link.trim()}>{t.vault.video.use}</Button>
      </form>
      <div className="vault-video__row">
        <input ref={file} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(ev) => { pick(ev.target.files?.[0]); ev.target.value = ""; }} />
        <Button size="s" icon="upload" disabled={busy} onClick={() => file.current?.click()}>{busy ? t.vault.video.busy : t.vault.video.upload}</Button>
        {video && <Button size="s" variant="quiet" icon="trash" disabled={busy} onClick={() => void send({ method: "DELETE" })}>{t.vault.video.remove}</Button>}
      </div>
      {error && <p className="vault-video__error" role="alert">{error}</p>}
    </div>
  );
}

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/** A step of the documentation: its number on a rail that runs down the steps, its name and note, then the code in a
 *  sunken well with its language, how long it is and Copy. The code is coloured by kind and numbered by line */
function CodeBlock({ n, title, lang, code, note }: { n: number; title: string; lang: string; code: string; note?: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const lines = useMemo(() => tokenLines(lang, code), [lang, code]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { return; }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <li className="vault-step">
      <span className="vault-step__n" aria-hidden>{n}</span>
      <div className="vault-step__body">
        <h3 className="t-title-s">{title}</h3>
        {note && <p className="vault-sheet__note">{note}</p>}
        <div className="vault-code">
          <div className="vault-code__bar">
            <span className="vault-code__lang">{lang.toUpperCase()}</span>
            <span className="vault-code__len">{t.vault.lines(lines.length)}</span>
            <Button variant="quiet" size="s" icon={copied ? "check" : "copy"} onClick={() => void copy()}>{copied ? t.vault.copied : t.vault.copy}</Button>
          </div>
          <pre tabIndex={0}><code>{lines.map((line, i) => (
            <span key={i} className="vault-code__line">{line.map((tk, j) => (tk.kind ? <span key={j} className={`vault-tk-${tk.kind}`}>{tk.text}</span> : tk.text))}{"\n"}</span>
          ))}</code></pre>
        </div>
      </div>
    </li>
  );
}
