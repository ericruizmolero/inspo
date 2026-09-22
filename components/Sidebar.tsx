"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FilterAutor, FilterFecha, FilterTipo, InspoItem, TagMap } from "@/types/inspo";
import { SECTORES, ESTILOS, TAGS, TAG_THRESHOLD, Term } from "@/lib/taxonomy";
import { RECURSOS_TOTAL } from "@/lib/recursos";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

export const TIPOS: InspoItem["tipo"][] = ["Inspiración", "Videos", "Ideas", "Documentales"];
export const FECHAS: Exclude<FilterFecha, "Todos">[] = ["Este mes", "Este año"];

// ─── Icons (16px, 1.5 stroke) ─────────────────────────────────────────────────
const I = {
  info: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
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
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
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
  compass: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" /><path d="M10.5 5.5l-1.6 4-4 1.6 1.6-4z" />
    </svg>
  ),
};

const TIPO_ICON: Record<InspoItem["tipo"], React.ReactNode> = {
  Inspiración: I.spark, Videos: I.play, Ideas: I.bulb, Documentales: I.film,
};

export function SearchBox({ value, onChange, className = "", autoFocus, ai, aiLoading }: {
  value: string; onChange: (v: string) => void; className?: string; autoFocus?: boolean;
  ai?: boolean; aiLoading?: boolean;
}) {
  const { t } = useT();
  return (
    <div className={`search ${className}${ai ? " is-ai" : ""}`}>
      <span className="search__icon">{aiLoading ? <span className="spinner spinner--sm" /> : ai ? I.spark : I.search}</span>
      <Input
        
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && value) { e.preventDefault(); onChange(""); } }}
        placeholder={ai ? t.sidebar.searchAi : t.sidebar.search}
      />
      <div className="search__right">
        {value && (
          <Button variant="icon" className="search__clear" onClick={() => onChange("")} aria-label={t.sidebar.clear}>
            {I.x}
          </Button>
        )}
      </div>
    </div>
  );
}

