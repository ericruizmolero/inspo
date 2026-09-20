"use client";

import { useEffect, useRef, useState } from "react";
import type { DesignMdState } from "./DesignMdToasts";
import type { DesignSpec } from "@/types/design";

interface DesignMdModalProps {
  url: string;
  empresa: string;
  state: DesignMdState | undefined;
  onClose: () => void;
  onRetry: () => void;
  onRegenerate: () => void;
}

const STEPS = [
  "Abriendo la web en Chromium…",
  "Midiendo colores, tipografías y espaciados…",
  "Capturando pantalla…",
  "Claude redacta el DESIGN.md…",
  "Claude sigue escribiendo…",
];

export function stepIndex(startedAt: number): number {
  return Math.min(Math.floor((Date.now() - startedAt) / 9000), STEPS.length - 1);
}
export function stepFor(startedAt: number): string {
  return STEPS[stepIndex(startedAt)];
}
export const STEP_COUNT = STEPS.length;
// Progreso estimado 0-1 sobre una duración típica de ~75 s; nunca llega al 100 % hasta que termina
export function progressFor(startedAt: number): number {
  return Math.min(0.94, (Date.now() - startedAt) / 75000);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IcCheck = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3.5" /></svg>
);
const IcX = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
);
const IcCopy = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="4.5" width="8" height="8" rx="1.6" /><path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" /></svg>
);
const IcArrow = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l6-6M4 3h5v5" /></svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isDark(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function useCopy(ms = 1400): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), ms);
    });
  };
  return [copied, copy];
}

