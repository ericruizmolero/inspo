"use client";

import { FilterAutor, FilterFecha, FilterTipo, InspoItem, TagMap } from "@/types/inspo";
import { SECTORES, ESTILOS, TAGS, TAG_THRESHOLD, Term } from "@/lib/taxonomy";
import { RECURSOS_TOTAL } from "@/lib/recursos";

export const TIPOS: InspoItem["tipo"][] = ["Inspiración", "Videos", "Ideas", "Documentales"];
export const FECHAS: Exclude<FilterFecha, "Todos">[] = ["Este mes", "Este año"];

// ─── Icons (16px, 1.5 stroke) ─────────────────────────────────────────────────
const I = {
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

export function SearchBox({ value, onChange, className = "", autoFocus, ai, onAi, aiLoading }: {
  value: string; onChange: (v: string) => void; className?: string; autoFocus?: boolean;
  ai?: boolean; onAi?: (on: boolean) => void; aiLoading?: boolean;
}) {
  return (
    <div className={`search ${className}${ai ? " is-ai" : ""}`}>
      <span className="search__icon">{aiLoading ? <span className="spinner spinner--sm" /> : ai ? I.spark : I.search}</span>
      <input
        className="input"
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ai ? "Describe lo que buscas" : "Buscar"}
      />
      <div className="search__right">
        {value && (
          <button className="btn-icon search__clear" onClick={() => onChange("")} aria-label="Limpiar">
            {I.x}
          </button>
        )}
        {onAi && (
          <button
            className={`search__ai${ai ? " is-on" : ""}`}
            onClick={() => onAi(!ai)}
            title={ai ? "Búsqueda IA activada" : "Activar búsqueda IA"}
            aria-pressed={ai}
          >
            IA
          </button>
        )}
      </div>
    </div>
  );
}

function Chips({ terms, counts, selected, onToggle }: {
  terms: Term[]; counts: Record<string, number>; selected: string[]; onToggle: (k: string) => void;
}) {
  const visible = terms.filter((t) => (counts[t.key] ?? 0) > 0 || selected.includes(t.key));
  if (!visible.length) return <div className="chips__empty">Sin etiquetar todavía</div>;
  return (
    <div className="chips">
      {visible.map((t) => {
        const on = selected.includes(t.key);
        return (
          <button key={t.key} className={`chip${on ? " is-active" : ""}`} onClick={() => onToggle(t.key)}>
            {t.label}<span className="chip__count">{counts[t.key] ?? 0}</span>
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
    <button className={`nav-item${active ? " is-active" : ""}`} onClick={onClick}>
      <span className="nav-item__icon">{icon}</span>
      <span className="nav-item__label">{label}</span>
      {count !== undefined && <span className="nav-item__count">{count}</span>}
    </button>
  );
}

export interface TaggingState { running: boolean; done: number; total: number; error?: string }

export interface SidebarProps {
  /** Cabecera: selector de workspace */
  brand: React.ReactNode;
  /** Valores del filtro "Quién" (nombres de miembros y etiquetas heredadas) */
  autores: string[];
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
  open: boolean;
  onClose: () => void;
  // IA
  tagMap: TagMap;
  sector: string;
  estilo: string;
  selTags: string[];
  onSector: (s: string) => void;
  onEstilo: (e: string) => void;
  onToggleTag: (k: string) => void;
  ai: boolean;
  onAi: (on: boolean) => void;
  aiLoading: boolean;
  aiEnabled: boolean;
  pending: number;
  tagging: TaggingState;
  onTagAll: () => void;
}

export default function Sidebar({
  brand, autores, items, tipo, autor, fecha, query,
  onTipo, onAutor, onFecha, onQuery, onReset, onAdd, onRecursos,
  open, onClose,
  tagMap, sector, estilo, selTags, onSector, onEstilo, onToggleTag,
  ai, onAi, aiLoading, aiEnabled, pending, tagging, onTagAll,
}: SidebarProps) {
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
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} />}
      <aside className={`sidebar${open ? " is-open" : ""}`}>
        <div className="sidebar__brand">{brand}</div>

        <SearchBox className="sidebar__search" value={query} onChange={onQuery}
          ai={ai} onAi={aiEnabled ? onAi : undefined} aiLoading={aiLoading} />

        <button className="sidebar__inspo" onClick={onRecursos}>
          <span className="sidebar__inspo-top">
            <span className="sidebar__inspo-icon">{I.compass}</span>
            <span className="sidebar__inspo-count">{RECURSOS_TOTAL} webs</span>
            <span className="sidebar__inspo-arrow">{I.arrow}</span>
          </span>
          <span className="sidebar__inspo-title">¿Buscando inspiración?</span>
          <span className="sidebar__inspo-sub">Un directorio de sitios donde mirar antes de empezar.</span>
        </button>

        <div className="sidebar__scroll">
        <NavItem icon={I.all} label="Todo" count={items.length} active={isAll} onClick={onReset} />

        <div className="sidebar__section">Colecciones</div>
        {TIPOS.map((t) => (
          <NavItem
            key={t}
            icon={TIPO_ICON[t]}
            label={t}
            count={countBy((i) => i.tipo === t)}
            active={tipo === t}
            onClick={() => onTipo(tipo === t ? "Todos" : t)}
          />
        ))}

        {autores.length > 1 && (
          <>
            <div className="sidebar__section">Quién</div>
            {autores.map((a) => (
              <NavItem
                key={a}
                icon={a === "Ambos" ? I.users : I.user}
                label={a}
                count={countBy((i) => i.puestoPor === a)}
                active={autor === a}
                onClick={() => onAutor(autor === a ? "Todos" : a)}
              />
            ))}
          </>
        )}

        <div className="sidebar__section">Cuándo</div>
        {FECHAS.map((f) => (
          <NavItem
            key={f}
            icon={I.cal}
            label={f}
            active={fecha === f}
            onClick={() => onFecha(fecha === f ? "Todos" : f)}
          />
        ))}

        <div className="sidebar__section">Sector</div>
        <Chips terms={SECTORES} counts={sectorCounts} selected={sector === "Todos" ? [] : [sector]}
          onToggle={(k) => onSector(sector === k ? "Todos" : k)} />

        <div className="sidebar__section">Estilo</div>
        <Chips terms={ESTILOS} counts={estiloCounts} selected={estilo === "Todos" ? [] : [estilo]}
          onToggle={(k) => onEstilo(estilo === k ? "Todos" : k)} />

        <div className="sidebar__section">Tags</div>
        <Chips terms={TAGS} counts={tagCounts} selected={selTags} onToggle={onToggleTag} />

        </div>

        <div className="sidebar__footer">
          {aiEnabled && (pending > 0 || tagging.running || tagging.error) && (
            <button className="btn btn--ghost btn--block btn--sm sidebar__tag-all" onClick={onTagAll} disabled={tagging.running}>
              {tagging.running
                ? <><span className="spinner spinner--sm" /> Etiquetando {tagging.done}/{tagging.total}</>
                : tagging.error
                  ? <>Error al etiquetar · reintentar</>
                  : <>{I.spark} Etiquetar {pending} con IA</>}
            </button>
          )}
          {aiEnabled && pending === 0 && !tagging.running && tagged > 0 && (
            <div className="sidebar__footer-note">{tagged} etiquetados con IA</div>
          )}
          <button className="btn btn--ghost btn--block" onClick={onAdd}>
            {I.plus} Añadir
          </button>
        </div>
      </aside>
    </>
  );
}

export const Icons = I;
