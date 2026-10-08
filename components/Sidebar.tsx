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
import type { ImportBoard } from "./BoardImport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


// ─── Icons: the system's Icon where it has the glyph; the rest drawn in the same hand (16px, 1.5 stroke) ─
const I = {
  home: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden><path d="M2.5 7.2 8 2.75l5.5 4.45V13a.75.75 0 0 1-.75.75H9.75v-3.5h-3.5v3.5H3.25A.75.75 0 0 1 2.5 13z" /></svg>,
  info: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6" cy="6" r="5" /><path d="M6 5.5V8.5M6 3.6v.1" />
    </svg>
  ),
  all: <Icon name="grid" size={16} />,
  spark: <Icon name="sparkle" size={16} />,
  // Polish, and nothing else in the app: a solid shine, the one filled icon among strokes
  gem: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M7 3c.4 2.6 1.9 4.1 4.5 4.5C8.9 7.9 7.4 9.4 7 12c-.4-2.6-1.9-4.1-4.5-4.5C5.1 7.1 6.6 5.6 7 3z" />
      <circle cx="12.5" cy="3.5" r="1.3" />
    </svg>
  ),
  play: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="2" /><path d="M7 6l3 2-3 2z" />
    </svg>
  ),
  bulb: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 11c-1.2-.9-2-2.2-2-3.8a4.5 4.5 0 019 0c0 1.6-.8 2.9-2 3.8" /><path d="M6 13.5h4" />
    </svg>
  ),
  film: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <rect x="2" y="2.5" width="12" height="11" rx="2" /><path d="M5 2.5v11M11 2.5v11M2 8h12" />
    </svg>
  ),
  inbox: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9l1.6-5.2A1.5 1.5 0 015 2.8h6a1.5 1.5 0 011.4 1L14 9v3.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5z" /><path d="M2 9h3.2l.8 1.6h4l.8-1.6H14" />
    </svg>
  ),
  folder: <Icon name="folder" size={16} />,
  dots: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="3" cy="7" r="1.2" /><circle cx="7" cy="7" r="1.2" /><circle cx="11" cy="7" r="1.2" />
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="5.5" r="2.7" /><path d="M2.8 14a5.2 5.2 0 0110.4 0" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6" cy="5.5" r="2.4" /><path d="M1.8 13.5a4.4 4.4 0 018.4 0" /><path d="M10.5 3.3a2.4 2.4 0 010 4.4M12 9.4a4.3 4.3 0 012.3 4.1" />
    </svg>
  ),
  cal: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="3" width="12" height="11" rx="2" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
    </svg>
  ),
  plus: <Icon name="plus" size={14} />,
  search: <Icon name="search" size={16} />,
  x: <Icon name="close" size={12} />,
  arrow: <Icon name="arrow-right" size={14} />,
  arrowUp: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11.5v-9M3 6.5l4-4 4 4" />
    </svg>
  ),
  check: <Icon name="check" size={14} />,
  copy: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M3.6 10.4A1.5 1.5 0 012.5 9V4A1.5 1.5 0 014 2.5h5a1.5 1.5 0 011.4 1.1" />
    </svg>
  ),
  sliders: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" /><circle cx="10" cy="4.5" r="1.5" /><circle cx="6" cy="11.5" r="1.5" />
    </svg>
  ),
  chevron: <Icon name="chevron-down" size={14} />,
  compass: <Icon name="compass" size={16} />,
  external: (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10l6-6M5 4h5v5" />
    </svg>
  ),
  shuffle: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h2.5c1.2 0 2.2.6 2.9 1.6L9.6 10.4c.7 1 1.7 1.6 2.9 1.6H14M2 12h2.5c1.2 0 2.2-.6 2.9-1.6M9.6 5.6c.7-1 1.7-1.6 2.9-1.6H14" />
      <path d="M12.5 2.5L14 4l-1.5 1.5M12.5 10.5L14 12l-1.5 1.5" />
    </svg>
  ),
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
  /** A board pasted in Import (Conectores): the same import as the first run and Add */
  onImportBoard: ImportBoard;
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
  space, onSpace, projects, links, systems = {}, onCreateProject, onRenameProject, onDeleteProject, onImportBoard }: Omit<SidebarProps, "brand"> & {
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
        <SidebarMenu><Connectors row onImportBoard={onImportBoard} /></SidebarMenu>
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
