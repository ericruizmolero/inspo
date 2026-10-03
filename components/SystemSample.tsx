"use client";
// The sample: one small page (a title, a subtitle, a body, two buttons, three cards) that every area of
// the system paints with what it decides. Typography sets its faces, colour its ground, ink and accent,
// layout its radius, motion how it arrives, voice what it says. The result of an area is always seen, not
// read. What the team tries is kept with the project on this machine until it is written to the system.
//
// And what each reference brings to an area, shown on its card: its palette, its radii, its curve, its
// logo, its icons, its line. Touching one tries it on the sample.
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { SystemArea } from "@/types/system";
import type { RefVisual } from "@/lib/system";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { Button } from "@/components/ui/button";

export interface SampleChoices {
  bg?: string; ink?: string; accent?: string;
  /** With no ground chosen: the sample on a light page instead of the app's dark one */
  light?: boolean;
  radius?: string;
  easing?: string; durationMs?: number;
  headline?: string; subline?: string;
}
export type ColorRole = "bg" | "ink" | "accent";
export const COLOR_ROLES: ColorRole[] = ["bg", "ink", "accent"];

const EVENT = "criterio:sample";
/** The sample's choices for a project, shared by every place that shows it (the stage, the bento) */
export function useSampleChoices(projectId: string): [SampleChoices, (patch: Partial<SampleChoices>) => void] {
  const store = `criterio:sample:${projectId}`;
  const [choices, setChoices] = useState<SampleChoices>({});
  useEffect(() => {
    const read = () => { try { setChoices(JSON.parse(localStorage.getItem(store) ?? "{}") as SampleChoices); } catch { setChoices({}); } };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, [store]);
  const set = (patch: Partial<SampleChoices>) => {
    let next: SampleChoices = {};
    try { next = JSON.parse(localStorage.getItem(store) ?? "{}") as SampleChoices; } catch { /* starts clean */ }
    next = { ...next, ...patch };
    for (const k of Object.keys(next) as (keyof SampleChoices)[]) if (next[k] === undefined || next[k] === "") delete next[k];
    setChoices(next);
    try { localStorage.setItem(store, JSON.stringify(next)); window.dispatchEvent(new Event(EVENT)); } catch { /* private mode: it lasts the visit */ }
  };
  return [choices, set];
}

export const luminance = (hex: string) => {
  const m = hex.replace("#", "").slice(0, 6);
  if (m.length < 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** The ink that reads on a ground */
export const inkOn = (hex: string) => (luminance(hex) > 0.55 ? "#141413" : "#f6f5f1");

const BEZIER: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1], linear: [0, 0, 1, 1],
};
export function bezierOf(easing: string): [number, number, number, number] {
  const m = easing.match(/cubic-bezier\(([^)]+)\)/);
  if (m) { const n = m[1].split(",").map((x) => parseFloat(x)); if (n.length === 4 && n.every((x) => Number.isFinite(x))) return n as [number, number, number, number]; }
  return BEZIER[easing] ?? BEZIER.ease;
}
export const isEasing = (easing: string) => easing.startsWith("cubic-bezier") || easing in BEZIER;

/** What the sample resolves to: the ground, the ink that reads on it, the accent and what reads on the accent */
export function sampleColors(c: SampleChoices) {
  const bg = c.bg ?? (c.light ? "#f6f5f1" : undefined);
  const ink = c.ink ?? (bg ? inkOn(bg) : undefined);
  const accent = c.accent ?? ink;
  return { bg, ink, accent, onAccent: accent ? inkOn(accent) : undefined };
}

// ─── The sample ──────────────────────────────────────────────────────────────

export interface SampleFaces { title?: CSSProperties; subtitle?: CSSProperties; body?: CSSProperties }

