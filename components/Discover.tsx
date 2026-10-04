"use client";
// Discover: the library of libraries as a list, group by group, in the directory's own order: one line per site,
// its name, what it is and its domain; a click opens it. On top: everything, what just came in or what we open
// most, and the kinds of resource in a menu. Beside it, the templates: whole systems to start a project from.
import { useMemo, useState } from "react";
import { DIRECTORY, featuredUrls, isNewSite, siteHost, type DirectorySite } from "@/lib/directory";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Icons } from "./Sidebar";
import { directory as enDirectory } from "@/lib/i18n/en/directory";
import { useT } from "./I18nProvider";
import "./Discover.css";

interface Site extends DirectorySite { group: string }
/** Everything, what came in lately (the last 30 days), or what we open most */
type Shelf = "all" | "new" | "featured";

type GroupKey = keyof typeof enDirectory.groups;
const ALL: Site[] = DIRECTORY.flatMap((g) => g.items.map((s) => ({ ...s, group: g.key })));

const FRESH = ALL.filter((s) => isNewSite(s));
const inShelf = (s: Site, shelf: Shelf) => shelf === "all" || (shelf === "new" ? isNewSite(s) : featuredUrls().includes(s.url));
const matching = (group: string | null, shelf: Shelf = "all") => ALL.filter((s) => (!group || s.group === group) && inShelf(s, shelf));

/** Discover: the places to look, and the templates, whole systems to start a project from */
export default function Discover({ section = "sites", onSection, templates }: {
  section?: "sites" | "templates";
  onSection?: (s: "sites" | "templates") => void;
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
      {(["templates", "sites"] as const).map((k) => (
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
function DiscoverList({ group, shelf }: { group: string | null; shelf: Shelf }) {
  const { t } = useT();
  const groups = useMemo(() => {
    const keep = new Set(matching(group, shelf).map((s) => s.url));
    return DIRECTORY.map((g) => ({ key: g.key, sites: g.items.filter((s) => keep.has(s.url)).map((s) => ({ ...s, group: g.key })) })).filter((g) => g.sites.length);
  }, [group, shelf]);
  return (
    <div className="disc-list">
      {groups.map((g) => {
        const text = t.directory.groups[g.key as keyof typeof t.directory.groups];
        return (
          <section key={g.key} className="disc-list__group">
            <header className="disc-list__head"><h2>{text?.title ?? g.key}</h2>{text?.hint && <p>{text.hint}</p>}</header>
            {/* A plain list: one line per site, its name and what it is in a sentence, the domain at the end */}
            <ul className="disc-rows">
              {g.sites.map((site) => (
                <li key={site.url}>
                  <a className="disc-row" href={site.url} target="_blank" rel="noopener noreferrer">
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
