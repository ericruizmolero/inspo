"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RECURSOS, RECURSOS_TOTAL, recursoShot, type Recurso } from "@/lib/recursos";
import { Icons, SearchBox } from "./Sidebar";
import { useT } from "./I18nProvider";
import en from "@/lib/i18n/en";
import es from "@/lib/i18n/es";

type GroupKey = keyof typeof en.recursos.groups;

// La búsqueda mira los dos idiomas: la palabra que tiene alguien en la cabeza puede
// ser "tipografía" aunque esté viendo la app en inglés.
const text = (url: string) => `${en.recursos.items[url] ?? ""} ${es.recursos.items[url] ?? ""}`;
const titles = (key: string) =>
  `${en.recursos.groups[key as GroupKey]?.title ?? ""} ${es.recursos.groups[key as GroupKey]?.title ?? ""}`;

interface RecursosModalProps {
  onClose: () => void;
  /** Sin sesión: solo una muestra; el resto se ve borroso detrás de un botón de entrar. */
  guest?: boolean;
}

// Fisher–Yates. Se baraja una vez por apertura del modal (el componente se monta cada vez que se abre).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Lo que ve un invitado: 6 webs fijas (distintas de las 9 de la portada) y 3 más borrosas
// como anzuelo. Siempre las mismas: si fueran al azar, recargando se acabaría viendo todo.
// Si alguna deja de estar en el directorio, se rellena con lo primero que haya.
const GUEST_SAMPLE = [
  "https://goatedui.dev",
  "https://landing.love",
  "https://saaspo.com",
  "https://navbar.gallery",
  "https://60fps.design",
  "https://klim.co.nz",
];
const GUEST_TEASER = ["https://refero.design", "https://www.fontshare.com", "https://savee.it"];
const ALL = RECURSOS.flatMap((g) => g.items);
function pick(urls: string[], n: number, exclude: Recurso[] = []): Recurso[] {
  const out = urls.map((u) => ALL.find((r) => r.url === u)).filter((r): r is Recurso => !!r);
  for (const r of ALL) {
    if (out.length >= n) break;
    if (!out.includes(r) && !exclude.includes(r)) out.push(r);
  }
  return out.slice(0, n);
}
const SAMPLE = pick(GUEST_SAMPLE, 6);
const TEASER = pick(GUEST_TEASER, 3, SAMPLE);
// Al entrar se vuelve a la portada con el directorio abierto (InspoClient lee ?recursos=1)
const LOGIN_HREF = `/login?next=${encodeURIComponent("/?recursos=1")}`;

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

/** Cuerpo del modal para un invitado: la muestra, y el resto borroso con el botón de entrar. */
function GuestBody() {
  const { t } = useT();
  const hidden = RECURSOS_TOTAL - SAMPLE.length;
  return (
    <>
      <section className="rec-group">
        <header className="rec-group__head">
          <h3 className="rec-group__title">{t.recursos.sample}</h3>
          <span className="rec-group__count">{SAMPLE.length}</span>
          <span className="rec-group__hint">{t.recursos.sampleHint}</span>
        </header>
        <ul className="rec-list">
          {SAMPLE.map((r) => <RecRow key={r.url} name={r.name} url={r.url} desc={t.recursos.items[r.url]} />)}
        </ul>
      </section>

      <section className="rec-gate" aria-label={t.recursos.gateLabel(hidden)}>
        {/* Filas de relleno: se ven borrosas y no se pueden abrir ni seleccionar */}
        <ul className="rec-list rec-gate__rows" aria-hidden inert>
          {TEASER.map((r) => <RecRow key={r.url} name={r.name} url={r.url} desc={t.recursos.items[r.url]} />)}
        </ul>
        <div className="rec-gate__cta">
          <p className="rec-gate__title">{t.recursos.moreInside(hidden)}</p>
          <p className="rec-gate__groups">
            {RECURSOS.map((g) => (
              <span key={g.key} className="chip" aria-hidden>{t.recursos.groups[g.key as GroupKey].title}<span className="chip__count">{g.items.length}</span></span>
            ))}
          </p>
          <Link href={LOGIN_HREF} className="btn btn--primary">{t.recursos.signInForAll}</Link>
          <p className="rec-gate__note">{t.recursos.free}</p>
        </div>
      </section>
    </>
  );
}

export default function RecursosModal({ onClose, guest = false }: RecursosModalProps) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("todas");
  const [base] = useState(() => RECURSOS.map((g) => ({ ...g, items: shuffle(g.items) })));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Búsqueda normal: nombre, descripción, URL y grupo, sin acentos ni mayúsculas
  const groups = useMemo(() => {
    const needle = norm(q.trim());
    return base
      .filter((g) => tab === "todas" || g.key === tab)
      .map((g) => ({
        ...g,
        items: needle ? g.items.filter((r) => norm(`${r.name} ${text(r.url)} ${r.url} ${titles(g.key)}`).includes(needle)) : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [base, q, tab]);

  const shown = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--lg rec-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rec-modal__header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="rec-modal__title">{t.recursos.title}</h2>
            <p className="rec-modal__lead">
              {t.recursos.lead(RECURSOS_TOTAL)}
              {guest && <> {t.recursos.guestNote} <Link href={LOGIN_HREF}>{t.recursos.guestSignIn}</Link> {t.recursos.guestNoteEnd}</>}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label={t.common.close}>{Icons.x}</button>
        </div>

        {!guest && (
          <div className="rec-modal__tools">
            <SearchBox value={q} onChange={setQ} autoFocus />
            <div className="rec-modal__tabs">
              <button className={`chip${tab === "todas" ? " is-active" : ""}`} onClick={() => setTab("todas")}>
                {t.recursos.all}<span className="chip__count">{RECURSOS_TOTAL}</span>
              </button>
              {RECURSOS.map((g) => (
                <button key={g.key} className={`chip${tab === g.key ? " is-active" : ""}`} onClick={() => setTab(tab === g.key ? "todas" : g.key)}>
                  {t.recursos.groups[g.key as GroupKey].title}<span className="chip__count">{g.items.length}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`modal__body rec-modal__body${guest ? " rec-modal__body--guest" : ""}`}>
          {guest ? <GuestBody /> : (
            <>
              {groups.length === 0 && (
                <div className="rec-empty">{t.recursos.noMatch}</div>
              )}
              {groups.map((g) => (
                <section key={g.key} className="rec-group">
                  <header className="rec-group__head">
                    <h3 className="rec-group__title">{t.recursos.groups[g.key as GroupKey].title}</h3>
                    <span className="rec-group__count">{g.items.length}</span>
                    <span className="rec-group__hint">{t.recursos.groups[g.key as GroupKey].hint}</span>
                  </header>
                  <ul className="rec-list">
                    {g.items.map((r) => <RecRow key={r.url} name={r.name} url={r.url} desc={t.recursos.items[r.url]} />)}
                  </ul>
                </section>
              ))}
              {(q || tab !== "todas") && shown > 0 && (
                <div className="sidebar__footer-note" style={{ padding: 0 }}>{t.recursos.showing(shown, RECURSOS_TOTAL)}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
