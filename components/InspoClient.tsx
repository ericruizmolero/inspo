"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { InspoItem, FilterTipo, FilterAutor, FilterFecha, TagMap, InspoTags } from "@/types/inspo";
import { ThumbnailMap } from "@/lib/thumbnails";
import { TAG_THRESHOLD, TAXONOMY_VERSION } from "@/lib/taxonomy";
import Sidebar, { SearchBox, Icons, TaggingState } from "./Sidebar";
import InspoCard from "./InspoCard";
import ThumbPickerModal from "./ThumbPickerModal";
import AddInspoModal from "./AddInspoModal";
import DesignMdModal from "./DesignMdModal";
import RecursosModal from "./RecursosModal";
import DesignMdToasts, { type DesignMdState } from "./DesignMdToasts";
import WorkspaceMenu from "./WorkspaceMenu";
import type { Workspace, SessionUser } from "@/lib/workspace-core";

// Compress + resize image client-side before upload (avoids 413 on Vercel)
async function compressImage(file: File, maxPx = 1400, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(new File([blob!], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })),
        "image/jpeg", quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

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
      const w = window.innerWidth;
      if (w <= 520) setCols(1);
      else if (w <= 900) setCols(2);
      else if (w <= 1400) setCols(3);
      else if (w <= 1900) setCols(4);
      else setCols(5);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

// Jev puntúa de forma conservadora: mostramos lo que supera 0.4 y, si son pocos,
// al menos los 8 mejores mientras pasen de 0.3.
function aiCutoff(scores: Record<string, number>) {
  const sorted = Object.values(scores).sort((a, b) => b - a);
  return Math.max(0.3, Math.min(0.4, sorted[7] ?? 0));
}

