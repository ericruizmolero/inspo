"use client";

import { useState } from "react";
import { FilterAutor, FilterFecha, FilterTipo } from "@/types/inspo";

const TIPOS: FilterTipo[] = ["Todos", "Inspiración", "Videos", "Ideas", "Documentales"];
const AUTORES: FilterAutor[] = ["Todos", "Eric", "Andoni", "Ambos"];
const FECHAS: FilterFecha[] = ["Todos", "Este mes", "Este año"];

interface FilterBarProps {
  tipo: FilterTipo;
  autor: FilterAutor;
  fecha: FilterFecha;
  query: string;
  onTipo: (t: FilterTipo) => void;
  onAutor: (a: FilterAutor) => void;
  onFecha: (f: FilterFecha) => void;
  onQuery: (q: string) => void;
  count: number;
  onRefresh: () => void;
  refreshing: boolean;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: "12px", letterSpacing: "0.02em",
        color: active ? "#0F1923" : "#A09890",
        borderBottom: active ? "1px solid #0F1923" : "1px solid transparent",
        padding: "4px 0", marginRight: "20px",
        transition: "color 0.15s, border-color 0.15s",
        fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "#0F1923" : "transparent",
        border: `1px solid ${active ? "#0F1923" : "#D8D0C6"}`,
        borderRadius: "2px", cursor: "pointer",
        fontSize: "11px", letterSpacing: "0.02em",
        color: active ? "#EDE8DF" : "#8A8580",
        padding: "4px 10px",
        transition: "all 0.15s",
        fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
        style={{ position: "absolute", left: "8px", opacity: 0.3, pointerEvents: "none", flexShrink: 0 }}>
        <circle cx="5" cy="5" r="3.5" stroke="#0F1923" strokeWidth="1.3"/>
        <line x1="7.8" y1="7.8" x2="10.5" y2="10.5" stroke="#0F1923" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar…"
        style={{
          background: "transparent",
          border: "1px solid transparent",
          borderRadius: "2px",
          fontSize: "11px", color: "#0F1923",
          padding: "4px 24px 4px 24px",
          width: value ? "180px" : "110px",
          outline: "none", fontFamily: "inherit",
          transition: "width 0.2s, border-color 0.15s",
          caretColor: "#0F1923",
        }}
        onFocus={(e) => { e.currentTarget.style.width = "200px"; e.currentTarget.style.borderColor = "#D8D0C6"; }}
        onBlur={(e) => { e.currentTarget.style.width = value ? "180px" : "110px"; e.currentTarget.style.borderColor = "transparent"; }}
      />
      {value && (
        <button onClick={() => onChange("")}
          style={{ position: "absolute", right: "6px", background: "none", border: "none", cursor: "pointer", color: "#A09890", fontSize: "13px", lineHeight: 1, padding: "2px" }}>
          ×
        </button>
      )}
    </div>
  );
}

