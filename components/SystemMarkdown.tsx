"use client";
// criterio.md, in sight: the same system the bento shows, as the file an agent reads before designing,
// and looking like what it is: the raw Markdown, in a code panel, its headings, quotes and marks coloured.
// It is not a second copy. Each area's block is the area's decision and its why: pressing a block turns
// it into the text itself, and saving writes the decision as the team's, exactly as the card or the agent
// would. The file follows.
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { SystemArea } from "@/types/system";
import { DECISION_MAX, NEVER_MAX } from "@/types/system";
import { neverMd, type CriterioBlock } from "@/lib/criterio-md";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { Button } from "@/components/ui/button";
import { loadRecipe, saveRecipe } from "@/app/actions/templates";
import { timeAgo } from "@/lib/i18n/format";
import { Avatar } from "./CommentsPanel";

type AreaBlock = Extract<CriterioBlock, { kind: "area" }>;
export const WHY_MAX = 400;

/** The part of an area's block a person writes: the decision, the why under its bold label, and the never list */
const rawOf = (b: AreaBlock) => [b.decision, b.why ? `**${b.whyLabel}:** ${b.why}` : "", b.never ? neverMd(b) : ""].filter(Boolean).join("\n\n");
export const rawAreaText = rawOf;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function parseAreaText(text: string, whyLabel: string, neverLabel: string): { decision: string; why: string; never: string } { return parse(text, whyLabel, neverLabel); }
function parse(text: string, whyLabel: string, neverLabel: string): { decision: string; why: string; never: string } {
  const n = new RegExp(`^\\*\\*${esc(neverLabel)}:\\*\\*[ \\t]*`, "m").exec(text);
  const before = n ? text.slice(0, n.index) : text;
  const never = n ? text.slice(n.index + n[0].length).split("\n").map((l) => l.trim().replace(/^[-*·]\s*/, "")).filter(Boolean).join("\n") : "";
  const w = new RegExp(`^\\*\\*${esc(whyLabel)}:\\*\\*[ \\t]*`, "m").exec(before);
  if (!w) return { decision: before.trim(), why: "", never };
  return { decision: before.slice(0, w.index).trim(), why: before.slice(w.index + w[0].length).trim(), never };
}

/** A long address, as the panel shows it: its host and its last part (the file copied or downloaded has it whole) */
function shortUrl(url: string): string {
  if (url.length <= 56) return url;
  try { const u = new URL(url); const last = u.pathname.split("/").filter(Boolean).pop() ?? ""; return `${u.host}/\u2026/${last.length > 28 ? `\u2026${last.slice(-24)}` : last}`; } catch { return `${url.slice(0, 40)}\u2026`; }
}

