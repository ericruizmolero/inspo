"use client";
// Discover: the library of libraries as a list, group by group, in the directory's own order: one line per site,
// its name, what it is and its domain; a click opens it. On top: everything, what just came in or what we open
// most, and the kinds of resource in a menu. Beside it, the templates (whole systems to start a project from) and the
// skills for agents, a list of their own.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { DIRECTORY, SKILLS, featuredUrls, isNewSite, siteHost, siteShot, type DirectorySite } from "@/lib/directory";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Icons } from "./Sidebar";
import { directory as enDirectory } from "@/lib/i18n/en/directory";
import { useT } from "./I18nProvider";
import DiscoverSkills from "./DiscoverSkills";
import "./Discover.css";

interface Site extends DirectorySite { group: string }
/** Everything, what came in lately (the last 30 days), or what we open most */
type Shelf = "all" | "new" | "featured";

type GroupKey = keyof typeof enDirectory.groups;
type Section = "templates" | "sites" | "skills";
const ALL: Site[] = DIRECTORY.flatMap((g) => g.items.map((s) => ({ ...s, group: g.key })));

const FRESH = ALL.filter((s) => isNewSite(s));
const inShelf = (s: Site, shelf: Shelf) => shelf === "all" || (shelf === "new" ? isNewSite(s) : featuredUrls().includes(s.url));
const matching = (group: string | null, shelf: Shelf = "all") => ALL.filter((s) => (!group || s.group === group) && inShelf(s, shelf));

