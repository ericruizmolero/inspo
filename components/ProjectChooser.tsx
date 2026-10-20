"use client";
// The first screen inside a workspace: what are you making? One box to name a project and land on its
// system, empty and waiting; under it, the ones the team already has, each shown by its own board.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Clouds from "@/components/Clouds";
import { saveProjectBrief } from "@/app/actions/brief";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { SYSTEM_AREAS, filledOf, unreadOf, type SystemSummary } from "@/types/system";
import { useT } from "./I18nProvider";
import { BoardCard, PromptInput, type BoardTile } from "@/components/criterio";
import { cachedCardImage } from "./InspoCard";
import { DEFAULT_RATIO, keyOf } from "@/lib/board";
import { newestFirst, parseDate } from "@/lib/search-query";
import HomeTino, { type TinoNudge } from "./HomeTino";
import { STEPS, nextStep, type FirstSteps } from "@/lib/first-steps-core";
import { FirstStepsPath } from "./FirstSteps";
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
  useLayoutEffect(() => { if (list.length > 1) setI(Math.floor(Math.random() * list.length)); }, [list]);
  const shown = useRef(false);
  useLayoutEffect(() => {
    const next = (n: number) => (n + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
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
  return (system: SystemSummary | undefined, filed: InspoItem[]): { tone: "synced" | "new" | "idle"; progress: number; label: string } => {
    const filled = filledOf(system);
    const progress = filled / SYSTEM_AREAS.length;
    const unread = unreadOf(system, filed.flatMap((i) => (i.id ? [i.id] : [])));
    if (unread > 0) return { tone: "new", progress, label: t.system.stale(unread) };
    return { tone: filled === SYSTEM_AREAS.length ? "synced" : "idle", progress, label: t.system.filled(filled, SYSTEM_AREAS.length) };
  };
}

const NONE: InspoItem[] = [];
/** The inbox is piling up from this many, once one of them has waited this long */
const INBOX_PILE = 15;
const STALE_MS = 7 * 24 * 3600 * 1000;
/** A board passing one of these is said once, per board and level */
const MILESTONES = [10, 25, 50];

export default function ProjectChooser({ projects, systems, items, links, ratioOf, imageOf, onMeasure, onPick, onCreate, inbox, onInbox, steps, onStep, onConnect }: {
  projects: Project[];
  systems: Record<string, SystemSummary>;
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
  /** What no project holds yet, and the way to it: Tino brings it up first */
  inbox: InspoItem[];
  onInbox: () => void;
  /** The first steps, while there are some to show: Tino brings up the one to do before anything else */
  steps: FirstSteps | null;
  /** Goes where a step is done */
  onStep: (href: string) => void;
  /** The last step's way out: connecting an AI client */
  onConnect: () => void;
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
  const [openedAt] = useState(() => Date.now());
  // What Tino brings up, most pressing first (the copy sheet's Home): the first step, the inbox piling up, a board that
  // moved while the person was away, a milestone, an empty board with another to start from
  const nudges = useMemo((): TinoNudge[] => {
    const list: TinoNudge[] = [];
    const now = steps && STEPS.find((x) => x.key === nextStep(steps));
    if (steps && now) {
      const s = t.firstSteps, done = STEPS.filter((x) => x.done(steps)).length;
      // Naming a project is done here, in the box above: the step puts the cursor in it
      const go = (href: string) => { if (href === "/?in=home") document.getElementById("chooser-name")?.focus(); else onStep(href); };
      list.push({
        key: `step:${now.key}`, who: `${s.title}, ${s.count(done, STEPS.length)}`, gesture: "senala",
        title: t.tino.stepsTitle, text: <FirstStepsPath steps={steps} onGo={go} />,
        act: t.tino.stepActs[now.key], go: now.key === "out" ? onConnect : () => go(now.href(steps)),
      });
    }
    if (inbox.length >= INBOX_PILE && inbox.some((i) => { const d = parseDate(i.date); return d > 0 && openedAt - d > STALE_MS; })) {
      list.push({ key: "inbox", title: t.tino.inboxTitle, text: t.tino.inboxText(inbox.length), act: t.tino.inboxAct, gesture: "curiosa", go: onInbox });
    }
    const counts = projects.map((p) => ({ p, n: byProject[p.id]?.length ?? 0 }));
    for (const { p } of counts) {
      const unread = unreadOf(systems[p.id], (byProject[p.id] ?? NONE).flatMap((i) => (i.id ? [i.id] : [])));
      if (unread > 0) list.push({ key: `back:${p.id}`, away: true, title: t.tino.backTitle, text: t.tino.backText(p.name), act: t.tino.backAct, gesture: "aprueba", go: () => onPick(p.id) });
    }
    for (const { p, n } of counts) {
      const level = MILESTONES.findLast((m) => n >= m);
      if (level) list.push({ key: `milestone:${p.id}:${level}`, once: true, title: t.tino.milestoneTitle, text: t.tino.milestoneText(p.name, level), gesture: "aprueba" });
    }
    const fullest = counts.reduce<(typeof counts)[number] | null>((a, c) => (c.n > (a?.n ?? 0) ? c : a), null);
    for (const { p, n } of counts) {
      if (!n && fullest) list.push({ key: `empty:${p.id}`, title: t.tino.emptyTitle, text: t.tino.emptyText(p.name, fullest.p.name, fullest.n), act: t.tino.emptyAct, gesture: "curiosa", go: () => onPick(fullest.p.id) });
    }
    return list;
  }, [steps, inbox, projects, systems, byProject, t, onStep, onConnect, onInbox, onPick, openedAt]);
  // Typing a name on the home: Tino says he is looking, over any nudge, until the box is empty again
  const typing = useMemo((): TinoNudge | undefined => (name.trim()
    ? { key: "typing", title: t.tino.typingTitle, text: t.tino.typingText(projects.length), gesture: "pensando" }
    : undefined), [name, projects.length, t]);
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
    <HomeTino nudges={nudges} say={typing} />
    </>
  );
}
