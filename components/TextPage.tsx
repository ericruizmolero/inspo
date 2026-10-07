"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "./I18nProvider";
import { StatusBar, StatusCell } from "@/components/criterio";
import "./TextRef.css";

/** The words, typed in place: they save themselves a moment after the typing stops, and when the page is left */
function Words({ body, onSave }: { body: string; onSave: (text: string) => Promise<void> }) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ kind: "" | "saving" | "saved" } | { kind: "error"; text: string }>({ kind: "" });
  // What the file holds, as far as this page knows; one save at a time, the last text wins
  const sent = useRef(body);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const waiting = useRef<string | null>(null);
  const busy = useRef(false);
  const save = useRef(onSave);
  save.current = onSave;
  const read = (el: HTMLElement) => el.innerText.replace(/ /g, " ");
  // What is shown follows the file, except while someone is typing here: redrawing it would move their caret
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    el.textContent = body; sent.current = body;
  }, [body]);
  useEffect(() => { if (state.kind !== "saved") return; const id = setTimeout(() => setState({ kind: "" }), 1600); return () => clearTimeout(id); }, [state]);
  // Closed with a change still waiting: it is saved on the way out
  useEffect(() => () => {
    clearTimeout(timer.current);
    const left = waiting.current;
    if (left !== null && left.trim() && left.trim() !== sent.current.trim()) void save.current(left).catch(() => {});
  }, []);
  const flush = async (now: string): Promise<void> => {
    // An emptied text is not saved: a reference is removed from its card, not by clearing it
    if (!now.trim() || now.trim() === sent.current.trim()) { waiting.current = null; return; }
    if (busy.current) return;
    busy.current = true; setState({ kind: "saving" });
    try { await save.current(now); sent.current = now; setState({ kind: "saved" }); }
    catch (e) { setState({ kind: "error", text: e instanceof Error ? e.message : String(e) }); }
    finally {
      busy.current = false;
      const next = waiting.current;
      if (next !== null && next.trim() !== sent.current.trim() && ref.current) void flush(next);
      else waiting.current = null;
    }
  };
  const typed = () => {
    const el = ref.current;
    if (!el) return;
    const now = read(el);
    waiting.current = now;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(now), 900);
  };
  return (
    <>
      <div ref={ref} className="ip-text__body" role="textbox" aria-multiline aria-label={t.card.text} spellCheck={false}
        contentEditable="plaintext-only" suppressContentEditableWarning
        onInput={typed} onBlur={(e) => { clearTimeout(timer.current); void flush(read(e.currentTarget)); }}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); e.currentTarget.blur(); } }} />
      {state.kind && <StatusBar className="ip-text__state"><StatusCell className={state.kind === "error" ? "is-error" : undefined}>{state.kind === "error" ? state.text : state.kind === "saving" ? t.doc.saving : t.doc.saved}</StatusCell></StatusBar>}
    </>
  );
}

/** A text reference opened in the panel: its words whole, as they were given, and written here when they change.
 *  `body` undefined: still loading; null: the file could not be read. Without `onSave` it is only read; with `onRename` its title is typed over too. */
export default function TextPage({ title, body, onSave, onRename }: { title: string; body: string | null | undefined; onSave?: (text: string) => Promise<void>; onRename?: (title: string) => Promise<void> }) {
  const { t } = useT();
  // The title is typed over where it is: Enter or leaving it renames the reference; emptied, it goes back
  const rename = (el: HTMLElement) => {
    const next = el.innerText.replace(/\s+/g, " ").trim();
    if (!next || next === title) { el.textContent = title; return; }
    void onRename?.(next).catch(() => { el.textContent = title; });
  };
  return (
    <div className="ip-text">
      <article className="ip-text__page">
        <span className="ip-text__kind">{t.card.text}</span>
        {onRename
          ? <h2 className="ip-text__title" role="textbox" aria-label={t.card.text} spellCheck={false} contentEditable="plaintext-only" suppressContentEditableWarning
              onBlur={(e) => rename(e.currentTarget)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); e.stopPropagation(); e.currentTarget.blur(); } }}>{title}</h2>
          : <h2 className="ip-text__title">{title}</h2>}
        {body === undefined
          ? <div className="ip-text__wait" aria-hidden>{["92%", "78%", "86%", "54%"].map((w) => <i key={w} style={{ width: w }} />)}</div>
          : body === null
            ? <p className="ip-text__missing">{t.card.textMissing}</p>
            : onSave ? <Words body={body} onSave={onSave} /> : <div className="ip-text__body">{body}</div>}
      </article>
    </div>
  );
}