/** Discover: the places to look, and the templates, whole systems to start a project from */
export default function Discover({ section = "sites", onSection, templates }: {
  section?: Section;
  onSection?: (s: Section) => void;
  /** The templates' own view, rendered here when that section is chosen */
  templates?: React.ReactNode;
}) {
  const { t } = useT();
  const [group, setGroup] = useState<string | null>(null);
  const [shelf, setShelf] = useState<Shelf>("all");
  const [groupsOpen, setGroupsOpen] = useState(false);
  const groupTitle = (k: string) => t.directory.groups[k as GroupKey]?.title ?? k;
  const sections = templates && onSection && (
    <div className="tt-modes disc__sections" role="tablist" aria-label={t.discover.sections.label}>
      {(["templates", "sites", "skills"] as const).map((k) => (
        <button key={k} type="button" role="tab" aria-selected={section === k} className={`tt-mode${section === k ? " is-on" : ""}`} onClick={() => onSection(k)}>{t.discover.sections[k]}</button>
      ))}
    </div>
  );
  if (section === "templates" && templates) return (
    <>
      {templates}
      <div className="disc__bar">{sections}</div>
    </>
  );
  if (section === "skills") return (
    <>
      <DiscoverSkills sites={SKILLS} />
      <div className="disc__bar">{sections}</div>
    </>
  );
  return (
    <>
      <DiscoverList group={group} shelf={shelf} />
      <div className="disc__bar">
        {sections}
        {/* What to look at first: everything, what just came in, what we open most. The kinds of resource wait in a menu */}
        <div className="tt-modes disc__shelves" role="tablist" aria-label={t.discover.shelves}>
          {(["all", "new", "featured"] as const).filter((k) => k !== "new" || FRESH.length > 0).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={shelf === k} className={`tt-mode${shelf === k ? " is-on" : ""}`} onClick={() => setShelf(k)}>
              {t.discover.shelf[k]}{k === "new" && <b>{FRESH.length}</b>}
            </button>
          ))}
        </div>
        <Popover open={groupsOpen} onOpenChange={setGroupsOpen}>
          <PopoverTrigger className={`disc__group${group ? " is-on" : ""}`}>
            {group ? groupTitle(group) : t.discover.groups} {Icons.chevron}
          </PopoverTrigger>
          <PopoverContent align="start" className="pp pp--menu">
            <button type="button" className={`ws__item${group === null ? " is-active" : ""}`} onClick={() => { setGroup(null); setGroupsOpen(false); }}>
              <span className="ws__item-name">{t.discover.all}</span>{group === null && <span className="ws__item-check">{Icons.check}</span>}
            </button>
            {DIRECTORY.map((g) => (
              <button key={g.key} type="button" className={`ws__item${group === g.key ? " is-active" : ""}`} title={t.directory.groups[g.key as GroupKey]?.hint}
                onClick={() => { setGroup(g.key); setGroupsOpen(false); }}>
                <span className="ws__item-name">{groupTitle(g.key)}</span>{group === g.key && <span className="ws__item-check">{Icons.check}</span>}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

/** The list: the directory group by group, in its own order, each with what it is for; one line per site */
// The peek: a small picture of the site's hero that follows the pointer over the list. One for the whole list; the
// rows only change its picture. Mouse only (a touch opens the site straight away); with reduced motion it stays put
// beside the pointer and only fades
const PEEK_W = 216;
const PEEK_H = 135;
const PEEK_GAP = 20;
const PEEK_EDGE = 12;
type Follow = (value: number, start?: number) => void;

function usePeek() {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const follow = useRef<{ x: Follow; y: Follow } | null>(null);
  const shown = useRef(false);
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => setMounted(true), []);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.set(el, { autoAlpha: 0, scale: still ? 1 : 0.85 });
    const d = still ? 0 : 0.55;
    follow.current = { x: gsap.quickTo(el, "x", { duration: d, ease: "power3" }), y: gsap.quickTo(el, "y", { duration: d, ease: "power3" }) };
    return () => { gsap.killTweensOf(el); follow.current = null; };
  }, [mounted]);

  // Beside the pointer, on its left near the right edge, and never out of the window
  const place = (e: React.PointerEvent, jump = false) => {
    const f = follow.current;
    if (!f) return;
    const x = e.clientX + PEEK_GAP + PEEK_W > window.innerWidth - PEEK_EDGE ? e.clientX - PEEK_GAP - PEEK_W : e.clientX + PEEK_GAP;
    const y = Math.min(Math.max(e.clientY - PEEK_H / 2, PEEK_EDGE), window.innerHeight - PEEK_H - PEEK_EDGE);
    if (jump) { f.x(x, x); f.y(y, y); } else { f.x(x); f.y(y); }
  };
  const hide = () => {
    if (!shown.current || !box.current) return;
    shown.current = false;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.to(box.current, { autoAlpha: 0, scale: still ? 1 : 0.85, duration: 0.2, ease: "power2.in", overwrite: "auto" });
  };
  const show = (e: React.PointerEvent, url: string) => {
    const el = box.current, pic = img.current;
    if (e.pointerType !== "mouse" || !el || !pic) return;
    const src = siteShot(url);
    if (pic.getAttribute("src") !== src) {
      pic.src = src;
      // A new picture settles in from a touch closer
      if (shown.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) gsap.fromTo(pic, { scale: 1.08 }, { scale: 1, duration: 0.5, ease: "power3.out", overwrite: true });
    }
    if (!shown.current) place(e, true);
    shown.current = true;
    gsap.to(el, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "power3.out", overwrite: "auto" });
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

function DiscoverList({ group, shelf }: { group: string | null; shelf: Shelf }) {
  const { t } = useT();
  const peek = usePeek();
  const groups = useMemo(() => {
    const keep = new Set(matching(group, shelf).map((s) => s.url));
    return DIRECTORY.map((g) => ({ key: g.key, sites: g.items.filter((s) => keep.has(s.url)).map((s) => ({ ...s, group: g.key })) })).filter((g) => g.sites.length);
  }, [group, shelf]);
  return (
    <div className="disc-list" onScroll={peek.hide}>
      {peek.node}
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
                    {isNewSite(site) && <i className="disc-card__new">{t.discover.new}</i>}
                    <span className="disc-row__text">{t.directory.items[site.url] ?? ""}</span>
                    <span className="disc-row__host">{siteHost(site.url)} ↗</span>
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