export default function InspoClient({
  items: initialItems,
  initialThumbnailMap = {},
  initialTagMap = {},
  aiEnabled = false,
  user,
  workspace,
  workspaces,
  memberNames = [],
}: {
  items: InspoItem[];
  initialThumbnailMap?: ThumbnailMap;
  initialTagMap?: TagMap;
  aiEnabled?: boolean;
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
  memberNames?: string[];
}) {
  const [items, setItems] = useState(initialItems);
  const [tipo, setTipo] = useState<FilterTipo>("Todos");
  const [autor, setAutor] = useState<FilterAutor>("Todos");
  const [fecha, setFecha] = useState<FilterFecha>("Todos");
  const [query, setQuery] = useState("");
  const [thumbMap, setThumbMap] = useState<ThumbnailMap>(initialThumbnailMap);

  // ─── IA: etiquetas y búsqueda ───────────────────────────────────────────────
  const [tagMap, setTagMap] = useState<TagMap>(initialTagMap);
  const [sector, setSector] = useState("Todos");
  const [estilo, setEstilo] = useState("Todos");
  const [selTags, setSelTags] = useState<string[]>([]);
  const [ai, setAi] = useState(false);
  const [aiScores, setAiScores] = useState<Record<string, number> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasons, setAiReasons] = useState<Record<string, string> | null>(null);
  const [aiError, setAiError] = useState("");
  const [tagging, setTagging] = useState<TaggingState>({ running: false, done: 0, total: 0 });

  const pending = useMemo(
    () => items.filter((i) => !tagMap[i.web] || tagMap[i.web].v !== TAXONOMY_VERSION).length,
    [items, tagMap]
  );

  const toggleTag = useCallback((k: string) => {
    setSelTags((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }, []);

  // Búsqueda IA: debounce y llamada a /api/search
  const aiQuery = ai ? query.trim() : "";
  useEffect(() => {
    if (!aiEnabled || aiQuery.length < 3) { setAiScores(null); setAiLoading(false); setAiError(""); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setAiLoading(true); setAiError("");
      try {
        const res = await fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: aiQuery }), signal: ctrl.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        setAiScores(data.scores);
        setAiReasons(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setAiError(String((e as Error).message ?? e));
      } finally {
        if (!ctrl.signal.aborted) setAiLoading(false);
      }
    }, 600);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [aiQuery, aiEnabled]);

  // Porqué de cada resultado: Claude redacta una frase por item visible (tras tener las puntuaciones)
  useEffect(() => {
    if (!aiScores || !aiQuery) { setAiReasons(null); return; }
    const cutoff = aiCutoff(aiScores);
    const results = Object.entries(aiScores)
      .filter(([, s]) => s >= cutoff)
      .sort((a, b) => b[1] - a[1]).slice(0, 40)
      .map(([web, score]) => ({ web, score }));
    if (!results.length) return;
    const ctrl = new AbortController();
    fetch("/api/explain", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: aiQuery, results }), signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.reasons) setAiReasons(d.reasons); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [aiScores, aiQuery]);

  // Etiqueta un item recién añadido (sin PIN; el servidor comprueba que esté en el sheet)
  const tagOne = useCallback(async (web: string) => {
    if (!aiEnabled) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ web }),
      });
      if (!res.ok) return;
      const { tags } = (await res.json()) as { tags: InspoTags };
      setTagMap((prev) => ({ ...prev, [web]: tags }));
    } catch { /* se quedará como pendiente */ }
  }, [aiEnabled]);

  // Etiquetado en lote de los pendientes (solo administradores del workspace), en tandas hasta acabar
  const tagAll = async () => {
    const total = pending;
    setTagging({ running: true, done: 0, total });
    let done = 0;
    try {
      for (let guard = 0; guard < 40; guard++) {
        const res = await fetch("/api/tags", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        setTagMap((prev) => ({ ...prev, ...data.map }));
        done += data.done;
        setTagging({ running: true, done, total });
        if (data.remaining <= 0 || data.done === 0) break;
      }
      setTagging({ running: false, done, total });
    } catch (e) {
      setTagging({ running: false, done, total, error: String((e as Error).message ?? e) });
    }
  };
  const [showAdd, setShowAdd] = useState(false);
  const [showRecursos, setShowRecursos] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pickerWebUrl, setPickerWebUrl] = useState<string | null>(null);
  const [designMdItem, setDesignMdItem] = useState<InspoItem | null>(null);
  const [designMdJobs, setDesignMdJobs] = useState<Record<string, DesignMdState>>({});
  // Índice de DESIGN.md ya generados: servidor + los que terminen en esta sesión
  const [designMdIndex, setDesignMdIndex] = useState<Record<string, { coverUrl?: string; scrollUrl?: string }>>({});

  // Cualquier miembro del workspace puede tocar miniaturas; el servidor comprueba la sesión.
  const handleThumbnailUpload = async (webUrl: string, file: File) => {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("file", compressed);
    fd.append("webUrl", webUrl);
    const res = await fetch("/api/thumbnail", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setThumbMap((prev) => ({ ...prev, [webUrl]: url }));
    }
  };

  const handleThumbnailRemove = async (webUrl: string) => {
    const res = await fetch(`/api/thumbnail?webUrl=${encodeURIComponent(webUrl)}`, { method: "DELETE" });
    if (res.ok) setThumbMap((prev) => { const next = { ...prev }; delete next[webUrl]; return next; });
  };

  const handlePickFromLibrary = (webUrl: string) => setPickerWebUrl(webUrl);

  // Returns error string on failure, null on success
  const handlePickerSelect = async (blobUrl: string): Promise<string | null> => {
    if (!pickerWebUrl) return "Sin webUrl";
    const webUrl = pickerWebUrl;
    try {
      const res = await fetch("/api/thumbnail/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webUrl, blobUrl }),
      });
      if (res.ok) {
        setThumbMap((prev) => ({ ...prev, [webUrl]: blobUrl }));
        setPickerWebUrl(null);
        return null;
      }
      const body = await res.json().catch(() => ({}));
      return body.error ?? `Error ${res.status}`;
    } catch (e) {
      return String(e);
    }
  };

  // ─── DESIGN.md ────────────────────────────────────────────────────────────
  // La generación vive aquí, no en el modal: cerrar el modal no la cancela y
  // el toast avisa cuando termina.
  const patchJob = (url: string, patch: Partial<DesignMdState>) =>
    setDesignMdJobs((prev) => ({ ...prev, [url]: { ...prev[url], ...patch } }));

  const runDesignMd = async (item: InspoItem, force = false) => {
    const url = item.web;
    setDesignMdJobs((prev) => ({
      ...prev,
      [url]: { status: "loading", empresa: item.empresa, startedAt: Date.now(), seen: false },
    }));
    try {
      const res = await fetch(`/api/design-md?url=${encodeURIComponent(url)}${force ? "&force=1" : ""}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      patchJob(url, { status: "ready", entry: body, error: undefined });
      setDesignMdIndex((prev) => ({ ...prev, [url]: { coverUrl: body.coverUrl, scrollUrl: body.scrollUrl } }));
    } catch (e) {
      patchJob(url, { status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  };

  useEffect(() => {
    fetch("/api/design-md")
      .then((r) => (r.ok ? r.json() : {}))
      .then((index: Record<string, { coverUrl?: string; scrollUrl?: string }>) => setDesignMdIndex(index))
      .catch(() => {});
  }, []);

  // Solo se abre la ficha si el DESIGN.md existe (en sesión o en el servidor).
  // Si hay que generarlo, se lanza en segundo plano y el toast de abajo a la derecha informa.
  const openDesignMd = (item: InspoItem) => {
    const job = designMdJobs[item.web];
    if (job?.status === "ready") { setDesignMdItem(item); return; }
    if (job?.status === "loading") return; // ya está en marcha, el toast lo muestra
    if (item.web in designMdIndex) {
      // Existe en el servidor: abrir y cargar (respuesta casi inmediata desde caché)
      setDesignMdItem(item);
      runDesignMd(item);
      return;
    }
    runDesignMd(item);
  };

  const openDesignMdByUrl = (url: string) => {
    const item = items.find((i) => i.web === url);
    if (item) openDesignMd(item);
  };

  // Regenerar cuesta dinero: el servidor solo lo permite a administradores del workspace
  const regenerateDesignMd = (item: InspoItem) => runDesignMd(item, true);

  // Lo que se muestra en el modal cuenta como visto
  useEffect(() => {
    const url = designMdItem?.web;
    if (!url) return;
    const job = designMdJobs[url];
    if (job && job.status !== "loading" && !job.seen) patchJob(url, { seen: true });
  }, [designMdItem, designMdJobs]);

  // "Quién": miembros del workspace primero, luego etiquetas heredadas que sigan en uso (p. ej. "Ambos")
  const autores = useMemo(() => {
    const used = new Set(items.map((i) => i.puestoPor).filter(Boolean));
    const fromMembers = memberNames.filter((n) => used.has(n));
    const legacy = [...used].filter((n) => !memberNames.includes(n)).sort();
    return [...fromMembers, ...legacy];
  }, [items, memberNames]);

  const resetFilters = useCallback(() => {
    setTipo("Todos"); setAutor("Todos"); setFecha("Todos"); setQuery("");
    setSector("Todos"); setEstilo("Todos"); setSelTags([]);
  }, []);

  const activeFilterCount = (tipo !== "Todos" ? 1 : 0) + (autor !== "Todos" ? 1 : 0) + (fecha !== "Todos" ? 1 : 0)
    + (sector !== "Todos" ? 1 : 0) + (estilo !== "Todos" ? 1 : 0) + selTags.length;

  const numCols = useColumnCount();
  const gridRef = useRef<HTMLElement>(null);
  const isMount = useRef(true);

  const filtered = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const q = normalize(query.trim());
    const useAi = !!aiScores && ai && query.trim().length >= 3;
    const cutoff = useAi ? aiCutoff(aiScores!) : 0;

    return [...items]
      .sort((a, b) => useAi
        ? (aiScores![b.web] ?? 0) - (aiScores![a.web] ?? 0)
        : parseFecha(b.fecha) - parseFecha(a.fecha))
      .filter((item) => {
        const t = tagMap[item.web];
        if (sector !== "Todos" && t?.sector !== sector) return false;
        if (estilo !== "Todos" && t?.estilo !== estilo) return false;
        if (selTags.length && !selTags.every((k) => (t?.tags[k] ?? 0) >= TAG_THRESHOLD)) return false;
        if (useAi) {
          if ((aiScores![item.web] ?? 0) < cutoff) return false;
        }
        if (tipo !== "Todos" && item.tipo !== tipo) return false;
        if (autor !== "Todos" && item.puestoPor !== autor) return false;
        if (fecha !== "Todos") {
          const ts = parseFecha(item.fecha);
          if (ts === 0) return false;
          const d = new Date(ts);
          if (fecha === "Este año" && d.getFullYear() !== thisYear) return false;
          if (fecha === "Este mes" && (d.getFullYear() !== thisYear || d.getMonth() !== thisMonth)) return false;
        }
        if (q && !useAi) {
          const haystack = normalize([item.empresa, item.comentarios, item.subcomentarios ?? "", item.web].join(" "));
          if (!haystack.includes(q)) return false;
        }
        return true;
      });
  }, [items, tipo, autor, fecha, query, tagMap, sector, estilo, selTags, ai, aiScores]);

  // Round-robin into columns so visual order reads left→right, row by row
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

    const sorted = cards.slice().sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 20) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    gsap.from(sorted, {
      opacity: 0,
      y: isMount.current ? 16 : 8,
      duration: isMount.current ? 0.45 : 0.3,
      stagger: isMount.current ? 0.035 : 0.025,
      ease: "power3.out",
      clearProps: "all",
    });
    isMount.current = false;
  }, [filtered]);

  // Close the mobile drawer whenever a filter changes
  useEffect(() => { setDrawerOpen(false); }, [tipo, autor, fecha, sector, estilo, selTags]);

  return (
    <div className="shell">
      {pickerWebUrl && (
        <ThumbPickerModal onSelect={handlePickerSelect} onCancel={() => setPickerWebUrl(null)} />
      )}
      {designMdItem && (
        <DesignMdModal
          url={designMdItem.web}
          empresa={designMdItem.empresa}
          state={designMdJobs[designMdItem.web]}
          onClose={() => setDesignMdItem(null)}
          onRetry={() => runDesignMd(designMdItem)}
          onRegenerate={() => regenerateDesignMd(designMdItem)}
        />
      )}
      <DesignMdToasts
        jobs={designMdJobs}
        openUrl={designMdItem?.web ?? null}
        onOpen={openDesignMdByUrl}
        onDismiss={(url) => patchJob(url, { seen: true })}
      />
      {showRecursos && <RecursosModal onClose={() => setShowRecursos(false)} />}
      {showAdd && (
        <AddInspoModal
          onClose={() => setShowAdd(false)}
          onAdd={(item) => { setItems((prev) => [item, ...prev]); tagOne(item.web); }}
        />
      )}

      <Sidebar
        brand={<WorkspaceMenu user={user} workspace={workspace} workspaces={workspaces} />}
        autores={autores}
        items={items}
        tipo={tipo} autor={autor} fecha={fecha} query={query}
        onTipo={setTipo} onAutor={setAutor} onFecha={setFecha} onQuery={setQuery}
        onReset={resetFilters}
        onAdd={() => { setDrawerOpen(false); setShowAdd(true); }}
        onRecursos={() => { setDrawerOpen(false); setShowRecursos(true); }}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tagMap={tagMap}
        sector={sector} estilo={estilo} selTags={selTags}
        onSector={setSector} onEstilo={setEstilo} onToggleTag={toggleTag}
        ai={ai} onAi={setAi} aiLoading={aiLoading} aiEnabled={aiEnabled}
        pending={pending} tagging={tagging} onTagAll={tagAll}
      />

      <div className="content">
        <div className="topbar">
          <span className="display">Inspo</span>
          <SearchBox className="topbar__search" value={query} onChange={setQuery}
            ai={ai} onAi={aiEnabled ? setAi : undefined} aiLoading={aiLoading} />
          <button className="btn-icon topbar__filter" onClick={() => setDrawerOpen(true)} aria-label="Filtros">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 4h12M4 8h8M6 12h4" />
            </svg>
            {activeFilterCount > 0 && <span className="topbar__badge">{activeFilterCount}</span>}
          </button>
          <button className="btn-icon" onClick={() => setShowAdd(true)} aria-label="Añadir">{Icons.plus}</button>
        </div>

        {ai && query.trim().length >= 3 && (
          <div className="ai-status">
            {aiLoading ? "Preguntando a Jev…"
              : aiError ? <span className="ai-status__error">{aiError}</span>
              : aiScores ? `${filtered.length} resultados para “${query.trim()}”` : null}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty">
            <span className="display">Nada por aquí</span>
            <span>{aiLoading ? "Buscando…" : "Prueba con otro filtro o búsqueda."}</span>
            <button className="btn btn--ghost btn--sm" onClick={resetFilters} style={{ marginTop: 8 }}>Ver todo</button>
          </div>
        ) : (
          <main ref={gridRef} className="masonry">
            {columns.map((col, colIdx) => (
              <div key={colIdx} className="masonry__col">
                {col.map((item, itemIdx) => (
                  <div key={`${item.web}-${colIdx}-${itemIdx}`} className="card-item">
                    <InspoCard
                      item={item}
                      tags={tagMap[item.web]}
                      score={ai && aiScores ? aiScores[item.web] : undefined}
                      reason={ai && aiScores ? aiReasons?.[item.web] : undefined}
                      manualThumbnail={thumbMap[item.web]}
                      onUpload={(file) => { handleThumbnailUpload(item.web, file); return Promise.resolve(); }}
                      onRemoveThumbnail={() => { handleThumbnailRemove(item.web); return Promise.resolve(); }}
                      onPickFromLibrary={() => handlePickFromLibrary(item.web)}
                      onDesignMd={() => openDesignMd(item)}
                      designMdLoading={designMdJobs[item.web]?.status === "loading"}
                      designMdReady={item.web in designMdIndex}
                      designCover={designMdIndex[item.web]?.coverUrl}
                      designScroll={designMdIndex[item.web]?.scrollUrl}
                    />
                  </div>
                ))}
              </div>
            ))}
          </main>
        )}
      </div>
    </div>
  );
}
