"use client";
// The first screen inside a workspace: what are you making? One box to name a project and land on its
// system, empty and waiting; under it, the ones the team already has, each shown by its own board.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { saveProjectBrief } from "@/app/actions/brief";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { SYSTEM_AREAS, type ProjectSystem } from "@/types/system";
import { useT } from "./I18nProvider";
import { FillRing, Icons } from "./Sidebar";
import { cachedCardImage } from "./InspoCard";
import { keyOf } from "@/lib/board";
import { parseDate } from "@/lib/search-query";
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

// The cover is the project's board in small: the same order and the same columns rule (components/Grid.tsx),
// cut at the cover's height. Measures are hundredths of the cover's width; the cover is 16:10.
const COLS = 4;
const PAD = 3;
const GAP = 1.5;
const VIEW = 62.5;
const COL = (100 - 2 * PAD - (COLS - 1) * GAP) / COLS;
const NONE: InspoItem[] = [];

function Shot({ item, image }: { item: InspoItem; image: string | null }) {
  const [at, setAt] = useState(0);
  const kind = mediaKindOf(item.web);
  // A video shows its frame (a Screen Studio share's poster, a YouTube still); only a site has a page to ask og for
  const srcs = [image, kind === "image" ? item.web : null, kind === "video" ? videoEmbedOf(item.web)?.poster : null, cachedCardImage(item.web),
    kind === "web" || kind === "post" ? `/api/og?url=${encodeURIComponent(item.web)}` : null].filter((x): x is string => !!x);
  const src = srcs[at];
  // Without a picture it stays a blank card, as on the board while one loads
  return src ? <img key={src} src={src} alt="" loading="lazy" decoding="async" onError={() => setAt((i) => i + 1)} /> : null;
}

/** A project told by its board, seen from afar. Without references, its initial. */
export function Cover({ name, items, ratioOf, imageOf }: { name: string; items: InspoItem[]; ratioOf: (item: InspoItem) => number; imageOf: (item: InspoItem) => string | null }) {
  const slots = useMemo(() => {
    const bottoms = new Array<number>(COLS).fill(PAD);
    const out: { item: InspoItem; x: number; y: number; h: number }[] = [];
    // A pasted text is the project's words, not a look: the cover shows what the project looks like
    for (const item of items) {
      if (mediaKindOf(item.web) === "text") continue;
      let c = 0;
      for (let i = 1; i < COLS; i++) if (bottoms[i] < bottoms[c] - 0.01) c = i;
      // The shortest column already ends below the cover: nothing else would be seen
      if (bottoms[c] >= VIEW) break;
      const h = COL * ratioOf(item);
      out.push({ item, x: PAD + c * (COL + GAP), y: bottoms[c], h });
      bottoms[c] += h + GAP;
    }
    return out;
  }, [items, ratioOf]);
  return (
    <span className="chooser__cover" data-n={slots.length} aria-hidden>
      {slots.length === 0 ? name.slice(0, 1).toUpperCase() : slots.map(({ item, x, y, h }) => (
        <span key={keyOf(item)} className="chooser__shot" style={{ left: `${x}%`, width: `${COL}%`, top: `${(y / VIEW) * 100}%`, height: `${(h / VIEW) * 100}%` }}>
          <Shot item={item} image={imageOf(item)} />
        </span>
      ))}
    </span>
  );
}

export default function ProjectChooser({ projects, systems, items, links, ratioOf, imageOf, onPick, onCreate }: {
  projects: Project[];
  systems: Record<string, ProjectSystem>;
  items: InspoItem[];
  links: ProjectLinks;
  /** Height/width of each card on the board */
  ratioOf: (item: InspoItem) => number;
  /** What each card shows on the board, at its smallest size */
  imageOf: (item: InspoItem) => string | null;
  onPick: (id: string) => void;
  onCreate: (name: string) => Promise<Project | null>;
}) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  // Each project's references in the order its board shows them: newest first
  const filed = useMemo(() => {
    const by: Record<string, InspoItem[]> = {};
    for (const i of items) for (const p of (i.id && links[i.id]) || []) (by[p] ??= []).push(i);
    for (const list of Object.values(by)) list.sort((a, b) => parseDate(b.date) - parseDate(a.date));
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
    <div className="chooser">
      <div className="chooser__inner">
        <h1 className="chooser__title">{projects.length ? t.chooser.titleSome : t.chooser.titleNone}</h1>
        <form className="chooser__box" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <input className="chooser__name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} disabled={busy} autoFocus autoComplete="off" aria-label={t.chooser.placeholder} />
          {!name && <Examples list={t.chooser.examples} />}
          {/* The second line only shows once there is a name: until then the box is one question */}
          <div className={`chooser__more${named ? " is-open" : ""}`}>
            <div className="chooser__more-inner">
              <textarea className="chooser__about" rows={1} value={about} onChange={(e) => setAbout(e.target.value)} placeholder={t.chooser.aboutPlaceholder} maxLength={500} disabled={busy} aria-label={t.chooser.aboutPlaceholder}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void create(); } }} />
            </div>
          </div>
          <button type="submit" className="chooser__send" disabled={busy || !named} aria-label={t.chooser.start} title={t.chooser.start}>
            {busy ? <span className="spinner spinner--sm" /> : Icons.arrow}
          </button>
        </form>
        {projects.length > 0 && (
          <div className="chooser__grid" role="group" aria-label={t.chooser.existing}>
            {projects.map((p) => {
              const filled = systems[p.id]?.areas.filter((a) => a.decision).length ?? 0;
              return (
                <button key={p.id} type="button" className="chooser__card" onClick={() => onPick(p.id)}>
                  <Cover name={p.name} items={filed[p.id] ?? NONE} ratioOf={ratioOf} imageOf={imageOf} />
                  <span className="chooser__card-head">
                    <span className="chooser__card-name">{p.name}</span>
                    {filled > 0 && <FillRing filled={filled} total={SYSTEM_AREAS.length} />}
                  </span>
                  <span className="chooser__card-meta">{t.chooser.refs(filed[p.id]?.length ?? 0)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
