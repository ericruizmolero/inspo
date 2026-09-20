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
