"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DesignMdState, DesignMdEntry } from "./DesignMdToasts";
import { renderWhyMd, type DesignSpec, type DesignWhy } from "@/types/design";
import { proxiedSrc } from "@/lib/proxied-src";
import type { RevisionMeta } from "@/lib/design-revise";
import { fmtDate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { Dict } from "@/lib/i18n/en";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface DesignMdModalProps {
  url: string;
  name: string;
  state: DesignMdState | undefined;
  onClose: () => void;
  onRegenerate: () => void;
  onRevised: (patch: Partial<DesignMdEntry>) => void;
  /**
   * The inspo's comment thread, as a column right of the sheet: rendered with
   * CommentsPanel in `column` mode; `hide` is what its close button should call.
   */
  comments?: (hide: () => void) => ReactNode;
  /** How many replies there are, for the bar button */
  commentCount?: number;
  /** Name of the library it belongs to, first step of the breadcrumb */
  libraryName?: string;
}

type ReviseFn = (section: string, comment: string) => Promise<{ summary: string; warning: string | null; unchanged?: boolean }>;

export function timeAgo(iso: string, locale: Locale, t: Dict): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t.designMd.justNow;
  if (s < 3600) return t.designMd.minsAgo(Math.floor(s / 60));
  if (s < 86400) return t.designMd.hoursAgo(Math.floor(s / 3600));
  if (s < 86400 * 7) return t.designMd.daysAgo(Math.floor(s / 86400));
  return fmtDate(iso, locale, { day: "2-digit", month: "short" });
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IcCheck = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6.5l2.5 2.5L10 3.5" /></svg>
);
const IcDoc = (
  <svg width="9" height="11" viewBox="0 0 9 11" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"><path d="M1.5 1h4l2 2v7h-6z" /><path d="M5.5 1v2h2" /></svg>
);
const IcX = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
);
const IcComment = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3.5A1.5 1.5 0 013.5 2h7A1.5 1.5 0 0112 3.5v5a1.5 1.5 0 01-1.5 1.5H6l-3 2.5V10h-.5A1.5 1.5 0 012 8.5z" /></svg>
);
const IcCopy = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="4.5" width="8" height="8" rx="1.6" /><path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" /></svg>
);
const IcChevron = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 2L6.5 5l-3 3" /></svg>
);
const IcEdit = (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2L5 11H3v-2z" /></svg>
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

// Tries to load the families from Google Fonts. If they aren't there, the browser
// ignores the sheet and the fallback declared in the spec applies.
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

// ─── Auto-scrolling screenshot, in a Safari window ───────────────────────────
// The bar is glass: the screenshot passes under it blurred while it scrolls.
const IcChev = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 2L3.5 5l3 3" /></svg>
);
const IcLock = (
  <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor"><path d="M2 4V3a2.5 2.5 0 015 0v1h.5a1 1 0 011 1v3.5a1 1 0 01-1 1h-6a1 1 0 01-1-1V5a1 1 0 011-1H2zm1 0h3V3a1.5 1.5 0 00-3 0v1z" /></svg>
);

