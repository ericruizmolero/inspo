"use client";
// The component catalogue at /library/componentes: one tab per context, one card per piece,
// each with a live sample or a screenshot, its names as copyable chips, and what it does.
import { useState } from "react";
import type { CatalogTab } from "@/lib/design-system";
import DsMarkdown from "./DsMarkdown";
import { Sample } from "./Specimens";
import "./DesignLibrary.css";

function Chip({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); } catch {}
  };
  return (
    <button type="button" className="ds-chip" onClick={copy} title="Copiar">
      {done ? "Copiado" : text}
    </button>
  );
}

export default function Catalog({ tabs }: { tabs: CatalogTab[] }) {
  const [tab, setTab] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  return (
    <div className="ds-specimen">
      <div className="ds-seg" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-pressed={t.id === current.id} aria-selected={t.id === current.id} onClick={() => setTab(t.id)}>
            {t.name} <span className="ds-count">{t.items.length}</span>
          </button>
        ))}
      </div>
      <div className="ds-catalog">
        {current.items.map((it) => (
          <article key={it.id} id={it.id} className={`ds-comp${it.unused ? " is-off" : ""}`}>
            {(it.sample || it.shot) && (
              <div className={`ds-comp__stage${it.shot ? " ds-comp__stage--shot" : ""}`}>
                {it.shot
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`/library/capturas/${it.shot}`} alt={it.name} loading="lazy" />
                  : <Sample name={it.sample!} />}
              </div>
            )}
            <div className="ds-comp__body">
              <header>
                <h2>{it.name}</h2>
                {it.unused && <span className="ds-pill ds-pill--retirada">Sin uso</span>}
              </header>
              {it.chips.length > 0 && <div className="ds-chips">{it.chips.map((c) => <Chip key={c} text={c} />)}</div>}
              <DsMarkdown blocks={it.blocks} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
