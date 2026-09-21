"use client";

import { useState, useRef, useEffect } from "react";
import { normalizeWebUrl } from "@/lib/url";
import { RECURSOS, RECURSOS_TOTAL, recursoShot } from "@/lib/recursos";
import { Icons } from "./Sidebar";
import s from "./EmptyStart.module.css";

// Siempre 9 webs (rejilla de 3×3): las más usadas y las más de moda ahora mismo, elegidas a mano
// y con una captura que se ve perfecta. Si alguna deja de estar en el directorio, se rellena
// con la primera de cada grupo que aún no esté representado, para no dejar la rejilla coja.
const FEATURED = [
  "https://styles.refero.design",
  "https://recent.design",
  "https://curated.design",
  "https://mobbin.com",
  "https://saasframe.io",
  "https://supahero.io",
  "https://motionin.design",
  "https://the-brandidentity.com",
  "https://www.cosmos.so",
];
const ALL = RECURSOS.flatMap((g) => g.items.map((r) => ({ group: g.title, groupKey: g.key, ...r })));
const PICKS = (() => {
  const picks = FEATURED.map((u) => ALL.find((r) => r.url === u)).filter((r): r is (typeof ALL)[number] => !!r);
  for (const g of RECURSOS) {
    if (picks.length >= 9) break;
    if (g.key === "recursos" || picks.some((r) => r.groupKey === g.key)) continue;
    picks.push({ group: g.title, groupKey: g.key, ...g.items[0] });
  }
  return picks.slice(0, 9);
})();

function Thumb({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={s.thumb} aria-hidden>
      {failed ? name.slice(0, 1).toUpperCase() : (
        <img src={recursoShot(url)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

const IcTag = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2.75h5.4c.33 0 .65.13.88.37l5.35 5.35a1.25 1.25 0 0 1 0 1.76l-3.4 3.4a1.25 1.25 0 0 1-1.76 0L3.12 8.28A1.25 1.25 0 0 1 2.75 7.4V2.75z" />
    <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const IcMd = <span className={s.md}>MD</span>;

// Cómo funciona la app, en el orden en que alguien la usa por primera vez.
const STEPS = [
  { icon: Icons.plus, title: "Guarda una web", text: "Pega la URL y ya. El nombre y la captura se sacan de la propia web y la card aparece en el lienzo." },
  { icon: IcTag, title: "Se etiqueta sola", text: "Sector, estilo y tags los pone la IA al guardar. Los filtros del lateral se van llenando sin que hagas nada." },
  { icon: Icons.search, title: "Busca describiendo", text: "Escribe «landing oscura con mucho tipo» y la búsqueda ordena por afinidad y te dice por qué encaja cada una." },
  { icon: Icons.all, title: "Colecciones", text: "Inspiración, vídeos, ideas y documentales. Cada cosa en su sitio, con filtros por sector, estilo y fecha." },
  { icon: IcMd, title: "Saca su DESIGN.md", text: "El botón MD de cada card extrae el sistema de diseño de esa web: colores, tipografía, componentes y un prompt listo para Claude o Cursor." },
  { icon: Icons.users, title: "En equipo", text: "Crea un equipo e invita por correo. Cada uno guarda con su nombre y puedes filtrar por quién lo trajo." },
];

interface EmptyStartProps {
  /** Guarda la primera inspo a partir de la URL (ya normalizada). Resuelve cuando termina el alta. */
  onAddUrl: (web: string) => Promise<void>;
  isDuplicate?: (web: string) => boolean;
  onRecursos: () => void;
}

/** Workspace sin inspos todavía: punto de partida en vez de un vacío. */
export default function EmptyStart({ onAddUrl, isDuplicate, onRecursos }: EmptyStartProps) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const web = normalizeWebUrl(raw);
    if (!web) { setError("Eso no parece una URL"); return; }
    if (isDuplicate?.(web)) { setError("Esa URL ya está guardada"); return; }
    setBusy(true);
    try { await onAddUrl(web); } finally { setBusy(false); }
  };

  return (
    <section className={s.wrap}>
      <div className={s.head} data-flip>
        <h1 className={s.title}>Tu librería empieza vacía. La inspiración, no.</h1>
        <p className={s.lead}>
          Pega la web que te tenga enganchado. Se guarda, se etiqueta sola y te sacamos su DESIGN.md para que veas de qué va esto.
        </p>
        <form className={s.paste} onSubmit={submit}>
          <input
            ref={inputRef}
            className={`input input--lg ${s.pasteInput}`}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(""); }}
            placeholder="Pega una URL"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-label="URL de la primera inspo"
          />
          <button type="submit" className="btn btn--primary" disabled={busy || !raw.trim()}>
            {busy ? <span className="spinner" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} /> : Icons.plus}
            <span>{busy ? "Guardando" : "Guardar"}</span>
          </button>
        </form>
        {error ? <p className={s.error}>{error}</p> : (
          <p className={s.sub}>
            ¿Sin nada a mano? Hay <strong>{RECURSOS_TOTAL} webs</strong> esperando en el directorio.{" "}
            <button type="button" className={s.link} onClick={onRecursos}>{Icons.compass}<span>Abrir el directorio</span></button>
          </p>
        )}
      </div>

      <div className={s.section}>
        <div className={s.eyebrow} data-flip>
          <span>Cómo funciona</span>
        </div>
        <ul className={s.steps}>
          {STEPS.map((st) => (
            <li key={st.title} className={s.step} data-flip>
              <span className={s.stepHead}>
                <span className={s.stepIcon}>{st.icon}</span>
              </span>
              <span className={s.stepTitle}>{st.title}</span>
              <span className={s.stepText}>{st.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.section}>
        <div className={s.eyebrow} data-flip>
          <span>Para empezar a mirar · las más de moda</span>
          <button className={s.more} onClick={onRecursos}>Ver las {RECURSOS_TOTAL} {Icons.arrow}</button>
        </div>
        <div className={s.grid}>
          {PICKS.map((r) => (
            <a key={r.url} className={s.tile} data-flip href={r.url} target="_blank" rel="noopener noreferrer">
              <Thumb name={r.name} url={r.url} />
              <span className={s.text}>
                <span className={s.group}>{r.group}</span>
                <span className={s.name}>{r.name}{Icons.arrow}</span>
                <span className={s.desc}>{r.desc}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      <p className={s.tip} data-flip>Cuando veas algo que te llame la atención, aunque no sepas por qué, guárdalo. Con tres o cuatro ya empieza a verse un criterio.</p>
    </section>
  );
}
