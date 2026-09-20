"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { flushSync } from "react-dom";
import { InspoItem, FilterTipo, FilterAutor, FilterFecha, TagMap, InspoTags, CommentMap } from "@/types/inspo";
import { ThumbnailMap } from "@/lib/thumbnails";
import { TAG_THRESHOLD, TAXONOMY_VERSION } from "@/lib/taxonomy";
import Sidebar, { SearchBox, Icons, TaggingState } from "./Sidebar";
import InspoCard from "./InspoCard";
import AddInspoModal, { type NewInspoInput } from "./AddInspoModal";
import { webKeyOf, nameFromHost, tipoFromUrl } from "@/lib/url";
import DesignMdModal from "./DesignMdModal";
import RecursosModal from "./RecursosModal";
import EmptyStart from "./EmptyStart";
import CommentsPanel from "./CommentsPanel";
import { proxiedSrc } from "@/lib/proxied-src";
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

const SIDEBAR_W = 256;
const SIDEBAR_RAIL_W = 52;
const DESKTOP_MIN = 801;
const COLLAPSED_KEY = "inspo:sidebar-collapsed";
const RATIOS_KEY = "inspo:card-ratios";
// Alto/ancho de una tarjeta antes de medirla (el placeholder es 4:3) y hueco entre tarjetas.
const DEFAULT_RATIO = 0.75;
const GAP_RATIO = 0.06;

