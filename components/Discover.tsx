"use client";
// Discover: the library of libraries as a list, group by group, in the directory's own order: one line per site,
// its name, what it is and its domain; a click opens it. On top: everything, what just came in or what we open
// most, and the kinds of resource in a menu. Beside it, the templates (whole systems to start a project from) and the
// skills for agents, a list of their own with its topics in the same menu. The three share one head, in the column
// of the content.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DIRECTORY, SKILLS, SKILL_TOPICS, featuredUrls, isNewSite, siteHost, siteShot, type DirectorySite, type SkillTopic } from "@/lib/directory";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { directory as enDirectory } from "@/lib/i18n/en/directory";
import { useT } from "./I18nProvider";
import DiscoverSkills from "./DiscoverSkills";
import { Chip, Icon, MenuItem, SegmentedControl } from "@/components/criterio";
import "./Discover.css";
import { afterPaint } from "@/components/ui/liquid";

interface Site extends DirectorySite { group: string }
/** Everything, what came in lately (the last 30 days), or what we open most */
type Shelf = "all" | "new" | "featured";

type GroupKey = keyof typeof enDirectory.groups;
type Section = "templates" | "sites" | "skills";
const ALL: Site[] = DIRECTORY.flatMap((g) => g.items.map((s) => ({ ...s, group: g.key })));

const FRESH = ALL.filter((s) => isNewSite(s));
/** The skills that came in lately: as with the resources, the first batch (criterio.design's own) carries no date */
const FRESH_SKILLS = SKILLS.filter((s) => s.install && isNewSite(s)).length;
const inShelf = (s: Site, shelf: Shelf) => shelf === "all" || (shelf === "new" ? isNewSite(s) : featuredUrls().includes(s.url));
const matching = (group: string | null, shelf: Shelf = "all") => ALL.filter((s) => (!group || s.group === group) && inShelf(s, shelf));

