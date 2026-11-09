"use client";
// The line over a project's board when an agent left things on it (lib/suggestions.ts): how many, where they came
// from, and accept or dismiss them all. The references are answered on their own cards; Review opens, in place,
// what has no card (the answers and a drafted plan) with yes and no on each. No form: nothing is typed here
// (decisiones/2026-11-09-fuera-los-formularios…).
import { useState } from "react";
import { useT } from "./I18nProvider";
import { Button, IconButton } from "@/components/criterio";
import { questionById, questionText } from "@/lib/playbook-questions";
import type { LandingOutline } from "@/types/landing";
import type { BriefAnswer } from "@/types/brief";
import "./SuggestedLine.css";

/** The room the line takes over the cards, closed (components/Grid.tsx headHeight) */
export const SUGGESTED_LINE_H = 52;

export interface Pending {
  refs: number;
  answers: [string, BriefAnswer][];
  outlines: LandingOutline[];
  origin: string;
}

export default function SuggestedLine({ pending, onAnswer }: {
  pending: Pending;
  /** Accept (true) or dismiss what is named, or everything */
  onAnswer: (accept: boolean, what: { answers?: string[]; outlines?: string[]; all?: boolean }) => Promise<void>;
}) {
  const { t, locale } = useT();
  const s = t.suggested;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const n = pending.refs + pending.answers.length + pending.outlines.length;
  const rest = pending.answers.length + pending.outlines.length;
  const run = async (accept: boolean, what: Parameters<typeof onAnswer>[1]) => {
    setBusy(true);
    try { await onAnswer(accept, what); } finally { setBusy(false); }
  };
  const lang = locale === "es" ? "es" : "en";
  return (
    <section className="suggested" aria-label={s.left(n)}>
      <div className="suggested__line">
        <p className="suggested__text">
          <span className="t-ui suggested__count">{s.left(n)}</span>
          {pending.origin && <span className="t-small suggested__origin">{pending.origin}</span>}
        </p>
        {rest > 0 && <Button variant="quiet" size="s" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? s.hide : s.review}</Button>}
        <Button variant="quiet" size="s" disabled={busy} onClick={() => void run(false, { all: true })}>{s.dismissAll}</Button>
        <Button size="s" icon="check" disabled={busy} onClick={() => void run(true, { all: true })}>{s.acceptAll}</Button>
      </div>
      {open && rest > 0 && (
        <ul className="suggested__list">
          {pending.answers.map(([id, a]) => {
            const q = questionById(id);
            return (
              <li key={id} className="suggested__item">
                <div className="suggested__body">
                  <span className="t-small suggested__muted">{q ? questionText(q, lang, false) : s.answer}</span>
                  <span className="t-ui">{a.text}</span>
                </div>
                <IconButton icon="check" size="xs" label={s.accept} disabled={busy} onClick={() => void run(true, { answers: [id] })} />
                <IconButton icon="close" size="xs" label={s.dismiss} disabled={busy} onClick={() => void run(false, { answers: [id] })} />
              </li>
            );
          })}
          {pending.outlines.map((o) => (
            <li key={o.id} className="suggested__item">
              <div className="suggested__body">
                <span className="t-small suggested__muted">{s.plan(o.name)}{o.directions?.length ? `, ${s.directions(o.directions.length)}` : ""}</span>
                <span className="t-ui">{o.goal}</span>
                <ol className="t-small suggested__sections">{o.sections.map((x, i) => <li key={i}><b>{x.kind}</b> {x.job}</li>)}</ol>
              </div>
              <IconButton icon="check" size="xs" label={s.accept} disabled={busy} onClick={() => void run(true, { outlines: [o.id] })} />
              <IconButton icon="close" size="xs" label={s.dismiss} disabled={busy} onClick={() => void run(false, { outlines: [o.id] })} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