// Columnas según el ancho útil del contenido (ventana menos sidebar en escritorio).
// Se calcula de forma síncrona para que plegar el sidebar y recolocar las tarjetas
// ocurra en el mismo render y GSAP Flip pueda animarlo de una vez.
function useColumnCount(collapsed: boolean) {
  const [winW, setWinW] = useState(0);
  useEffect(() => {
    const update = () => setWinW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return useMemo(() => {
    if (!winW) return 4;
    const desktop = winW >= DESKTOP_MIN;
    const w = desktop ? winW - (collapsed ? SIDEBAR_RAIL_W : SIDEBAR_W) : winW;
    if (!desktop && w <= 520) return 1;
    if (w <= 644) return 2;
    if (w <= 1144) return 3;
    if (w <= 1644) return 4;
    return 5;
  }, [winW, collapsed]);
}

const IconPanel = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
    <path d="M6 2.75v10.5" />
  </svg>
);

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
  members = [],
}: {
  items: InspoItem[];
  initialThumbnailMap?: ThumbnailMap;
  initialTagMap?: TagMap;
  aiEnabled?: boolean;
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
  members?: { name: string; image: string | null }[];
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
  // Sin modo "normal": si Jev está configurado, la búsqueda es siempre IA
  const ai = aiEnabled;
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

  // ─── Alta solo con URL ───────────────────────────────────────────────────────
  // La tarjeta aparece al instante con el dominio; el servidor saca el nombre real
  // de la propia web y la reemplaza. Si falla, se retira y se avisa arriba.
  const [addError, setAddError] = useState<{ title: string; detail: string } | null>(null);
  useEffect(() => {
    if (!addError) return;
    const t = setTimeout(() => setAddError(null), 6000);
    return () => clearTimeout(t);
  }, [addError]);
  const isDuplicate = useCallback((web: string) => {
    const key = webKeyOf(web);
    return items.some((i) => webKeyOf(i.web) === key);
  }, [items]);
  const addByUrl = useCallback(async (input: NewInspoInput): Promise<InspoItem | null> => {
    const d = new Date();
    const temp: InspoItem = {
      empresa: nameFromHost(input.web), web: input.web, tipo: input.tipo, comentarios: input.comentarios,
      fecha: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      puestoPor: user.name || user.email,
    };
    setItems((prev) => [temp, ...prev]);
    try {
      const res = await fetch("/api/inspo/add", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ web: input.web, tipo: input.tipo, comentarios: input.comentarios }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      const item = data.item as InspoItem;
      setItems((prev) => prev.map((i) => (i === temp ? item : i)));
      tagOne(item.web);
      return item;
    } catch (e) {
      setItems((prev) => prev.filter((i) => i !== temp));
      setAddError({ title: "No se ha podido guardar", detail: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }, [user, tagOne]);

  // ─── Quitar tarjeta ──────────────────────────────────────────────────────────
  // Se retira al instante; si el servidor falla, vuelve a su sitio y se avisa.
  const deleteItem = useCallback(async (item: InspoItem) => {
    if (!item.id) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      const res = await fetch(`/api/inspo?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) throw new Error(data.error ?? `Error ${res.status}`);
      setThumbMap((prev) => { if (!(item.web in prev)) return prev; const next = { ...prev }; delete next[item.web]; return next; });
    } catch (e) {
      setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [item, ...prev]));
      setAddError({ title: "No se ha podido quitar", detail: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  // ─── Comentarios ───────────────────────────────────────────────────────────
  const [commentMap, setCommentMap] = useState<CommentMap>({});
  const [commentsItemId, setCommentsItemId] = useState<string | null>(null);
  const loadComments = useCallback(async () => {
    try {
      const res = await fetch("/api/comments");
      if (res.ok) setCommentMap(await res.json());
    } catch { /* sin red: se reintenta en el siguiente ciclo */ }
  }, []);
  useEffect(() => { loadComments(); }, [loadComments]);
  // Con el panel abierto, refrescar cada 20 s para ver lo que escriban los demás
  useEffect(() => {
    if (!commentsItemId) return;
    const t = setInterval(loadComments, 20000);
    return () => clearInterval(t);
  }, [commentsItemId, loadComments]);
  const commentsItem = useMemo(() => items.find((i) => i.id === commentsItemId) ?? null, [items, commentsItemId]);
  const postComment = async (itemId: string, body: string) => {
    const res = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, body }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
    setCommentMap((prev) => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), data] }));
  };
  const deleteComment = async (itemId: string, id: string) => {
    const res = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) setCommentMap((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? []).filter((c) => c.id !== id) }));
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const memberNames = useMemo(() => members.map((m) => m.name), [members]);
  const autorImages = useMemo(() => Object.fromEntries(members.filter((m) => m.image).map((m) => [m.name, m.image!])), [members]);
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

  // Sidebar plegable (solo escritorio). Se recuerda entre sesiones.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(COLLAPSED_KEY) === "1") setCollapsed(true); } catch { /* sin storage */ }
  }, []);
  const toggleSidebar = () => {
    gsap.registerPlugin(Flip);
    const targets = [".sidebar", ".sb-toggle", ".card-item"];
    const state = Flip.getState(targets);
    const next = !collapsed;
    flushSync(() => setCollapsed(next));
    try { localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0"); } catch { /* sin storage */ }
    Flip.from(state, {
      targets,
      duration: 0.55,
      ease: "power3.inOut",
      scale: true,
      absolute: false,
      onComplete: () => gsap.set(targets, { clearProps: "transform" }),
    });
  };

  const numCols = useColumnCount(collapsed);
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

  // Mejor afinidad entre los resultados visibles (para la cabecera de la búsqueda IA)
  const aiTop = useMemo(
    () => (ai && aiScores ? filtered.reduce((m, it) => Math.max(m, aiScores[it.web] ?? 0), 0) : 0),
    [filtered, ai, aiScores],
  );

  // Masonry real: cada tarjeta va a la columna más corta según su alto medido
  // (alto/ancho, así no depende del ancho de columna). Las medidas se cachean en
  // localStorage para que la segunda visita salga ya equilibrada.
  const ratiosRef = useRef<Record<string, number>>({});
  const [ratiosVersion, setRatiosVersion] = useState(0);
  const entering = useRef(false);
  const pendingRelayout = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RATIOS_KEY) || "{}");
      if (saved && typeof saved === "object") { ratiosRef.current = saved; setRatiosVersion((v) => v + 1); }
    } catch { /* sin storage */ }
  }, []);

  const columns = useMemo(() => {
    const cols: InspoItem[][] = Array.from({ length: numCols }, () => []);
    const heights = new Array<number>(numCols).fill(0);
    for (const item of filtered) {
      let c = 0;
      for (let i = 1; i < numCols; i++) if (heights[i] < heights[c] - 0.001) c = i;
      cols[c].push(item);
      heights[c] += (ratiosRef.current[item.web] ?? DEFAULT_RATIO) + GAP_RATIO;
    }
    return cols;
    // ratiosVersion fuerza el recálculo cuando cambian las medidas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, numCols, ratiosVersion]);

  const relayout = () => {
    try { localStorage.setItem(RATIOS_KEY, JSON.stringify(ratiosRef.current)); } catch { /* sin storage */ }
    if (entering.current) { pendingRelayout.current = true; return; }
    pendingRelayout.current = false;
    gsap.registerPlugin(Flip);
    const state = Flip.getState(".card-item");
    flushSync(() => setRatiosVersion((v) => v + 1));
    Flip.from(state, {
      targets: ".card-item",
      duration: 0.4,
      ease: "power2.inOut",
      onComplete: () => gsap.set(".card-item", { clearProps: "transform" }),
    });
  };
  const relayoutRef = useRef(relayout);
  relayoutRef.current = relayout;

  // Mide cada tarjeta cuando cambia de tamaño (imagen cargada, miniatura nueva…)
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let timer: number | undefined;
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const e of entries) {
        const el = e.target as HTMLElement;
        const id = el.dataset.flipId;
        if (!id || el.querySelector(".tile__media.is-loading")) continue;
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) continue;
        const r = h / w;
        const prev = ratiosRef.current[id];
        if (prev === undefined || Math.abs(prev - r) > 0.02) { ratiosRef.current[id] = r; changed = true; }
      }
      if (!changed) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => relayoutRef.current(), 200);
    });
    grid.querySelectorAll<HTMLElement>(".card-item").forEach((el) => ro.observe(el));
    return () => { ro.disconnect(); window.clearTimeout(timer); };
  }, [columns]);

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

    entering.current = true;
    gsap.from(sorted, {
      opacity: 0,
      y: isMount.current ? 16 : 8,
      duration: isMount.current ? 0.45 : 0.3,
      stagger: isMount.current ? 0.035 : 0.025,
      ease: "power3.out",
      clearProps: "all",
      onComplete: () => {
        entering.current = false;
        if (pendingRelayout.current) relayoutRef.current();
      },
    });
    isMount.current = false;
  }, [filtered]);

  // Close the mobile drawer whenever a filter changes
  useEffect(() => { setDrawerOpen(false); }, [tipo, autor, fecha, sector, estilo, selTags]);

  return (
    <div className={`shell${collapsed ? " is-collapsed" : ""}`}>
      {designMdItem && (
        <DesignMdModal
          url={designMdItem.web}
          empresa={designMdItem.empresa}
          state={designMdJobs[designMdItem.web]}
          onClose={() => setDesignMdItem(null)}
          onRetry={() => runDesignMd(designMdItem)}
          onRegenerate={() => regenerateDesignMd(designMdItem)}
          onRevised={(patch) => patchJob(designMdItem.web, { entry: { ...designMdJobs[designMdItem.web]?.entry!, ...patch } })}
        />
      )}
      <DesignMdToasts
        jobs={designMdJobs}
        openUrl={designMdItem?.web ?? null}
        onOpen={openDesignMdByUrl}
        onDismiss={(url) => patchJob(url, { seen: true })}
      />
      {addError && (
        <div className="toasts toasts--top" role="alert">
          <div className="toast toast--error" onClick={() => setAddError(null)}>
            <span className="toast__dot" />
            <span className="toast__text"><span className="toast__title">{addError.title}</span><span className="toast__sub">{addError.detail}</span></span>
          </div>
        </div>
      )}
      {showRecursos && <RecursosModal onClose={() => setShowRecursos(false)} aiEnabled={aiEnabled} />}
      {commentsItem && (
        <CommentsPanel
          item={commentsItem}
          comments={commentMap[commentsItem.id!] ?? []}
          user={user}
          canManage={workspace.role === "owner" || workspace.role === "admin"}
          memberImages={autorImages}
          memberNames={memberNames}
          image={thumbMap[commentsItem.web] ? proxiedSrc(thumbMap[commentsItem.web]) : designMdIndex[commentsItem.web]?.coverUrl ? proxiedSrc(designMdIndex[commentsItem.web].coverUrl!) : null}
          onPost={(body) => postComment(commentsItem.id!, body)}
          onDelete={(id) => deleteComment(commentsItem.id!, id)}
          onClose={() => setCommentsItemId(null)}
        />
      )}
      {showAdd && (
        <AddInspoModal
          onClose={() => setShowAdd(false)}
          onSubmit={addByUrl}
          isDuplicate={isDuplicate}
        />
      )}

      <Sidebar
        brand={<WorkspaceMenu user={user} workspace={workspace} workspaces={workspaces} />}
        autores={autores}
        autorImages={autorImages}
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
        ai={ai} aiLoading={aiLoading} aiEnabled={aiEnabled}
        pending={pending} tagging={tagging} onTagAll={tagAll}
      />

      <button
        className="btn-icon sb-toggle"
        onClick={toggleSidebar}
        aria-label={collapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
        title={collapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
        aria-expanded={!collapsed}
      >
        {IconPanel}
      </button>

      <div className="content">
        <div className="topbar">
          <span className="display">Inspo</span>
          <SearchBox className="topbar__search" value={query} onChange={setQuery}
            ai={ai} aiLoading={aiLoading} />
          <button className="btn-icon topbar__filter" onClick={() => setDrawerOpen(true)} aria-label="Filtros">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 4h12M4 8h8M6 12h4" />
            </svg>
            {activeFilterCount > 0 && <span className="topbar__badge">{activeFilterCount}</span>}
          </button>
          <button className="btn-icon" onClick={() => setShowAdd(true)} aria-label="Añadir">{Icons.plus}</button>
        </div>

        {ai && query.trim().length >= 3 && (aiLoading || aiError || aiScores) && (
          <header className={`ai-hero${aiLoading ? " is-loading" : ""}${aiError ? " is-error" : ""}`} role="status" aria-live="polite">
            <div className="ai-hero__badge" aria-hidden>
              {aiLoading ? <span className="spinner" /> : aiError ? Icons.x : Icons.spark}
            </div>
            <div className="ai-hero__main">
              <div className="ai-hero__eyebrow">
                {aiLoading ? "Jev está leyendo la librería" : aiError ? "Jev no ha respondido" : "Resultados de Jev para"}
              </div>
              <h2 className="ai-hero__query">{query.trim()}</h2>
              <div className="ai-hero__meta">
                {aiLoading ? (
                  <>
                    <span className="ai-hero__skeleton" style={{ width: 120 }} />
                    <span className="ai-hero__skeleton" style={{ width: 72 }} />
                  </>
                ) : aiError ? (
                  <span className="ai-hero__pill ai-hero__pill--error">{aiError}</span>
                ) : (
                  <>
                    <span className="ai-hero__pill"><strong>{filtered.length}</strong> {filtered.length === 1 ? "resultado" : "resultados"}</span>
                    {aiTop > 0 && <span className="ai-hero__pill">mejor encaje <strong>{Math.round(aiTop * 100)}%</strong></span>}
                    <span className="ai-hero__hint">Ordenados por afinidad · pulsa el porcentaje de una card para ver el porqué</span>
                  </>
                )}
              </div>
            </div>
            <button className="ai-hero__clear" onClick={() => setQuery("")}>
              {Icons.x}<span>Limpiar</span><kbd>Esc</kbd>
            </button>
            <span className="ai-hero__bar" aria-hidden />
          </header>
        )}

        {items.length === 0 ? (
          <EmptyStart
            onAddUrl={async (web) => {
              // Primera inspo: se guarda y se abre su DESIGN.md directamente, para que se vea qué hace la app
              const item = await addByUrl({ web, tipo: tipoFromUrl(web), comentarios: "" });
              if (item) { setDesignMdItem(item); runDesignMd(item); }
            }}
            isDuplicate={isDuplicate}
            onRecursos={() => setShowRecursos(true)}
          />
        ) : filtered.length === 0 ? (
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
                  <div key={`${item.web}-${colIdx}-${itemIdx}`} className="card-item" data-flip-id={item.web}>
                    <InspoCard
                      item={item}
                      tags={tagMap[item.web]}
                      score={ai && aiScores ? aiScores[item.web] : undefined}
                      reason={ai && aiScores ? aiReasons?.[item.web] : undefined}
                      commentCount={item.id ? (commentMap[item.id]?.length ?? 0) : 0}
                      onComments={item.id ? () => setCommentsItemId(item.id!) : undefined}
                      onDelete={item.id ? () => deleteItem(item) : undefined}
                      manualThumbnail={thumbMap[item.web]}
                      onUpload={(file) => { handleThumbnailUpload(item.web, file); return Promise.resolve(); }}
                      onRemoveThumbnail={() => { handleThumbnailRemove(item.web); return Promise.resolve(); }}
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
