"use client";
// The brand as guidelines: the contents down the left, one section per screen beside it, each with its number, a
// heading set large in the brand's own display face and a short lede. In the app every value is edited where it
// stands; on a share link the same page is read only and the sections with nothing in them step out.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BRAND_SECTIONS, accentOf, sectionFilled, type BrandSection, type BrandSections } from "@/types/brand";
import { inkOn } from "@/lib/brand-values";
import { useT } from "../I18nProvider";
import { BrandCtx, useBrand, type BrandCtxValue } from "./context";
import { Editable } from "./edit/Editable";
import IntroSection from "./sections/IntroSection";
import LogoSection from "./sections/LogoSection";
import ColorSection from "./sections/ColorSection";
import TypeSection from "./sections/TypeSection";
import MotionSection from "./sections/MotionSection";
import VoiceSection from "./sections/VoiceSection";
import ImagerySection from "./sections/ImagerySection";
import ApplicationsSection from "./sections/ApplicationsSection";
import AssetsSection from "./sections/AssetsSection";
import "./brand.css";


/** One section's values, and a setter that saves a change to them */
export function useSection<K extends BrandSection>(k: K): [BrandSections[K], (patch: Partial<BrandSections[K]>) => void] {
  const { spec, save } = useBrand();
  const value = spec[k];
  return [value, (patch) => save(k, { ...value, ...patch })];
}

/** Up, down and out for an item of a list, on hover in the app */
export function ItemTools<T>({ list, index, onChange, className = "" }: { list: T[]; index: number; onChange: (next: T[]) => void; className?: string }) {
  const { mode } = useBrand();
  const { t } = useT();
  if (mode !== "edit") return null;
  const move = (d: -1 | 1) => { const n = [...list]; const j = index + d; if (j < 0 || j >= n.length) return; [n[index], n[j]] = [n[j], n[index]]; onChange(n); };
  return (
    <span className={`be-tools ${className}`}>
      {index > 0 && <button type="button" onClick={() => move(-1)} aria-label={t.brand.moveUp} title={t.brand.moveUp}>↑</button>}
      {index < list.length - 1 && <button type="button" onClick={() => move(1)} aria-label={t.brand.moveDown} title={t.brand.moveDown}>↓</button>}
      <button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} aria-label={t.brand.remove} title={t.brand.remove}>×</button>
    </span>
  );
}

/** "+ Add …", only in the app */
export function AddButton({ label, onClick, className = "" }: { label: string; onClick: () => void; className?: string }) {
  const { mode } = useBrand();
  if (mode !== "edit") return null;
  return <button type="button" className={`be-add ${className}`} onClick={onClick}><span aria-hidden>+</span> {label}</button>;
}

/** A section: its rule (brand · section, n / total), its heading, its lede; who wrote it, in the app */
function Frame({ k, n, total, title, lede, onLede, children, wide }: {
  k: BrandSection; n: number; total: number; title?: string; lede?: string; onLede?: (v: string) => void; children: ReactNode; wide?: boolean;
}) {
  const { t } = useT();
  const { mode, spec, release, saving } = useBrand();
  const label = t.brand.sections[k];
  const src = spec.meta[k]?.src;
  const pad = (x: number) => String(x).padStart(2, "0");
  return (
    <section id={`brand-${k}`} className={`brand-sec brand-sec--${k}${wide ? " is-wide" : ""}`} data-section={k} aria-labelledby={`brand-${k}-h`}>
      <div className="brand-rule">
        <span className="brand-rule__n">{pad(n)} / {pad(total)}<i aria-hidden>·</i>{label}</span>
        <span className="brand-rule__right">
          {mode === "edit" && saving.has(k) && <em className="brand-saving">{t.brand.saving}</em>}
          {mode === "edit" && src && <em className={`brand-src brand-src--${src}`}>{t.brand.src[src]}</em>}
          {mode === "edit" && src === "team" && <button type="button" className="brand-handback" title={t.brand.handBackHint} onClick={() => release(k)}>{t.brand.handBack}</button>}
        </span>
      </div>
      <h2 id={`brand-${k}-h`} className="brand-h">{title ?? label}</h2>
      {onLede && <Editable as="p" className="brand-lede" value={lede ?? ""} onCommit={onLede} placeholder={t.brand.write} multiline />}
      {children}
    </section>
  );
}