export function Sample({ title, subtitle, body, cta, more, faces, choices, replay = 0, compact = false }: {
  title: string; subtitle: string; body: string; cta: string; more: string;
  faces: SampleFaces; choices: SampleChoices;
  /** Each new number plays the arrival again, in the chosen curve */
  replay?: number;
  /** On a tile: the title, the subtitle and the buttons, without the body and the cards */
  compact?: boolean;
}) {
  const { bg, ink, accent, onAccent } = sampleColors(choices);
  const style = {
    ...(bg ? { "--smp-bg": bg } : {}), ...(ink ? { "--smp-ink": ink } : {}),
    ...(accent ? { "--smp-accent": accent, "--smp-on-accent": onAccent } : {}),
    ...(choices.radius ? { "--smp-radius": choices.radius } : {}),
    "--smp-ease": choices.easing && isEasing(choices.easing) ? choices.easing : "cubic-bezier(0.23, 1, 0.32, 1)",
    "--smp-ms": `${Math.max(120, Math.min(choices.durationMs ?? 520, 2000))}ms`,
  } as CSSProperties;
  return (
    <div key={replay} className={`smp${replay ? " is-playing" : ""}${compact ? " smp--compact" : ""}`} style={style}>
      <h2 className="smp__title" style={faces.title}>{choices.headline || title}</h2>
      <p className="smp__sub" style={faces.subtitle}>{choices.subline || subtitle}</p>
      {!compact && <p className="smp__body" style={faces.body}>{body}</p>}
      <div className="smp__actions" style={{ fontFamily: faces.body?.fontFamily }}>
        <span className="smp__cta">{cta}</span>
        <span className="smp__more">{more}</span>
      </div>
      {!compact && (
        <div className="smp__cards" aria-hidden>
          {[0, 1, 2].map((i) => <span key={i} className="smp__card"><i /><b /><b /></span>)}
        </div>
      )}
    </div>
  );
}

// ─── What a reference brings to an area, on its card ─────────────────────────

function Curve({ easing, size = 40 }: { easing: string; size?: number }) {
  const [x1, y1, x2, y2] = bezierOf(easing);
  const h = Math.round(size * 0.6), p = 3;
  const X = (x: number) => p + x * (size - 2 * p), Y = (y: number) => h - p - y * (h - 2 * p);
  return <svg className="rm-curve" viewBox={`0 0 ${size} ${h}`} width={size} height={h} aria-hidden><path d={`M ${X(0)} ${Y(0)} C ${X(x1)} ${Y(y1)}, ${X(x2)} ${Y(y2)}, ${X(1)} ${Y(1)}`} /></svg>;
}

export function RefMaterial({ area, v, onColor, onRadius, onEasing, onHeadline }: {
  area: SystemArea; v: RefVisual | undefined;
  onColor?: (hex: string) => void; onRadius?: (value: string) => void;
  onEasing?: (easing: string, ms: number | null) => void; onHeadline?: (text: string) => void;
}) {
  const { t } = useT();
  const s = t.system.sample;
  if (!v) return null;
  const none = <span className="rm-none">{s.noMaterial}</span>;
  switch (area) {
    case "color": {
      const seen = new Set<string>();
      const colors = v.colors.filter((c) => c.group !== "semantic" && !seen.has(c.hex.toLowerCase()) && seen.add(c.hex.toLowerCase())).slice(0, 10);
      if (!colors.length) return none;
      return <span className="rm-swatches">{colors.map((c) => <button key={c.hex} type="button" className="rm-swatch" style={{ background: c.hex }} title={`${c.name} ${c.hex} · ${s.tryIt}`} aria-label={`${c.name} ${c.hex}`} onClick={() => onColor?.(c.hex.slice(0, 7))} />)}</span>;
    }
    case "typography": {
      const fams = [...new Set(v.fonts.map((f) => f.family))].slice(0, 3);
      return fams.length ? <span className="rm-text">{fams.join(" · ")}</span> : none;
    }
    case "layout": {
      const seen = new Set<string>();
      const radii = v.radii.filter((r) => /\d/.test(r.value) && !seen.has(r.value) && seen.add(r.value)).slice(0, 5);
      if (!radii.length) return none;
      return <span className="rm-radii">{radii.map((r) => <button key={r.value} type="button" className="rm-radius" title={`${r.element} · ${s.tryIt}`} onClick={() => onRadius?.(r.value)}><i style={{ borderRadius: r.value }} />{r.value}</button>)}</span>;
    }
    case "motion":
      if (!v.easing) return none;
      return <button type="button" className="rm-ease" title={s.tryIt} onClick={() => onEasing?.(v.easing!, v.durationMs)}><Curve easing={v.easing} /><span>{v.easing.replace("cubic-bezier", "")}{v.durationMs ? ` · ${v.durationMs} ms` : ""}</span></button>;
    case "logo":
      return v.logo ? <span className="rm-logo"><img src={v.logo} alt="" loading="lazy" decoding="async" /></span> : none;
    case "iconography":
      // The markup comes from the sheets this app generated (standalone svg elements)
      return v.icons.length ? <span className="rm-icons">{v.icons.slice(0, 8).map((svg, i) => <i key={i} dangerouslySetInnerHTML={{ __html: svg }} />)}</span> : none;
    case "voice":
      if (!v.tagline && !v.voice) return none;
      return (
        <span className="rm-voice">
          {v.tagline && <button type="button" className="rm-quote" title={s.tryIt} onClick={() => onHeadline?.(v.tagline!)}>“{v.tagline}”</button>}
          {v.voice && <span className="rm-text">{v.voice}</span>}
        </span>
      );
    case "imagery":
      return null;  // the capture is the material: the card shows the page down its length
  }
}

