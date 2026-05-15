"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import gsap from "gsap";
import { InspoItem, FilterTipo, FilterAutor, FilterFecha } from "@/types/inspo";
import { ThumbnailMap } from "@/lib/thumbnails";
import FilterBar from "./FilterBar";
import InspoCard from "./InspoCard";

function parseFecha(s: string): number {
  if (!s) return 0;
  const parts = s.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const ts = Date.parse(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (!isNaN(ts)) return ts;
  }
  const ts = Date.parse(s);
  return isNaN(ts) ? 0 : ts;
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function useColumnCount() {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    function update() {
      if (window.innerWidth <= 500) setCols(1);
      else if (window.innerWidth <= 900) setCols(2);
      else if (window.innerWidth <= 1300) setCols(3);
      else setCols(4);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

export default function InspoClient({
  items,
  initialThumbnailMap = {},
}: {
  items: InspoItem[];
  initialThumbnailMap?: ThumbnailMap;
}) {
  const [tipo, setTipo] = useState<FilterTipo>("Todos");
  const [autor, setAutor] = useState<FilterAutor>("Todos");
  const [fecha, setFecha] = useState<FilterFecha>("Todos");
  const [query, setQuery] = useState("");
  const [thumbMap, setThumbMap] = useState<ThumbnailMap>(initialThumbnailMap);

  const handleThumbnailUpload = async (webUrl: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("webUrl", webUrl);
    const res = await fetch("/api/thumbnail", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setThumbMap((prev) => ({ ...prev, [webUrl]: url }));
    } else {
      const body = await res.json().catch(() => ({}));
      alert(`Error subiendo thumbnail (${res.status}):\n${body.error ?? "desconocido"}`);
    }
  };

  const handleThumbnailRemove = async (webUrl: string) => {
    await fetch(`/api/thumbnail?webUrl=${encodeURIComponent(webUrl)}`, { method: "DELETE" });
    setThumbMap((prev) => {
      const next = { ...prev };
      delete next[webUrl];
      return next;
    });
  };

  const numCols = useColumnCount();
  const gridRef = useRef<HTMLElement>(null);
  const isMount = useRef(true);

  const filtered = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const q = normalize(query.trim());

    return [...items]
      .sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha))
      .filter((item) => {
        if (tipo !== "Todos" && item.tipo !== tipo) return false;
        if (autor !== "Todos" && item.puestoPor !== autor) return false;
        if (fecha !== "Todos") {
          const ts = parseFecha(item.fecha);
          if (ts === 0) return false;
          const d = new Date(ts);
          if (fecha === "Este año" && d.getFullYear() !== thisYear) return false;
          if (fecha === "Este mes" && (d.getFullYear() !== thisYear || d.getMonth() !== thisMonth)) return false;
        }
        if (q) {
          const haystack = normalize(
            [item.empresa, item.comentarios, item.subcomentarios ?? "", item.web].join(" ")
          );
          if (!haystack.includes(q)) return false;
        }
        return true;
      });
  }, [items, tipo, autor, fecha, query]);

  // Distribuir round-robin en columnas → orden visual izq→der fila por fila
  const columns = useMemo(() => {
    const cols: InspoItem[][] = Array.from({ length: numCols }, () => []);
    filtered.forEach((item, i) => cols[i % numCols].push(item));
    return cols;
  }, [filtered, numCols]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".card-item"));
    if (!cards.length) return;

    // Ordenar por posición visual: fila (top) → columna (left)
    // Así el stagger va de izquierda a derecha, fila por fila
    const sorted = cards.slice().sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 20) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    if (isMount.current) {
      isMount.current = false;
      gsap.from(sorted, {
        opacity: 0,
        y: 20,
        duration: 0.45,
        stagger: 0.04,
        ease: "power3.out",
        clearProps: "all",
      });
    } else {
      gsap.from(sorted, {
        opacity: 0,
        y: 10,
        duration: 0.3,
        stagger: 0.03,
        ease: "power2.out",
        clearProps: "all",
      });
    }
  }, [filtered]);

  return (
    <>
      <FilterBar
        tipo={tipo} autor={autor} fecha={fecha} query={query}
        onTipo={setTipo} onAutor={setAutor} onFecha={setFecha} onQuery={setQuery}
        count={filtered.length}
      />

      <main ref={gridRef} className="inspo-masonry">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="inspo-masonry__col">
            {col.map((item, itemIdx) => (
              <div key={`${item.empresa}-${colIdx}-${itemIdx}`} className="card-item">
                <InspoCard
                  item={item}
                  manualThumbnail={thumbMap[item.web]}
                  onUpload={(file) => handleThumbnailUpload(item.web, file)}
                  onRemoveThumbnail={() => handleThumbnailRemove(item.web)}
                />
              </div>
            ))}
          </div>
        ))}
      </main>
    </>
  );
}