/** A line of the file, coloured the way an editor would: bold, links and emphasis keep their marks */
function inline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <b key={i} className="mdv-b">{part}</b>;
    if (/^`[^`]+`$/.test(part)) return <span key={i} className="mdv-code">{part}</span>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <span key={i}>[<a className="mdv-link" href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>]<span className="mdv-url" title={link[2]}>({shortUrl(link[2])})</span></span>;
    return <span key={i}>{part}</span>;
  });
}
/** What a line of the file is quoted as when a pin is left on it */
export const quoteOf = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 160);

function Line({ text, onPress, pins, active }: {
  text: string;
  /** Pressing the line: where, so the menu opens at the pointer */
  onPress?: (at: { x: number; y: number }) => void;
  /** The pins left on it */
  pins?: DocPin[];
  active?: boolean;
}) {
  if (!text) return <div className="mdv-line">&nbsp;</div>;
  // A list line that wraps keeps its indent: the second row starts under the first's words, not at the margin
  const bullet = text.match(/^(\s*)- /);
  const hang = bullet ? `${bullet[1].length + 2}ch` : undefined;
  const kind = /^#{1,6} /.test(text) ? " mdv-h" : text.startsWith("> ") ? " mdv-q" : /^_.*_$/.test(text) ? " mdv-em" : "";
  const press = onPress ? {
    role: "button" as const, tabIndex: 0,
    onClick: (e: React.MouseEvent) => { if ((e.target as HTMLElement).closest("a")) return; onPress({ x: e.clientX, y: e.clientY }); },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); onPress({ x: r.left + 24, y: r.bottom }); } },
  } : {};
  return (
    <div className={`mdv-line${kind}${onPress ? " is-pressable" : ""}${pins?.length ? " has-pins" : ""}${active ? " is-active" : ""}`}
      style={hang ? { paddingLeft: hang, textIndent: `-${hang}` } : undefined} {...press}>
      {kind ? text : inline(text)}
      {!!pins?.length && (
        <span className="mdv-pin" aria-label={String(pins.length)}>
          {[...new Map(pins.map((n) => [n.who, n])).values()].slice(0, 2).map((n) => <Avatar key={n.who} name={n.who} image={n.image} size={16} />)}
          <b>{pins.length}</b>
        </span>
      )}
    </div>
  );
}

/** A comment the team pinned to a line of the file */
export interface DocPin { id: string; who: string; image: string | null; at: string; mine: boolean; text: string; quote: string }

export default function SystemMarkdown({ blocks, busy, onSave, onCopy, onDownload, copied, projectId, projectName, hasRecipe, onPropose, actions, after, pins, onPin, onUnpin }: {
  blocks: CriterioBlock[];
  busy: Set<SystemArea>;
  /** Writes the block as the area's decision (an empty decision opens the area again) */
  onSave: (area: SystemArea, next: { decision: string; why: string; never: string }) => Promise<void>;
  onCopy: () => void; onDownload: () => void; copied: boolean;
  /** The recipe beside the file: how the work is done, kept with the project */
  projectId: string; projectName: string; hasRecipe: boolean;
  /** Leaves the block's new text as a proposal for the team instead of writing it; resolves true when it was left */
  onPropose?: (area: SystemArea, next: { decision: string; why: string; never: string }, reason: string) => Promise<boolean>;
  /** What else can be done with an area, offered where it is pressed (confirm what the agent proposed, open its stage) */
  actions?: (block: AreaBlock) => { label: string; run: () => void }[];
  /** What the team is doing with an area, under its block: the proposals waiting and its conversation */
  after?: (block: AreaBlock) => ReactNode;
  /** The pins the team left, by the part of the file they sit on (an area, or head, project, summary, refs) */
  pins?: Record<string, DocPin[]>;
  /** Leaves a pin on a line; resolves true when it was left */
  onPin?: (part: string, quote: string, body: string) => Promise<boolean>;
  onUnpin?: (id: string) => Promise<void>;
}) {
  const { t } = useT();
  const s = t.system.mdView;
  const [editing, setEditing] = useState<SystemArea | null>(null);
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");
  // Pressing a line opens a menu at the pointer: change the text (an area's own words), or pin a comment to that line
  const [menu, setMenu] = useState<{ x: number; y: number; part: string; quote: string; block?: AreaBlock; editable: boolean } | null>(null);
  const [pinAt, setPinAt] = useState<{ part: string; quote: string } | null>(null);
  const [pinText, setPinText] = useState("");
  const [pinning, setPinning] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const { locale } = useT();
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => { if (!(e.target as HTMLElement | null)?.closest?.(".mdv-menu")) setMenu(null); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    const id = setTimeout(() => { document.addEventListener("click", close); document.addEventListener("keydown", key); }, 0);
    return () => { clearTimeout(id); document.removeEventListener("click", close); document.removeEventListener("keydown", key); };
  }, [menu]);
  const openPin = (part: string, quote: string) => { setMenu(null); setPinText(""); setPinAt({ part, quote }); };
  const press = (part: string, text: string, block: AreaBlock | undefined, editable: boolean) => (at: { x: number; y: number }) => {
    const quote = quoteOf(text);
    // A line with pins opens them; one with nothing else to do with it goes straight to a new pin
    if ((pins?.[part] ?? []).some((n) => n.quote === quote)) { openPin(part, quote); return; }
    if (!editable && !block && onPin) { openPin(part, quote); return; }
    const box = docRef.current?.getBoundingClientRect();
    setMenu({ x: at.x - (box?.left ?? 0), y: at.y - (box?.top ?? 0), part, quote, block, editable });
  };
  const sendPin = async () => {
    if (!pinAt || !onPin || pinning || !pinText.trim()) return;
    setPinning(true);
    const ok = await onPin(pinAt.part, pinAt.quote, pinText.trim());
    setPinning(false);
    if (ok) setPinText("");
  };
  /** The lines of a part, each pressable, with its pins and, under the open one, its thread */
  const lines = (part: string, texts: string[], block?: AreaBlock, editable = false) => {
    const mine = pins?.[part] ?? [];
    const quotes = new Set(texts.map(quoteOf));
    return texts.map((text, i) => {
      const q = quoteOf(text);
      // A pin whose line no longer reads the same stays with the part, on its first line
      const here = text ? mine.filter((n) => n.quote === q || (i === 0 && !quotes.has(n.quote))) : [];
      const open = !!text && pinAt?.part === part && (pinAt.quote === q || (i === 0 && !quotes.has(pinAt.quote)));
      return (
        <Fragment key={i}>
          <Line text={text} pins={here} active={open} onPress={text && (onPin || editable) ? press(part, text, block, editable) : undefined} />
          {open && (
            <div className="mdv-thread" onClick={(e) => e.stopPropagation()}>
              {here.map((n) => (
                <div key={n.id} className="mdv-thread__note">
                  <Avatar name={n.who} image={n.image} size={20} />
                  <div>
                    <p className="mdv-thread__meta"><b>{n.who}</b><span>{timeAgo(n.at, locale, t)}</span>{n.mine && onUnpin && <button type="button" onClick={() => void onUnpin(n.id)}>{t.areaThread.remove}</button>}</p>
                    <p>{n.text}</p>
                  </div>
                </div>
              ))}
              <form className="mdv-thread__form" onSubmit={(e) => { e.preventDefault(); void sendPin(); }}>
                <textarea autoFocus rows={2} value={pinText} placeholder={t.doc.pinPlaceholder} aria-label={t.doc.pinPlaceholder} disabled={pinning}
                  onChange={(e) => setPinText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setPinAt(null); } if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void sendPin(); } }} />
                <span>
                  <Button variant="primary" size="sm" type="submit" disabled={pinning || !pinText.trim()}>{t.doc.pin}</Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setPinAt(null)}>{t.system.cancel}</Button>
                </span>
              </form>
            </div>
          )}
        </Fragment>
      );
    });
  };
  // While editing, the never label is always there: a rule typed under it lands in the list, never in the why
  const start = (b: AreaBlock) => { setDraft(b.never ? rawOf(b) : `${rawOf(b)}${rawOf(b) ? "\n\n" : ""}**${b.neverLabel}:**\n- `); setReason(""); setEditing(b.area); };
  const propose = async (b: AreaBlock) => {
    const p = parsed(b);
    if (!onPropose || tooLong(b) || !p.decision) return;
    if (await onPropose(b.area, p, reason.trim())) setEditing(null);
  };
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
        <span className="mdv-bar__hint">{onPin ? t.doc.hint : s.hint}</span>
        <span className="mdv-bar__tools">
          <button type="button" className="mdv-btn" onClick={onCopy}>{copied ? Icons.check : Icons.all} {copied ? t.system.copied : s.copy}</button>
          <button type="button" className="mdv-btn" onClick={onDownload} title={t.system.download}><i className="mdv-btn__down">{Icons.arrow}</i> .md</button>
        </span>
      </header>
      <div className="mdv-doc" ref={docRef}>
        {blocks.map((b) => {
          if (b.kind === "head") return <div key="head" id="sdoc-head" className="mdv-block">{lines("head", b.lines.flatMap((line) => [line, ""]))}</div>;
          if (b.kind === "summary") return <div key="summary" id="sdoc-summary" className="mdv-block">{lines("summary", [`## ${b.heading}`, "", b.text, ""])}</div>;
          // Written whole by the app: what the project is, and the references one by one
          if (b.kind === "section") return <div key={b.id} id={`sdoc-${b.id}`} className="mdv-block">{lines(b.id, [`## ${b.heading}`, "", ...b.lines, ""])}</div>;
          const on = editing === b.area;
          const p = on ? parsed(b) : null;
          return (
            <div key={b.area} id={`sdoc-${b.area}`} className={`mdv-block mdv-block--area${on ? " is-editing" : ""}${busy.has(b.area) ? " is-busy" : ""}`} aria-busy={busy.has(b.area)}>
              {lines(b.area, [`## ${b.heading}`, ""], b, true)}
              {on ? (
                <div className="mdv-edit">
                  <textarea className="mdv-input" autoFocus spellCheck={false} rows={rowsFor(draft)} value={draft} placeholder={`${t.system.placeholder}\n\n**${b.whyLabel}:** ${t.system.whyPlaceholder}\n\n**${b.neverLabel}:**\n- ${t.system.neverPlaceholder}`}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { e.stopPropagation(); setEditing(null); }
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(b); }
                    }} />
                  {onPropose && <input className="mdv-reason" value={reason} maxLength={300} placeholder={t.doc.reason} aria-label={t.doc.reason} onChange={(e) => setReason(e.target.value)} />}
                  <div className="mdv-edit__row">
                    <Button variant="primary" size="sm" disabled={busy.has(b.area) || tooLong(b)} onClick={() => void save(b)} title={t.doc.saveHint}>{t.system.save}</Button>
                    {onPropose && <Button size="sm" disabled={busy.has(b.area) || tooLong(b) || !p!.decision || (p!.decision === b.decision.trim() && p!.why === b.why.trim() && p!.never === b.never.trim())} onClick={() => void propose(b)} title={t.doc.proposeHint}>{t.doc.propose}</Button>}
                    <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>{t.system.cancel}</Button>
                    <small className={tooLong(b) ? "is-over" : ""}>{p!.decision.length}/{DECISION_MAX}{p!.why ? ` · ${b.whyLabel.toLowerCase()} ${p!.why.length}/${WHY_MAX}` : ""}{p!.never ? ` · ${b.neverLabel.toLowerCase()} ${p!.never.length}/${NEVER_MAX}` : ""} · {s.editHint}</small>
                  </div>
                </div>
              ) : (
                // The words a person wrote: pressed to change them or to pin a comment; the status and the references under them are the app's, pinned only
                lines(b.area, b.decision ? rawOf(b).split("\n") : [`_${b.openText}_`, ...(b.never ? ["", ...neverMd(b).split("\n")] : [])], b, true)
              )}
              {!on && b.meta.length > 0 && lines(b.area, ["", ...b.meta], b, false)}
              {after && <div className="mdv-team">{after(b)}</div>}
              <Line text="" />
            </div>
          );
        })}
        {menu && (
          <div className="mdv-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
            {menu.editable && menu.block && <button type="button" role="menuitem" onClick={() => { const b = menu.block!; setMenu(null); start(b); }}>{menu.block.decision ? t.system.edit : t.system.write}</button>}
            {onPin && <button type="button" role="menuitem" onClick={() => openPin(menu.part, menu.quote)}>{t.doc.comment}</button>}
            {menu.block && actions?.(menu.block).map((a) => <button key={a.label} type="button" role="menuitem" onClick={() => { setMenu(null); a.run(); }}>{a.label}</button>)}
          </div>
        )}
      </div>
    </section>
  );
}
