"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FilterDate, FilterType, InspoItem } from "@/types/inspo";
import type { Term } from "@/lib/taxonomy";
import { DIRECTORY_TOTAL } from "@/lib/directory";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

export const TYPES: InspoItem["type"][] = ["inspiration", "videos", "ideas", "documentaries"];
export const DATES: Exclude<FilterDate, "all">[] = ["thisMonth", "thisYear"];

// ─── Icons (16px, 1.5 stroke) ─────────────────────────────────────────────────
const I = {
  info: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6" cy="6" r="5" /><path d="M6 5.5V8.5M6 3.6v.1" />
    </svg>
  ),
  all: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1.2" /><rect x="9" y="2" width="5" height="5" rx="1.2" />
      <rect x="2" y="9" width="5" height="5" rx="1.2" /><rect x="9" y="9" width="5" height="5" rx="1.2" />
    </svg>
  ),
  spark: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M8 2c.6 3.4 2.6 5.4 6 6-3.4.6-5.4 2.6-6 6-.6-3.4-2.6-5.4-6-6 3.4-.6 5.4-2.6 6-6z" />
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
  plus: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 2v10M2 7h10" />
    </svg>
  ),
  search: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" />
    </svg>
  ),
  x: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" />
    </svg>
  ),
  arrowUp: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11.5v-9M3 6.5l4-4 4 4" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7.5l3 3 6-7" />
    </svg>
  ),
  sliders: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" /><circle cx="10" cy="4.5" r="1.5" /><circle cx="6" cy="11.5" r="1.5" />
    </svg>
  ),
  compass: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" /><path d="M10.5 5.5l-1.6 4-4 1.6 1.6-4z" />
    </svg>
  ),
};

const TYPE_ICON: Record<InspoItem["type"], React.ReactNode> = {
  inspiration: I.spark, videos: I.play, ideas: I.bulb, documentaries: I.film,
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
      <span className="search__icon">{aiLoading ? <span className="spinner spinner--sm" /> : ai ? I.spark : I.search}</span>
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
        {shortcut && !value && <kbd className="search__kbd" aria-hidden>/</kbd>}
        {value && (
          <Button variant="icon" className="search__clear" onClick={() => onChange("")} aria-label={t.sidebar.clear}>
            {I.x}
          </Button>
        )}
      </div>
    </div>
  );
}

export function Chips({ terms, counts, selected, onToggle, labels, images }: {
  terms: Term[]; counts: Record<string, number>; selected: string[]; onToggle: (k: string) => void;
  labels: Record<string, string>; images?: Record<string, string>;
}) {
  const { t: dict } = useT();
  const visible = terms.filter((t) => (counts[t.key] ?? 0) > 0 || selected.includes(t.key));
  if (!visible.length) return <div className="chips__empty">{dict.sidebar.notTagged}</div>;
  return (
    <div className="chips">
      {visible.map((t) => {
        const on = selected.includes(t.key);
        return (
          <button key={t.key} className={`chip${on ? " is-active" : ""}`} onClick={() => onToggle(t.key)}>
            {images?.[t.key] && <span className="fbar__avatar"><img src={images[t.key]} alt="" /></span>}
            {labels[t.key] ?? t.key}<span className="chip__count">{counts[t.key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

function NavItem({ icon, label, count, active, onClick }: {
  icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active} onClick={onClick} className="nav-item">
        <span className="nav-item__icon">{icon}</span>
        <span>{label}</span>
      </SidebarMenuButton>
      {count !== undefined && <SidebarMenuBadge className="nav-item__count">{count}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}

export interface TaggingState { running: boolean; done: number; total: number; error?: string }

export interface QuotaView {
  planName: string;
  designMd: { used: number; limit: number | null };
  searches: { used: number; limit: number | null };
}

export interface SidebarProps {
  /** Plan and this month's usage (null until loaded) */
  quota?: QuotaView | null;
  /** Header: workspace switcher */
  brand: React.ReactNode;
  items: InspoItem[];
  type: FilterType;
  /** No filter and no search: "All" is the current view */
  isAll: boolean;
  onType: (t: FilterType) => void;
  onReset: () => void;
  onAdd: () => void;
  onDirectory: () => void;
}

/** This month's DESIGN.md quota: the only thing that runs out. Links to /settings/plan. */
function PlanMeter({ quota }: { quota: QuotaView }) {
  const { t } = useT();
  const { used, limit } = quota.designMd;
  const full = limit !== null && used >= limit;
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <Link href="/settings/plan" className={`sidebar__plan${full ? " is-full" : ""}`} title={t.sidebar.seePlans}>
      <span className="sidebar__plan-head"><strong>{t.sidebar.plan(quota.planName)}</strong><span>{limit === null ? `${used} DESIGN.md` : `${used}/${limit} DESIGN.md`}</span></span>
      {limit !== null && <span className="quota__bar"><span style={{ width: `${pct}%` }} className={full ? "is-full" : ""} /></span>}
      <span className="sidebar__plan-note">{full ? t.sidebar.quotaSpent : limit === null ? t.sidebar.noLimit : t.sidebar.thisMonth}</span>
    </Link>
  );
}

// Navigation only (Refero model): add, the whole library, the four collections and the directory.
// Filters live in the bar over the grid (FilterBar), search in the top bar.
export default function AppSidebar({ quota, brand, items, type, isAll, onType, onReset, onAdd, onDirectory }: SidebarProps) {
  const { t } = useT();
  const { isMobile, setOpenMobile } = useSidebar();
  // On a phone the sidebar is a sheet: opening a modal from it closes the sheet first
  const fromSheet = (fn: () => void) => () => { if (isMobile) setOpenMobile(false); fn(); };
  // Picking a collection on a phone closes the sheet so the result is visible
  useEffect(() => { setOpenMobile(false); }, [type, setOpenMobile]);
  const countBy = (pred: (i: InspoItem) => boolean) => items.filter(pred).length;

  return (
    <Sidebar mobileTitle={t.app.menu} className="app-sidebar">
      <SidebarHeader className="app-sidebar__header">
        {brand}
        <Button variant="primary" block className="sidebar__add" onClick={fromSheet(onAdd)}>
          {I.plus} {t.sidebar.addReference}
        </Button>
      </SidebarHeader>

      {/* SidebarContent stays still; FadeScroll owns the scroll so the edge fades can follow it */}
      <SidebarContent className="overflow-hidden">
        <FadeScroll>
          <SidebarGroup>
            <SidebarMenu>
              <NavItem icon={I.all} label={t.sidebar.all} count={items.length} active={isAll} onClick={fromSheet(onReset)} />
              {TYPES.map((v) => (
                <NavItem
                  key={v}
                  icon={TYPE_ICON[v]}
                  label={t.labels.type[v]}
                  count={countBy((i) => i.type === v)}
                  active={type === v}
                  onClick={() => onType(type === v ? "all" : v)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t.sidebar.discover}</SidebarGroupLabel>
            <SidebarMenu>
              <NavItem icon={I.compass} label={t.sidebar.directory} count={DIRECTORY_TOTAL} active={false} onClick={fromSheet(onDirectory)} />
            </SidebarMenu>
          </SidebarGroup>
        </FadeScroll>
      </SidebarContent>

      {quota && (
        <SidebarFooter className="app-sidebar__footer">
          <PlanMeter quota={quota} />
        </SidebarFooter>
      )}
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
