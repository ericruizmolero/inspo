"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "./I18nProvider";
import { StatusBar, StatusCell } from "@/components/criterio";
import type { CodeJar } from "codejar";
import { continueList, highlightMarkdown } from "@/lib/markdown-highlight";
import "./TextRef.css";

/** The words, typed in place as Markdown and coloured as they are typed: they save themselves a moment after the
 *  typing stops, and when the page is left */
function Words({ body, onSave }: { body: string; onSave: (text: string) => Promise<void> }) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const jar = useRef<CodeJar | null>(null);
  const [state, setState] = useState<{ kind: "" | "saving" | "saved" } | { kind: "error"; text: string }>({ kind: "" });
  // What the file holds, as far as this page knows; one save at a time, the last text wins
  const sent = useRef(body);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const waiting = useRef<string | null>(null);
  const busy = useRef(false);
  const save = useRef(onSave);
  save.current = onSave;
  const read = () => (jar.current?.toString() ?? ref.current?.textContent ?? "").replace(/\u00a0/g, " ");
  // What is shown follows the file, except while someone is typing here: redrawing it would move their caret
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    sent.current = body;
    if (jar.current) jar.current.updateCode(body, false); else el.innerHTML = highlightMarkdown(body);
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
  const typed = useRef(() => {});
  typed.current = () => {
    const now = read();
    waiting.current = now;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(now), 900);
  };
  // CodeJar reads `window` when it loads: it comes in here, on the client
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    const keys = (e: KeyboardEvent) => onKey(e, jar.current);
    el.addEventListener("keydown", keys);
    void import("codejar").then(({ CodeJar }) => {
      if (!live) return;
      const j = CodeJar(el, (node) => { node.innerHTML = highlightMarkdown(node.textContent ?? ""); }, { tab: "  ", indentOn: /$^/, addClosing: false });
      j.onUpdate(() => typed.current());
      jar.current = j;
    });
    return () => { live = false; el.removeEventListener("keydown", keys); jar.current?.destroy(); jar.current = null; };
  }, []);
  return (
    <>
      <div ref={ref} className="ip-text__body mde" role="textbox" aria-multiline aria-label={t.card.text} spellCheck={false}
        contentEditable="plaintext-only" suppressContentEditableWarning
        onBlur={() => { clearTimeout(timer.current); void flush(read()); }} />
      {state.kind && <StatusBar className="ip-text__state"><StatusCell className={state.kind === "error" ? "is-error" : undefined}>{state.kind === "error" ? state.text : state.kind === "saving" ? t.doc.saving : t.doc.saved}</StatusCell></StatusBar>}
    </>
  );
}

/** The keys the editor adds to typing: Enter carries a list on, ⌘B and ⌘I wrap the selection, ⌘K makes it a link,
 *  Esc leaves. They run before CodeJar's own, which steps aside for a key already handled. */
function onKey(e: KeyboardEvent, jar: CodeJar | null) {
  const el = e.currentTarget as HTMLElement;
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); el.blur(); return; }
  if (!jar || e.isComposing) return;
  const mod = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey;
  const k = e.key.toLowerCase();
  const wrap = mod && k === "b" ? ["**", "**"] : mod && k === "i" ? ["_", "_"] : mod && k === "k" ? ["[", "]()"] : null;
  const text = jar.toString();
  const pos = jar.save();
  const [from, to] = [Math.min(pos.start, pos.end), Math.max(pos.start, pos.end)];
  if (wrap) {
    e.preventDefault(); e.stopPropagation();
    const picked = text.slice(from, to);
    // ⌘K over an address: the address goes in the brackets' link, the caret into the words
    const isUrl = k === "k" && /^https?:\/\/\S+$/.test(picked);
    const out = isUrl ? `[](${picked})` : `${wrap[0]}${picked}${wrap[1]}`;
    edit(jar, from, to, out, isUrl ? from + 1 : k === "k" && picked ? from + out.length - 1 : from + wrap[0].length + picked.length);
    return;
  }
  if (e.key === "Enter" && !e.shiftKey && !mod && from === to) {
    const start = text.lastIndexOf("\n", from - 1) + 1;
    const next = continueList(text.slice(start, from));
    if (!next) return;
    e.preventDefault(); e.stopPropagation();
    if ("end" in next) edit(jar, start, from, "", start);
    else edit(jar, from, from, `\n${next.next}`, from + 1 + next.next.length);
  }
}

/** Writes `insert` over the text between `from` and `to`, puts the caret at `caret`, and keeps it in the undo history */
function edit(jar: CodeJar, from: number, to: number, insert: string, caret: number) {
  jar.recordHistory();
  const text = jar.toString();
  jar.updateCode(text.slice(0, from) + insert + text.slice(to));
  jar.restore({ start: caret, end: caret });
  jar.recordHistory();
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
            : onSave ? <Words body={body} onSave={onSave} /> : <div className="ip-text__body mde" dangerouslySetInnerHTML={{ __html: highlightMarkdown(body, { links: true }) }} />}
      </article>
    </div>
  );
}