function Chips({ terms, counts, selected, onToggle, labels }: {
  terms: Term[]; counts: Record<string, number>; selected: string[]; onToggle: (k: string) => void;
  labels: Record<string, string>;
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
  /** Plan y uso del mes (null hasta que carga) */
  quota?: QuotaView | null;
  /** Cabecera: selector de workspace */
  brand: React.ReactNode;
  /** Valores del filtro "Quién" (nombres de miembros y etiquetas heredadas) */
  autores: string[];
  autorImages?: Record<string, string>;
  items: InspoItem[];
  tipo: FilterTipo;
  autor: FilterAutor;
  fecha: FilterFecha;
  query: string;
  onTipo: (t: FilterTipo) => void;
  onAutor: (a: FilterAutor) => void;
  onFecha: (f: FilterFecha) => void;
  onQuery: (q: string) => void;
  onReset: () => void;
  onAdd: () => void;
  onRecursos: () => void;
  // IA
  tagMap: TagMap;
  sector: string;
  estilo: string;
  selTags: string[];
  onSector: (s: string) => void;
  onEstilo: (e: string) => void;
  onToggleTag: (k: string) => void;
  ai: boolean;
  aiLoading: boolean;
  aiEnabled: boolean;
  pending: number;
  tagging: TaggingState;
  onTagAll: () => void;
}

/** Cuota de DESIGN.md del mes: es lo único que se agota. Enlaza a /planes. */
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

export default function AppSidebar({
  quota,
  brand, autores, autorImages = {}, items, tipo, autor, fecha, query,
  onTipo, onAutor, onFecha, onQuery, onReset, onAdd, onRecursos,
  tagMap, sector, estilo, selTags, onSector, onEstilo, onToggleTag,
  ai, aiLoading, aiEnabled, pending, tagging, onTagAll,
}: SidebarProps) {
  const { t } = useT();
  const { isMobile, setOpenMobile } = useSidebar();
  // On a phone the sidebar is a sheet: opening a modal from it closes the sheet first
  const fromSheet = (fn: () => void) => () => { if (isMobile) setOpenMobile(false); fn(); };
  // Picking a filter on a phone closes the sheet so the result is visible
  useEffect(() => { setOpenMobile(false); }, [tipo, autor, fecha, sector, estilo, selTags, setOpenMobile]);
  const isAll = tipo === "Todos" && autor === "Todos" && fecha === "Todos" && !query
    && sector === "Todos" && estilo === "Todos" && selTags.length === 0;
  const countBy = (pred: (i: InspoItem) => boolean) => items.filter(pred).length;

  const sectorCounts: Record<string, number> = {};
  const estiloCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  for (const it of items) {
    const t = tagMap[it.web];
    if (!t) continue;
    sectorCounts[t.sector] = (sectorCounts[t.sector] ?? 0) + 1;
    estiloCounts[t.estilo] = (estiloCounts[t.estilo] ?? 0) + 1;
    for (const k of Object.keys(t.tags)) if (t.tags[k] >= TAG_THRESHOLD) tagCounts[k] = (tagCounts[k] ?? 0) + 1;
  }
  const tagged = items.filter((i) => tagMap[i.web]).length;

  return (
    <Sidebar mobileTitle={t.app.filters} className="app-sidebar">
      <SidebarHeader className="app-sidebar__header">
        {brand}

        <SearchBox className="sidebar__search" value={query} onChange={onQuery}
          ai={ai} aiLoading={aiLoading} />

        {/* Con inspos ya guardadas, añadir va arriba, a la vista; con la librería vacía manda el cajón de URL del lienzo */}
        {items.length > 0 && (
          <Button variant="ghost" block onClick={fromSheet(onAdd)}>
            {I.plus} {t.sidebar.add}
          </Button>
        )}

        <button className="sidebar__inspo" onClick={fromSheet(onRecursos)}>
          <span className="sidebar__inspo-top">
            <span className="sidebar__inspo-icon">{I.compass}</span>
            <span className="sidebar__inspo-count">{t.sidebar.directoryCount(RECURSOS_TOTAL)}</span>
            <span className="sidebar__inspo-arrow">{I.arrow}</span>
          </span>
          <span className="sidebar__inspo-title">{t.sidebar.directoryTitle}</span>
          <span className="sidebar__inspo-sub">{t.sidebar.directorySub}</span>
        </button>
      </SidebarHeader>

      {/* SidebarContent stays still; FadeScroll owns the scroll so the edge fades can follow it */}
      <SidebarContent className="overflow-hidden">
        <FadeScroll>
          <SidebarGroup>
            <SidebarMenu>
              <NavItem icon={I.all} label={t.sidebar.all} count={items.length} active={isAll} onClick={onReset} />
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t.sidebar.collections}</SidebarGroupLabel>
            <SidebarMenu>
              {TIPOS.map((v) => (
                <NavItem
                  key={v}
                  icon={TIPO_ICON[v]}
                  label={t.labels.tipo[v]}
                  count={countBy((i) => i.tipo === v)}
                  active={tipo === v}
                  onClick={() => onTipo(tipo === v ? "Todos" : v)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>

          {autores.length > 1 && (
            <SidebarGroup>
              <SidebarGroupLabel>{t.sidebar.who}</SidebarGroupLabel>
              <SidebarMenu>
                {autores.map((a) => (
                  <NavItem
                    key={a}
                    icon={autorImages[a]
                      ? <span className="nav-item__avatar"><img src={autorImages[a]} alt="" /></span>
                      : I.user}
                    label={t.labels.autor[a as keyof typeof t.labels.autor] ?? a}
                    count={countBy((i) => i.puestoPor === a)}
                    active={autor === a}
                    onClick={() => onAutor(autor === a ? "Todos" : a)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}

          <SidebarGroup>
            <SidebarGroupLabel>{t.sidebar.when}</SidebarGroupLabel>
            <SidebarMenu>
              {FECHAS.map((f) => (
                <NavItem
                  key={f}
                  icon={I.cal}
                  label={t.labels.fecha[f]}
                  active={fecha === f}
                  onClick={() => onFecha(fecha === f ? "Todos" : f)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t.sidebar.sector}</SidebarGroupLabel>
            <SidebarGroupContent>
              <Chips terms={SECTORES} labels={t.taxonomy.sector} counts={sectorCounts} selected={sector === "Todos" ? [] : [sector]}
                onToggle={(k) => onSector(sector === k ? "Todos" : k)} />
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t.sidebar.style}</SidebarGroupLabel>
            <SidebarGroupContent>
              <Chips terms={ESTILOS} labels={t.taxonomy.estilo} counts={estiloCounts} selected={estilo === "Todos" ? [] : [estilo]}
                onToggle={(k) => onEstilo(estilo === k ? "Todos" : k)} />
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>{t.sidebar.tags}</SidebarGroupLabel>
            <SidebarGroupContent>
              <Chips terms={TAGS} labels={t.taxonomy.tag} counts={tagCounts} selected={selTags} onToggle={onToggleTag} />
            </SidebarGroupContent>
          </SidebarGroup>
        </FadeScroll>
      </SidebarContent>

      <SidebarFooter className="app-sidebar__footer">
        {quota && <PlanMeter quota={quota} />}
        {aiEnabled && (pending > 0 || tagging.running || tagging.error) && (
          <Button variant="ghost" size="sm" block onClick={onTagAll} disabled={tagging.running}>
            {tagging.running
              ? <><span className="spinner spinner--sm" /> {t.sidebar.tagging(tagging.done, tagging.total)}</>
              : tagging.error
                ? <>{t.sidebar.taggingFailed}</>
                : <>{I.spark} {t.sidebar.tagPending(pending)}</>}
          </Button>
        )}
        {aiEnabled && pending === 0 && !tagging.running && tagged > 0 && (
          <div className="sidebar__footer-note">{t.sidebar.tagged(tagged)}</div>
        )}
        {items.length === 0 && (
          <Button variant="ghost" block onClick={fromSheet(onAdd)}>
            {I.plus} {t.sidebar.add}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export const Icons = I;

// Bloque con scroll y dos "nubes" en los bordes: arriba solo cuando hay contenido por
// encima, abajo solo cuando queda más por debajo. Se recalculan al hacer scroll y al
// cambiar el tamaño (filtros que aparecen o desaparecen), y se funden con transición.
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