function RefreshBtn({ onClick, refreshing }: { onClick: () => void; refreshing: boolean }) {
  return (
    <button onClick={onClick} disabled={refreshing} title="Actualizar"
      style={{ background: "none", border: "none", cursor: refreshing ? "wait" : "pointer", color: "#C8C0B8", padding: "4px", display: "flex", alignItems: "center", flexShrink: 0, transition: "color 0.15s" }}
      onMouseEnter={(e) => { if (!refreshing) (e.currentTarget as HTMLButtonElement).style.color = "#0F1923"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#C8C0B8"; }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
        style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }}>
        <path d="M10.5 6A4.5 4.5 0 1 1 7.5 1.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M7.5 1.8 L10 1.8 L10 4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FilterBar({
  tipo, autor, fecha, query,
  onTipo, onAutor, onFecha, onQuery,
  count, onRefresh, refreshing,
}: FilterBarProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  const hasActiveFilters = tipo !== "Todos" || autor !== "Todos" || fecha !== "Todos";
  const activeCount = (tipo !== "Todos" ? 1 : 0) + (autor !== "Todos" ? 1 : 0) + (fecha !== "Todos" ? 1 : 0);

  return (
    <div className="filterbar">

      {/* ── Desktop: dos filas ── */}
      <div className="filterbar-desktop">
        {/* Fila 1 */}
        <div className="filterbar__row filterbar__row--top">
          <nav style={{ display: "flex", alignItems: "center" }}>
            {TIPOS.map((t) => <Tab key={t} label={t} active={tipo === t} onClick={() => onTipo(t)} />)}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
            <nav style={{ display: "flex", alignItems: "center" }}>
              {AUTORES.map((a) => <Tab key={a} label={a} active={autor === a} onClick={() => onAutor(a)} />)}
            </nav>
            <span style={{ fontSize: "11px", color: "#C8C0B8", fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}>{count}</span>
            <RefreshBtn onClick={onRefresh} refreshing={refreshing} />
          </div>
        </div>
        {/* Fila 2 */}
        <div className="filterbar__row filterbar__row--bottom">
          <nav style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "#C8C0B8", letterSpacing: "0.06em", textTransform: "uppercase", marginRight: "14px", flexShrink: 0 }}>Fecha</span>
            {FECHAS.map((f) => <Tab key={f} label={f} active={fecha === f} onClick={() => onFecha(f)} />)}
          </nav>
          <SearchInput value={query} onChange={onQuery} />
        </div>
      </div>

      {/* ── Mobile: barra única + panel plegable ── */}
      <div className="filterbar-mobile">
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "0 16px", height: "48px",
        }}>
          {/* Search — grows */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <MobileSearch value={query} onChange={onQuery} />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setPanelOpen((o) => !o)}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              background: panelOpen ? "#0F1923" : hasActiveFilters ? "#EDE8DF" : "none",
              border: `1px solid ${panelOpen ? "#0F1923" : hasActiveFilters ? "#0F1923" : "#D8D0C6"}`,
              borderRadius: "2px", cursor: "pointer",
              padding: "5px 10px", flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <line x1="1" y1="2" x2="11" y2="2" stroke={panelOpen ? "#EDE8DF" : "#0F1923"} strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="3" y1="5" x2="9" y2="5" stroke={panelOpen ? "#EDE8DF" : "#0F1923"} strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="5" y1="8" x2="7" y2="8" stroke={panelOpen ? "#EDE8DF" : "#0F1923"} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            {activeCount > 0 && (
              <span style={{ fontSize: "10px", fontWeight: 600, color: panelOpen ? "#EDE8DF" : "#0F1923", lineHeight: 1 }}>
                {activeCount}
              </span>
            )}
          </button>

          {/* Count */}
          <span style={{ fontSize: "11px", color: "#C8C0B8", letterSpacing: "0.04em", flexShrink: 0, minWidth: "20px", textAlign: "right" }}>
            {count}
          </span>

          <RefreshBtn onClick={onRefresh} refreshing={refreshing} />
        </div>

        {/* Filter panel */}
        {panelOpen && (
          <div style={{
            borderTop: "1px solid #E4DFD8",
            padding: "14px 16px 16px",
            display: "flex", flexDirection: "column", gap: "12px",
          }}>
            <FilterGroup label="Tipo" options={TIPOS} active={tipo} onSelect={(v) => onTipo(v as FilterTipo)} />
            <FilterGroup label="Autor" options={AUTORES} active={autor} onSelect={(v) => onAutor(v as FilterAutor)} />
            <FilterGroup label="Fecha" options={FECHAS} active={fecha} onSelect={(v) => onFecha(v as FilterFecha)} />
            {hasActiveFilters && (
              <button
                onClick={() => { onTipo("Todos"); onAutor("Todos"); onFecha("Todos"); }}
                style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#A09890", padding: 0, letterSpacing: "0.02em" }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function MobileSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
        style={{ position: "absolute", left: "8px", opacity: 0.3, pointerEvents: "none" }}>
        <circle cx="5" cy="5" r="3.5" stroke="#0F1923" strokeWidth="1.3"/>
        <line x1="7.8" y1="7.8" x2="10.5" y2="10.5" stroke="#0F1923" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar…"
        style={{
          width: "100%", boxSizing: "border-box",
          background: "transparent",
          border: "1px solid #E4DFD8", borderRadius: "2px",
          fontSize: "12px", color: "#0F1923",
          padding: "6px 28px 6px 26px",
          outline: "none", fontFamily: "inherit",
          caretColor: "#0F1923",
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#C8C0B8"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#E4DFD8"; }}
      />
      {value && (
        <button onClick={() => onChange("")}
          style={{ position: "absolute", right: "8px", background: "none", border: "none", cursor: "pointer", color: "#A09890", fontSize: "14px", lineHeight: 1, padding: "2px" }}>
          ×
        </button>
      )}
    </div>
  );
}

function FilterGroup({ label, options, active, onSelect }: {
  label: string;
  options: string[];
  active: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      <span style={{ fontSize: "10px", color: "#C8C0B8", letterSpacing: "0.06em", textTransform: "uppercase", width: "36px", flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {options.map((o) => (
          <Pill key={o} label={o} active={active === o} onClick={() => onSelect(o)} />
        ))}
      </div>
    </div>
  );
}