// Intenta cargar las familias desde Google Fonts. Si no existen ahí, el navegador
// ignora la hoja y se aplica el fallback declarado en el spec.
function useGoogleFonts(families: string[]) {
  useEffect(() => {
    const links = families.map((f) => {
      const id = `gf-${f.replace(/\s+/g, "-").toLowerCase()}`;
      if (document.getElementById(id)) return null;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, "+")}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`;
      document.head.appendChild(link);
      return link;
    });
    return () => { links.forEach((l) => l?.remove()); };
  }, [families.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
}

function pageBg(spec: DesignSpec): string {
  const neutrals = spec.colors.filter((c) => c.group === "neutral");
  const pick = (spec.theme === "dark" ? neutrals.find((c) => isDark(c.hex)) : neutrals.find((c) => !isDark(c.hex)))
    ?? neutrals[0] ?? spec.colors[0];
  return pick?.hex ?? (spec.theme === "dark" ? "#0d0d0d" : "#ffffff");
}

// ─── Progress ─────────────────────────────────────────────────────────────────
function Progress({ startedAt, empresa, url }: { startedAt: number; empresa: string; url: string }) {
  const current = stepIndex(startedAt);
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return (
    <div className="dm-progress">
      <div className="dm-progress__card">
        <div className="dm-progress__head">
          <span className="spinner" />
          <div>
            <div className="display dm-progress__title">Leyendo {empresa}</div>
            <div className="dm-progress__url">{url}</div>
          </div>
          <span className="dm-progress__time">{elapsed}s</span>
        </div>
        <ol className="dm-steps">
          {STEPS.map((label, i) => (
            <li key={label} className={`dm-step${i < current ? " is-done" : i === current ? " is-current" : ""}`}>
              <span className="dm-step__mark">{i < current ? IcCheck : null}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
        <p className="dm-progress__hint">
          Suele tardar entre 30 y 90 segundos. Puedes cerrar esta ventana: la generación sigue en segundo plano y te avisamos cuando esté lista.
        </p>
      </div>
    </div>
  );
}

// ─── Screenshot con scroll automático ─────────────────────────────────────────
function ScrollShot({ src, alt, bg }: { src: string; alt: string; bg: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const box = boxRef.current;
    if (!box) return;
    const rendered = (img.naturalHeight / img.naturalWidth) * box.clientWidth;
    setDist(Math.max(0, rendered - box.clientHeight));
    setLoaded(true);
  };

  const duration = Math.max(6, Math.round(dist / 140));
  const proxied = src.startsWith("https://") ? `/api/thumbnail/img?url=${encodeURIComponent(src)}` : src;

  return (
    <div className="dm-frame" style={{ background: bg }}>
      <div className="dm-frame__bar"><span /><span /><span /></div>
      <div ref={boxRef} className={`dm-shot${loaded ? " is-loaded" : ""}`}>
        {!loaded && <div className="shimmer" />}
        <img
          src={proxied}
          alt={alt}
          onLoad={onLoad}
          style={{ "--dm-scroll": `-${dist}px`, animationDuration: `${duration}s` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

// ─── Colores ──────────────────────────────────────────────────────────────────
const GROUPS: { key: DesignSpec["colors"][number]["group"]; label: string }[] = [
  { key: "brand", label: "Marca" },
  { key: "accent", label: "Acento" },
  { key: "semantic", label: "Semánticos" },
  { key: "neutral", label: "Neutros" },
];

function Swatch({ c }: { c: DesignSpec["colors"][number] }) {
  const [copied, copy] = useCopy();
  return (
    <button className="dm-swatch" onClick={() => copy(c.hex)} title="Copiar hex">
      <span className="dm-swatch__chip" style={{ background: c.hex, color: isDark(c.hex) ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.7)" }}>
        <span className="dm-swatch__copy">{copied ? IcCheck : IcCopy}</span>
      </span>
      <span className="dm-swatch__name">{c.name}</span>
      <span className="dm-swatch__hex">{copied ? "copiado" : c.hex}</span>
      <span className="dm-swatch__role">{c.role}</span>
    </button>
  );
}

function PaletteStrip({ colors }: { colors: DesignSpec["colors"] }) {
  return (
    <div className="dm-strip">
      {colors.map((c) => (
        <span key={c.name + c.hex} className="dm-strip__seg" style={{ background: c.hex }} title={`${c.name} · ${c.hex}`}>
          <span style={{ color: isDark(c.hex) ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.65)" }}>{c.hex}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Tipografía ───────────────────────────────────────────────────────────────
function FontCard({ f, sample }: { f: DesignSpec["fonts"][number]; sample: string }) {
  const stack = `"${f.family}", ${f.fallback}`;
  const isDisplay = f.role === "display";
  const weight = f.weights.includes(700) && !isDisplay ? 700 : f.weights[0] ?? 400;
  return (
    <div className="dm-font">
      <div className="dm-font__specimen" style={{ fontFamily: stack }}>
        <div className="dm-font__aa" style={{ fontWeight: weight }}>Aa</div>
        <div className="dm-font__line" style={{ fontWeight: weight }}>{sample}</div>
        <div className="dm-font__glyphs">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 &amp;?!</div>
      </div>
      <div className="dm-font__body">
        <div className="dm-font__head">
          <span className="dm-font__family">{f.family}</span>
          <span className="dm-tag">{({ display: "display", body: "cuerpo", mono: "mono", ui: "interfaz" } as const)[f.role]}</span>
        </div>
        <p className="dm-font__usage">{f.usage}</p>
        <dl className="dm-kv">
          <dt>Weights</dt><dd>{f.weights.join(" · ")}</dd>
          <dt>Sizes</dt><dd>{f.sizes}</dd>
          <dt>Line height</dt><dd>{f.lineHeight}</dd>
          <dt>Tracking</dt><dd>{f.letterSpacing}</dd>
          <dt>Fallback</dt><dd className="dm-kv__mono">{f.fallback}</dd>
        </dl>
      </div>
    </div>
  );
}

// ─── Ficha ────────────────────────────────────────────────────────────────────
function SpecPanel({ spec, entry, url, date }: { spec: DesignSpec; entry: { screenshotUrl?: string; model: string }; url: string; date: string }) {
  useGoogleFonts(spec.fonts.map((f) => f.family));
  const [promptCopied, copyPrompt] = useCopy();
  const bg = pageBg(spec);
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const scale = [...spec.typeScale].sort((a, b) => b.size - a.size);

  return (
    <div className="dm-spec">
      {/* Hero */}
      <section className="dm-hero">
        <div className="dm-hero__text">
          <div className="dm-eyebrow">
            <span className={`dm-theme dm-theme--${spec.theme}`}><i />{spec.theme === "dark" ? "oscuro" : "claro"}</span>
            <a className="dm-link" href={url} target="_blank" rel="noopener noreferrer">{host}{IcArrow}</a>
            <span className="dm-eyebrow__sep">·</span>
            <span>{date}</span>
          </div>
          <h1 className="display dm-brand">{spec.brand}</h1>
          <p className="dm-tagline">{spec.tagline}</p>
          <p className="dm-desc">{spec.description}</p>
        </div>
        {entry.screenshotUrl && <ScrollShot src={entry.screenshotUrl} alt={spec.brand} bg={bg} />}
      </section>

      <PaletteStrip colors={spec.colors} />

      {/* Colores */}
      <section className="dm-section">
        <header className="dm-section__head">
          <h2 className="dm-h">Color</h2>
          <span className="dm-section__meta">{spec.colors.length} tonos · clic para copiar</span>
        </header>
        {GROUPS.map(({ key, label }) => {
          const cs = spec.colors.filter((c) => c.group === key);
          if (!cs.length) return null;
          return (
            <div key={key} className="dm-group">
              <div className="dm-group__label">{label}<span>{cs.length}</span></div>
              <div className="dm-swatches">{cs.map((c) => <Swatch key={c.name + c.hex} c={c} />)}</div>
            </div>
          );
        })}
      </section>

      {/* Tipografía */}
      <section className="dm-section">
        <header className="dm-section__head">
          <h2 className="dm-h">Tipografía</h2>
          <span className="dm-section__meta">{spec.fonts.map((f) => f.family).join(" + ")}</span>
        </header>
        <div className="dm-fonts">
          {spec.fonts.map((f) => <FontCard key={f.family + f.role} f={f} sample={f.role === "mono" ? host : spec.tagline} />)}
        </div>

        <div className="dm-subhead">Escala</div>
        <div className="dm-scale">
          {scale.map((t) => {
            const f = spec.fonts.find((x) => x.family === t.family);
            return (
              <div key={t.role + t.size} className="dm-scale__row">
                <div className="dm-scale__meta">
                  <span className="dm-scale__role">{t.role}</span>
                  <span className="dm-scale__vals">{Math.round(t.size)}px · {t.weight} · {t.lineHeight}{t.letterSpacing && t.letterSpacing !== "normal" ? ` · ${t.letterSpacing}` : ""}</span>
                  <span className="dm-scale__family">{t.family}</span>
                </div>
                <div
                  className="dm-scale__sample"
                  style={{
                    fontFamily: `"${t.family}", ${f?.fallback ?? "system-ui, sans-serif"}`,
                    fontSize: Math.min(t.size, 64),
                    fontWeight: t.weight,
                    lineHeight: t.lineHeight,
                    letterSpacing: t.letterSpacing === "normal" ? undefined : t.letterSpacing,
                  }}
                >
                  {spec.brand}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tokens */}
      <section className="dm-section">
        <header className="dm-section__head">
          <h2 className="dm-h">Espaciado y forma</h2>
          <span className="dm-section__meta">densidad {({ compact: "compacta", comfortable: "cómoda", airy: "aireada" } as const)[spec.spacing.density]}</span>
        </header>
        <div className="dm-tokens">
          <div className="dm-token"><span className="dm-token__k">Unidad base</span><span className="dm-token__v">{spec.spacing.baseUnit}</span></div>
          <div className="dm-token"><span className="dm-token__k">Ancho máximo</span><span className="dm-token__v">{spec.spacing.maxWidth}</span></div>
          <div className="dm-token"><span className="dm-token__k">Separación de secciones</span><span className="dm-token__v">{spec.spacing.sectionGap}</span></div>
          <div className="dm-token"><span className="dm-token__k">Padding de tarjeta</span><span className="dm-token__v">{spec.spacing.cardPadding}</span></div>
          <div className="dm-token"><span className="dm-token__k">Separación de elementos</span><span className="dm-token__v">{spec.spacing.elementGap}</span></div>
          {spec.radii.map((r) => (
            <div key={r.element} className="dm-token dm-token--radius">
              <span className="dm-radius" style={{ borderRadius: r.value }} />
              <span className="dm-token__k">{r.element}</span>
              <span className="dm-token__v">{r.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Componentes */}
      <section className="dm-section">
        <header className="dm-section__head">
          <h2 className="dm-h">Componentes</h2>
          <span className="dm-section__meta">{spec.components.length}</span>
        </header>
        <div className="dm-components">
          {spec.components.map((c) => (
            <div key={c.name} className="dm-component">
              <div className="dm-component__name">{c.name}</div>
              <div className="dm-component__role">{c.role}</div>
              <p className="dm-component__spec">{c.spec}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Do / Don't */}
      <section className="dm-section">
        <header className="dm-section__head"><h2 className="dm-h">Reglas</h2></header>
        <div className="dm-two">
          <ul className="dm-rules dm-rules--do">
            {spec.dos.map((d, i) => <li key={i}><span className="dm-rules__mark">{IcCheck}</span>{d}</li>)}
          </ul>
          <ul className="dm-rules dm-rules--dont">
            {spec.donts.map((d, i) => <li key={i}><span className="dm-rules__mark">{IcX}</span>{d}</li>)}
          </ul>
        </div>
      </section>

      {/* Notas */}
      <section className="dm-section">
        <header className="dm-section__head"><h2 className="dm-h">Sistema</h2></header>
        <div className="dm-notes">
          {[["Elevación", spec.elevation], ["Layout", spec.layout], ["Imagen", spec.imagery], ["Movimiento", spec.motion]].map(([k, v]) => (
            <div key={k} className="dm-note"><div className="dm-note__k">{k}</div><p>{v}</p></div>
          ))}
        </div>
      </section>

      {/* Similares */}
      <section className="dm-section">
        <header className="dm-section__head"><h2 className="dm-h">Marcas afines</h2></header>
        <ul className="dm-similar">
          {spec.similar.map((s) => <li key={s.brand}><strong>{s.brand}</strong><span>{s.why}</span></li>)}
        </ul>
      </section>

      {/* Prompt */}
      <section className="dm-section">
        <div className="dm-prompt">
          <div className="dm-prompt__head">
            <div>
              <div className="dm-h" style={{ margin: 0 }}>Prompt para agentes</div>
              <div className="dm-section__meta">Pégalo tal cual en Claude o en el DESIGN.md de un proyecto</div>
            </div>
            <button className="btn btn--sm btn--ghost" onClick={() => copyPrompt(spec.agentPrompt)}>
              {promptCopied ? <>{IcCheck} Copiado</> : <>{IcCopy} Copiar</>}
            </button>
          </div>
          <p className="dm-prompt__text">{spec.agentPrompt}</p>
        </div>
        <div className="dm-colophon">Medidas tomadas de la web en vivo · roles y recomendaciones interpretados por {entry.model}</div>
      </section>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function DesignMdModal({ url, empresa, state, onClose, onRetry, onRegenerate }: DesignMdModalProps) {
  const [copied, copy] = useCopy(1600);
  const [view, setView] = useState<"spec" | "md">("spec");
  const [, tick] = useState(0);

  const status = state?.status ?? "loading";
  const entry = state?.entry;
  const spec = entry?.spec;

  useEffect(() => {
    if (status !== "loading") return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const download = () => {
    if (!entry) return;
    const blob = new Blob([entry.markdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${empresa.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-DESIGN.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const date = entry ? new Date(entry.generatedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const showTabs = status === "ready" && !!spec;
  const activeView = spec ? view : "md";

  return (
    <div className="dm">
      <header className="dm-bar">
        <button className="btn-icon dm-bar__close" onClick={onClose} aria-label="Cerrar">{IcX}</button>
        <div className="dm-bar__title">
          <span className="display">{spec?.brand ?? empresa}</span>
          <span className="dm-bar__file">DESIGN.md</span>
        </div>
        {showTabs && (
          <div className="dm-tabs" role="tablist">
            <button role="tab" aria-selected={activeView === "spec"} className={`dm-tab${activeView === "spec" ? " is-active" : ""}`} onClick={() => setView("spec")}>Ficha</button>
            <button role="tab" aria-selected={activeView === "md"} className={`dm-tab${activeView === "md" ? " is-active" : ""}`} onClick={() => setView("md")}>Markdown</button>
          </div>
        )}
        <div className="dm-bar__actions">
          <button className="btn btn--ghost btn--sm" onClick={onRegenerate} disabled={status === "loading"}>Regenerar</button>
          <button className="btn btn--ghost btn--sm" onClick={download} disabled={status !== "ready"}>Descargar</button>
          <button className="btn btn--primary btn--sm" onClick={() => entry && copy(entry.markdown)} disabled={status !== "ready"}>
            {copied ? <>{IcCheck} Copiado</> : <>{IcCopy} Copiar MD</>}
          </button>
        </div>
      </header>

      {status === "loading" && <Progress startedAt={state?.startedAt ?? Date.now()} empresa={empresa} url={url} />}

      {status === "error" && (
        <div className="dm-progress">
          <div className="dm-progress__card">
            <div className="display dm-progress__title">No se ha podido generar</div>
            <p className="modal__error" style={{ marginTop: 8 }}>{state?.error}</p>
            <p className="dm-progress__hint">Algunas webs bloquean navegadores automáticos o tardan demasiado en cargar.</p>
            <button className="btn btn--ghost btn--sm" style={{ alignSelf: "flex-start" }} onClick={onRetry}>Reintentar</button>
          </div>
        </div>
      )}

      {status === "ready" && entry && (
        <div className="dm-body">
          {activeView === "spec" && spec
            ? <SpecPanel spec={spec} entry={entry} url={url} date={date} />
            : (
              <div className="dm-md">
                <div className="dm-md__head">
                  <span>{empresa.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-DESIGN.md</span>
                  <span>{entry.markdown.split(/\s+/).length} palabras · {date}</span>
                </div>
                <pre className="dm-md__pre">{entry.markdown}</pre>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
