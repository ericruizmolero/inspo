"use client";

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
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "12px",
        letterSpacing: "0.02em",
        color: active ? "#0F1923" : "#A09890",
        borderBottom: active ? "1px solid #0F1923" : "1px solid transparent",
        padding: "4px 0",
        marginRight: "20px",
        transition: "color 0.15s, border-color 0.15s",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#6A6560"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#A09890"; }}
    >
      {label}
    </button>
  );
}

export default function FilterBar({ tipo, autor, fecha, query, onTipo, onAutor, onFecha, onQuery, count }: FilterBarProps) {
  return (
    <div className="filterbar">
      {/* Fila 1: tipo + autor + count */}
      <div className="filterbar__row filterbar__row--top">
        <nav className="filterbar__nav">
          {TIPOS.map((t) => (
            <Tab key={t} label={t} active={tipo === t} onClick={() => onTipo(t)} />
          ))}
        </nav>

        <div className="filterbar__right">
          <nav className="filterbar__nav">
            {AUTORES.map((a) => (
              <Tab key={a} label={a} active={autor === a} onClick={() => onAutor(a)} />
            ))}
          </nav>
          <span style={{ fontSize: "11px", color: "#C8C0B8", fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em", flexShrink: 0 }}>
            {count}
          </span>
        </div>
      </div>

      {/* Fila 2: fecha + buscador */}
      <div className="filterbar__row filterbar__row--bottom">
        <div className="filterbar__nav" style={{ alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: "#C8C0B8", letterSpacing: "0.06em", textTransform: "uppercase", marginRight: "12px", flexShrink: 0 }}>
            Fecha
          </span>
          {FECHAS.map((f) => (
            <Tab key={f} label={f} active={fecha === f} onClick={() => onFecha(f)} />
          ))}
        </div>

        {/* Buscador */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ position: "absolute", left: "8px", opacity: 0.35, pointerEvents: "none" }}
          >
            <circle cx="5" cy="5" r="3.5" stroke="#0F1923" strokeWidth="1.2" />
            <line x1="7.8" y1="7.8" x2="10.5" y2="10.5" stroke="#0F1923" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar..."
            style={{
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: "2px",
              fontSize: "11px",
              color: "#0F1923",
              padding: "4px 8px 4px 26px",
              width: query ? "180px" : "120px",
              outline: "none",
              fontFamily: "inherit",
              letterSpacing: "0.01em",
              transition: "width 0.2s ease, border-color 0.15s",
              caretColor: "#0F1923",
            }}
            onFocus={(e) => {
              e.currentTarget.style.width = "200px";
              e.currentTarget.style.borderColor = "#D8D0C6";
            }}
            onBlur={(e) => {
              e.currentTarget.style.width = query ? "180px" : "120px";
              e.currentTarget.style.borderColor = "transparent";
            }}
          />
          {query && (
            <button
              onClick={() => onQuery("")}
              style={{
                position: "absolute",
                right: "6px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#A09890",
                fontSize: "14px",
                lineHeight: 1,
                padding: "2px",
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
