"use client";

import { useEffect, useMemo, useState } from "react";
import { RECURSOS, RECURSOS_TOTAL, recursoShot } from "@/lib/recursos";
import { Icons, SearchBox } from "./Sidebar";

interface RecursosModalProps {
  onClose: () => void;
  aiEnabled?: boolean;
}

// Fisher–Yates. Se baraja una vez por apertura del modal (el componente se monta cada vez que se abre).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Umbral: como en la búsqueda de inspos, se queda con lo que Jev puntúa alto, y al menos los 8 mejores si superan 0.3
function aiCutoff(scores: Record<string, number>) {
  const sorted = Object.values(scores).sort((a, b) => b - a);
  return Math.max(0.3, Math.min(0.4, sorted[7] ?? 0));
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const IcArrow = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10l6-6M5 4h5v5" />
  </svg>
);

/** Miniatura estática de public/recursos (scripts/recursos-shots.ts); si no existe, la inicial del nombre. */
function RecThumb({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`rec-row__thumb${failed ? " is-fallback" : ""}`} aria-hidden>
      {failed ? name.slice(0, 1).toUpperCase() : (
        <img src={recursoShot(url)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

function RecRow({ name, url, desc }: { name: string; url: string; desc: string }) {
  return (
    <li className="rec-item">
      <a className="rec-row" href={url} target="_blank" rel="noopener noreferrer">
        <RecThumb name={name} url={url} />
        <span className="rec-row__text">
          <span className="rec-row__name">{name}</span>
          <span className="rec-row__desc">{desc}</span>
        </span>
        <span className="rec-row__arrow">{IcArrow}</span>
      </a>
    </li>
  );
}

export default function RecursosModal({ onClose, aiEnabled = false }: RecursosModalProps) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("todas");
  const [aiScores, setAiScores] = useState<Record<string, number> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [base] = useState(() => RECURSOS.map((g) => ({ ...g, items: shuffle(g.items) })));

  // Búsqueda IA: debounce y llamada a /api/recursos/search
  const aiQuery = aiEnabled ? q.trim() : "";
  useEffect(() => {
    if (aiQuery.length < 3) { setAiScores(null); setAiLoading(false); setAiError(""); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setAiLoading(true); setAiError("");
      try {
        const res = await fetch("/api/recursos/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: aiQuery }), signal: ctrl.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        setAiScores(data.scores);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setAiError(String((e as Error).message ?? e));
      } finally {
        if (!ctrl.signal.aborted) setAiLoading(false);
      }
    }, 600);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [aiQuery]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const useAi = !!aiScores && aiQuery.length >= 3;
  const groups = useMemo(() => {
    const needle = norm(q.trim());
    const cutoff = useAi ? aiCutoff(aiScores!) : 0;
    return base
      .filter((g) => tab === "todas" || g.key === tab)
      .map((g) => ({
        ...g,
        items: useAi
          ? g.items
              .filter((r) => (aiScores![r.url] ?? 0) >= cutoff)
              .sort((a, b) => (aiScores![b.url] ?? 0) - (aiScores![a.url] ?? 0))
          : needle
            ? g.items.filter((r) => norm(`${r.name} ${r.desc} ${r.url} ${g.title}`).includes(needle))
            : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [base, q, tab, useAi, aiScores]);

  const shown = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--lg rec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rec-modal__header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="rec-modal__title">¿Buscando inspiración?</h2>
            <p className="rec-modal__lead">
              {RECURSOS_TOTAL} webs que usamos para mirar antes de empezar: galerías, secciones sueltas,
              motion, DESIGN.md para agentes y herramientas. Ninguna repetida.
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar">{Icons.x}</button>
        </div>

        <div className="rec-modal__tools">
          <SearchBox
            value={q} onChange={setQ} autoFocus
            ai={aiEnabled} aiLoading={aiLoading}
          />
          <div className="rec-modal__tabs">
            <button className={`chip${tab === "todas" ? " is-active" : ""}`} onClick={() => setTab("todas")}>
              Todas<span className="chip__count">{RECURSOS_TOTAL}</span>
            </button>
            {RECURSOS.map((g) => (
              <button key={g.key} className={`chip${tab === g.key ? " is-active" : ""}`} onClick={() => setTab(tab === g.key ? "todas" : g.key)}>
                {g.title}<span className="chip__count">{g.items.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="modal__body rec-modal__body">
          {(aiLoading || aiError || useAi) && (
            <div className={`rec-status${aiError ? " is-error" : ""}`}>
              {aiLoading ? "Preguntando a Jev…"
                : aiError ? `Jev no ha respondido: ${aiError}`
                : `${shown} sitios para “${aiQuery}”`}
            </div>
          )}
          {groups.length === 0 && !aiLoading && (
            <div className="rec-empty">
              {useAi ? "Jev no ha encontrado nada que encaje. Prueba a describirlo de otra forma." : "Nada con ese nombre. Prueba con otra palabra o quita el filtro."}
            </div>
          )}
          {groups.map((g) => (
            <section key={g.key} className="rec-group">
              <header className="rec-group__head">
                <h3 className="rec-group__title">{g.title}</h3>
                <span className="rec-group__count">{g.items.length}</span>
                <span className="rec-group__hint">{g.hint}</span>
              </header>
              <ul className="rec-list">
                {g.items.map((r) => <RecRow key={r.url} name={r.name} url={r.url} desc={r.desc} />)}
              </ul>
            </section>
          ))}
          {!useAi && (q || tab !== "todas") && shown > 0 && (
            <div className="sidebar__footer-note" style={{ padding: 0 }}>{shown} de {RECURSOS_TOTAL}</div>
          )}
        </div>
      </div>
    </div>
  );
}