function Toc({ sections, active, onGo }: { sections: BrandSection[]; active: BrandSection | null; onGo: (k: BrandSection) => void }) {
  const { t } = useT();
  const { name } = useBrand();
  return (
    <nav className="brand-toc" aria-label={t.brand.contents}>
      <div className="brand-toc__brand">
        <b>{name}</b>
        <span>{t.brand.guidelines}</span>
      </div>
      <ol>
        {sections.map((k, i) => (
          <li key={k}>
            <button type="button" className={active === k ? "is-on" : ""} aria-current={active === k ? "true" : undefined} onClick={() => onGo(k)}>
              <small>{String(i + 1).padStart(2, "0")}</small>{t.brand.sections[k]}<i aria-hidden />
            </button>
          </li>
        ))}
      </ol>
      <p className="brand-toc__count">{t.brand.sectionsCount(sections.length)}</p>
    </nav>
  );
}

export type PresentationProps = Omit<BrandCtxValue, "accent" | "stack" | "display" | "text"> & {
  stack: BrandCtxValue["stack"]; display: string; text: string;
  /** Extra controls over the page, in the app (the share bar on a link) */
  bar?: ReactNode;
};

export default function BrandPresentation(props: PresentationProps) {
  const { spec, mode, summary, bar } = props;
  const { t } = useT();
  // Without an accent of its own, the page marks in Criterio's ink
  const accent = accentOf(spec)?.hex ?? "var(--text)";
  const ctx: BrandCtxValue = { ...props, accent };
  // On a share, a section with nothing in it is not shown, and the numbers follow what is
  const sections = useMemo(() => BRAND_SECTIONS.filter((k) => mode === "edit" || sectionFilled(spec, k, { summary })), [spec, mode, summary]);

  const [active, setActive] = useState<BrandSection | null>(sections[0] ?? null);
  const root = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set((e.target as HTMLElement).dataset.section!, e.isIntersecting ? e.intersectionRect.height : 0);
      const best = [...seen.entries()].sort((a, b) => b[1] - a[1])[0];
      if (best && best[1] > 0) setActive(best[0] as BrandSection);
    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
    el.querySelectorAll<HTMLElement>(".brand-sec").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [sections.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (k: BrandSection) => document.getElementById(`brand-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const total = sections.length;
  const n = (k: BrandSection) => sections.indexOf(k) + 1;
  const lede = <K extends BrandSection>(k: K) => (v: string) => props.save(k, { ...spec[k], lede: v } as BrandSections[K]);
  const area = (k: string) => props.areas.find((a) => a.area === k)?.decision ?? "";

  return (
    <BrandCtx.Provider value={ctx}>
      <div ref={root} className={`brand is-${mode}`} style={{ ["--brand-accent" as string]: accent, ["--brand-on-accent" as string]: accent.startsWith("#") ? inkOn(accent) : "var(--bg)", ["--brand-display" as string]: props.display, ["--brand-text" as string]: props.text }}>
        <Toc sections={sections} active={active} onGo={go} />
        <div className="brand-main">
          {bar}
          {sections.includes("intro") && <Frame k="intro" n={n("intro")} total={total}><IntroSection /></Frame>}
          {sections.includes("logo") && <Frame k="logo" n={n("logo")} total={total} title={t.brand.logo.primary} lede={spec.logo.lede || (mode === "view" ? area("logo") : "")} onLede={lede("logo")}><LogoSection /></Frame>}
          {sections.includes("color") && <Frame k="color" n={n("color")} total={total} lede={spec.color.lede || (mode === "view" ? area("color") : "")} onLede={lede("color")}><ColorSection /></Frame>}
          {sections.includes("typography") && <Frame k="typography" n={n("typography")} total={total} lede={spec.typography.lede || (mode === "view" ? area("typography") : "")} onLede={lede("typography")}><TypeSection /></Frame>}
          {sections.includes("imagery") && <Frame k="imagery" n={n("imagery")} total={total} lede={spec.imagery.lede || (mode === "view" ? area("imagery") : "")} onLede={lede("imagery")}><ImagerySection /></Frame>}
          {sections.includes("motion") && <Frame k="motion" n={n("motion")} total={total} lede={spec.motion.lede || (mode === "view" ? area("motion") : "")} onLede={lede("motion")}><MotionSection /></Frame>}
          {sections.includes("voice") && <Frame k="voice" n={n("voice")} total={total} lede={spec.voice.lede || (mode === "view" ? area("voice") : "")} onLede={lede("voice")}><VoiceSection /></Frame>}
          {sections.includes("applications") && <Frame k="applications" n={n("applications")} total={total} lede={spec.applications.lede} onLede={lede("applications")}><ApplicationsSection /></Frame>}
          {sections.includes("assets") && <Frame k="assets" n={n("assets")} total={total} lede={spec.assets.lede} onLede={lede("assets")}><AssetsSection /></Frame>}
          {!sections.length && <p className="brand-empty">{t.brand.empty}</p>}
        </div>
      </div>
    </BrandCtx.Provider>
  );
}
