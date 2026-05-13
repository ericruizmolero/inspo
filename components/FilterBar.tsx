"use client";

import { FilterAutor, FilterTipo } from "@/types/inspo";

const TIPOS: FilterTipo[] = ["Todos", "Inspiración", "Videos", "Ideas", "Documentales"];
const AUTORES: FilterAutor[] = ["Todos", "Eric", "Andoni", "Ambos"];

interface FilterBarProps {
  tipo: FilterTipo;
  autor: FilterAutor;
  onTipo: (t: FilterTipo) => void;
  onAutor: (a: FilterAutor) => void;
  count: number;
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#6A6560";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#A09890";
      }}
    >
      {label}
    </button>
  );
}

export default function FilterBar({ tipo, autor, onTipo, onAutor, count }: FilterBarProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        height: "52px",
        borderBottom: "1px solid #D8D0C6",
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "#EDE8DF",
      }}
    >
      {/* Tipo filters */}
      <nav style={{ display: "flex", alignItems: "center" }}>
        {TIPOS.map((t) => (
          <Tab key={t} label={t} active={tipo === t} onClick={() => onTipo(t)} />
        ))}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        {/* Autor filters */}
        <nav style={{ display: "flex", alignItems: "center" }}>
          {AUTORES.map((a) => (
            <Tab key={a} label={a} active={autor === a} onClick={() => onAutor(a)} />
          ))}
        </nav>

        {/* Count */}
        <span
          style={{
            fontSize: "11px",
            color: "#C8C0B8",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.04em",
          }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}
