"use client";

import { Busy, Icon, Key, MenuItem, Progress, Separator } from "@/components/criterio";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { SYSTEM_AREAS, type ProjectSystem } from "@/types/system";
import { useT } from "./I18nProvider";
import { fmtCount } from "@/lib/i18n/format";
import FeedbackEntry from "./FeedbackEntry";
import ThemeToggle from "./ThemeToggle";
import Connectors from "./Connectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


// ─── Icons: the system's Icon where it has the glyph; the rest drawn in the same hand (16px, 1.5 stroke) ─
const I = {
  home: <Icon name="home" size={15} />,
  info: <Icon name="info" size={12} />,
  all: <Icon name="grid" size={16} />,
  spark: <Icon name="sparkle" size={16} />,
  // Polish, and nothing else in the app: a solid shine, the one filled icon among strokes
  gem: <Icon name="sparkle" size={16} weight="fill" />,
  play: <Icon name="video" size={16} />,
  bulb: <Icon name="bulb" size={16} />,
  film: <Icon name="film" size={16} />,
  inbox: <Icon name="inbox" size={16} />,
  folder: <Icon name="folder" size={16} />,
  dots: <Icon name="dots" size={14} />,
  user: <Icon name="user" size={16} />,
  users: <Icon name="users" size={16} />,
  cal: <Icon name="calendar" size={16} />,
  plus: <Icon name="plus" size={14} />,
  search: <Icon name="search" size={16} />,
  x: <Icon name="close" size={12} />,
  arrow: <Icon name="arrow-right" size={14} />,
  arrowUp: <Icon name="arrow-up" size={14} />,
  check: <Icon name="check" size={14} />,
  copy: <Icon name="copy" size={16} />,
  sliders: <Icon name="sliders" size={14} />,
  chevron: <Icon name="chevron-down" size={14} />,
  compass: <Icon name="compass" size={16} />,
  external: <Icon name="arrow-up-right" size={12} />,
  shuffle: <Icon name="shuffle" size={14} />,
};

export function SearchBox({ value, onChange, className = "", autoFocus, ai, aiLoading, shortcut }: {
  value: string; onChange: (v: string) => void; className?: string; autoFocus?: boolean;
  ai?: boolean; aiLoading?: boolean;
  /** "/" focuses this box from anywhere in the page */
  shortcut?: boolean;
}) {
  const { t } = useT();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      ref.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut]);
  return (
    <div className={`search ${className}${ai ? " is-ai" : ""}`}>
      <span className="search__icon">{aiLoading ? <Busy label={t.sidebar.searchAi} /> : ai ? I.spark : I.search}</span>
      <Input
        ref={ref}
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && value) { e.preventDefault(); onChange(""); } }}
        placeholder={ai ? t.sidebar.searchAi : t.sidebar.search}
      />
      <div className="search__right">
        {shortcut && !value && <Key className="search__kbd">/</Key>}
        {value && (
          <Button variant="icon" className="search__clear" onClick={() => onChange("")} aria-label={t.sidebar.clear}>
            {I.x}
          </Button>
        )}
      </div>
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick, title, onPointerEnter }: {
  icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void; title?: string;
  onPointerEnter?: () => void;
}) {
  return (
    <SidebarMenuItem onPointerEnter={onPointerEnter}>
      <SidebarMenuButton isActive={active} onClick={onClick} className="nav-item" title={title}>
        <span className="nav-item__icon">{icon}</span>
        <span>{label}</span>
      </SidebarMenuButton>
      {count !== undefined && <SidebarMenuBadge className="nav-item__count">{count}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}


export interface QuotaView {
  planName: string;
  /** AI actions this month: what people asked of the model */
  ai: { used: number; limit: number | null };
  searches: { used: number; limit: number | null };
}

export interface SidebarProps {
  /** Plan and this month's usage (null until loaded) */
  quota?: QuotaView | null;
  /** Header: workspace switcher */
  brand: React.ReactNode;
  items: InspoItem[];
  /** No search and the whole library: "All" is the current view */
  isAll: boolean;
  onReset: () => void;
  onAdd: () => void;
  onDirectory: () => void;
  /** Where the library is looking: "all", "inbox" or a project id */
  space: string;
  onSpace: (space: string) => void;
  projects: Project[];
  links: ProjectLinks;
  /** Each project's system, for the ring that says how much of it is decided */
  systems?: Record<string, ProjectSystem>;
  onCreateProject: (name: string) => Promise<Project | null>;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (project: Project) => void;
}

/** A name typed in place (new project, rename): Enter or leaving the field saves, Esc drops it. */
function NameField({ initial = "", placeholder, onSubmit, onCancel }: {
  initial?: string; placeholder: string; onSubmit: (name: string) => void; onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  const done = useRef(false);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    const n = v.trim();
    if (save && n && n !== initial) onSubmit(n); else onCancel();
  };
  return (
    <SidebarMenuItem>
      <div className="nav-item nav-item--field">
        <span className="nav-item__icon">{I.folder}</span>
        <input
          autoFocus value={v} placeholder={placeholder} maxLength={60} aria-label={placeholder}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); finish(true); }
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); }
          }}
          onBlur={() => finish(true)}
        />
      </div>
    </SidebarMenuItem>
  );
}

