"use client";
// Discover: the examples (whole systems to start a project from), the resources (the places we look, as a list group
// by group in the list's own order: one line per site, its name, what it is and its domain; a click opens it) and
// the skills for agents, a list of their own with its topics in the same menu. On top: everything, what just came in
// or what we open most, and the kinds in a menu. The three share one head, in the column of the content. The
// resources and the skills are the marketing site's lists (lib/resources.ts, lib/agent-skills.ts), so criterio.design
// shows the same; a small picture of each site's hero follows the pointer over the resources.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Clouds from "@/components/Clouds";
import { FEATURED_URLS, RESOURCES, isNewSite, plain, siteHost, siteShot, type Resource } from "@/lib/resources";
import { SKILLS, SKILL_TOPICS, isNewSkill, type SkillTopic } from "@/lib/agent-skills";
import DiscoverSkills from "./DiscoverSkills";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import { Chip, Icon, MenuItem, SegmentedControl } from "@/components/criterio";
import { afterPaint } from "@/components/ui/liquid";
import "./Discover.css";

/** Everything, what came in lately (the last 30 days), or what we open most */
type Shelf = "all" | "new" | "featured";
export type DiscoverSection = "templates" | "sites" | "skills";
const SECTIONS: readonly DiscoverSection[] = ["templates", "sites", "skills"];
const ALL = RESOURCES.flatMap((g) => g.items);
const FRESH = ALL.filter((s) => isNewSite(s)).length;
/** The skills that came in lately: as with the resources, criterio.design's own carry no date */
const FRESH_SKILLS = SKILLS.filter((s) => isNewSkill(s)).length;
const inShelf = (s: Resource, shelf: Shelf) => shelf === "all" || (shelf === "new" ? isNewSite(s) : FEATURED_URLS.includes(s.url));

/** Discover: the examples, the places to look and the skills for agents */
export default function Discover({ section, onSection, templates }: {
  section: DiscoverSection;
  onSection: (s: DiscoverSection) => void;
  /** The examples' own view, rendered when that section is chosen, under the page's head */
  templates: (head: React.ReactNode) => React.ReactNode;
}) {
  const { t, locale } = useT();
  const [group, setGroup] = useState<string | null>(null);
  const [shelf, setShelf] = useState<Shelf>("all");
  /** Words typed over the resources: they narrow what the shelf and the kind leave (name, domain, what it is for) */
  const [query, setQuery] = useState("");
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [topic, setTopic] = useState<SkillTopic | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [skillShelf, setSkillShelf] = useState<Shelf>("all");
  // The head of the page, the same in the three sections and in their column, as a project's page has it: the name
  // (the page's h1) on top with what the open section holds, and below one row with the sections on the left and, on
  // the right, what the open one is looked through with. It scrolls away with the page, so its tabs are the paper
  // SegmentedControl, as a project's are, in the toolbar size (s, 34) so the row does not outweigh the titles
  const head = (lead: string, side?: React.ReactNode) => (
    <>
      <header className="disc-head">
        <h1 className="disc-title">{t.sidebar.discover}</h1>
        <p className="t-body disc-lead">{lead}</p>
      </header>
      <div className="disc-bar">
        <SegmentedControl tone="paper" size="s" label={t.discover.sections.label} active={SECTIONS.indexOf(section)} onChange={(i) => afterPaint(() => onSection(SECTIONS[i]))}
          items={SECTIONS.map((k) => ({ label: t.discover.sections[k] }))} />
        {side && <div className="disc-bar__side">{side}</div>}
      </div>
    </>
  );
  if (section === "templates") return templates(head(t.templates.lead));
  // A few words over the resources or the skills: the field at the toolbar size, the search icon inside. Escape empties it
  const search = (placeholder: string) => (
    <label className="disc-search">
      <Icon name="search" size={14} />
      <input className="cr-input cr-input-s" type="search" value={query} aria-label={placeholder} placeholder={placeholder} autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && query) { e.preventDefault(); e.stopPropagation(); setQuery(""); } }} />
    </label>
  );
  // What to look at first: everything, what just came in, what we open most. The same three for resources and skills
  const shelves = (value: Shelf, onPick: (s: Shelf) => void, fresh: number) => {
    const keys = (["all", "new", "featured"] as const).filter((k) => k !== "new" || fresh > 0);
    return (
      <SegmentedControl tone="paper" size="s" className="disc__shelves" label={t.discover.shelves} active={keys.indexOf(value)} onChange={(i) => onPick(keys[i])}
        items={keys.map((k) => ({ label: t.discover.shelf[k], count: k === "new" ? fresh : undefined }))} />
    );
  };
  // One of a section's kinds, or all of them: the menu on the right of the row, the same for resources and skills. A
  // secondary Button opens the system's Menu, a check on the one chosen
  const picker = <K extends string>(p: { open: boolean; onOpen: (o: boolean) => void; value: K | null; onPick: (k: K | null) => void; label: string; options: { key: K; title: string; hint?: string }[] }) => (
    <Popover open={p.open} onOpenChange={p.onOpen}>
      <PopoverTrigger className={`cr-btn cr-btn-secondary cr-btn-s disc__group${p.value ? " is-pressed" : ""}`}>
        {p.options.find((o) => o.key === p.value)?.title ?? p.label} <Icon name="chevron-down" size={16} />
      </PopoverTrigger>
      <PopoverContent align="end" className="cr-menu disc__menu">
        <MenuItem checked={p.value === null} onClick={() => { p.onPick(null); p.onOpen(false); }}>{t.discover.all}</MenuItem>
        {p.options.map((o) => (
          <MenuItem key={o.key} checked={p.value === o.key} data-tip={o.hint} onClick={() => { p.onPick(o.key); p.onOpen(false); }}>{o.title}</MenuItem>
        ))}
      </PopoverContent>
    </Popover>
  );
  if (section === "skills") {
    return <DiscoverSkills topic={topic} shelf={skillShelf} query={query} head={head(t.discover.skills.lead, (
      <>
        {search(t.discover.skills.search)}
        {shelves(skillShelf, setSkillShelf, FRESH_SKILLS)}
        {picker({ open: topicsOpen, onOpen: setTopicsOpen, value: topic, onPick: setTopic, label: t.discover.skills.topicsLabel,
          options: SKILL_TOPICS.map((k) => ({ key: k.key, title: k.title[locale] })) })}
      </>
    ))} />;
  }
  // The kinds of resource wait in a menu; a few words find a resource by name, domain or what it is for
  const filters = (
    <>
      {search(t.discover.search)}
      {shelves(shelf, setShelf, FRESH)}
      {picker({ open: groupsOpen, onOpen: setGroupsOpen, value: group, onPick: setGroup, label: t.discover.groups,
        options: RESOURCES.map((g) => ({ key: g.key, title: g.title[locale], hint: g.hint[locale] })) })}
    </>
  );
  return <DiscoverList group={group} shelf={shelf} query={query} head={head(t.discover.lead, filters)} />;
}

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

