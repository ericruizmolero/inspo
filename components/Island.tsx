"use client";

// The island (desktop): the projects as tabs in a white bar, in the search dock's material, so moving
// between them is one click and nothing opens. Projects change every day and workspaces almost never, so the
// workspace is only its avatar at the start of the bar: it opens the workspace menu (switch, directory,
// feedback, the plan, settings). The selected project carries a ⌄ to rename or delete it. Projects get a
// tab while they fit beside the right-hand pill (and at most MAX_TABS of them), the most recently active
// first; "N more" lists the rest.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { savePolishBrief } from "@/app/actions/polish";
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

const MAX_TABS = 5;
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
      <textarea rows={3} value={about} maxLength={500} disabled={busy} placeholder={t.projects.aboutPlaceholder} aria-label={t.projects.aboutPlaceholder}
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
  onCreateProject, onRenameProject, onDeleteProject, onDirectory, onPerson, quota }: {
  user: SessionUser; workspace: Workspace; workspaces: Workspace[]; isAdmin: boolean;
  items: InspoItem[]; links: ProjectLinks; projects: Project[];
  /** Each project's system: a ring on its tab says how much of it is decided */
  systems?: Record<string, ProjectSystem>;
  /** The team, listed in the workspace menu; picking someone filters by what they saved */
  members?: { name: string; image: string | null }[];
  onPerson?: (name: string) => void;
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
    for (const p of order.slice(0, MAX_TABS)) {
      const need = total + width(p.id) + (order.length > n + 1 ? more : 0);
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

  // The tabs keep the projects' own order (muscle memory); only which ones get a tab follows activity and room
  const { shown, hidden } = useMemo(() => {
    const keep = new Set(order.slice(0, fit ?? MAX_TABS).map((p) => p.id));
    return { shown: projects.filter((p) => keep.has(p.id)), hidden: order.filter((p) => !keep.has(p.id)) };
  }, [projects, order, fit]);

  // The library is one tab: everything saved. What isn't in a project yet is a view of it (the right-hand pill)
  const inLibrary = space === "all" || space === "inbox";
  const createNew = async (name: string, about: string) => {
    const p = await onCreateProject(name);
    if (!p) return;
    // The sentence is the project's brief from the first minute, as on the first screen
    if (about) await savePolishBrief(p.id, { about }).catch(() => null);
    onSpace(p.id);
  };

  const day = (at: number) => new Date(at).toLocaleDateString(locale, { day: "numeric", month: "short" });
  // Each tab is a link to its space: a plain click switches in place (the search stays), a modified click
  // opens the space the way the browser opens any link
  const hrefOf = (id: string) => (id === "all" ? "/?in=library" : `/?in=${encodeURIComponent(id)}`);
  const go = (id: string) => (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSpace(id);
  };
  const filledOf = (id: string) => systems[id]?.areas.filter((a) => a.decision).length ?? 0;
  const label = (name: string, n: number, id?: string) => <><span className="island__label">{name}</span> <span className="island__n">{n}</span>{id && filledOf(id) > 0 && <span className="island__ring"><FillRing filled={filledOf(id)} total={SYSTEM_AREAS.length} /></span>}</>;
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
        triggerClassName="island__ws" triggerLabel={t.ws.menuFor(workspace.name)}
        trigger={<>
          <WorkspaceFace workspace={workspace} user={user} small />
          <span className="island__chev" aria-hidden>{Icons.chevron}</span>
        </>}
        extras={<>
          {/* The projects as folders and the team, one click from anywhere */}
          <div className="ws__section">{t.projects.title}</div>
          {projects.length > 0 && (
            <div className="island__menu-list">
              {projects.map((p) => (
                <button key={p.id} type="button" className={`ws__item${space === p.id ? " is-active" : ""}`} onClick={() => onSpace(p.id)}>
                  <span className="pp__icon" aria-hidden>{Icons.folder}</span>
                  <span className="ws__item-name">{p.name}</span>
                  <span className="island__n">{counts.byProject[p.id] ?? 0}</span>
                </button>
              ))}
            </div>
          )}
          {/* After the menu has closed: opening one popover on the click that closes another shuts it at once */}
          <button type="button" className="ws__item ws__item--muted" onClick={() => setTimeout(() => setNaming("new"), 150)}>
            <span className="ws__plus" aria-hidden>{Icons.plus}</span>
            <span className="ws__item-name">{t.projects.newProject}</span>
          </button>
          <div className="ws__divider" />
          <div className="ws__section">{t.team.title}</div>
          {members.length > 0 && (
            <div className="island__menu-list">
              {members.map((m) => (
                <button key={m.name} type="button" className="ws__item" title={t.ws.savedBy(m.name)} onClick={() => onPerson?.(m.name)}>
                  <UserAvatar name={m.name} image={m.image} small />
                  <span className="ws__item-name">{m.name}</span>
                </button>
              ))}
            </div>
          )}
          <Link className="ws__item ws__item--muted" href="/settings/members">
            <span className="ws__plus" aria-hidden>{Icons.plus}</span>
            <span className="ws__item-name">{t.ws.manageTeam}</span>
          </Link>
          <div className="ws__divider" />
          <button type="button" className="ws__item" onClick={onDirectory}>
            <span className="ws__plus ws__plus--solid" aria-hidden>{Icons.compass}</span>
            <span className="ws__item-name">{t.palette.openDirectory}</span>
          </button>
          <button type="button" className="ws__item" data-feedback-toolbar="true" title={t.feedback.entryHint} onClick={() => enterFeedbackMode()}>
            <span className="ws__plus ws__plus--solid" aria-hidden>{sectionIcon("feedback")}</span>
            <span className="ws__item-name">{t.feedback.open}</span>
          </button>
          {quota && <div className="island__plan"><PlanMeter quota={quota} /></div>}
          <div className="ws__divider" />
        </>}
      />
      <span className="island__sep" aria-hidden />

      <nav className="island__tabs" ref={tabsRef} aria-label={t.projects.title}>
        <a href={hrefOf("all")} className={`island__tab${inLibrary ? " is-on" : ""}`} aria-current={inLibrary ? "page" : undefined} data-fixed onClick={go("all")}>
          {label(t.sidebar.library, counts.all)}
        </a>
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
          </span>
        ) : tab(p.id, p.name, counts.byProject[p.id] ?? 0))}

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
      </nav>

      {/* Every project tab and "N more" at their own width, out of sight, for the measure above */}
      <div className="island__measure" ref={sizesRef} aria-hidden>
        {order.map((p) => p.id === space ? (
          <span key={p.id} data-id={p.id} className="island__tab island__tab--split">
            <span className="island__tab-main">{label(p.name, counts.byProject[p.id] ?? 0, p.id)}</span><span className="island__tab-more" />
          </span>
        ) : (
          <span key={p.id} data-id={p.id} className="island__tab">{label(p.name, counts.byProject[p.id] ?? 0, p.id)}</span>
        ))}
        <span data-id="more" className="island__tab island__tab--more">{t.projects.more(order.length)} {Icons.chevron}</span>
      </div>
    </div>
  );
}