const PRESETS: { label: string; easing: string }[] = [
  { label: "ease-out", easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
  { label: "ease-in-out", easing: "cubic-bezier(0.77, 0, 0.175, 1)" },
  { label: "spring", easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
];

// ─── Three at once ───────────────────────────────────────────────────────────
// A matter of degree is settled by seeing three side by side, not one per round (Multiverse: four rounds
// for a tint, solved the moment three were on the page together). From the area's references first.

export interface SampleVariant { label: string; patch: Partial<SampleChoices> }
const px = (v: string) => parseFloat(v) || 0;
export function variantsFor(area: SystemArea, visuals: RefVisual[]): SampleVariant[] {
  if (area === "color") {
    const seen = new Set<string>();
    const colors = visuals.flatMap((v) => v.colors).filter((c) => c.group !== "semantic" && /^#[0-9a-f]{6}/i.test(c.hex) && !seen.has(c.hex.slice(0, 7).toLowerCase()) && seen.add(c.hex.slice(0, 7).toLowerCase()));
    const byLum = [...colors].sort((a, b) => luminance(a.hex) - luminance(b.hex));
    const light = byLum[byLum.length - 1]?.hex.slice(0, 7) ?? "#f6f5f1";
    const dark = byLum[0]?.hex.slice(0, 7) ?? "#141413";
    const brand = (colors.find((c) => c.group === "brand" || c.group === "accent")?.hex ?? byLum[Math.floor(byLum.length / 2)]?.hex ?? "#2d2d2b").slice(0, 7);
    const grounds = [...new Set([light, dark, brand].map((h) => h.toLowerCase()))].slice(0, 3);
    while (grounds.length < 3) grounds.push(["#f6f5f1", "#141413", "#e8e2d6"][grounds.length]);
    return grounds.map((bg) => ({ label: bg, patch: { bg, ink: undefined } }));
  }
  if (area === "layout") {
    const seen = new Set<string>();
    const radii = visuals.flatMap((v) => v.radii).map((r) => r.value).filter((v) => /^\d+(\.\d+)?px$/.test(v) && px(v) <= 40 && !seen.has(v) && seen.add(v)).sort((a, b) => px(a) - px(b));
    const pick = radii.length >= 3 ? [radii[0], radii[Math.floor(radii.length / 2)], radii[radii.length - 1]] : [...new Set([...radii, "4px", "12px", "24px"])].sort((a, b) => px(a) - px(b)).slice(0, 3);
    return pick.map((radius) => ({ label: radius, patch: { radius } }));
  }
  if (area === "motion") {
    const seen = new Set<string>();
    const fromRefs = visuals.filter((v) => v.easing && isEasing(v.easing) && !seen.has(v.easing) && seen.add(v.easing)).map((v) => ({ label: v.name, patch: { easing: v.easing!, ...(v.durationMs ? { durationMs: v.durationMs } : {}) } }));
    const presets = PRESETS.filter((p) => !seen.has(p.easing)).map((p) => ({ label: p.label, patch: { easing: p.easing } }));
    return [...fromRefs, ...presets].slice(0, 3);
  }
  return [];
}

// ─── The controls beside the sample, per area ────────────────────────────────


export function SampleControls({ area, choices, onChoice, colorRole, onColorRole, visuals, onReplay, busy, onUse }: {
  area: SystemArea; choices: SampleChoices; onChoice: (patch: Partial<SampleChoices>) => void;
  colorRole: ColorRole; onColorRole: (role: ColorRole) => void;
  /** The references of the area (or of the board when it has none): where radii and curves come from */
  visuals: RefVisual[];
  onReplay: () => void;
  busy: boolean;
  /** Writes what the sample shows as the area's decision, as the team's */
  onUse?: (decision: string) => void;
}): ReactNode {
  const { t } = useT();
  const s = t.system.sample;
  const resolved = sampleColors(choices);
  if (area === "color") {
    const hexOf = (r: ColorRole) => choices[r];
    return (
      <div className="smp-controls">
        <p className="smp-controls__hint">{s.colorHint}</p>
        {COLOR_ROLES.map((r) => (
          <div key={r} className={`smp-role${colorRole === r ? " is-on" : ""}`}>
            <button type="button" className="smp-role__pick" aria-pressed={colorRole === r} onClick={() => onColorRole(r)}>
              <i className="smp-role__dot" style={{ background: hexOf(r) ?? resolved[r] ?? "transparent" }} />
              <span className="smp-role__name">{s.colorRoles[r]}</span>
              <span className="smp-role__value">{hexOf(r) ?? s.auto}</span>
            </button>
            {hexOf(r) && <button type="button" className="smp-role__x" aria-label={s.clear} title={s.clear} onClick={() => onChoice({ [r]: undefined })}>{Icons.x}</button>}
          </div>
        ))}
        <div className="smp-controls__foot">
          {!choices.bg && <button type="button" className="tt-comp__bg" aria-pressed={!!choices.light} onClick={() => onChoice({ light: !choices.light })}>{choices.light ? t.system.type.comp.dark : t.system.type.comp.light}</button>}
          {onUse && <Button variant="primary" size="sm" disabled={busy || !choices.bg} title={s.useHint} onClick={() => onUse(s.decisionColor(resolved.bg ?? "", resolved.ink ?? "", resolved.accent ?? ""))}>{Icons.check} {t.system.type.comp.use}</Button>}
        </div>
      </div>
    );
  }
  if (area === "layout") {
    const seen = new Set<string>();
    const radii = visuals.flatMap((v) => v.radii).filter((r) => /\d/.test(r.value) && !seen.has(r.value) && seen.add(r.value)).slice(0, 10);
    return (
      <div className="smp-controls">
        <p className="smp-controls__hint">{s.radiusHint}</p>
        <span className="smp-controls__label">{s.radius}</span>
        <div className="smp-chips">
          {radii.map((r) => <button key={r.value} type="button" className={`smp-chip${choices.radius === r.value ? " is-on" : ""}`} aria-pressed={choices.radius === r.value} title={r.element} onClick={() => onChoice({ radius: choices.radius === r.value ? undefined : r.value })}><i style={{ borderRadius: r.value }} />{r.value}</button>)}
          {!radii.length && <span className="rm-none">{s.noMaterial}</span>}
        </div>
      </div>
    );
  }
  if (area === "motion") {
    const seen = new Set<string>();
    const fromRefs = visuals.filter((v) => v.easing && isEasing(v.easing) && !seen.has(v.easing) && seen.add(v.easing));
    const pick = (easing: string, ms?: number | null) => { onChoice({ easing, ...(ms ? { durationMs: ms } : {}) }); onReplay(); };
    const ms = choices.durationMs ?? 520;
    return (
      <div className="smp-controls">
        <p className="smp-controls__hint">{s.motionHint}</p>
        {fromRefs.length > 0 && <span className="smp-controls__label">{s.fromRefs}</span>}
        <div className="smp-chips smp-chips--col">
          {fromRefs.map((v) => <button key={v.itemId} type="button" className={`smp-chip${choices.easing === v.easing ? " is-on" : ""}`} aria-pressed={choices.easing === v.easing} onClick={() => pick(v.easing!, v.durationMs)}><Curve easing={v.easing!} size={30} />{v.name}</button>)}
        </div>
        <span className="smp-controls__label">{s.presets}</span>
        <div className="smp-chips">
          {PRESETS.map((p) => <button key={p.label} type="button" className={`smp-chip${choices.easing === p.easing ? " is-on" : ""}`} aria-pressed={choices.easing === p.easing} onClick={() => pick(p.easing)}><Curve easing={p.easing} size={30} />{p.label}</button>)}
        </div>
        <label className="smp-range"><span>{s.duration} · {ms} ms</span><input type="range" min={120} max={1500} step={10} value={ms} onChange={(e) => onChoice({ durationMs: Number(e.target.value) })} onPointerUp={onReplay} onKeyUp={onReplay} /></label>
        <div className="smp-controls__foot"><Button size="sm" onClick={onReplay}>{Icons.play} {s.replay}</Button></div>
      </div>
    );
  }
  if (area === "voice") {
    return (
      <div className="smp-controls">
        <p className="smp-controls__hint">{s.voiceHint}</p>
        <label className="tt-role"><span className="tt-role__name">{s.headline}</span><input className="smp-input" value={choices.headline ?? ""} maxLength={120} placeholder={s.headlinePlaceholder} onChange={(e) => onChoice({ headline: e.target.value })} /></label>
        <label className="tt-role"><span className="tt-role__name">{s.subline}</span><textarea className="smp-input" rows={3} value={choices.subline ?? ""} maxLength={240} placeholder={s.sublinePlaceholder} onChange={(e) => onChoice({ subline: e.target.value })} /></label>
        {(choices.headline || choices.subline) && <div className="smp-controls__foot"><button type="button" className="tt-comp__bg" onClick={() => onChoice({ headline: undefined, subline: undefined })}>{s.clear}</button></div>}
      </div>
    );
  }
  return null;
}
