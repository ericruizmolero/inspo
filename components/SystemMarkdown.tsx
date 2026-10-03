"use client";
// criterio.md, in sight: the same system the bento shows, as the file an agent reads before designing,
// and looking like what it is: the raw Markdown, in a code panel, its headings, quotes and marks coloured.
// It is not a second copy. Each area's block is the area's decision and its why: pressing a block turns
// it into the text itself, and saving writes the decision as the team's, exactly as the card or the agent
// would. The file follows.
import { useState, type ReactNode } from "react";
import type { SystemArea } from "@/types/system";
import { DECISION_MAX } from "@/types/system";
import type { CriterioBlock } from "@/lib/criterio-md";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { Button } from "@/components/ui/button";

type AreaBlock = Extract<CriterioBlock, { kind: "area" }>;
const WHY_MAX = 400;

/** The part of an area's block a person writes: the decision, a blank line, and the why under its bold label */
const rawOf = (b: AreaBlock) => b.decision + (b.why ? `\n\n**${b.whyLabel}:** ${b.why}` : "");
function parse(text: string, whyLabel: string): { decision: string; why: string } {
  const label = whyLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\*\\*${label}:\\*\\*[ \\t]*`, "m").exec(text);
  if (!m) return { decision: text.trim(), why: "" };
  return { decision: text.slice(0, m.index).trim(), why: text.slice(m.index + m[0].length).trim() };
}

/** A line of the file, coloured the way an editor would: bold, links and emphasis keep their marks */
function inline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <b key={i} className="mdv-b">{part}</b>;
    if (/^`[^`]+`$/.test(part)) return <span key={i} className="mdv-code">{part}</span>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <span key={i}>[<a className="mdv-link" href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>]<span className="mdv-url">({link[2]})</span></span>;
    return <span key={i}>{part}</span>;
  });
}
function Line({ text }: { text: string }) {
  if (!text) return <div className="mdv-line">&nbsp;</div>;
  if (/^#{1,6} /.test(text)) return <div className="mdv-line mdv-h">{text}</div>;
  if (text.startsWith("> ")) return <div className="mdv-line mdv-q">{text}</div>;
  if (/^_.*_$/.test(text)) return <div className="mdv-line mdv-em">{text}</div>;
  return <div className="mdv-line">{inline(text)}</div>;
}

export default function SystemMarkdown({ blocks, busy, onSave, onOpen, onCopy, onDownload, copied }: {
  blocks: CriterioBlock[];
  busy: Set<SystemArea>;
  /** Writes the block as the area's decision (an empty decision opens the area again) */
  onSave: (area: SystemArea, decision: string, why: string) => Promise<void>;
  /** Opens the area's stage */
  onOpen: (area: SystemArea) => void;
  onCopy: () => void; onDownload: () => void; copied: boolean;
}) {
  const { t } = useT();
  const s = t.system.mdView;
  const [editing, setEditing] = useState<SystemArea | null>(null);
  const [draft, setDraft] = useState("");
  const start = (b: AreaBlock) => { setDraft(rawOf(b)); setEditing(b.area); };
  const parsed = (b: AreaBlock) => parse(draft, b.whyLabel);
  const tooLong = (b: AreaBlock) => { const p = parsed(b); return p.decision.length > DECISION_MAX || p.why.length > WHY_MAX; };
  const save = async (b: AreaBlock) => {
    const p = parsed(b);
    if (p.decision.length > DECISION_MAX || p.why.length > WHY_MAX) return;
    if (p.decision !== b.decision.trim() || p.why !== b.why.trim()) await onSave(b.area, p.decision, p.why);
    setEditing(null);
  };
  const rowsFor = (text: string) => Math.min(20, Math.max(4, text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 88)), 0) + 1));

  return (
    <section className="mdv" aria-label="criterio.md">
      <header className="mdv-bar">
        <span className="mdv-bar__name">criterio.md</span>
        <span className="mdv-bar__hint">{s.hint}</span>
        <span className="mdv-bar__tools">
          <button type="button" className="mdv-btn" onClick={onCopy}>{copied ? Icons.check : Icons.all} {copied ? t.system.copied : s.copy}</button>
          <button type="button" className="mdv-btn" onClick={onDownload} title={t.system.download}><i className="mdv-btn__down">{Icons.arrow}</i> .md</button>
        </span>
      </header>
      <div className="mdv-doc">
        {blocks.map((b) => {
          if (b.kind === "head") return <div key="head" className="mdv-block">{b.lines.flatMap((line, i) => [<Line key={`l${i}`} text={line} />, <Line key={`s${i}`} text="" />])}</div>;
          if (b.kind === "summary") return (
            <div key="summary" className="mdv-block">
              <Line text={`## ${b.heading}`} /><Line text="" /><Line text={b.text} /><Line text="" />
            </div>
          );
          const on = editing === b.area;
          const p = on ? parsed(b) : null;
          return (
            <div key={b.area} className={`mdv-block mdv-block--area${on ? " is-editing" : ""}${busy.has(b.area) ? " is-busy" : ""}`} aria-busy={busy.has(b.area)}>
              <div className="mdv-line mdv-h mdv-h--area">
                <span>{`## ${b.heading}`}</span>
                <span className="mdv-tools">
                  {!on && <button type="button" className="mdv-tool" onClick={() => start(b)}>{b.decision ? t.system.edit : t.system.write}</button>}
                  <button type="button" className="mdv-tool" onClick={() => onOpen(b.area)}>{s.openArea}</button>
                </span>
              </div>
              <Line text="" />
              {on ? (
                <div className="mdv-edit">
                  <textarea className="mdv-input" autoFocus spellCheck={false} rows={rowsFor(draft)} value={draft} placeholder={`${t.system.placeholder}\n\n**${b.whyLabel}:** ${t.system.whyPlaceholder}`}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { e.stopPropagation(); setEditing(null); }
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(b); }
                    }} />
                  <div className="mdv-edit__row">
                    <Button variant="primary" size="sm" disabled={busy.has(b.area) || tooLong(b)} onClick={() => void save(b)}>{t.system.save}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>{t.system.cancel}</Button>
                    <small className={tooLong(b) ? "is-over" : ""}>{p!.decision.length}/{DECISION_MAX}{p!.why ? ` · ${b.whyLabel.toLowerCase()} ${p!.why.length}/${WHY_MAX}` : ""} · {s.editHint}</small>
                  </div>
                </div>
              ) : (
                // The words a person wrote are pressed to edit them; the status and the references under them are the app's
                <div className="mdv-press" role="button" tabIndex={0} title={b.decision ? t.system.edit : t.system.write} onClick={() => start(b)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(b); } }}>
                  {b.decision
                    ? rawOf(b).split("\n").map((line, i) => <Line key={i} text={line} />)
                    : <Line text={`_${b.openText}_`} />}
                </div>
              )}
              {!on && b.decision && <><Line text="" />{b.meta.map((line, i) => <Line key={i} text={line} />)}</>}
              <Line text="" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
