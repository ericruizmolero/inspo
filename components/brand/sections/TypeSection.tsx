"use client";
// Each face set huge in itself, with what it is for, where it comes from and its weights; then the scale, every
// step set in the same line at its real size. A face nobody serves says so instead of pretending.
import { useState } from "react";
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { AddButton, ItemTools, useSection } from "../BrandPresentation";
import { Editable, EditableNumber } from "../edit/Editable";
import { FACE_ROLES, brandId, type BrandFace, type ScaleStep } from "@/types/brand";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileSlot } from "../edit/FileSlot";
import { weightInName } from "@/lib/font-names";

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

/** Looking a family up: where it can be loaded from and which weights it has */
function FindFace({ initial, onFound, label }: { initial: string; onFound: (f: Pick<BrandFace, "family" | "source" | "weights" | "slug" | "siteWeb">) => void; label: string }) {
  const { t } = useT();
  const { findFace } = useBrand();
  const [family, setFamily] = useState(initial);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    const name = family.trim();
    if (!name || !findFace) return;
    setBusy(true);
    const found = await findFace(name).catch(() => null);
    setBusy(false);
    onFound(found ? { family: found.family, source: found.source, weights: found.weights, slug: found.slug, siteWeb: found.siteWeb } : { family: name, source: "system", weights: [400] });
  };
  return (
    <form className="bt-find" onSubmit={(e) => { e.preventDefault(); void go(); }}>
      <label><span>{t.brand.type.family}</span><input className="input" value={family} onChange={(e) => setFamily(e.currentTarget.value)} maxLength={80} autoFocus /></label>
      <button type="submit" className="be-btn" disabled={busy || !family.trim()}>{busy ? <><span className="spinner spinner--sm" /> {t.brand.type.finding}</> : label}</button>
    </form>
  );
}

function Face({ face, i }: { face: BrandFace; i: number }) {
  const { t } = useT();
  const { mode, stack } = useBrand();
  const [type, set] = useSection("typography");
  const [open, setOpen] = useState(false);
  const s = t.brand.type;
  const put = (next: Partial<BrandFace>) => set({ faces: type.faces.map((f) => (f.id === face.id ? { ...f, ...next } : f)) });
  const weights = (face.weights.length ? face.weights : [400]).slice().sort((a, b) => a - b);
  const heavy = face.role === "display" ? weights.find((w) => w >= 500) ?? weights[weights.length - 1] : weights.find((w) => w >= 400) ?? weights[0];
  return (
    <article className="bt-face">
      <div className="bt-face__main">
        <p className="bt-specimen" style={{ fontFamily: stack(face.id), fontWeight: heavy }}>{face.family}</p>
        <div className="bt-meta">
          {mode === "edit" ? (
            <select className="bt-meta__role" value={face.role} onChange={(e) => put({ role: e.currentTarget.value as BrandFace["role"] })} aria-label={s.face}>
              {FACE_ROLES.map((r) => <option key={r} value={r}>{s.roles[r]}</option>)}
            </select>
          ) : <span>{s.roles[face.role]}</span>}
          <span>{s.sources[face.source]}</span>
          <span>{s.styles(weights.length)}</span>
          {mode === "edit" && (
            <span className="bt-meta__tools">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger className="be-link">{s.family}</PopoverTrigger>
                <PopoverContent className="be-pop" align="end"><FindFace initial={face.family} label={s.findFace} onFound={(f) => { put(f); setOpen(false); }} /></PopoverContent>
              </Popover>
              <ItemTools list={type.faces} index={i} onChange={(faces) => set({ faces, scale: type.scale.filter((x) => faces.some((f) => f.id === x.faceId)) })} />
            </span>
          )}
        </div>
        <Editable as="p" className="bt-note" value={face.note} onCommit={(note) => put({ note })} placeholder={t.brand.write} multiline />
        {face.source === "system" && mode === "edit" && <p className="brand-hint">{s.notLoaded}</p>}
        {mode === "edit" && (
          <FileSlot purpose="font" accept=".woff2,.woff,.otf,.ttf" has={false} label={s.uploadFont} className="bt-upload"
            onFile={(f) => {
              const weight = weightInName(f.name ?? "") ?? 400;
              const style = /italic|oblique/i.test(f.name ?? "") ? "italic" as const : "normal" as const;
              const files = [...(face.files ?? []).filter((x) => !(x.weight === weight && x.style === style)), { weight, style, key: f.key }];
              put({ source: "upload", files, weights: [...new Set([...face.weights, weight])].sort((a, b) => a - b) });
            }} />
        )}
        {mode === "edit" && (face.files?.length ?? 0) > 0 && <p className="brand-hint">{s.uploaded((face.files ?? []).map((x) => `${x.weight}${x.style === "italic" ? " italic" : ""}`).join(", "))}</p>}
        {mode === "edit" && (
          <div className="bt-weightpick" role="group" aria-label={s.weight}>
            {WEIGHTS.map((w) => <button key={w} type="button" className={face.weights.includes(w) ? "is-on" : ""} aria-pressed={face.weights.includes(w)}
              onClick={() => put({ weights: face.weights.includes(w) ? face.weights.filter((x) => x !== w) : [...face.weights, w].sort((a, b) => a - b) })}>{w}</button>)}
          </div>
        )}
      </div>
      <div className="bt-weights" style={{ ["--n" as string]: Math.min(weights.length, 4) }}>
        {weights.slice(-4).map((w) => (
          <div key={w} className="bt-weight">
            <span>{s.weights[w] ?? w} · {w}</span>
            <i style={{ fontFamily: stack(face.id), fontWeight: w }} aria-hidden>Aa</i>
          </div>
        ))}
      </div>
    </article>
  );
}

