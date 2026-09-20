"use client";

import { useState } from "react";
import { RECURSOS, RECURSOS_TOTAL, recursoShot } from "@/lib/recursos";
import { Icons } from "./Sidebar";
import s from "./EmptyStart.module.css";

// Una web por categoría del directorio (la primera de cada grupo), sin el grupo de herramientas.
const PICKS = RECURSOS.filter((g) => g.key !== "recursos").map((g) => ({ group: g.title, ...g.items[0] }));

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
  { icon: Icons.plus, title: "Guarda una web", text: "Pega la URL y ponle nombre. La captura se hace sola y la card aparece en el lienzo." },
  { icon: IcTag, title: "Se etiqueta sola", text: "Sector, estilo y tags los pone la IA al guardar. Los filtros del lateral se van llenando sin que hagas nada." },
  { icon: Icons.search, title: "Busca describiendo", text: "Escribe «landing oscura con mucho tipo» y la búsqueda ordena por afinidad y te dice por qué encaja cada una." },
  { icon: Icons.all, title: "Colecciones", text: "Inspiración, vídeos, ideas y documentales. Cada cosa en su sitio, con filtros por sector, estilo y fecha." },
  { icon: IcMd, title: "Saca su DESIGN.md", text: "El botón MD de cada card extrae el sistema de diseño de esa web: colores, tipografía, componentes y un prompt listo para Claude o Cursor." },
  { icon: Icons.users, title: "En equipo", text: "Crea un equipo e invita por correo. Cada uno guarda con su nombre y puedes filtrar por quién lo trajo." },
];

interface EmptyStartProps {
  onAdd: () => void;
  onRecursos: () => void;
}

/** Workspace sin inspos todavía: punto de partida en vez de un vacío. */
export default function EmptyStart({ onAdd, onRecursos }: EmptyStartProps) {
  return (
    <section className={s.wrap}>
      <div className={s.head}>
        <h1 className={s.title}>Tu librería empieza vacía. La inspiración, no.</h1>
        <p className={s.lead}>
          Hay <strong>{RECURSOS_TOTAL} webs</strong> esperando en el directorio. Mira, guarda lo que te pare, y las etiquetas se ponen solas.
        </p>
        <div className={s.actions}>
          <button className="btn btn--primary" onClick={onAdd}>{Icons.plus}<span>Guardar la primera inspo</span></button>
          <button className="btn btn--ghost" onClick={onRecursos}>{Icons.compass}<span>Abrir el directorio</span></button>
        </div>
      </div>

      <div className={s.section}>
        <div className={s.eyebrow}>
          <span>Cómo funciona</span>
        </div>
        <ol className={s.steps}>
          {STEPS.map((st) => (
            <li key={st.title} className={s.step}>
              <span className={s.stepHead}>
                <span className={s.stepIcon}>{st.icon}</span>
              </span>
              <span className={s.stepTitle}>{st.title}</span>
              <span className={s.stepText}>{st.text}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={s.section}>
        <div className={s.eyebrow}>
          <span>Para empezar a mirar · una por categoría</span>
          <button className={s.more} onClick={onRecursos}>Ver las {RECURSOS_TOTAL} {Icons.arrow}</button>
        </div>
        <div className={s.grid}>
          {PICKS.map((r) => (
            <a key={r.url} className={s.tile} href={r.url} target="_blank" rel="noopener noreferrer">
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

      <p className={s.tip}>Cuando veas algo que te llame la atención, aunque no sepas por qué, guárdalo. Con tres o cuatro ya empieza a verse un criterio.</p>
    </section>
  );
}
