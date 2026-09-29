"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DesignMdState, DesignMdEntry } from "./DesignMdToasts";
import { BRIEF_KEYS, noDashes, type DesignSpec, type DesignBrief } from "@/types/design";
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

  return (
    <div className={`dm-frame${theme === "dark" ? " dm-frame--dark" : ""}`} style={{ background: bg }}>
      <div className="dm-frame__bar">
        <span className="dm-frame__left" aria-hidden>
          <span className="dm-frame__lights"><i /><i /><i /></span>
          <span className="dm-frame__nav">{IcChev}<span className="dm-frame__fwd">{IcChev}</span></span>
        </span>
        <span className="dm-frame__url" aria-hidden>{IcLock}<span>{host}</span></span>
      </div>
      <div ref={boxRef} className={`dm-shot${loaded ? " is-loaded" : ""}`}>
        {!loaded && <div className="shimmer" />}
        <img
          src={src}
          alt={alt}
          onLoad={onLoad}
          style={{ "--dm-scroll": `-${dist}px`, animationDuration: `${duration}s` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

// ─── Brief ────────────────────────────────────────────────────────────────────
// One line per aspect. Specs from before the brief existed get what can be read off
// their other fields; the rest asks for a regeneration.
function briefOf(spec: DesignSpec, locale: Locale): Partial<DesignBrief> {
  const own = (locale === "es" && spec.es?.brief) || spec.brief;
  if (own) return Object.fromEntries(Object.entries(own).map(([k, v]) => [k, noDashes(v)]));
  // First sentence, cut at a clause if it runs long: these fields were written as paragraphs
  const first = (s: string) => {
    const one = s.split(/(?<=\.)\s/)[0];
    return one.length <= 120 ? one : `${one.split(/[:;(]/)[0].trim().slice(0, 117)}…`;
  };
  return {
    imagery: noDashes(first(spec.imagery)),
    motion: noDashes(first(spec.motion)),
  };
}

function ColorDot({ c }: { c: DesignSpec["colors"][number] }) {
  const { t } = useT();
  const [copied, copy] = useCopy();
  return (
    <button type="button" className="dm-dot" data-hex={copied ? t.common.copied : c.hex} style={{ background: c.hex, color: isDark(c.hex) ? "#fff" : "#000" }} onClick={() => copy(c.hex)} aria-label={`${c.name} ${c.hex} · ${t.designMd.copyHex}`}>
      {copied && IcCheck}
    </button>
  );
}

// The logo and the icons are shown on the site's own background, as they were measured
// next/font serves "Inter" as "__Inter_1a2b3c": compare names without that wrapping
const fontKey = (f: string) => f.replace(/^_+/, "").replace(/_[0-9a-f]{5,}$/i, "").replace(/[_\s-]+/g, " ").trim().toLowerCase();

function Brief({ spec, logoUrl, icons, fontFiles, bg }: { spec: DesignSpec; logoUrl?: string; icons?: string[]; fontFiles?: { family: string; formats: string[] }[]; bg: string }) {
  const { locale, t } = useT();
  const brief = briefOf(spec, locale);
  const families = [...new Set(spec.fonts.map((f) => f.family))].slice(0, 3);
  const missing = <span className="dm-brief__missing">{t.designMd.briefMissing}</span>;
  const cell: Record<(typeof BRIEF_KEYS)[number], ReactNode> = {
    typography: (
      <ul className="dm-fams">
        {families.map((f) => {
          const k = fontKey(f);
          const file = fontFiles?.find((x) => fontKey(x.family) === k) ?? fontFiles?.find((x) => fontKey(x.family).startsWith(k) || k.startsWith(fontKey(x.family)));
          return <li key={f}>{f}{file && <span className="dm-fams__fmt">.{file.formats[0]}</span>}</li>;
        })}
      </ul>
    ),
    imagery: brief.imagery ?? missing,
    logo: logoUrl
      ? <span className="dm-logo" style={{ background: bg }}><img srcSet={`${logoUrl} 2x`} alt={spec.brand} /></span>
      : brief.logo ?? missing,
    motion: brief.motion ?? missing,
    color: <span className="dm-dots">{spec.colors.map((c) => <ColorDot key={c.name + c.hex} c={c} />)}</span>,
    iconography: icons?.length ? (
      <>
        <span className="dm-icons" style={{ background: bg }}>
          {icons.map((svg, i) => <img key={i} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt="" />)}
        </span>
        {brief.iconography && <span className="dm-brief__sub">{brief.iconography}</span>}
      </>
    ) : brief.iconography ?? missing,
    voice: brief.voice ?? missing,
    framework: brief.framework ?? missing,
  };
  return (
    <dl className="dm-brief">
      {BRIEF_KEYS.map((k) => (
        <div key={k} className="dm-brief__row">
          <dt>{t.designMd.brief[k]}</dt>
          <dd>{cell[k]}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Section header with "Suggest a change" ───────────────────────────────────
function SectionHead({ title, meta, section, onRevise }: {
  title: string; meta?: React.ReactNode; section: string; onRevise?: ReviseFn;
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
        <h2 className="dm-h">{title}</h2>
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

// ─── Sheet ────────────────────────────────────────────────────────────────────
// Brief on purpose: the screenshot and eight lines. Every value lives in the Markdown
// tab and the downloaded file.
function SpecPanel({ spec, entry, url, date, onRevise }: { spec: DesignSpec; entry: { screenshotUrl?: string; logoUrl?: string; icons?: string[]; fontFiles?: { family: string; formats: string[] }[]; revisions?: RevisionMeta[] }; url: string; date: string; onRevise?: ReviseFn }) {
  const { locale, t } = useT();
  const [promptCopied, copyPrompt] = useCopy();
  const bg = pageBg(spec);
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="dm-spec">
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
          <p className="dm-tagline">{noDashes((locale === "es" && spec.es?.tagline) || spec.tagline)}</p>
          <Brief spec={spec} logoUrl={entry.logoUrl} icons={entry.icons} fontFiles={entry.fontFiles} bg={bg} />
          <div className="dm-hero__actions">
            <Button variant="ghost" size="sm" onClick={() => copyPrompt(spec.agentPrompt)}>
              {promptCopied ? <>{IcCheck} {t.common.copied}</> : <>{IcCopy} {t.designMd.copyPrompt}</>}
            </Button>
          </div>
          {onRevise && <div className="dm-hero__revise"><SectionHead title={t.designMd.sections.brief} section="brief" onRevise={onRevise} /></div>}
        </div>
        {entry.screenshotUrl && <ScrollShot src={entry.screenshotUrl} alt={spec.brand} bg={bg} host={host.split("/")[0]} theme={spec.theme} />}
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
  const markdown = entry?.markdown ?? "";

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
            ? <SpecPanel spec={spec} entry={entry} url={url} date={date} onRevise={revise} />
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
