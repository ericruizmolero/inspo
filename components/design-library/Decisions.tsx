"use client";
// The decision log at /library/decisiones: newest first, filtered by kind and by whether it still holds.
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import type { Block } from "@/lib/design-system";
import DsMarkdown from "./DsMarkdown";
import "./DesignLibrary.css";

export interface DecisionView { slug: string; title: string; date: string; status: string; kind: string; supersedes?: string; blocks: Block[] }

export default function Decisions({ items }: { items: DecisionView[] }) {
  const { t, locale } = useT();
  const d = t.designLibrary;
  const [kind, setKind] = useState<string | null>(null);
  const kinds = Array.from(new Set(items.map((i) => i.kind)));
  const shown = items.filter((i) => !kind || i.kind === kind);
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="ds-specimen">
      <div className="ds-seg" role="group">
        <button type="button" aria-pressed={!kind} onClick={() => setKind(null)}>{d.all} <span className="ds-count">{items.length}</span></button>
        {kinds.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {d.kinds[k] ?? k} <span className="ds-count">{items.filter((i) => i.kind === k).length}</span>
          </button>
        ))}
      </div>
      <ol className="ds-log">
        {shown.map((it) => (
          <li key={it.slug} id={it.slug} className={`ds-dec${it.status !== "vigente" ? " is-off" : ""}`}>
            <div className="ds-dec__rail">
              <time dateTime={it.date}>{fmt.format(new Date(it.date + "T12:00:00"))}</time>
            </div>
            <article className="ds-dec__body">
              <header>
                <h2>{it.title}</h2>
                <div className="ds-dec__tags">
                  <span className={`ds-pill ds-pill--${it.status}`}>{d.status[it.status] ?? it.status}</span>
                  <span className="ds-pill">{d.kinds[it.kind] ?? it.kind}</span>
                </div>
                {it.supersedes && <p className="ds-dec__sup">{d.replaces}: {it.supersedes}</p>}
              </header>
              <DsMarkdown blocks={it.blocks} />
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