function ScrollShot({ src, alt, bg, host, theme }: { src: string; alt: string; bg: string; host: string; theme?: string }) {
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
    <div className={`dm-frame${theme === "dark" ? " dm-frame--dark" : ""}`} style={{ background: bg }}>
      <div className="dm-frame__bar" aria-hidden>
        <span className="dm-frame__left">
          <span className="dm-frame__lights"><i /><i /><i /></span>
          <span className="dm-frame__nav">{IcChev}<span className="dm-frame__fwd">{IcChev}</span></span>
        </span>
        <span className="dm-frame__url">{IcLock}<span>{host}</span></span>
        <span />
      </div>
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

// ─── Colors ───────────────────────────────────────────────────────────────────
// The order colors are grouped in; the label comes from the dictionary.
const GROUPS: DesignSpec["colors"][number]["group"][] = ["brand", "accent", "semantic", "neutral"];

function Swatch({ c }: { c: DesignSpec["colors"][number] }) {
  const { t } = useT();
  const [copied, copy] = useCopy();
  return (
    <button className="dm-swatch" onClick={() => copy(c.hex)} title={t.designMd.copyHex}>
      <span className="dm-swatch__chip" style={{ background: c.hex, color: isDark(c.hex) ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.7)" }}>
        <span className="dm-swatch__copy">{copied ? IcCheck : IcCopy}</span>
      </span>
      <span className="dm-swatch__name">{c.name}</span>
      <span className="dm-swatch__hex">{copied ? t.designMd.copiedShort : c.hex}</span>
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

// ─── Typography ───────────────────────────────────────────────────────────────
function FontCard({ f, sample }: { f: DesignSpec["fonts"][number]; sample: string }) {
  const { t } = useT();
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
          <span className="dm-tag">{t.designMd.fontRoles[f.role]}</span>
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

// ─── Section header with "Suggest a change" ───────────────────────────────────
function SectionHead({ title, meta, section, onRevise, open: expanded, onToggle }: {
  title: string; meta?: React.ReactNode; section: string; onRevise?: ReviseFn;
  /** Folding section: the title opens and closes it */
  open?: boolean; onToggle?: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ summary: string; warning: string | null; unchanged?: boolean } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [busy]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRevise || text.trim().length < 5) return;
    setBusy(true); setError(""); setDone(null); setStartedAt(Date.now());
    try {
      const r = await onRevise(section, text.trim());
      setDone(r);
      if (!r.unchanged) { setText(""); setOpen(false); }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.designMd.reviseFailed);
    } finally { setBusy(false); }
  };
  const elapsed = busy ? Math.floor((Date.now() - startedAt) / 1000) : 0;

  return (
    <>
      <header className="dm-section__head">
        {onToggle ? (
          <h2 className="dm-h">
            <button type="button" className="dm-fold__toggle" aria-expanded={expanded} onClick={onToggle}>
              <span className="dm-fold__chev" aria-hidden>{IcChevron}</span>{title}
            </button>
          </h2>
        ) : <h2 className="dm-h">{title}</h2>}
        <span className="dm-section__right">
          {meta && <span className="dm-section__meta">{meta}</span>}
          {onRevise && (
            <button className={`dm-revise-btn${open ? " is-open" : ""}`} onClick={() => { setOpen((o) => !o); setDone(null); }} disabled={busy}>
              {IcEdit}<span>{t.designMd.propose}</span>
            </button>
          )}
        </span>
      </header>
      {open && (
        <form className="dm-revise" onSubmit={submit}>
          <textarea
            className="dm-revise__input" autoFocus rows={3} value={text} disabled={busy}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.designMd.revisePlaceholder(title.toLowerCase())}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(e); }}
          />
          <div className="dm-revise__foot">
            <span className="dm-revise__hint">
              {busy
                ? <><span className="spinner spinner--sm" /> {t.designMd.reviseBusy(elapsed)} <span className="dm-revise__eta">{t.designMd.reviseEta}</span></>
                : t.designMd.reviseHint}
            </span>
            <div className="dm-revise__actions">
              <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(false)} disabled={busy}>{t.common.cancel}</Button>
              <Button variant="primary" size="sm" type="submit" disabled={busy || text.trim().length < 5}>{t.designMd.applyWithClaude}</Button>
            </div>
          </div>
          {error && <p className="modal__error">{error}</p>}
        </form>
      )}
      {done && (
        <div className={`dm-revise-done${done.warning ? " has-warning" : ""}${done.unchanged ? " is-unchanged" : ""}`}>
          <span className="dm-revise-done__mark">{done.unchanged ? IcX : IcCheck}</span>
          <div>
            <p>{done.summary}</p>
            {done.warning && <p className="dm-revise-done__warning">{done.warning}</p>}
          </div>
          <Button variant="icon" onClick={() => setDone(null)} aria-label={t.common.close}>{IcX}</Button>
        </div>
      )}
    </>
  );
}