/** Discover: the places to look, and the templates, whole systems to start a project from */
export default function Discover({ section, onSection, templates }: {
  section: Section;
  onSection: (s: Section) => void;
  /** The templates' own view, rendered when that section is chosen, under the page's head */
  templates: (head: React.ReactNode) => React.ReactNode;
}) {
  const { t } = useT();
  const [group, setGroup] = useState<string | null>(null);
  const [shelf, setShelf] = useState<Shelf>("all");
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [topic, setTopic] = useState<SkillTopic | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [skillShelf, setSkillShelf] = useState<Shelf>("all");
  const groupTitle = (k: string) => t.directory.groups[k as GroupKey]?.title ?? k;
  // One of a section's kinds, or all of them: the menu on the right of the row, the same for resources and skills. The
  // trigger is a secondary Button; the popup the system's Menu, a check on the one chosen
  const picker = <K extends string>(p: { open: boolean; onOpen: (o: boolean) => void; value: K | null; onPick: (k: K | null) => void; label: string; options: { key: K; title: string; hint?: string }[] }) => (
    <Popover open={p.open} onOpenChange={p.onOpen}>
      <PopoverTrigger className={`cr-btn cr-btn-secondary cr-btn-m disc__group${p.value ? " is-pressed" : ""}`}>
        {p.options.find((o) => o.key === p.value)?.title ?? p.label} <Icon name="chevron-down" size={20} />
      </PopoverTrigger>
      <PopoverContent align="end" className="cr-menu disc__menu">
        <MenuItem checked={p.value === null} onClick={() => { p.onPick(null); p.onOpen(false); }}>{t.discover.all}</MenuItem>
        {p.options.map((o) => (
          <MenuItem key={o.key} checked={p.value === o.key} data-tip={o.hint} onClick={() => { p.onPick(o.key); p.onOpen(false); }}>{o.title}</MenuItem>
        ))}
      </PopoverContent>
    </Popover>
  );
  // The head of the page, the same in the three sections and in their column, as a project's page has it: the name
  // (the page's h1) on top with what the open section holds, and below one row with the sections on the left and, on
  // the right, what the open one is looked through with. It scrolls away with the page, so its tabs are the paper
  // SegmentedControl, as a project's are
  const SECTIONS = ["templates", "sites", "skills"] as const;
  const head = (lead: string, side?: React.ReactNode) => (
    <>
      <header className="disc-head">
        <h1 className="disc-title">{t.sidebar.discover}</h1>
        <p className="t-body disc-lead">{lead}</p>
      </header>
      <div className="disc-bar">
        <SegmentedControl tone="paper" label={t.discover.sections.label} active={SECTIONS.indexOf(section)} onChange={(i) => afterPaint(() => onSection(SECTIONS[i]))}
          items={SECTIONS.map((k) => ({ label: t.discover.sections[k] }))} />
        {side && <div className="disc-bar__side">{side}</div>}
      </div>
    </>
  );
  if (section === "templates") return templates(head(t.templates.lead));
  // What to look at first: everything, what just came in, what we open most. The same three for resources and skills
  const shelves = (value: Shelf, onPick: (s: Shelf) => void, fresh: number) => {
    const keys = (["all", "new", "featured"] as const).filter((k) => k !== "new" || fresh > 0);
    return (
      <SegmentedControl tone="paper" className="disc__shelves" label={t.discover.shelves} active={keys.indexOf(value)} onChange={(i) => onPick(keys[i])}
        items={keys.map((k) => ({ label: t.discover.shelf[k], count: k === "new" ? fresh : undefined }))} />
    );
  };
  if (section === "skills") {
    return <DiscoverSkills sites={SKILLS} topic={topic} shelf={skillShelf} head={head(t.directory.groups.skills.hint, (
      <>
        {shelves(skillShelf, setSkillShelf, FRESH_SKILLS)}
        {picker({ open: topicsOpen, onOpen: setTopicsOpen, value: topic, onPick: setTopic, label: t.discover.skills.topicsLabel,
          options: SKILL_TOPICS.map((k) => ({ key: k, title: t.discover.skills.topics[k] })) })}
      </>
    ))} />;
  }
  // The kinds of resource wait in a menu
  const filters = (
    <>
      {shelves(shelf, setShelf, FRESH.length)}
      {picker({ open: groupsOpen, onOpen: setGroupsOpen, value: group, onPick: setGroup, label: t.discover.groups,
        options: DIRECTORY.map((g) => ({ key: g.key, title: groupTitle(g.key), hint: t.directory.groups[g.key as GroupKey]?.hint })) })}
    </>
  );
  return <DiscoverList group={group} shelf={shelf} head={head(t.discover.lead, filters)} />;
}

