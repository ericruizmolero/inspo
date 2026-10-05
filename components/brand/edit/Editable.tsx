"use client";
// Text typed where it stands, in the size and face it is shown in: a headline is edited as the headline. Enter
// keeps a one-line text, Escape gives back what was there, leaving the field saves. Read only on a share.
import { createElement, useLayoutEffect, useRef, type CSSProperties } from "react";
import { useBrand } from "../context";

interface Props {
  as?: keyof HTMLElementTagNameMap;
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Shown in view mode when the value is empty; nothing by default */
  fallback?: string;
  maxLength?: number;
}

export function Editable({ as = "span", value, onCommit, placeholder, multiline, className = "", style, fallback, maxLength = 600 }: Props) {
  const { mode } = useBrand();
  const ref = useRef<HTMLElement | null>(null);
  // The text is set by hand, not by React: a re-render while someone types would move the caret
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value, mode]);
  if (mode !== "edit") {
    const shown = value || fallback;
    return shown ? createElement(as, { className, style }, shown) : null;
  }
  const commit = () => {
    const el = ref.current;
    if (!el) return;
    let next = el.innerText.replace(/ /g, " ").replace(/\r/g, "");
    next = (multiline ? next.replace(/\n{3,}/g, "\n\n") : next.replace(/\s*\n\s*/g, " ")).trim().slice(0, maxLength);
    if (next !== value) onCommit(next);
    if (el.innerText !== next) el.innerText = next;
  };
  return createElement(as, {
    ref,
    className: `${className} be-text`,
    style,
    contentEditable: "plaintext-only",
    suppressContentEditableWarning: true,
    role: "textbox",
    "aria-multiline": !!multiline,
    "aria-label": placeholder,
    "data-placeholder": placeholder,
    spellCheck: true,
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); e.currentTarget.blur(); }
      if (e.key === "Escape") { e.currentTarget.innerText = value; e.currentTarget.blur(); }
    },
    onBlur: commit,
  });
}

/** A number typed in place: a size, a weight, a duration */
export function EditableNumber({ value, onCommit, min, max, step = 1, label, suffix, className = "" }: {
  value: number; onCommit: (n: number) => void; min: number; max: number; step?: number; label: string; suffix?: string; className?: string;
}) {
  const { mode } = useBrand();
  if (mode !== "edit") return <span className={className}>{value}{suffix}</span>;
  return (
    <span className={`be-num ${className}`}>
      <input type="number" inputMode="decimal" aria-label={label} title={label} defaultValue={value} key={value} min={min} max={max} step={step}
        onBlur={(e) => { const n = Number(e.currentTarget.value); if (Number.isFinite(n) && n !== value) onCommit(Math.min(max, Math.max(min, n))); else e.currentTarget.value = String(value); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.currentTarget.value = String(value); e.currentTarget.blur(); } }} />
      {suffix && <i>{suffix}</i>}
    </span>
  );
}