// ─── Revision history ─────────────────────────────────────────────────────────
function History({ revisions, onRevert, busy }: { revisions: RevisionMeta[]; onRevert: (id: string) => void; busy: boolean }) {
  const { locale, t } = useT();
  return (
    <div className="dm-history">
      <div className="dm-history__head">
        <span className="dm-h" style={{ margin: 0 }}>{t.designMd.history}</span>
        <span className="dm-section__meta">{t.designMd.historyMeta(revisions.length)}</span>
      </div>
      <ol className="dm-history__list">
        {revisions.map((r, i) => (
          <li key={r.id} className={`dm-rev${i === 0 ? " is-current" : ""}`}>
            <div className="dm-rev__meta">
              <span className="dm-rev__author">{r.authorName}</span>
              <span className="dm-rev__when">{timeAgo(r.createdAt, locale, t)}</span>
              {r.kind === "revision" && r.section && <span className="dm-tag">{t.designMd.sections[r.section as keyof typeof t.designMd.sections] ?? r.section}</span>}
              {r.kind === "regeneration" && <span className="dm-tag">{t.designMd.kindRegenerated}</span>}
              {r.kind === "reversion" && <span className="dm-tag">{t.designMd.kindReverted}</span>}
              {i === 0 && <span className="dm-rev__current">{t.designMd.live}</span>}
            </div>
            {r.comment && <p className="dm-rev__comment">“{r.comment}”</p>}
            <p className="dm-rev__summary">{r.summary}</p>
            {r.warning && <p className="dm-rev__warning">{r.warning}</p>}
            {i !== 0 && (
              <Button variant="ghost" size="sm" className="dm-rev__revert" onClick={() => onRevert(r.id)} disabled={busy}>{t.designMd.revertTo}</Button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// Secondary sections start closed: the first screen is identity, color and type.
function Fold({ title, meta, section, onRevise, children }: {
  title: string; meta?: React.ReactNode; section: string; onRevise?: ReviseFn; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`dm-section dm-fold${open ? " is-open" : ""}`}>
      <SectionHead title={title} meta={meta} section={section} onRevise={onRevise} open={open} onToggle={() => setOpen((o) => !o)} />
      {open && children}
    </section>
  );
}

// ─── Why it's here ─────────────────────────────────────────────────────────────
// The human root of the inspo (the saver's note, the thread) connected to the measured
// spec by a model. Per workspace and cached server-side; a new comment rebuilds it.
type WhyState = { status: "loading" | "ready" | "error"; why?: DesignWhy; error?: string };

function useWhy(url: string, ready: boolean, commentCount: number, specStamp: string): WhyState {
  const [state, setState] = useState<WhyState>({ status: "loading" });
  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();
    setState((s) => (s.why ? s : { status: "loading" }));
    fetch(`/api/design-md/why?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        setState({ status: "ready", why: data.why });
      })
      .catch((e) => { if (!ctrl.signal.aborted) setState({ status: "error", error: e instanceof Error ? e.message : String(e) }); });
    return () => ctrl.abort();
  }, [url, ready, commentCount, specStamp]);
  return state;
}

function WhySection({ state }: { state: WhyState }) {
  const { t } = useT();
  const why = state.why;
  return (
    <section className="dm-section dm-why">
      <header className="dm-section__head">
        <h2 className="dm-h">{t.designMd.sections.why}</h2>
        {why && why.voices > 0 && <span className="dm-section__meta">{t.designMd.whyMeta(why.voices)}</span>}
      </header>
      {state.status === "loading" && !why && <p className="dm-why__note"><span className="spinner spinner--sm" /> {t.designMd.whyLoading}</p>}
      {state.status === "error" && <p className="dm-why__note">{t.designMd.whyFailed}</p>}
      {why && why.voices === 0 && <p className="dm-why__note">{t.designMd.whyEmpty}</p>}
      {why && why.voices > 0 && !why.highlights.length && <p className="dm-why__note">{t.designMd.whyNothingConcrete}</p>}
      {why && why.highlights.length > 0 && (
        <ol className="dm-why__list">
          {why.highlights.map((h, i) => (
            <li key={i} className={`dm-why__item is-${h.status}`}>
              {/* The thing itself first; the words read as its caption */}
              {h.shotUrls && h.shotUrls.length > 0 && (
                <div className="dm-why__shots">
                  {h.shotUrls.map((u, j) => (
                    <a key={j} className="dm-why__shot" href={proxiedSrc(u)} target="_blank" rel="noopener noreferrer">
                      <img src={proxiedSrc(u)} alt="" loading="lazy" decoding="async" />
                    </a>
                  ))}
                </div>
              )}
              <div className="dm-why__caption">
                <blockquote className="dm-why__quote">
                  <p>{h.quote}</p>
                  <footer>{h.author}</footer>
                </blockquote>
                <div className="dm-why__body">
                  {h.values.length > 0 && (
                    <div className="dm-why__values">{h.values.map((v, j) => <code key={j} className="dm-why__value">{v}</code>)}</div>
                  )}
                  {h.status === "unverifiable" && <p className="dm-why__note-text dm-why__note-text--muted">{t.designMd.whyUnverifiable}{h.note ? ` ${h.note}` : ""}</p>}
                  {h.status !== "unverifiable" && h.note && <p className="dm-why__note-text">{h.note}</p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────
function SpecPanel({ spec, entry, url, date, onRevise, why }: { spec: DesignSpec; entry: { screenshotUrl?: string; model: string; revisions?: RevisionMeta[] }; url: string; date: string; onRevise?: ReviseFn; why: WhyState }) {
  const { locale, t } = useT();
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
            <span className={`dm-theme dm-theme--${spec.theme}`}><i />{spec.theme === "dark" ? t.designMd.themeDark : t.designMd.themeLight}</span>
            <a className="dm-link" href={url} target="_blank" rel="noopener noreferrer">{host}{IcArrow}</a>
            <span className="dm-eyebrow__sep">·</span>
            <span>{date}</span>
            {entry.revisions?.length ? (
              <>
                <span className="dm-eyebrow__sep">·</span>
                <span className="dm-eyebrow__rev">{IcEdit} {t.designMd.revisedBy(entry.revisions[0].authorName, timeAgo(entry.revisions[0].createdAt, locale, t))}</span>
              </>
            ) : null}
          </div>
          <h1 className="display dm-brand">{spec.brand}</h1>
          <p className="dm-tagline">{spec.tagline}</p>
          <p className="dm-desc">{spec.description}</p>
          <div className="dm-hero__actions">
            <Button variant="ghost" size="sm" onClick={() => copyPrompt(spec.agentPrompt)}>
              {promptCopied ? <>{IcCheck} {t.common.copied}</> : <>{IcCopy} {t.designMd.copyPrompt}</>}
            </Button>
          </div>
          {onRevise && <div className="dm-hero__revise"><SectionHead title={t.designMd.sections.general} section="general" onRevise={onRevise} /></div>}
        </div>
        {entry.screenshotUrl && <ScrollShot src={entry.screenshotUrl} alt={spec.brand} bg={bg} host={host.split("/")[0]} theme={spec.theme} />}
      </section>

      <WhySection state={why} />

      {/* Colors */}
      <section className="dm-section">
        <SectionHead title={t.designMd.sections.color} meta={t.designMd.colorMeta(spec.colors.length)} section="color" onRevise={onRevise} />
        <PaletteStrip colors={spec.colors} />
        {GROUPS.map((key) => {
          const cs = spec.colors.filter((c) => c.group === key);
          if (!cs.length) return null;
          return (
            <div key={key} className="dm-group">
              <div className="dm-group__label">{t.designMd.colorGroups[key]}<span>{cs.length}</span></div>
              <div className="dm-swatches">{cs.map((c) => <Swatch key={c.name + c.hex} c={c} />)}</div>
            </div>
          );
        })}
      </section>

      {/* Typography */}
      <section className="dm-section">
        <SectionHead title={t.designMd.sections.typography} meta={spec.fonts.map((f) => f.family).join(" + ")} section="typography" onRevise={onRevise} />
        <div className="dm-fonts">
          {spec.fonts.map((f) => <FontCard key={f.family + f.role} f={f} sample={f.role === "mono" ? host : spec.tagline} />)}
        </div>

        <div className="dm-subhead">{t.designMd.scale}</div>
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
      <Fold title={t.designMd.sections.spacing} meta={t.designMd.densityMeta(t.designMd.density[spec.spacing.density])} section="spacing" onRevise={onRevise}>
        <div className="dm-tokens">
          <div className="dm-token"><span className="dm-token__k">{t.designMd.baseUnit}</span><span className="dm-token__v">{spec.spacing.baseUnit}</span></div>
          <div className="dm-token"><span className="dm-token__k">{t.designMd.maxWidth}</span><span className="dm-token__v">{spec.spacing.maxWidth}</span></div>
          <div className="dm-token"><span className="dm-token__k">{t.designMd.sectionGap}</span><span className="dm-token__v">{spec.spacing.sectionGap}</span></div>
          <div className="dm-token"><span className="dm-token__k">{t.designMd.cardPadding}</span><span className="dm-token__v">{spec.spacing.cardPadding}</span></div>
          <div className="dm-token"><span className="dm-token__k">{t.designMd.elementGap}</span><span className="dm-token__v">{spec.spacing.elementGap}</span></div>
          {spec.radii.map((r) => (
            <div key={r.element} className="dm-token dm-token--radius">
              <span className="dm-radius" style={{ borderRadius: r.value }} />
              <span className="dm-token__k">{r.element}</span>
              <span className="dm-token__v">{r.value}</span>
            </div>
          ))}
        </div>
      </Fold>

      {/* Components */}
      <Fold title={t.designMd.sections.components} meta={String(spec.components.length)} section="components" onRevise={onRevise}>
        <div className="dm-components">
          {spec.components.map((c) => (
            <div key={c.name} className="dm-component">
              <div className="dm-component__name">{c.name}</div>
              <div className="dm-component__role">{c.role}</div>
              <p className="dm-component__spec">{c.spec}</p>
            </div>
          ))}
        </div>
      </Fold>

      {/* Do / Don't */}
      <Fold title={t.designMd.sections.rules} section="rules" onRevise={onRevise}>
        <div className="dm-two">
          <ul className="dm-rules dm-rules--do">
            {spec.dos.map((d, i) => <li key={i}><span className="dm-rules__mark">{IcCheck}</span>{d}</li>)}
          </ul>
          <ul className="dm-rules dm-rules--dont">
            {spec.donts.map((d, i) => <li key={i}><span className="dm-rules__mark">{IcX}</span>{d}</li>)}
          </ul>
        </div>
      </Fold>

      {/* Notes */}
      <Fold title={t.designMd.sections.system} section="system" onRevise={onRevise}>
        <div className="dm-notes">
          {[[t.designMd.elevation, spec.elevation], [t.designMd.layout, spec.layout], [t.designMd.imagery, spec.imagery], [t.designMd.motion, spec.motion]].map(([k, v]) => (
            <div key={k} className="dm-note"><div className="dm-note__k">{k}</div><p>{v}</p></div>
          ))}
        </div>
      </Fold>

      {/* Similar */}
      <Fold title={t.designMd.sections.related} section="related" onRevise={onRevise}>
        <ul className="dm-similar">
          {spec.similar.map((s) => <li key={s.brand}><strong>{s.brand}</strong><span>{s.why}</span></li>)}
        </ul>
      </Fold>

      {/* Prompt */}
      <section className="dm-section">
        <div className="dm-prompt">
          <div className="dm-prompt__head">
            <div>
              <div className="dm-h" style={{ margin: 0 }}>{t.designMd.agentPrompt}</div>
              <div className="dm-section__meta">{t.designMd.agentPromptHint}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => copyPrompt(spec.agentPrompt)}>
              {promptCopied ? <>{IcCheck} {t.common.copied}</> : <>{IcCopy} {t.common.copy}</>}
            </Button>
          </div>
          <p className="dm-prompt__text">{spec.agentPrompt}</p>
          {onRevise && <div className="dm-prompt__revise"><SectionHead title={t.designMd.sections.prompt} section="prompt" onRevise={onRevise} /></div>}
        </div>
        <div className="dm-colophon">{t.designMd.colophon(entry.model)}</div>
      </section>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
// The sheet only opens once the DESIGN.md exists: generation lives in the
// bottom-right toast (DesignMdToasts), there is no progress screen here.
export default function DesignMdModal({ url, name, state, onClose, onRegenerate, onRevised, comments, commentCount = 0, libraryName }: DesignMdModalProps) {
  const { locale, t } = useT();
  const [copied, copy] = useCopy(1600);
  const [view, setView] = useState<"spec" | "md" | "history">("spec");
  const [reverting, setReverting] = useState(false);
  // The comments column starts open on wide screens; on narrow ones it
  // overlays the sheet and opens by hand from the bar.
  const [commentsOpen, setCommentsOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 1024);

  const entry = state?.entry;
  const ready = state?.status === "ready" && !!entry;
  const spec = entry?.spec;
  const revisions = entry?.revisions ?? [];
  // The team's "why": rebuilt when the thread grows or the spec changes (a revision, a regeneration)
  const why = useWhy(url, ready, commentCount, `${entry?.generatedAt ?? ""}:${revisions[0]?.id ?? ""}`);
  // This workspace's file: the global DESIGN.md plus its own "Why it's here"
  const markdown = entry ? (why.why?.highlights.length ? `${entry.markdown}\n${renderWhyMd(why.why)}` : entry.markdown) : "";

  // Sends an objection to Claude and updates the entry with the corrected spec
  const revise: ReviseFn = async (section, comment) => {
    const res = await fetch("/api/design-md/revisions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, section, comment }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
    if (data.unchanged) return { summary: data.summary, warning: null, unchanged: true };
    onRevised({ spec: data.spec, markdown: data.markdown, revisions: data.revisions });
    return { summary: data.applied?.summary ?? t.designMd.changeApplied, warning: data.applied?.warning ?? null };
  };

  const revert = async (id: string) => {
    setReverting(true);
    try {
      const res = await fetch("/api/design-md/revisions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, revertTo: id }),
      });
      const data = await res.json();
      if (res.ok) onRevised({ spec: data.spec, markdown: data.markdown, revisions: data.revisions });
    } finally { setReverting(false); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const download = () => {
    if (!entry) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-DESIGN.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const date = entry ? fmtDate(entry.generatedAt, locale, { day: "2-digit", month: "short", year: "numeric" }) : "";
  const showTabs = ready && !!spec;
  const activeView = spec ? view : "md";
  const barHost = url.replace(/^https?:\/\//, "").split("/")[0];
  const [iconOk, setIconOk] = useState(true);

  return (
    <div className="dm">
      <header className="dm-bar">
        <Button variant="icon" className="dm-bar__close" onClick={onClose} aria-label={t.common.close}>{IcX}</Button>
        <div className="dm-bar__id">
          <span className="dm-bar__icon" aria-hidden>
            {iconOk && <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(barHost)}&sz=64`} alt="" onError={() => setIconOk(false)} />}
            {!iconOk && <span>{(spec?.brand ?? name).slice(0, 1).toUpperCase()}</span>}
          </span>
          <div className="dm-bar__title">
            <span className="display dm-bar__brand">{spec?.brand ?? name}</span>
            {/* Where this is: the library, the site, the file */}
            <Breadcrumb className="dm-bar__meta" aria-label={t.settings.breadcrumb}>
              <BreadcrumbList>
                {libraryName && (
                  <>
                    <BreadcrumbItem><button type="button" className="dm-bar__crumb" onClick={onClose}>{libraryName}</button></BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                <BreadcrumbItem><a href={url} target="_blank" rel="noopener noreferrer">{barHost}</a></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <button type="button" className="dm-bar__file" onClick={download} disabled={!ready} title={t.designMd.downloadFile}>{IcDoc}DESIGN.md</button>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        {showTabs && (
          <div className="dm-tabs" role="tablist">
            <button role="tab" aria-selected={activeView === "spec"} className={`dm-tab${activeView === "spec" ? " is-active" : ""}`} onClick={() => setView("spec")}>{t.designMd.tabSpec}</button>
            <button role="tab" aria-selected={activeView === "md"} className={`dm-tab${activeView === "md" ? " is-active" : ""}`} onClick={() => setView("md")}>{t.designMd.tabMarkdown}</button>
            <button role="tab" aria-selected={activeView === "history"} className={`dm-tab${activeView === "history" ? " is-active" : ""}`} onClick={() => setView("history")}>
              {t.designMd.tabHistory}{revisions.length > 0 && <span className="dm-tab__count">{revisions.length}</span>}
            </button>
          </div>
        )}
        <div className="dm-bar__actions">
          {comments && (
            <Button
              variant="ghost"
              size="sm"
              className={`dm-bar__comments${commentsOpen ? " is-active" : ""}`}
              onClick={() => setCommentsOpen((o) => !o)}
              aria-pressed={commentsOpen}
              title={commentsOpen ? t.designMd.hideComments : t.designMd.showComments}
            >
              {IcComment}<span className="dm-bar__comments-label">{t.designMd.comments}</span><span className="dm-tab__count">{commentCount}</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={!ready}>{t.designMd.regenerate}</Button>
          <Button variant="ghost" size="sm" onClick={download} disabled={!ready}>{t.designMd.download}</Button>
          <Button variant="primary" size="sm" onClick={() => entry && copy(markdown)} disabled={!ready}>
            {copied ? <>{IcCheck} {t.common.copied}</> : <>{IcCopy} {t.designMd.copyMd}</>}
          </Button>
        </div>
      </header>

      {ready && entry && (
        <div className={`dm-content${comments && commentsOpen ? " has-comments" : ""}`}>
        <div className="dm-body">
          {activeView === "history" ? (
            revisions.length
              ? <History revisions={revisions} onRevert={revert} busy={reverting} />
              : <div className="dm-history dm-history--empty">{t.designMd.historyEmpty}</div>
          ) : activeView === "spec" && spec
            ? <SpecPanel spec={spec} entry={entry} url={url} date={date} onRevise={revise} why={why} />
            : (
              <div className="dm-md">
                <div className="dm-md__head">
                  <span>{name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-DESIGN.md</span>
                  <span>{t.designMd.words(markdown.split(/\s+/).length)} · {date}</span>
                </div>
                <pre className="dm-md__pre">{markdown}</pre>
              </div>
            )}
        </div>
        {comments && commentsOpen && (
          <div className="dm-side">{comments(() => setCommentsOpen(false))}</div>
        )}
        </div>
      )}
    </div>
  );
}