/** The list: the resources group by group, in their own order, each with what it is for; one line per site */
function DiscoverList({ group, shelf, query, head }: { group: string | null; shelf: Shelf; query: string; head: React.ReactNode }) {
  const { t, locale } = useT();
  const peek = usePeek();
  const groups = useMemo(() => {
    // Every word typed has to be somewhere in the row: its name, its domain, what it is for, or its group's name
    const words = plain(query).split(/\s+/).filter(Boolean);
    const hit = (s: Resource, title: string) => !words.length || words.every((w) => plain([s.name, siteHost(s.url), s.text[locale], title].join(" ")).includes(w));
    return RESOURCES
      .filter((g) => !group || g.key === group)
      .map((g) => ({ ...g, items: g.items.filter((s) => inShelf(s, shelf) && hit(s, g.title[locale])) }))
      .filter((g) => g.items.length);
  }, [group, shelf, query, locale]);
  return (
    <>
    <div className="disc-list" onScroll={peek.hide}>
      {peek.node}
      {head}
      {groups.map((g) => (
        <section key={g.key} className="disc-list__group">
          <header className="disc-list__head"><h2 className="t-title-m">{g.title[locale]}</h2><p>{g.hint[locale]}</p></header>
          {/* A plain list: one line per site, its name and what it is in a sentence, the domain at the end */}
          <ul className="disc-rows" onPointerEnter={() => peek.warm(g.items.map((s) => s.url))} onPointerLeave={peek.hide}>
            {g.items.map((site) => (
              <li key={site.url}>
                <a className="disc-row" href={site.url} target="_blank" rel="noopener noreferrer"
                  onPointerEnter={(e) => peek.show(e, site.url)} onPointerMove={(e) => peek.place(e)}>
                  <b className="disc-row__name">{site.name}</b>
                  {isNewSite(site) && <Chip tone="paper" className="disc-row__new">{t.discover.new}</Chip>}
                  <span className="disc-row__text">{site.text[locale]}</span>
                  <span className="disc-row__host">{siteHost(site.url)}<Icon name="arrow-up-right" size={14} /></span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!groups.length && <p className="disc-list__none">{t.discover.none}</p>}
    </div>
    <Clouds />
    </>
  );
}
