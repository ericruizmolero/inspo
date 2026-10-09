"use client";
// The first screen inside a workspace: what are you making? One box to name a project and land on its
// system, empty and waiting; under it, the ones the team already has, each shown by its own board.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Clouds from "@/components/Clouds";
import { saveProjectBrief } from "@/app/actions/brief";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { SYSTEM_AREAS, staleness, type ProjectSystem } from "@/types/system";
import { useT } from "./I18nProvider";
import { BoardCard, PromptInput, type BoardTile } from "@/components/criterio";
import { cachedCardImage } from "./InspoCard";
import { DEFAULT_RATIO, keyOf } from "@/lib/board";
import { newestFirst } from "@/lib/search-query";
import { mediaKindOf, videoEmbedOf } from "@/lib/url";
import "./ProjectChooser.css";

/** The empty box's placeholder, taking turns between what a project can be: word by word, each one rises a little
 *  and leaves upwards (WAAPI, a short stagger). Drawn over the input (a native placeholder cannot animate); with reduced
 *  motion it stays on the first */
const EXAMPLE_HOLD = 2.6;
function Examples({ list }: { list: readonly string[] }) {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  // Always in a random order: the next one is any but the one showing. The server draws the list's first; the
  // browser picks another before the first paint, so no two visits start the same
  const next = (n: number) => (n + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
  useLayoutEffect(() => { if (list.length > 1) setI(Math.floor(Math.random() * list.length)); }, [list]);
  const shown = useRef(false);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || list.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const chars = Array.from(box.querySelectorAll<HTMLElement>(".chooser__char"));
    const runs: Animation[] = [];
    // The first one is there when the screen opens; the next ones come in
    const entering = shown.current ? 550 + (chars.length - 1) * 35 : 0;
    if (shown.current) chars.forEach((c, k) => runs.push(c.animate(
      [{ transform: "translateY(40%)", opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 550, delay: k * 35, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" })));
    const timer = window.setTimeout(() => {
      const out = chars.map((c, k) => c.animate(
        [{ transform: "none", opacity: 1 }, { transform: "translateY(-40%)", opacity: 0 }],
        { duration: 350, delay: k * 20, easing: "cubic-bezier(0.55, 0, 1, 0.45)", fill: "forwards" }));
      runs.push(...out);
      out[out.length - 1]?.finished.then(() => { shown.current = true; setI(next); }, () => { /* cancelled: a new list or the box filled */ });
    }, entering + EXAMPLE_HOLD * 1000);
    return () => { window.clearTimeout(timer); runs.forEach((a) => a.cancel()); };
  }, [i, list]);
  return (
    <span ref={ref} className="chooser__example" aria-hidden>
      {list[i].split(" ").map((w, k) => <span key={`${i}-${k}`} className="chooser__char">{k ? `\u00a0${w}` : w}</span>)}
    </span>
  );
}

function Shot({ item, image, onMeasure }: { item: InspoItem; image: string | null; onMeasure?: (ratio: number) => void }) {
  const [at, setAt] = useState(0);
  const kind = mediaKindOf(item.web);
  // A video shows its frame (a Screen Studio share's poster, a YouTube still); only a site has a page to ask og for
  const srcs = [image, kind === "image" ? item.web : null, kind === "video" ? videoEmbedOf(item.web)?.poster : null, cachedCardImage(item.web),
    kind === "web" || kind === "post" ? `/api/og?url=${encodeURIComponent(item.web)}` : null].filter((x): x is string => !!x);
  const src = srcs[at];
  // Without a picture it stays a blank tile, as on the board while one loads. Once one is there its shape is
  // told to the board's measure, as a card does: the mini relays out, and the board opens with the same shapes
  const measure = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w && h) onMeasure?.(h / w);
  };
  return src ? <img key={src} src={src} alt="" loading="lazy" decoding="async" onLoad={measure} onError={() => setAt((i) => i + 1)} /> : null;
}

/** The mini masonry: five columns, the mosaic's 6px gap as a share of a column (a 330px card) and its height in
 *  columns (33:20): past that the crop does the rest, so no more pictures are asked for than the card can show */
const MINI_COLS = 5;
const MINI_GAP = 0.105;
const MINI_FULL = 3.3;

/** A project told by its board, seen from afar: its first references laid out as the board lays them, shortest
 *  column first and each at its own height (the same rule as Grid's layoutBoard), cropped at the mosaic's bottom.
 *  A pasted text is the project's words, not a look: the mosaic shows what the project looks like */
export function boardColumns(items: InspoItem[], imageOf: (item: InspoItem) => string | null, ratioOf?: (item: InspoItem) => number, measure?: (web: string, ratio: number) => void): BoardTile[][] {
  const bottoms = new Array<number>(MINI_COLS).fill(0);
  const cols: BoardTile[][] = Array.from({ length: MINI_COLS }, () => []);
  for (const item of items) {
    if (mediaKindOf(item.web) === "text") continue;
    let c = 0;
    for (let i = 1; i < MINI_COLS; i++) if (bottoms[i] < bottoms[c] - 1e-3) c = i;
    if (bottoms[c] >= MINI_FULL) break;
    const ratio = ratioOf?.(item) ?? DEFAULT_RATIO;
    cols[c].push({ ratio, node: <Shot key={keyOf(item)} item={item} image={imageOf(item)} onMeasure={measure && ((r) => measure(item.web, r))} /> });
    bottoms[c] += ratio + MINI_GAP;
  }
  return cols;
}

/** The BoardCard's StatusRing: the board moved past the last reading is something new (ember dot); otherwise the ring
 *  is a gauge of the areas decided (moss over muted), closed when all eight are. The label says which */
export function useBoardStatus() {
  const { t } = useT();
  return (system: ProjectSystem | undefined, filed: InspoItem[]): { tone: "synced" | "new" | "idle"; progress: number; label: string } => {
    const filled = system?.areas.filter((a) => a.decision).length ?? 0;
    const progress = filled / SYSTEM_AREAS.length;
    const unread = system?.run ? staleness(system, filed.flatMap((i) => (i.id ? [i.id] : []))).unread : 0;
    if (unread > 0) return { tone: "new", progress, label: t.system.stale(unread) };
    return { tone: filled === SYSTEM_AREAS.length ? "synced" : "idle", progress, label: t.system.filled(filled, SYSTEM_AREAS.length) };
  };
}

const NONE: InspoItem[] = [];

export default function ProjectChooser({ projects, systems, items, links, ratioOf, imageOf, onMeasure, onPick, onCreate }: {
  projects: Project[];
  systems: Record<string, ProjectSystem>;
  items: InspoItem[];
  links: ProjectLinks;
  /** Height/width of each card on the board: the mini masonry keeps the same shapes */
  ratioOf?: (item: InspoItem) => number;
  /** What each card shows on the board, at its smallest size */
  imageOf: (item: InspoItem) => string | null;
  /** The board's measure: a picture's shape, once the mini has loaded it */
  onMeasure?: (web: string, ratio: number) => void;
  onPick: (id: string) => void;
  onCreate: (name: string) => Promise<Project | null>;
}) {
  const { t } = useT();
  const statusOf = useBoardStatus();
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  // Each project's references in the order its board shows them: newest first
  const byProject = useMemo(() => {
    const by: Record<string, InspoItem[]> = {};
    for (const i of items) for (const p of (i.id && links[i.id]) || []) (by[p] ??= []).push(i);
    for (const list of Object.values(by)) list.sort(newestFirst);
    return by;
  }, [items, links]);
  const create = async () => {
    const n = name.trim(); if (!n || busy) return;
    setBusy(true);
    try {
      const p = await onCreate(n);
      if (!p) return;
      // The sentence is the project's brief from the first minute: the first reading of the board follows it
      if (about.trim()) await saveProjectBrief(p.id, { about: about.trim() }).catch(() => null);
      onPick(p.id);
    } finally { setBusy(false); }
  };
  const named = !!name.trim();
  return (
    <>
    <div className="chooser">
      <div className="chooser__inner">
        <h1 className="cr-hello chooser__title">{projects.length ? t.chooser.titleSome : t.chooser.titleNone}</h1>
        {/* The system's PromptInput, with the app's two lines: the name, and under it (once there is one) the sentence */}
        <PromptInput className="chooser__box" id="chooser-name" value={name} onChange={setName} onSubmit={() => void create()}
          label={t.chooser.placeholder} placeholder="" sendLabel={t.chooser.start} disabled={busy} busy={busy}
          inputProps={{ className: "chooser__name", maxLength: 60 }}
          leading={!name ? <Examples list={t.chooser.examples} /> : null}
          below={
            // The second line only shows once there is a name: until then the box is one question
            <div className={`chooser__more${named ? " is-open" : ""}`}>
              <div className="chooser__more-inner">
                <textarea className="chooser__about" rows={1} value={about} onChange={(e) => setAbout(e.target.value)} placeholder={t.chooser.aboutPlaceholder} maxLength={500} disabled={busy} aria-label={t.chooser.aboutPlaceholder}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void create(); } }} />
              </div>
            </div>
          } />
        {projects.length > 0 && (
          <div className="chooser__grid" role="group" aria-label={t.chooser.existing}>
            {projects.map((p) => {
              const filed = byProject[p.id] ?? NONE;
              const status = statusOf(systems[p.id], filed);
              return (
                <BoardCard key={p.id} className="chooser__card" name={p.name} count={filed.length} countLabel={t.chooser.refs(filed.length)}
                  columns={boardColumns(filed, imageOf, ratioOf, onMeasure)} status={status.tone} progress={status.progress} statusLabel={status.label} onClick={() => onPick(p.id)} />
              );
            })}
          </div>
        )}
      </div>
    </div>
    <Clouds />
    </>
  );
}