/** The list: the directory group by group, in its own order, each with what it is for; one line per site */
// The peek: a small picture of the site's hero that follows the pointer over the list. One for the whole list; the
// rows only change its picture. It trails the pointer (eased each frame), grows in and fades out with WAAPI. Mouse
// only (a touch opens the site straight away); with reduced motion it sits beside the pointer and only fades
const PEEK_W = 216;
const PEEK_H = 135;
const PEEK_GAP = 20;
const PEEK_EDGE = 12;
/** Share of the distance to the pointer covered per 60 Hz frame */
const PEEK_TRAIL = 0.16;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN = "cubic-bezier(0.55, 0, 1, 0.45)";
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function usePeek() {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const frame = useRef(0);
  const fade = useRef<Animation | null>(null);
  const shown = useRef(false);
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);
  useLayoutEffect(() => () => cancelAnimationFrame(frame.current), []);

  const paint = () => { const p = pos.current; if (box.current) box.current.style.translate = `${p.x}px ${p.y}px`; };
  const trail = () => {
    let last = performance.now();
    const step = (now: number) => {
      const p = pos.current;
      const k = 1 - Math.pow(1 - PEEK_TRAIL, (now - last) / 16.67);
      last = now;
      p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
      if (Math.abs(p.tx - p.x) < 0.3 && Math.abs(p.ty - p.y) < 0.3) { p.x = p.tx; p.y = p.ty; frame.current = 0; }
      else frame.current = requestAnimationFrame(step);
      paint();
    };
    frame.current = requestAnimationFrame(step);
  };
  // Beside the pointer, on its left near the right edge, and never out of the window
  const place = (e: React.PointerEvent, jump = false) => {
    const p = pos.current;
    p.tx = e.clientX + PEEK_GAP + PEEK_W > window.innerWidth - PEEK_EDGE ? e.clientX - PEEK_GAP - PEEK_W : e.clientX + PEEK_GAP;
    p.ty = Math.min(Math.max(e.clientY - PEEK_H / 2, PEEK_EDGE), window.innerHeight - PEEK_H - PEEK_EDGE);
    if (jump || still()) { cancelAnimationFrame(frame.current); frame.current = 0; p.x = p.tx; p.y = p.ty; paint(); }
    else if (!frame.current) trail();
  };
  // From wherever the last one left it, so a quick in-and-out never jumps
  const fadeTo = (on: boolean) => {
    const el = box.current;
    if (!el) return;
    const now = getComputedStyle(el);
    const from = { opacity: now.opacity, transform: now.transform === "none" ? "scale(1)" : now.transform };
    fade.current?.cancel();
    const small = still() ? "scale(1)" : "scale(0.85)";
    fade.current = el.animate([from, on ? { opacity: 1, transform: "scale(1)" } : { opacity: 0, transform: small }],
      { duration: on ? 400 : 200, easing: on ? EASE_OUT : EASE_IN, fill: "forwards" });
  };
  const hide = () => {
    if (!shown.current) return;
    shown.current = false;
    fadeTo(false);
  };
  const show = (e: React.PointerEvent, url: string) => {
    const pic = img.current;
    if (e.pointerType !== "mouse" || !pic) return;
    const src = siteShot(url);
    if (pic.getAttribute("src") !== src) {
      pic.src = src;
      // A new picture settles in from a touch closer
      if (shown.current && !still()) pic.animate([{ transform: "scale(1.08)" }, { transform: "scale(1)" }], { duration: 500, easing: EASE_OUT });
    }
    if (shown.current) return;
    place(e, true);
    shown.current = true;
    fadeTo(true);
  };
  // The pictures of a group load as soon as the pointer comes into it, so the next row's is already there
  const warm = (urls: string[]) => { for (const u of urls) new Image().src = siteShot(u); };

  const node = mounted ? createPortal(
    <div ref={box} className="disc-peek" aria-hidden>
      {/* A site without its picture (not captured yet): no peek rather than an empty frame */}
      <img ref={img} alt="" decoding="async" onError={hide} />
    </div>,
    document.body,
  ) : null;
  return { node, show, place, hide, warm };
}

function DiscoverList({ group, shelf, head }: { group: string | null; shelf: Shelf; head: React.ReactNode }) {
  const { t } = useT();
  const peek = usePeek();
  const groups = useMemo(() => {
    const keep = new Set(matching(group, shelf).map((s) => s.url));
    return DIRECTORY.map((g) => ({ key: g.key, sites: g.items.filter((s) => keep.has(s.url)).map((s) => ({ ...s, group: g.key })) })).filter((g) => g.sites.length);
  }, [group, shelf]);
  return (
    <div className="disc-list" onScroll={peek.hide}>
      {peek.node}
      {head}
      {groups.map((g) => {
        const text = t.directory.groups[g.key as keyof typeof t.directory.groups];
        return (
          <section key={g.key} className="disc-list__group">
            <header className="disc-list__head"><h2>{text?.title ?? g.key}</h2>{text?.hint && <p>{text.hint}</p>}</header>
            {/* A plain list: one line per site, its name and what it is in a sentence, the domain at the end */}
            <ul className="disc-rows" onPointerEnter={() => peek.warm(g.sites.map((s) => s.url))} onPointerLeave={peek.hide}>
              {g.sites.map((site) => (
                <li key={site.url}>
                  <a className="disc-row" href={site.url} target="_blank" rel="noopener noreferrer"
                    onPointerEnter={(e) => peek.show(e, site.url)} onPointerMove={(e) => peek.place(e)}>
                    <b className="disc-row__name">{site.name}</b>
                    {isNewSite(site) && <Chip tone="paper" className="disc-row__new">{t.discover.new}</Chip>}
                    <span className="disc-row__text">{t.directory.items[site.url] ?? ""}</span>
                    <span className="disc-row__host">{siteHost(site.url)}<Icon name="arrow-up-right" size={14} /></span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!groups.length && <p className="disc-list__none">{t.discover.none}</p>}
    </div>
  );
}
