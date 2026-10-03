"use client";
// criterio.md, in sight: the same system the bento shows, as the file an agent reads before designing.
// It is not a second copy. Each area's block is the area's decision and its why: editing a block here
// writes the decision as the team's, exactly as the card or the agent would, and the file follows.
// The Markdown marks stay visible, quiet, so it reads as the file it is.
import { useState } from "react";
import type { SystemArea } from "@/types/system";
import { DECISION_MAX } from "@/types/system";
import type { CriterioBlock } from "@/lib/criterio-md";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { areaIcon } from "./area-icons";
import { Button } from "@/components/ui/button";

type AreaBlock = Extract<CriterioBlock, { kind: "area" }>;
const M = ({ children }: { children: string }) => <span className="mdv-mark" aria-hidden>{children}</span>;

/** A line of the file with its marks dimmed: `- **Status** · rest`, `  - [Name](url). Take: …` */
function MetaLine({ line }: { line: string }) {
  const indent = line.match(/^\s*/)?.[0].length ?? 0;
  const body = line.trim().replace(/^- /, "");
  const parts = body.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return (
    <p className="mdv-meta" style={{ paddingLeft: indent * 9 }}>
      <M>- </M>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <span key={i}><M>**</M><b>{bold[1]}</b><M>**</M></span>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) return <span key={i}><M>[</M><a href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a><M>{`](${link[2].replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")})`}</M></span>;
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export default function SystemMarkdown({ blocks, busy, onSave, onOpen }: {
  blocks: CriterioBlock[];
  busy: Set<SystemArea>;
  /** Writes the block as the area's decision (an empty decision opens the area again) */
  onSave: (area: SystemArea, decision: string, why: string) => Promise<void>;
  /** Opens the area's stage */
  onOpen: (area: SystemArea) => void;
}) {
  const { t } = useT();
  const s = t.system.mdView;
  const [editing, setEditing] = useState<SystemArea | null>(null);
  const [draft, setDraft] = useState("");
  const [why, setWhy] = useState("");
  const start = (b: AreaBlock) => { setDraft(b.decision); setWhy(b.why); setEditing(b.area); };
  const save = async (b: AreaBlock) => {
    if (draft.trim() !== b.decision.trim() || why.trim() !== b.why.trim()) await onSave(b.area, draft.trim(), why.trim());
    setEditing(null);
  };
  const keys = (b: AreaBlock) => (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); setEditing(null); }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(b); }
  };
  const pressable = (b: AreaBlock) => ({
    role: "button" as const, tabIndex: 0, title: t.system.edit,
    onClick: () => start(b),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(b); } },
  });

  return (
    <article className="mdv" aria-label="criterio.md">
      <p className="mdv-hint">{s.hint}</p>
      {blocks.map((b) => {
        if (b.kind === "head") return (
          <header key="head" className="mdv-head">
            {b.lines.map((line, i) => line.startsWith("# ")
              ? <h1 key={i} className="mdv-h1"><M># </M>{line.slice(2)}</h1>
              : line.startsWith("> ") ? <p key={i} className="mdv-quote"><M>&gt; </M>{line.slice(2)}</p>
              : <p key={i} className="mdv-meta">{line.replace(/\*\*/g, "")}</p>)}
          </header>
        );
        if (b.kind === "summary") return (
          <section key="summary" className="mdv-block">
            <h2 className="mdv-h2"><M>## </M>{b.heading}</h2>
            <p className="mdv-text">{b.text}</p>
          </section>
        );
        const on = editing === b.area;
        return (
          <section key={b.area} className={`mdv-block${on ? " is-editing" : ""}${busy.has(b.area) ? " is-busy" : ""}`} aria-busy={busy.has(b.area)}>
            <h2 className="mdv-h2">
              <M>## </M>{areaIcon(b.area, 15)}{b.heading}
              <span className="mdv-h2__tools">
                {!on && <button type="button" className="mdv-tool" onClick={() => start(b)}>{Icons.sliders} {b.decision ? t.system.edit : t.system.write}</button>}
                <button type="button" className="mdv-tool" onClick={() => onOpen(b.area)}>{s.openArea} {Icons.arrow}</button>
              </span>
            </h2>
            {on ? (
              <div className="mdv-edit">
                <textarea className="mdv-input" autoFocus rows={Math.min(10, Math.max(3, Math.ceil(draft.length / 80)))} maxLength={DECISION_MAX} value={draft} placeholder={t.system.placeholder}
                  onChange={(e) => setDraft(e.target.value)} onKeyDown={keys(b)} />
                <label className="mdv-edit__why">
                  <span><M>**</M><b>{b.whyLabel}:</b><M>**</M></span>
                  <textarea className="mdv-input" rows={Math.min(6, Math.max(2, Math.ceil(why.length / 80)))} maxLength={400} value={why} placeholder={t.system.whyPlaceholder}
                    onChange={(e) => setWhy(e.target.value)} onKeyDown={keys(b)} />
                </label>
                <div className="mdv-edit__row">
                  <Button variant="primary" size="sm" disabled={busy.has(b.area)} onClick={() => void save(b)}>{t.system.save}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>{t.system.cancel}</Button>
                  <small>{s.editHint}</small>
                </div>
              </div>
            ) : b.decision ? (
              <>
                <p className="mdv-text mdv-press" {...pressable(b)}>{b.decision}</p>
                {b.why && <p className="mdv-text mdv-press" {...pressable(b)}><M>**</M><b>{b.whyLabel}:</b><M>**</M> {b.why}</p>}
                {b.meta.map((line, i) => <MetaLine key={i} line={line} />)}
              </>
            ) : (
              <p className="mdv-text mdv-open mdv-press" {...pressable(b)}><M>_</M>{b.openText}<M>_</M></p>
            )}
          </section>
        );
      })}
    </article>
  );
}
