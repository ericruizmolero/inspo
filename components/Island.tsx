"use client";

// The island (desktop): the projects as tabs in a white bar, in the search dock's material, so moving
// between them is one click and nothing opens. Projects change every day and workspaces almost never, so the
// workspace is only its avatar at the start of the bar: it opens the workspace menu (switch, directory,
// feedback, the plan, settings). The selected project carries a ⌄ to rename or delete it. Tabs work as in Figma:
// a project gets one when it is opened and keeps it until its × closes it (kept per browser and workspace); the
// house at the start goes to every project. Open tabs that do not fit beside the right-hand pill wait in "N more".
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { saveProjectBrief } from "@/app/actions/brief";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { SYSTEM_AREAS, type ProjectSystem } from "@/types/system";
import { parseDate } from "@/lib/search-query";
import WorkspaceMenu, { UserAvatar, WorkspaceFace } from "./WorkspaceMenu";
import { FillRing, Icons, PlanMeter, useSpaceCounts, type QuotaView } from "./Sidebar";
import { enterFeedbackMode } from "./feedback-mode";
import { sectionIcon } from "./section-icons";
import { useT } from "./I18nProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Liquid, afterPaint } from "@/components/ui/liquid";

/** Open tabs shown at most, room allowing; the rest wait in "N more" */
const MAX_TABS = 8;
/** On a first visit, before anything was opened or closed here: the most recently active, this many */
const FIRST_TABS = 5;
const IcHome = <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden><path d="M2.5 7.2 8 2.75l5.5 4.45V13a.75.75 0 0 1-.75.75H9.75v-3.5h-3.5v3.5H3.25A.75.75 0 0 1 2.5 13z" /></svg>;
/** Faces in the menu's team row, overlapping; past this, the last slot counts the rest */
const MAX_FACES = 7;
/** Gap between tabs, as in .island__tabs */
const GAP = 2;
/** A name past this many characters is cut by the tab's max-width: the tooltip keeps it whole */
const LONG_NAME = 24;

/** A project's name typed in place (new or rename): Enter saves, Esc or leaving it empty drops it */
function NameTab({ initial = "", onSubmit, onCancel }: { initial?: string; onSubmit: (name: string) => void; onCancel: () => void }) {
  const { t } = useT();
  const [name, setName] = useState(initial);
  const done = useRef(false);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    const n = name.trim();
    if (save && n && n !== initial) onSubmit(n); else onCancel();
  };
  return (
    <input
      autoFocus className="island__tab island__tab--field" value={name} maxLength={60}
      placeholder={t.projects.namePlaceholder} aria-label={t.projects.namePlaceholder}
      size={Math.max(12, name.length + 1)}
      onChange={(e) => setName(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); finish(true); }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); }
      }}
      onBlur={() => finish(true)}
    />
  );
}

/** A new project, asked for where the + is: its name and, if the team has it, the sentence it opens with
 *  (the brief the first reading of the board follows). Enter in the name, or ⌘↵ in the sentence, creates it. */
function NewProject({ onCreate, onDone }: { onCreate: (name: string, about: string) => Promise<void>; onDone: () => void }) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try { await onCreate(n, about.trim()); onDone(); } finally { setBusy(false); }
  };
  return (
    <form className="island__new-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <span className="island__new-title">{t.projects.newProject}</span>
      <input autoFocus value={name} maxLength={60} disabled={busy} placeholder={t.projects.namePlaceholder} aria-label={t.projects.namePlaceholder}
        onChange={(e) => setName(e.target.value)} />
      <textarea rows={3} value={about} disabled={busy} placeholder={t.projects.aboutPlaceholder} aria-label={t.projects.aboutPlaceholder}
        onChange={(e) => setAbout(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); } }} />
      <div className="island__new-foot">
        <span className="island__new-hint">{t.projects.newHint}</span>
        <button type="submit" className="island__new-go" disabled={busy || !name.trim()}>{busy && <span className="spinner spinner--sm" />}{t.projects.createNew}</button>
      </div>
    </form>
  );
}

