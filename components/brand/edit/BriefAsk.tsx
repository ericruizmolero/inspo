"use client";
// The brief field a section needs before it is drawn, asked at its top while the field is empty, and gone once saved.
import { useState } from "react";
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { Button, Chip } from "@/components/criterio";
import { A11Y_LEVELS, type Brief } from "@/types/brief";
import type { BrandSection } from "@/types/brand";

const BRIEF_ASKS = { color: "a11y", voice: "neverSay" } as const satisfies Partial<Record<BrandSection, keyof Brief>>;

export function BriefAsk({ area }: { area: keyof typeof BRIEF_ASKS }) {
  const { t } = useT();
  const { mode, brief, onBrief } = useBrand();
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const field = BRIEF_ASKS[area];
  if (mode !== "edit" || !onBrief || brief?.[field]) return null;
  const q = t.system.briefAsk[field];
  const save = async (patch: Partial<Brief>) => {
    setBusy(true);
    await onBrief(patch);
    setBusy(false);
  };
  const saveText = () => { const v = text.trim(); if (v) void save({ neverSay: v }); };
  return (
    <div className="be-ask">
      <p className="be-ask__say t-small">{q.say}</p>
      <h3 className="t-title-s">{q.question}</h3>
      {field === "a11y" ? (
        <ul className="be-ask__choices">
          {A11Y_LEVELS.map((l) => (
            <li key={l}>
              <Chip disabled={busy} onClick={() => void save({ a11y: l })}>WCAG {l}</Chip>
              <span>{t.system.briefAsk.a11y.why[l]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="be-ask__write">
          <input className="cr-input cr-input-s" value={text} maxLength={200} placeholder={t.system.briefAsk.neverSay.placeholder} aria-label={q.question} disabled={busy}
            onChange={(e) => setText(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter") saveText(); }} />
          <Button size="s" disabled={busy || !text.trim()} onClick={saveText}>{t.common.save}</Button>
        </div>
      )}
    </div>
  );
}
