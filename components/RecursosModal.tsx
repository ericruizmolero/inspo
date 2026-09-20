"use client";

import { useEffect, useMemo, useState } from "react";
import { RECURSOS, RECURSOS_TOTAL } from "@/lib/recursos";
import { Icons } from "./Sidebar";

interface RecursosModalProps {
  onClose: () => void;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const IcArrow = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10l6-6M5 4h5v5" />
  </svg>
);

function RecRow({ name, url, desc }: { name: string; url: string; desc: string }) {
  return (
    <li className="rec-item">
      <a className="rec-row" href={url} target="_blank" rel="noopener noreferrer">
        <span className="rec-row__name">{name}</span>
        <span className="rec-row__desc">{desc}</span>
        <span className="rec-row__arrow">{IcArrow}</span>
      </a>
    </li>
  );
}

export default function RecursosModal({ onClose }: RecursosModalProps) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("todas");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = useMemo(() => {
    const needle = norm(q.trim());
    return RECURSOS
      .filter((g) => tab === "todas" || g.key === tab)
      .map((g) => ({
        ...g,
        items: needle
          ? g.items.filter((r) => norm(`${r.name} ${r.desc} ${r.url} ${g.title}`).includes(needle))
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [q, tab]);

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
          <div className="search">
            <span className="search__icon">{Icons.search}</span>
            <input
              className="input"
              type="text"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar: heros, motion, design.md, dark…"
            />
            {q && (
              <div className="search__right">
                <button className="btn-icon search__clear" onClick={() => setQ("")} aria-label="Limpiar">{Icons.x}</button>
              </div>
            )}
          </div>
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
          {groups.length === 0 && <div className="rec-empty">Nada con ese nombre. Prueba con otra palabra o quita el filtro.</div>}
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
          {(q || tab !== "todas") && shown > 0 && (
            <div className="sidebar__footer-note" style={{ padding: 0 }}>{shown} de {RECURSOS_TOTAL}</div>
          )}
        </div>
      </div>
    </div>
  );
}