export default function Island({ user, workspace, workspaces, isAdmin, items, links, projects, systems = {}, members = [], space, onSpace,
  onCreateProject, onRenameProject, onDeleteProject, onDirectory, onPerson, quota, onMenuOpen }: {
  user: SessionUser; workspace: Workspace; workspaces: Workspace[]; isAdmin: boolean;
  items: InspoItem[]; links: ProjectLinks; projects: Project[];
  /** Each project's system: a ring on its tab says how much of it is decided */
  systems?: Record<string, ProjectSystem>;
  /** The team, listed in the workspace menu; picking someone filters by what they saved */
  members?: { name: string; image: string | null }[];
  onPerson?: (name: string) => void;
  /** The workspace menu just opened: the moment to re-read the plan's usage */
  onMenuOpen?: () => void;
  /** "all", "inbox" or a project id */
  space: string;
  onSpace: (space: string) => void;
  onCreateProject: (name: string) => Promise<Project | null>;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (project: Project) => void;
  onDirectory: () => void;
  quota: QuotaView | null;
}) {
  const { t, locale } = useT();
  const counts = useSpaceCounts(items, links);
  // "new", a project id being renamed, or nothing
  const [naming, setNaming] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // How many project tabs fit, measured; null until the first layout
  const [fit, setFit] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const sizesRef = useRef<HTMLDivElement>(null);

  // Each project's last reference: when, and who filed it (for the order of the tabs and the "more" list)
  const latest = useMemo(() => {
    const out: Record<string, { at: number; by: string }> = {};
    for (const i of items) {
      const at = parseDate(i.date);
      for (const p of (i.id && links[i.id]) || []) if (!out[p] || at > out[p].at) out[p] = { at, by: i.addedBy };
    }
    return out;
  }, [items, links]);

  // Who gets a tab first: the selected project, then the most recently active
  const order = useMemo(() => {
    const byActivity = [...projects].sort((a, b) => (latest[b.id]?.at ?? 0) - (latest[a.id]?.at ?? 0));
    const current = byActivity.find((p) => p.id === space);
    return current ? [current, ...byActivity.filter((p) => p !== current)] : byActivity;
  }, [projects, latest, space]);

  // The tabs that are open, in the order they were opened: kept in this browser for this workspace. A first visit
  // starts with the most recently active ones
  const tabsKey = `criterio:tabs:${workspace.id}`;
  const [openIds, setOpenIds] = useState<string[] | null>(null);
  useEffect(() => {
    let kept: unknown = null;
    try { kept = JSON.parse(localStorage.getItem(tabsKey) ?? "null"); } catch { /* none kept */ }
    setOpenIds(Array.isArray(kept) ? kept.filter((x): x is string => typeof x === "string") : order.slice(0, FIRST_TABS).map((p) => p.id));
  }, [tabsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Opening a project gives it a tab; a deleted project loses its own
  useEffect(() => {
    setOpenIds((ids) => {
      if (!ids) return ids;
      const next = ids.filter((id) => projects.some((p) => p.id === id));
      if (projects.some((p) => p.id === space) && !next.includes(space)) next.push(space);
      return next.length === ids.length && next.every((id, i) => id === ids[i]) ? ids : next;
    });
  }, [space, projects]);
  useEffect(() => { if (openIds) try { localStorage.setItem(tabsKey, JSON.stringify(openIds)); } catch { /* the tabs last the visit */ } }, [openIds, tabsKey]);
  const openTabs = useMemo(() => {
    const ids = openIds ?? order.slice(0, FIRST_TABS).map((p) => p.id);
    const list = ids.map((id) => projects.find((p) => p.id === id)).filter((p): p is Project => !!p);
    const current = projects.find((p) => p.id === space);
    return current && !list.includes(current) ? [...list, current] : list;
  }, [openIds, order, projects, space]);
  // Who keeps a tab when they do not all fit: the selected project, then the rest in their order
  const fitOrder = useMemo(() => {
    const current = openTabs.find((p) => p.id === space);
    return current ? [current, ...openTabs.filter((p) => p !== current)] : openTabs;
  }, [openTabs, space]);
  const closeTab = (id: string) => {
    setOpenIds((ids) => (ids ?? openTabs.map((p) => p.id)).filter((x) => x !== id));
    if (space === id) onSpace("home");
  };

  // The room left for project tabs: the bar's width, less what else sits in it (the right-hand pill), the
  // island's own avatar and separator, and its fixed tabs. Read from the layout, never from the tabs that
  // are shown, so hiding a tab can't shrink the room and hide another.
  const measure = () => {
    const el = root.current, bar = el?.parentElement, tabs = tabsRef.current, sizes = sizesRef.current;
    if (!el || !bar || !tabs || !sizes || getComputedStyle(el).display === "none") return;
    const cs = getComputedStyle(bar);
    const others = [...bar.children].filter((c): c is HTMLElement => c !== el && c instanceof HTMLElement && c.offsetWidth > 0);
    const used = others.reduce((s, c) => s + c.offsetWidth, 0) + (parseFloat(cs.columnGap) || 0) * others.length;
    const inner = bar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const chrome = el.offsetWidth - tabs.offsetWidth;
    const fixed = [...tabs.querySelectorAll<HTMLElement>("[data-fixed]")].reduce((s, c) => s + c.offsetWidth + GAP, 0);
    const room = inner - used - chrome - fixed;
    const width = (id: string) => (sizes.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.offsetWidth ?? 0) + GAP;
    const more = width("more");
    let n = 0, total = 0;
    for (const p of fitOrder.slice(0, MAX_TABS)) {
      const need = total + width(p.id) + (fitOrder.length > n + 1 ? more : 0);
      if (need > room) break;
      total += width(p.id);
      n++;
    }
    // The selected project always keeps its tab: it is where you are
    if (n === 0 && projects.some((p) => p.id === space)) n = 1;
    setFit((f) => (f === n ? f : n));
  };
  const measureRef = useRef(measure);
  measureRef.current = measure;
  // After every render (a project renamed, Polish appearing beside the bar) and on every resize of the bar
  useLayoutEffect(() => measureRef.current());
  useLayoutEffect(() => {
    const bar = root.current?.parentElement;
    if (!bar) return;
    const ro = new ResizeObserver(() => measureRef.current());
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  // The tabs keep the order they were opened in (muscle memory); only which ones show follows the room
  const { shown, hidden } = useMemo(() => {
    const keep = new Set(fitOrder.slice(0, fit ?? MAX_TABS).map((p) => p.id));
    return { shown: openTabs.filter((p) => keep.has(p.id)), hidden: openTabs.filter((p) => !keep.has(p.id)) };
  }, [openTabs, fitOrder, fit]);

  // No library tab: Discover holds the directory and the templates, and the Inbox what is in no project yet
  const inDiscover = space === "discover" || space === "templates" || space === "skills";
  const createNew = async (name: string, about: string) => {
    const p = await onCreateProject(name);
    if (!p) return;
    // The sentence is the project's brief from the first minute, as on the first screen
    if (about) await saveProjectBrief(p.id, { about }).catch(() => null);
    onSpace(p.id);
  };

  const day = (at: number) => new Date(at).toLocaleDateString(locale, { day: "numeric", month: "short" });
  // Each tab is a link to its space: a plain click switches in place (the search stays), a modified click
  // opens the space the way the browser opens any link
  const hrefOf = (id: string) => (id === "all" ? "/?in=library" : `/?in=${encodeURIComponent(id)}`);
  const go = (id: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    // The tab's fill is painted first: opening a space is a heavy render, and the tab would not answer until it ended
    afterPaint(() => onSpace(id));
  };
  const filledOf = (id: string) => systems[id]?.areas.filter((a) => a.decision).length ?? 0;
  const label = (name: string, n: number, id?: string) => <><span className="island__label">{name}</span> <span className="island__n">{n}</span>{id && filledOf(id) > 0 && <span className="island__ring"><FillRing filled={filledOf(id)} total={SYSTEM_AREAS.length} /></span>}</>;
  /** The × that closes a project's tab: the project stays, it only leaves the bar */
  const closeX = (p: Project) => (
    <button type="button" className="island__tab-x" aria-label={t.projects.closeTab(p.name)} title={t.projects.closeTab(p.name)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); closeTab(p.id); }}>{Icons.x}</button>
  );
  const tab = (id: string, name: string, n: number, fixed?: boolean) => (
    <a key={id} href={hrefOf(id)} className={`island__tab${space === id ? " is-on" : ""}`} aria-current={space === id ? "page" : undefined}
      title={name.length > LONG_NAME ? name : undefined} data-fixed={fixed || undefined} onClick={go(id)}>
      {label(name, n, fixed ? undefined : id)}
    </a>
  );

  return (
    // data-feedback-entry: the feedback entry lives in this bar's menu, so the floating feedback dock stays hidden
    <div className="island" ref={root} data-feedback-entry="">
      <WorkspaceMenu
        user={user} workspace={workspace} workspaces={workspaces} isAdmin={isAdmin}
        triggerClassName="island__ws" triggerLabel={t.ws.menuFor(workspace.name)} onOpen={onMenuOpen}
        trigger={<>
          <WorkspaceFace workspace={workspace} user={user} small />
          <span className="island__chev" aria-hidden>{Icons.chevron}</span>
        </>}
        extras={<>
          {/* The team in one row of faces: each one filters by who saved, and the row ends in the way to Members.
              The projects are not listed here: the tabs beside this menu are the projects */}
          <div className="island__team">
            {(members.length > MAX_FACES ? members.slice(0, MAX_FACES - 1) : members).map((m) => (
              <button key={m.name} type="button" className="island__face" title={t.ws.savedBy(m.name)} aria-label={t.ws.savedBy(m.name)} onClick={() => onPerson?.(m.name)}>
                <UserAvatar name={m.name} image={m.image} small />
              </button>
            ))}
            {members.length > MAX_FACES && (
              <Link className="island__face island__face--more" href="/settings/members">+{members.length - MAX_FACES + 1}</Link>
            )}
            <Link className="island__team-manage" href="/settings/members" aria-label={t.ws.manageTeam}>{t.ws.manage}</Link>
          </div>
          <div className="ws__divider" />
          <button type="button" className="ws__item" onClick={onDirectory}>
            <span className="ws__plus ws__plus--solid" aria-hidden>{Icons.compass}</span>
            <span className="ws__item-name">{t.palette.openDirectory}</span>
          </button>
          <button type="button" className="ws__item" data-feedback-toolbar="true" title={t.feedback.entryHint} onClick={() => enterFeedbackMode()}>
            <span className="ws__plus ws__plus--solid" aria-hidden>{sectionIcon("feedback")}</span>
            <span className="ws__item-name">{t.feedback.open}</span>
          </button>
          {quota && <div className="island__plan"><PlanMeter quota={quota} compact /></div>}
          <div className="ws__divider" />
        </>}
      />
      <span className="island__sep" aria-hidden />

      <Liquid as="nav" on=":scope > .is-on" className="island__tabs" ref={tabsRef} aria-label={t.projects.title}>
        {/* Home: every project, as pictures, and where a new one starts */}
        <a href={hrefOf("home")} className={`island__tab island__tab--home${space === "home" ? " is-on" : ""}`} aria-current={space === "home" ? "page" : undefined}
          aria-label={t.projects.home} data-tip={t.projects.home} data-fixed onClick={go("home")}>{IcHome}</a>
        {/* Discover opens on its templates; the places to look are one tab away */}
        <a href={hrefOf("templates")} className={`island__tab${inDiscover ? " is-on" : ""}`} aria-current={inDiscover ? "page" : undefined} data-fixed onClick={go("templates")}>
          <span className="island__label">{t.sidebar.discover}</span>
        </a>
        {/* What is in no project yet: always a tab away, so nothing saved is ever out of reach */}
        {tab("inbox", t.projects.inbox, counts.inbox, true)}
        {shown.map((p) => naming === p.id ? (
          <NameTab key={p.id} initial={p.name} onCancel={() => setNaming(null)}
            onSubmit={(name) => { setNaming(null); onRenameProject(p.id, name); }} />
        ) : p.id === space ? (
          // The selected project: its name goes to it, its ⌄ renames or deletes it
          <span key={p.id} className="island__tab is-on island__tab--split">
            <a href={hrefOf(p.id)} className="island__tab-main" aria-current="page"
              title={p.name.length > LONG_NAME ? p.name : undefined} onClick={go(p.id)}>
              {label(p.name, counts.byProject[p.id] ?? 0, p.id)}
            </a>
            <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
              <PopoverTrigger className="island__tab-more" aria-label={t.projects.options(p.name)}>{Icons.chevron}</PopoverTrigger>
              <PopoverContent align="start" className="pp pp--menu island-pop">
                <button type="button" className="ws__item" onClick={() => { setOptionsOpen(false); setNaming(p.id); }}>
                  <span className="ws__item-name">{t.projects.rename}</span>
                </button>
                <button type="button" className="ws__item ws__item--danger" onClick={() => { setOptionsOpen(false); onDeleteProject(p); }}>
                  <span className="ws__item-name">{t.projects.remove}</span>
                </button>
              </PopoverContent>
            </Popover>
            {closeX(p)}
          </span>
        ) : (
          <span key={p.id} className="island__tab island__tab--split island__tab--closable">
            <a href={hrefOf(p.id)} className="island__tab-main" title={p.name.length > LONG_NAME ? p.name : undefined} onClick={go(p.id)}>
              {label(p.name, counts.byProject[p.id] ?? 0, p.id)}
            </a>
            {closeX(p)}
          </span>
        ))}

        {hidden.length > 0 && (
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger className="island__tab island__tab--more">{t.projects.more(hidden.length)} {Icons.chevron}</PopoverTrigger>
            <PopoverContent align="start" className="pp island__others island-pop">
              <div className="ws__section">{t.projects.others}</div>
              <div className="pp__list">
                {hidden.map((p) => (
                  <button key={p.id} type="button" className="ws__item island__other" onClick={() => { setMoreOpen(false); onSpace(p.id); }}>
                    <span className="pp__icon" aria-hidden>{Icons.folder}</span>
                    <span className="island__other-text">
                      <span className="ws__item-name">{p.name}</span>
                      {latest[p.id] && <span className="island__other-meta">{latest[p.id].by.split(" ")[0]} · {day(latest[p.id].at)}</span>}
                    </span>
                    <span className="island__n">{counts.byProject[p.id] ?? 0}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Popover open={naming === "new"} onOpenChange={(o) => setNaming(o ? "new" : null)}>
          <PopoverTrigger className="island__tab island__tab--add" aria-label={t.projects.newProject} data-tip={naming === "new" ? undefined : t.projects.newProject} data-fixed>{Icons.plus}</PopoverTrigger>
          <PopoverContent align="start" className="pp island-pop island__new">
            <NewProject onCreate={createNew} onDone={() => setNaming(null)} />
          </PopoverContent>
        </Popover>
      </Liquid>

      {/* Every project tab and "N more" at their own width, out of sight, for the measure above */}
      <div className="island__measure" ref={sizesRef} aria-hidden>
        {openTabs.map((p) => (
          // The same classes as the real tab, so it measures what will be drawn
          <span key={p.id} data-id={p.id} className={`island__tab island__tab--split${p.id === space ? " is-on" : " island__tab--closable"}`}>
            <span className="island__tab-main">{label(p.name, counts.byProject[p.id] ?? 0, p.id)}</span>{p.id === space && <><span className="island__tab-more" /><span className="island__tab-x" /></>}
          </span>
        ))}
        <span data-id="more" className="island__tab island__tab--more">{t.projects.more(openTabs.length)} {Icons.chevron}</span>
      </div>
    </div>
  );
}