function Step({ step, i, sample }: { step: ScaleStep; i: number; sample: string }) {
  const { t } = useT();
  const { mode, stack } = useBrand();
  const [type, set] = useSection("typography");
  const s = t.brand.type;
  const put = (next: Partial<ScaleStep>) => set({ scale: type.scale.map((x) => (x.id === step.id ? { ...x, ...next } : x)) });
  return (
    <div className={`bt-step${step.px <= 20 ? " is-small" : ""}`}>
      <div className="bt-step__label">
        <Editable value={step.label} onCommit={(label) => label && put({ label })} placeholder={s.label} maxLength={30} />
        <span> · </span>
        <EditableNumber value={step.px} min={6} max={400} label={s.size} suffix="px" onCommit={(px) => put({ px })} />
        {mode === "edit" && (
          <span className="bt-step__more">
            <select value={step.faceId} onChange={(e) => put({ faceId: e.currentTarget.value })} aria-label={s.face}>{type.faces.map((f) => <option key={f.id} value={f.id}>{f.family}</option>)}</select>
            <select value={step.weight} onChange={(e) => put({ weight: Number(e.currentTarget.value) })} aria-label={s.weight}>{WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}</select>
            <EditableNumber value={step.lineHeight} min={0.6} max={3} step={0.05} label={s.lineHeight} onCommit={(lineHeight) => put({ lineHeight })} />
            <EditableNumber value={step.tracking} min={-0.2} max={0.5} step={0.005} label={s.tracking} suffix="em" onCommit={(tracking) => put({ tracking })} />
            <ItemTools list={type.scale} index={i} onChange={(scale) => set({ scale })} />
          </span>
        )}
      </div>
      <p className="bt-step__sample" style={{ fontFamily: stack(step.faceId), fontWeight: step.weight, lineHeight: step.lineHeight, letterSpacing: `${step.tracking}em`, ["--px" as string]: step.px }}>{sample}</p>
    </div>
  );
}

export default function TypeSection() {
  const { t } = useT();
  const { mode, name, spec } = useBrand();
  const [type, set] = useSection("typography");
  const [adding, setAdding] = useState(false);
  const s = t.brand.type;
  const sample = type.sample || spec.intro.headline || s.defaultSample(name);
  const big = type.scale.filter((x) => x.px > 20).sort((a, b) => b.px - a.px);
  const small = type.scale.filter((x) => x.px <= 20).sort((a, b) => b.px - a.px);
  const idx = (x: ScaleStep) => type.scale.indexOf(x);
  return (
    <div className="bt">
      {type.faces.map((f, i) => <Face key={f.id} face={f} i={i} />)}
      {mode === "edit" && type.faces.length < 4 && (
        <Popover open={adding} onOpenChange={setAdding}>
          <PopoverTrigger className="be-add">+ {s.addFace}</PopoverTrigger>
          <PopoverContent className="be-pop" align="start">
            <FindFace initial="" label={s.findFace} onFound={(f) => { set({ faces: [...type.faces, { id: brandId(), role: type.faces.some((x) => x.role === "display") ? "text" : "display", note: "", ...f }] }); setAdding(false); }} />
          </PopoverContent>
        </Popover>
      )}
      {(type.scale.length > 0 || (mode === "edit" && type.faces.length > 0)) && (
        <div className="bt-scale">
          <h3 className="brand-k">{s.scale}</h3>
          {mode === "edit" && <Editable as="p" className="bt-sample" value={type.sample} onCommit={(v) => set({ sample: v })} placeholder={`${s.sample}: ${sample}`} maxLength={120} />}
          <div className="bt-scale__grid">
            <div className="bt-scale__big">{big.map((x) => <Step key={x.id} step={x} i={idx(x)} sample={sample} />)}</div>
            {small.length > 0 && <div className="bt-scale__small">{small.map((x) => <Step key={x.id} step={x} i={idx(x)} sample={sample} />)}</div>}
          </div>
          {type.faces.length > 0 && <AddButton label={s.addStep} onClick={() => set({ scale: [...type.scale, { id: brandId(), label: "Body", px: 16, faceId: (type.faces.find((f) => f.role === "text") ?? type.faces[0]).id, weight: 400, lineHeight: 1.5, tracking: 0 }] })} />}
          <Editable as="p" className="bt-rule" value={type.trackingRule} onCommit={(trackingRule) => set({ trackingRule })} placeholder={t.brand.write} multiline />
        </div>
      )}
    </div>
  );
}
