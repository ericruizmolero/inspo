"use client";

import { useState, useMemo } from "react";
import { InspoItem, FilterTipo, FilterAutor } from "@/types/inspo";
import FilterBar from "./FilterBar";
import InspoCard from "./InspoCard";
import InspoModal from "./InspoModal";

export default function InspoClient({ items }: { items: InspoItem[] }) {
  const [tipo, setTipo] = useState<FilterTipo>("Todos");
  const [autor, setAutor] = useState<FilterAutor>("Todos");
  const [selected, setSelected] = useState<InspoItem | null>(null);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (tipo !== "Todos" && item.tipo !== tipo) return false;
      if (autor !== "Todos" && item.puestoPor !== autor) return false;
      return true;
    });
  }, [items, tipo, autor]);

  return (
    <>
      <FilterBar
        tipo={tipo}
        autor={autor}
        onTipo={setTipo}
        onAutor={setAutor}
        count={filtered.length}
      />

      <main
        style={{
          padding: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: "1px",
          backgroundColor: "#D8D0C6",
        }}
      >
        {filtered.map((item, i) => (
          <div key={`${item.empresa}-${i}`} style={{ background: "#EDE8DF" }}>
            <InspoCard item={item} onClick={() => setSelected(item)} />
          </div>
        ))}
      </main>

      {selected && (
        <InspoModal item={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