/** One project in the sidebar: goes to it; its "…" (on hover) renames or deletes it. */
/** How much of the project's system is decided: a ring that fills area by area */
export function FillRing({ filled, total }: { filled: number; total: number }) {
  const { t } = useT();
  const r = 4.5, c = 2 * Math.PI * r;
  return (
    <svg className={`nav-item__ring${filled === total ? " is-full" : ""}`} viewBox="0 0 12 12" width="12" height="12" role="img" aria-label={t.system.filled(filled, total)}>
      <circle cx="6" cy="6" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.6" />
      <circle cx="6" cy="6" r={r} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" transform="rotate(-90 6 6)"
        strokeDasharray={`${(c * filled) / total} ${c}`} />
    </svg>
  );
}

function ProjectRow({ project, count, filled, active, onClick, onRename, onDelete }: {
  project: Project; count: number; filled: number; active: boolean; onClick: () => void; onRename: () => void; onDelete: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  return (
    <SidebarMenuItem className="nav-item--project">
      <SidebarMenuButton isActive={active} onClick={onClick} className="nav-item" title={project.name}>
        <span className="nav-item__icon">{I.folder}</span>
        <span className="truncate">{project.name}</span>
      </SidebarMenuButton>
      <SidebarMenuBadge className="nav-item__count">{filled > 0 && <FillRing filled={filled} total={SYSTEM_AREAS.length} />}{count}</SidebarMenuBadge>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<SidebarMenuAction showOnHover className="nav-item__more" aria-label={t.projects.options(project.name)} data-tip={open ? undefined : t.projects.options(project.name)} />}>
          {I.dots}
        </PopoverTrigger>
        <PopoverContent align="start" side="right" className="cr-menu">
          <MenuItem onClick={() => { setOpen(false); onRename(); }}>{t.projects.rename}</MenuItem>
          <Separator />
          <MenuItem danger onClick={() => { setOpen(false); onDelete(); }}>{t.projects.remove}</MenuItem>
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}

/** How many references each space holds: the whole library, the Inbox (in no project) and each project */
export function useSpaceCounts(items: InspoItem[], links: ProjectLinks) {
  return useMemo(() => {
    const byProject: Record<string, number> = {};
    let inbox = 0;
    for (const i of items) {
      const filed = (i.id && links[i.id]) || [];
      if (!filed.length) inbox++;
      for (const p of filed) byProject[p] = (byProject[p] ?? 0) + 1;
    }
    return { all: items.length, inbox, byProject };
  }, [items, links]);
}

/** This month's DESIGN.md quota: the only thing that runs out. Links to /settings/plan. */
export function PlanMeter({ quota, compact }: { quota: QuotaView; /** Head and bar only, without the note under them */ compact?: boolean }) {
  const { t, locale } = useT();
  const { used, limit } = quota.ai;
  const full = limit !== null && used >= limit;
  return (
    <Link href="/settings/plan" className={`sidebar__plan${full ? " is-full" : ""}`} title={t.sidebar.seePlans}>
      <span className="sidebar__plan-head"><strong>{t.sidebar.plan(quota.planName)}</strong><span>{limit === null ? `${fmtCount(used, locale)} ${t.sidebar.ai}` : `${fmtCount(used, locale)}/${fmtCount(limit, locale)} ${t.sidebar.ai}`}</span></span>
      {/* The system's Progress: segmented ember blocks in a sunken field */}
      {limit !== null && <Progress value={used} max={limit} segments={20} label={`${fmtCount(used, locale)}/${fmtCount(limit, locale)} ${t.sidebar.ai}`} className="sidebar__plan-progress" />}
      {!compact && <span className="sidebar__plan-note">{full ? t.sidebar.quotaSpent : limit === null ? t.sidebar.noLimit : t.sidebar.thisMonth}</span>}
    </Link>
  );
}

/** Everything under the workspace: add, the whole library, the projects, the directory and the plan.
 *  Shared by the docked column and the phone sheet. The team lives in Settings › Members. */
export function SidebarNav({ quota, items, onPick,
  space, onSpace, projects, links, systems = {}, onCreateProject, onRenameProject, onDeleteProject }: Omit<SidebarProps, "brand"> & {
  /** Called after any choice (the phone sheet closes) */
  onPick?: () => void;
}) {
  const { t } = useT();
  const pick = (fn: () => void) => () => { onPick?.(); fn(); };
  // Projects: which one is being named in place ("new" = the row at the bottom), and each one's count
  const [naming, setNaming] = useState<string | null>(null);
  const counts = useSpaceCounts(items, links);
  const inDiscover = space === "discover" || space === "templates" || space === "skills";
  return (
    <>
      {/* SidebarContent stays still; FadeScroll owns the scroll so the edge fades can follow it */}
      <SidebarContent className="overflow-hidden">
        <FadeScroll>
          {/* The island's first two tabs: home (every project, as pictures) and Discover (opens on its examples) */}
          <SidebarGroup>
            <SidebarMenu>
              <NavItem icon={I.home} label={t.projects.home} active={space === "home"} onClick={pick(() => onSpace("home"))} />
              <NavItem icon={I.compass} label={t.sidebar.discover} active={inDiscover} onClick={pick(() => onSpace("templates"))} />
            </SidebarMenu>
          </SidebarGroup>

          {/* Projects: spaces to file references by what they are for. The Inbox heads the group (what is
              in no project yet), so it reads as the tray the projects empty; the last row creates one in place. */}
          <SidebarGroup>
            <SidebarGroupLabel>{t.projects.title}</SidebarGroupLabel>
            <SidebarMenu>
              <NavItem icon={I.inbox} label={t.projects.inbox} count={counts.inbox} active={space === "inbox"} title={t.projects.inboxHint}
                onClick={pick(() => onSpace("inbox"))} />
              {projects.map((p) => naming === p.id ? (
                <NameField key={p.id} initial={p.name} placeholder={t.projects.namePlaceholder}
                  onSubmit={(name) => { setNaming(null); onRenameProject(p.id, name); }} onCancel={() => setNaming(null)} />
              ) : (
                <ProjectRow key={p.id} project={p} count={counts.byProject[p.id] ?? 0} filled={systems[p.id]?.areas.filter((a) => a.decision).length ?? 0} active={space === p.id}
                  onClick={pick(() => onSpace(p.id))}
                  onRename={() => setNaming(p.id)} onDelete={() => onDeleteProject(p)} />
              ))}
              {naming === "new" ? (
                <NameField placeholder={t.projects.namePlaceholder} onCancel={() => setNaming(null)}
                  onSubmit={async (name) => { setNaming(null); const p = await onCreateProject(name); if (p) { onPick?.(); onSpace(p.id); } }} />
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton className="nav-item nav-item--quiet" onClick={() => setNaming("new")}>
                    <span className="nav-item__icon">{I.plus}</span>
                    <span>{t.projects.newProject}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </FadeScroll>
      </SidebarContent>

      <SidebarFooter className="app-sidebar__footer">
        {/* The ways in from outside (an AI client over MCP), as on the island's right pill */}
        <SidebarMenu><Connectors row /></SidebarMenu>
        <FeedbackEntry onPick={onPick} />
        <ThemeToggle row />
        {quota && <PlanMeter quota={quota} />}
      </SidebarFooter>
    </>
  );
}

// Navigation only (Refero model): the workspace card, then SidebarNav. Every filter lives in the search.
// Collapsed on desktop, the column slides away and the island (components/Island.tsx) takes over.
export default function AppSidebar({ brand, ...nav }: SidebarProps) {
  const { t } = useT();
  const { isMobile, setOpenMobile } = useSidebar();
  // On a phone the sidebar is a sheet: any choice closes the sheet first so the result is visible
  const onPick = isMobile ? () => setOpenMobile(false) : undefined;

  return (
    <Sidebar mobileTitle={t.app.menu} className="app-sidebar">
      <SidebarHeader className="app-sidebar__header">
        <div className="app-sidebar__brand">{brand}</div>
      </SidebarHeader>
      <SidebarNav {...nav} onPick={onPick} />
    </Sidebar>
  );
}

export const Icons = I;

// Scrolling block with two "clouds" at the edges: top only when there is content
// above, bottom only when more remains below. Recomputed on scroll and on
// resize (filters appearing or disappearing), and they fade with a transition.
function FadeScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const top = el.scrollTop > 2;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
      setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);

  return (
    <div className={`sidebar__scrollwrap${edges.top ? " is-top" : ""}${edges.bottom ? " is-bottom" : ""}`}>
      <div className="sidebar__scroll" ref={ref}>{children}</div>
    </div>
  );
}
