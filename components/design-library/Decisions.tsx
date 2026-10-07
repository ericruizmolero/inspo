"use client";
// The decision log at /library/decisiones: newest first, filtered by kind and by whether it still holds.
import { useState } from "react";
import { useT } from "@/components/I18nProvider";
import type { Block } from "@/lib/design-system";
import DsMarkdown from "./DsMarkdown";
import { Chip } from "@/components/criterio";
import { LiquidSegmented } from "./Specimens";
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
      <LiquidSegmented choice className="ds-seg" label={d.filter} active={kind ? kinds.indexOf(kind) + 1 : 0}
        onChange={(i) => setKind(i === 0 ? null : kinds[i - 1])}
        items={[{ label: d.all, count: items.length }, ...kinds.map((k) => ({ label: d.kinds[k] ?? k, count: items.filter((i) => i.kind === k).length }))]} />
      <ol className="ds-log">
        {shown.map((it) => (
          <li key={it.slug} id={it.slug} className={`ds-dec${it.status !== "vigente" ? " is-off" : ""}`}>
            <div className="ds-dec__rail">
              <time dateTime={it.date}>{fmt.format(new Date(it.date + "T12:00:00"))}</time>
            </div>
            <article className="cr-card cr-card-raised ds-dec__body">
              <header>
                <h2 className="t-title-m">{it.title}</h2>
                <div className="ds-dec__tags">
                  <Chip tone={it.status === "vigente" ? "moss" : "paper"}>{d.status[it.status] ?? it.status}</Chip>
                  <Chip>{d.kinds[it.kind] ?? it.kind}</Chip>
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
