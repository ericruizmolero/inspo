"use client";
// criterio.md, in sight: the same system the bento shows, as the file an agent reads before designing,
// and looking like what it is: the raw Markdown, in a code panel, its headings, quotes and marks coloured.
// It is not a second copy. Each area's block is the area's decision and its why: pressing a block turns
// it into the text itself, and saving writes the decision as the team's, exactly as the card or the agent
// would. The file follows.
import { useState, type ReactNode } from "react";
import type { SystemArea } from "@/types/system";
import { DECISION_MAX, NEVER_MAX } from "@/types/system";
import { neverMd, type CriterioBlock } from "@/lib/criterio-md";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { loadRecipe, saveRecipe } from "@/app/actions/templates";

type AreaBlock = Extract<CriterioBlock, { kind: "area" }>;
const WHY_MAX = 400;

/** The part of an area's block a person writes: the decision, the why under its bold label, and the never list */
const rawOf = (b: AreaBlock) => [b.decision, b.why ? `**${b.whyLabel}:** ${b.why}` : "", b.never ? neverMd(b) : ""].filter(Boolean).join("\n\n");
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function parse(text: string, whyLabel: string, neverLabel: string): { decision: string; why: string; never: string } {
  const n = new RegExp(`^\\*\\*${esc(neverLabel)}:\\*\\*[ \\t]*`, "m").exec(text);
  const before = n ? text.slice(0, n.index) : text;
  const never = n ? text.slice(n.index + n[0].length).split("\n").map((l) => l.trim().replace(/^[-*·]\s*/, "")).filter(Boolean).join("\n") : "";
  const w = new RegExp(`^\\*\\*${esc(whyLabel)}:\\*\\*[ \\t]*`, "m").exec(before);
  if (!w) return { decision: before.trim(), why: "", never };
  return { decision: before.slice(0, w.index).trim(), why: before.slice(w.index + w[0].length).trim(), never };
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

export default function SystemMarkdown({ blocks, busy, onSave, onOpen, onCopy, onDownload, copied, projectId, projectName, hasRecipe }: {
  blocks: CriterioBlock[];
  busy: Set<SystemArea>;
  /** Writes the block as the area's decision (an empty decision opens the area again) */
  onSave: (area: SystemArea, next: { decision: string; why: string; never: string }) => Promise<void>;
  /** Opens the area's stage */
  onOpen: (area: SystemArea) => void;
  onCopy: () => void; onDownload: () => void; copied: boolean;
  /** The recipe beside the file: how the work is done, kept with the project */
  projectId: string; projectName: string; hasRecipe: boolean;
}) {
  const { t } = useT();
  const s = t.system.mdView;
  const [editing, setEditing] = useState<SystemArea | null>(null);
  const [draft, setDraft] = useState("");
  // While editing, the never label is always there: a rule typed under it lands in the list, never in the why
  const start = (b: AreaBlock) => { setDraft(b.never ? rawOf(b) : `${rawOf(b)}${rawOf(b) ? "\n\n" : ""}**${b.neverLabel}:**\n- `); setEditing(b.area); };
  const parsed = (b: AreaBlock) => parse(draft, b.whyLabel, b.neverLabel);
  const tooLong = (b: AreaBlock) => { const p = parsed(b); return p.decision.length > DECISION_MAX || p.why.length > WHY_MAX || p.never.length > NEVER_MAX; };
  const save = async (b: AreaBlock) => {
    const p = parsed(b);
    if (p.decision.length > DECISION_MAX || p.why.length > WHY_MAX || p.never.length > NEVER_MAX) return;
    if (p.decision !== b.decision.trim() || p.why !== b.why.trim() || p.never !== b.never.trim()) await onSave(b.area, p);
    setEditing(null);
  };
  const rowsFor = (text: string) => Math.min(20, Math.max(4, text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 88)), 0) + 1));

  const [file, setFile] = useState<"criterio" | "recipe">("criterio");
  const [recipe, setRecipe] = useState<string | null>(null);
  const [recipeCopied, setRecipeCopied] = useState(false);
  const [hasOne, setHasOne] = useState(hasRecipe);
  const openRecipe = async () => { setFile("recipe"); if (recipe === null) { const r = await loadRecipe(projectId); setRecipe(r.ok ? r.data : ""); } };
  const upload = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    const r = await saveRecipe(projectId, text);
    if (r.ok) { setRecipe(text); setHasOne(!!text); setFile("recipe"); }
  };
  const tabs = (
    <span className="mdv-files" role="tablist">
      <button type="button" role="tab" aria-selected={file === "criterio"} className={`mdv-file${file === "criterio" ? " is-on" : ""}`} onClick={() => setFile("criterio")}>criterio.md</button>
      {hasOne
        ? <button type="button" role="tab" aria-selected={file === "recipe"} className={`mdv-file${file === "recipe" ? " is-on" : ""}`} onClick={() => void openRecipe()}>receta.md</button>
        : <label className="mdv-file mdv-file--add" title={s.recipeHint}>{Icons.plus} receta.md<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label>}
    </span>
  );
  if (file === "recipe") return (
    <section className="mdv" aria-label="receta.md">
      <header className="mdv-bar">
        {tabs}
        <span className="mdv-bar__hint">{s.recipeHint}</span>
        <span className="mdv-bar__tools">
          <button type="button" className="mdv-btn" onClick={() => { void navigator.clipboard.writeText(recipe ?? "").then(() => { setRecipeCopied(true); setTimeout(() => setRecipeCopied(false), 1500); }, () => {}); }}>{recipeCopied ? Icons.check : Icons.all} {recipeCopied ? t.system.copied : s.copy}</button>
          <button type="button" className="mdv-btn" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([recipe ?? ""], { type: "text/markdown" })); a.download = `${projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-receta.md`; a.click(); URL.revokeObjectURL(a.href); }}><i className="mdv-btn__down">{Icons.arrow}</i> .md</button>
          <label className="mdv-btn" title={s.replaceRecipe}>{Icons.shuffle}<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden onChange={(e) => void upload(e.target.files?.[0])} /></label>
        </span>
      </header>
      {recipe === null ? <div className="mdv-doc"><span className="spinner spinner--sm" /></div> : <div className="mdv-doc">{recipe.split("\n").map((line, i) => <Line key={i} text={line} />)}</div>}
    </section>
  );

  return (
    <section className="mdv" aria-label="criterio.md">
      <header className="mdv-bar">
        {tabs}
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
          // Written whole by the app: what the project is, and the references one by one
          if (b.kind === "section") return (
            <div key={b.id} className="mdv-block">
              <Line text={`## ${b.heading}`} /><Line text="" />{b.lines.map((line, i) => <Line key={i} text={line} />)}<Line text="" />
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
                  <textarea className="mdv-input" autoFocus spellCheck={false} rows={rowsFor(draft)} value={draft} placeholder={`${t.system.placeholder}\n\n**${b.whyLabel}:** ${t.system.whyPlaceholder}\n\n**${b.neverLabel}:**\n- ${t.system.neverPlaceholder}`}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { e.stopPropagation(); setEditing(null); }
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(b); }
                    }} />
                  <div className="mdv-edit__row">
                    <Button variant="primary" size="sm" disabled={busy.has(b.area) || tooLong(b)} onClick={() => void save(b)}>{t.system.save}</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>{t.system.cancel}</Button>
                    <small className={tooLong(b) ? "is-over" : ""}>{p!.decision.length}/{DECISION_MAX}{p!.why ? ` · ${b.whyLabel.toLowerCase()} ${p!.why.length}/${WHY_MAX}` : ""}{p!.never ? ` · ${b.neverLabel.toLowerCase()} ${p!.never.length}/${NEVER_MAX}` : ""} · {s.editHint}</small>
                  </div>
                </div>
              ) : (
                // The words a person wrote are pressed to edit them; the status and the references under them are the app's
                <div className="mdv-press" role="button" tabIndex={0} title={b.decision ? t.system.edit : t.system.write} onClick={() => start(b)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(b); } }}>
                  {b.decision
                    ? rawOf(b).split("\n").map((line, i) => <Line key={i} text={line} />)
                    : [`_${b.openText}_`, ...(b.never ? ["", ...neverMd(b).split("\n")] : [])].map((line, i) => <Line key={i} text={line} />)}
                </div>
              )}
              {!on && b.meta.length > 0 && <><Line text="" />{b.meta.map((line, i) => <Line key={i} text={line} />)}</>}
              <Line text="" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
