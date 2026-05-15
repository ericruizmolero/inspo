"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { InspoItem, FilterTipo, FilterAutor, FilterFecha } from "@/types/inspo";
import { ThumbnailMap } from "@/lib/thumbnails";
import FilterBar from "./FilterBar";
import InspoCard from "./InspoCard";
import PinModal from "./PinModal";
import ThumbPickerModal from "./ThumbPickerModal";

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
  const [showPin, setShowPin] = useState(false);
  const [pickerWebUrl, setPickerWebUrl] = useState<string | null>(null);
  const pendingAction = useRef<((pin: string) => void) | null>(null);

  const withPin = (action: (pin: string) => void) => {
    const stored = localStorage.getItem("inspo_upload_pin");
    if (stored) { action(stored); return; }
    pendingAction.current = action;
    setShowPin(true);
  };

  const handlePinConfirm = (pin: string) => {
    localStorage.setItem("inspo_upload_pin", pin);
    setShowPin(false);
    pendingAction.current?.(pin);
    pendingAction.current = null;
  };

  const handlePinCancel = () => {
    setShowPin(false);
    pendingAction.current = null;
  };

  const handleThumbnailUpload = (webUrl: string, file: File) => {
    withPin(async (pin) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("webUrl", webUrl);
      const res = await fetch("/api/thumbnail", { method: "POST", body: fd, headers: { "x-upload-pin": pin } });
      if (res.ok) {
        const { url } = await res.json();
        setThumbMap((prev) => ({ ...prev, [webUrl]: url }));
      } else if (res.status === 401) {
        localStorage.removeItem("inspo_upload_pin");
        pendingAction.current = async (newPin) => {
          const fd2 = new FormData();
          fd2.append("file", file);
          fd2.append("webUrl", webUrl);
          const res2 = await fetch("/api/thumbnail", { method: "POST", body: fd2, headers: { "x-upload-pin": newPin } });
          if (res2.ok) { const { url } = await res2.json(); setThumbMap((prev) => ({ ...prev, [webUrl]: url })); }
        };
        setShowPin(true);
      }
    });
  };

  const handleThumbnailRemove = (webUrl: string) => {
    withPin(async (pin) => {
      const res = await fetch(`/api/thumbnail?webUrl=${encodeURIComponent(webUrl)}`, { method: "DELETE", headers: { "x-upload-pin": pin } });
      if (res.status === 401) { localStorage.removeItem("inspo_upload_pin"); return; }
      setThumbMap((prev) => { const next = { ...prev }; delete next[webUrl]; return next; });
    });
  };

  const handlePickFromLibrary = (webUrl: string) => {
    // Ensure PIN is stored before opening picker
    withPin(() => { setPickerWebUrl(webUrl); });
  };

  // Called when PIN confirmed — if picker was waiting, open it
  // (already handled by pendingAction in handlePinConfirm)

  // Returns error string on failure, null on success
  const handlePickerSelect = async (blobUrl: string): Promise<string | null> => {
    if (!pickerWebUrl) return "Sin webUrl";
    const webUrl = pickerWebUrl;

    const pin = localStorage.getItem("inspo_upload_pin");
    if (!pin) return "Sin PIN — recarga y vuelve a intentarlo";

    try {
      const res = await fetch("/api/thumbnail/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-upload-pin": pin },
        body: JSON.stringify({ webUrl, blobUrl }),
      });
      if (res.ok) {
        setThumbMap((prev) => ({ ...prev, [webUrl]: blobUrl }));
        setPickerWebUrl(null); // close modal only on success
        return null;
      }
      if (res.status === 401) {
        localStorage.removeItem("inspo_upload_pin");
        return "PIN incorrecto";
      }
      const body = await res.json().catch(() => ({}));
      return body.error ?? `Error ${res.status}`;
    } catch (e) {
      return String(e);
    }
  };

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const handleRefresh = () => startTransition(() => router.refresh());

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
      {showPin && <PinModal onConfirm={handlePinConfirm} onCancel={handlePinCancel} />}
      {pickerWebUrl && (
        <ThumbPickerModal
          onSelect={handlePickerSelect}
          onCancel={() => setPickerWebUrl(null)}
        />
      )}
      <FilterBar
        tipo={tipo} autor={autor} fecha={fecha} query={query}
        onTipo={setTipo} onAutor={setAutor} onFecha={setFecha} onQuery={setQuery}
        count={filtered.length}
        onRefresh={handleRefresh}
        refreshing={isPending}
      />

      <main ref={gridRef} className="inspo-masonry">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="inspo-masonry__col">
            {col.map((item, itemIdx) => (
              <div key={`${item.empresa}-${colIdx}-${itemIdx}`} className="card-item">
                <InspoCard
                  item={item}
                  manualThumbnail={thumbMap[item.web]}
                  onUpload={(file) => { handleThumbnailUpload(item.web, file); return Promise.resolve(); }}
                  onRemoveThumbnail={() => { handleThumbnailRemove(item.web); return Promise.resolve(); }}
                  onPickFromLibrary={() => handlePickFromLibrary(item.web)}
                />
              </div>
            ))}
          </div>
        ))}
      </main>
    </>
  );
}
