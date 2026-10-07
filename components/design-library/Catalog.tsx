"use client";
// The component catalogue at /library/componentes: one tab per context, one card per piece,
// each with a live sample or a screenshot, its names as copyable chips, and what it does.
import { useState } from "react";
import type { CatalogTab } from "@/lib/design-system";
import DsMarkdown from "./DsMarkdown";
import { LiquidSegmented, Sample } from "./Specimens";
import { Chip as SysChip } from "@/components/criterio";
import "./DesignLibrary.css";

function Chip({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); } catch {}
  };
  return (
    <span className="ds-code" data-tip="Copiar">
      <SysChip onClick={copy}>{done ? "Copiado" : text}</SysChip>
    </span>
  );
}

export default function Catalog({ tabs }: { tabs: CatalogTab[] }) {
  const [tab, setTab] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  return (
    <div className="ds-specimen">
      <LiquidSegmented className="ds-seg" label="Contextos" active={tabs.indexOf(current)}
        onChange={(i) => setTab(tabs[i].id)} items={tabs.map((t) => ({ label: t.name, count: t.items.length }))} />
      <div className="ds-catalog">
        {current.items.map((it) => (
          <article key={it.id} id={it.id} className={`cr-card cr-card-raised ds-comp${it.unused ? " is-off" : ""}`}>
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
                <h2 className="t-title-m">{it.name}</h2>
                {it.unused && <SysChip>Sin uso</SysChip>}
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
