"use client";

import { proxiedSrc } from "@/lib/proxied-src";
import { hueFor } from "./CommentsPanel";

import { Fragment, useState, useEffect, useRef } from "react";
import { InspoItem, InspoTags } from "@/types/inspo";
import { TAGS, TAG_THRESHOLD } from "@/lib/taxonomy";
import { useT } from "./I18nProvider";

const BLOCKED = ["x.com", "twitter.com", "linkedin.com", "primevideo.com", "instagram.com", "youtube.com"];

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}
function isBlocked(url: string) {
  const d = getDomain(url);
  return BLOCKED.some((b) => d.includes(b));
}

type ImgSource = "idle" | "og" | "shot" | "error";

// Images already resolved per URL: moving cards between columns makes React
// remount them, and without this everything would download (and flicker) again.
const imgCache = new Map<string, { src: string | null; source: ImgSource }>();

interface InspoCardProps {
  item: InspoItem;
  tags?: InspoTags;
  score?: number;
  reason?: string;
  manualThumbnail?: string;
  onUpload: (file: File) => Promise<void>;
  onRemoveThumbnail: () => Promise<void>;
  onDesignMd: () => void;
  designMdLoading?: boolean;
  designMdReady?: boolean;
  designCover?: string;   // 720x450 cover generated with the DESIGN.md
  designScroll?: string;  // long strip that scrolls on hover
  commentCount?: number;  // replies in the thread (not counting the original note)
  onComments?: () => void;
  onDelete?: () => Promise<void>; // remove the card from the workspace
}

const IconUpload = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10V2M7 2L4 5M7 2l3 3" /><path d="M2 12h10" />
  </svg>
);
const IconComment = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M2 3.5A1.5 1.5 0 013.5 2h7A1.5 1.5 0 0112 3.5v5a1.5 1.5 0 01-1.5 1.5H6l-3 2.5V10h-.5A1.5 1.5 0 012 8.5z" />
  </svg>
);
const IconTrash = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.6 8h4.8L10 4" />
  </svg>
);
const IconX = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 2l8 8M10 2l-8 8" />
  </svg>
);
const IconExternal = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10l6-6M5 4h5v5" />
  </svg>
);
const IconInfo = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="6" cy="6" r="5" /><path d="M6 5.5V8.5M6 3.6v.1" />
  </svg>
);

export default function InspoCard({ item, tags, score, reason, manualThumbnail, onUpload, onRemoveThumbnail, onDesignMd, designMdLoading, designMdReady, designCover, designScroll, commentCount = 0, onComments, onDelete }: InspoCardProps) {
  const { t } = useT();
  const [source, setSource] = useState<ImgSource>(() => isBlocked(item.web) ? "error" : imgCache.get(item.web)?.source ?? "idle");
  const [imgSrc, setImgSrc] = useState<string | null>(() => imgCache.get(item.web)?.src ?? null); // blob URL
  const [manualLoaded, setManualLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false); // mobile: the % bubble opens on tap
  const [coverLoaded, setCoverLoaded] = useState(false);
  // A cover or thumbnail that fails to load falls through to og:image / screenshot instead of shimmering forever
  const [manualFailed, setManualFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [scrollDist, setScrollDist] = useState(0);
  // Delete in two taps: the first asks for confirmation on the button itself, the second deletes
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // When the confirmation opened: a near-instant second click/tap/key doesn't count,
  // so deleting is always two deliberate actions (double click, double tap or Space don't delete).
  const confirmAt = useRef(0);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const manualImgRef = useRef<HTMLImageElement>(null);
  const coverImgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suppressClick = useRef(false);

  const useManual = !!manualThumbnail && !manualFailed;
  const useDesign = !useManual && !!designCover && !coverFailed;

  // Reset on thumbnail change, then check if the image was already cached
  useEffect(() => {
    setManualLoaded(false);
    setManualFailed(false);
    const id = setTimeout(() => {
      const el = manualImgRef.current;
      if (el && el.complete && el.naturalWidth > 0) setManualLoaded(true);
    }, 0);
    return () => clearTimeout(id);
  }, [manualThumbnail]);

  // Same for the DESIGN.md cover. The tile is server-rendered, so the browser
  // often finishes loading the cover before React hydrates and attaches onLoad:
  // the event is lost and the tile would shimmer forever over a loaded image.
  useEffect(() => {
    setCoverLoaded(false);
    setCoverFailed(false);
    const id = setTimeout(() => {
      const el = coverImgRef.current;
      if (el && el.complete && el.naturalWidth > 0) setCoverLoaded(true);
    }, 0);
    return () => clearTimeout(id);
  }, [designCover]);

  // Start loading when the tile enters the viewport
  useEffect(() => {
    if (useManual || useDesign || source !== "idle") return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setSource("og"); observer.disconnect(); } },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [source, useManual, useDesign]);

  // Fetch as blob so failed sources don't spam the console
  useEffect(() => {
    if (source === "idle" || source === "error" || imgSrc) return;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), source === "shot" ? 60000 : 15000);
    // og:image first (cheap); if the site has none, capture its hero server-side.
    // The "v" changes the screenshot URL when the server gets fixed: old 502s
    // stay in the browser cache and without this would keep showing for a while.
    const apiUrl = source === "og"
      ? `/api/og?url=${encodeURIComponent(item.web)}`
      : `/api/shot?url=${encodeURIComponent(item.web)}&v=2`;

    fetch(apiUrl, { signal: ctrl.signal })
      .then((res) => {
        // 204 = the site has no og:image or the screenshot failed: move to the next method
        if (!res.ok || res.status === 204 || !res.headers.get("content-type")?.startsWith("image/")) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        clearTimeout(timeout);
        const src = URL.createObjectURL(blob);
        imgCache.set(item.web, { src, source });
        setImgSrc(src);
      })
      .catch(() => {
        clearTimeout(timeout);
        if (source === "og") { setSource("shot"); setImgSrc(null); }
        else { imgCache.set(item.web, { src: null, source: "error" }); setSource("error"); }
      });

    return () => { ctrl.abort(); clearTimeout(timeout); };
    // imgSrc only avoids a repeat download when it already comes from the cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, item.web]);

  const domain = getDomain(item.web);
  const isError = !useManual && !useDesign && source === "error";
  const isLoaded = useManual ? manualLoaded : useDesign ? coverLoaded : !!imgSrc;

  const onScrollLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget, box = scrollBoxRef.current;
    if (!box) return;
    const rendered = (img.naturalHeight / img.naturalWidth) * box.clientWidth;
    setScrollDist(Math.max(0, rendered - box.clientHeight));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await onUpload(file); } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // The confirmation cancels with Esc or on its own after 6 s
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 6000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setConfirmDelete(false); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [confirmDelete]);
  const cancelDelete = (e: React.MouseEvent) => { e.stopPropagation(); setConfirmDelete(false); };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    if (!confirmDelete) { confirmAt.current = Date.now(); setConfirmDelete(true); return; }
    if (Date.now() - confirmAt.current < 400) return; // too quick: not a decision
    setConfirmDelete(false);
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  };

  const triggerUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    suppressClick.current = true;
    fileInputRef.current?.click();
    setTimeout(() => { suppressClick.current = false; }, 500);
  };

  // The external site only opens from its icon: a click on the card leads to our own views.
  // With a DESIGN.md done the sheet opens; otherwise the comment thread (which links to the site).
  const clickTarget: "md" | "comments" = designMdReady || !onComments ? "md" : "comments";
  const openInside = () => { if (clickTarget === "md") onDesignMd(); else onComments!(); };

  const meta = (
    <div className="tile__meta">
      <span>{t.labels.type[item.type]}</span>
      {/* "Both" is the legacy sheet author: not a person, so it isn't shown */}
      {item.addedBy !== "Both" && (<><span className="tile__meta-sep">·</span><span>{item.addedBy}</span></>)}
      {domain && (<><span className="tile__meta-sep">·</span><span>{domain}</span></>)}
    </div>
  );

  const activeTags = tags
    ? TAGS.filter((t) => (tags.tags[t.key] ?? 0) >= TAG_THRESHOLD)
        .sort((a, b) => tags.tags[b.key] - tags.tags[a.key]).slice(0, 3)
    : [];
  const aiChips = tags && (
    <div className="tile__tags">
      <span className="tile__tag tile__tag--style">{t.taxonomy.style[tags.style as keyof typeof t.taxonomy.style] ?? tags.style}</span>
      {activeTags.map((x) => <span key={x.key} className="tile__tag">{t.taxonomy.tag[x.key as keyof typeof t.taxonomy.tag] ?? x.key}</span>)}
    </div>
  );

  return (
    <div>
      <article
        className="tile"
        onClick={() => { if (suppressClick.current) return; openInside(); }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div ref={containerRef} className={`tile__media${!isLoaded && !isError ? " is-loading" : ""}`}>
          {!isLoaded && !isError && <div className="shimmer" />}

          {useManual && (
            <img
              ref={manualImgRef}
              className={`tile__img${manualLoaded ? "" : " is-hidden"}`}
                decoding="async"
              src={manualThumbnail.startsWith("https://")
                ? `/api/thumbnail/img?url=${encodeURIComponent(manualThumbnail)}`
                : manualThumbnail}
              alt={item.name}
              onLoad={() => setManualLoaded(true)}
              onError={() => setManualFailed(true)}
            />
          )}

          {useDesign && (
            <>
              <img
                ref={coverImgRef}
                className={`tile__img${coverLoaded ? "" : " is-hidden"}`}
                decoding="async"
                src={proxiedSrc(designCover!)}
                alt={item.name}
                loading="lazy"
                onLoad={() => setCoverLoaded(true)}
                onError={() => setCoverFailed(true)}
              />
              {designScroll && coverLoaded && hovering && (
                <div ref={scrollBoxRef} className="tile__scroll">
                  <img
                    src={proxiedSrc(designScroll)}
                    alt=""
                    onLoad={onScrollLoad}
                    className={scrollDist > 0 ? "is-ready" : ""}
                    style={{ "--dm-scroll": `-${scrollDist}px`, animationDuration: `${Math.max(4, Math.round(scrollDist / 170))}s` } as React.CSSProperties}
                  />
                </div>
              )}
            </>
          )}

          {!useManual && !useDesign && imgSrc && (
            <img
              className="tile__img"
                decoding="async"
              src={imgSrc}
              alt={item.name}
              onError={() => {
                // Blob fetched but not a renderable image (bad og:image): try next source
                imgCache.delete(item.web);
                setImgSrc(null);
                setSource(source === "og" ? "shot" : "error");
              }}
            />
          )}

          {isError && (
            // No screenshot: a typographic poster. Subtle stable tint per domain and the initial as a watermark.
            <div className="tile__fallback" style={{ "--fb-hue": hueFor(domain || item.name) } as React.CSSProperties}>
              <span className="display tile__fallback-mark" aria-hidden>{item.name.trim().slice(0, 1).toUpperCase()}</span>
              <div className="tile__fallback-top">
                <span className="tile__fallback-domain">{domain}</span>
                <span className="tile__fallback-type">{t.labels.type[item.type]}</span>
              </div>
              <div className="tile__fallback-body">
                <i className="tile__fallback-rule" aria-hidden />
                <span className="display tile__fallback-name">{item.name}</span>
                {item.note && <span className="tile__fallback-note">{item.note}</span>}
              </div>
            </div>
          )}

          <div className="tile__overlay">
            <div className="display tile__title">{item.name}</div>
            {meta}
            {item.note && <p className="tile__comment">{item.note}</p>}
            {commentCount > 0 && (
              <span className="tile__replies">{IconComment}{t.card.replies(commentCount)}</span>
            )}
            {aiChips}
            <span className="tile__cta">
              {clickTarget === "md" ? (designMdReady ? t.card.openDesignMd : designMdLoading ? t.card.generatingDesignMd : t.card.generateDesignMd) : (commentCount > 0 ? t.card.seeComments : t.card.comment)}
            </span>
          </div>

          {score !== undefined && (
            <div
              className={`tile__score has-why${whyOpen ? " is-open" : ""}`}
              onClick={(e) => { e.stopPropagation(); setWhyOpen((v) => !v); }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseLeave={() => setWhyOpen(false)}
            >
              <span className="tile__score-pct">
                {Math.round(score * 100)}%
                <span className="tile__score-i" aria-hidden>{IconInfo}</span>
              </span>
              <span className="tile__score-why" role="tooltip">
                <span className="tile__score-why-label">{t.card.matchLabel}</span>
                <span className="tile__score-why-text">{reason ?? t.card.matchFallback}</span>
              </span>
            </div>
          )}

          <div
            className={`tile__actions${uploading || designMdLoading || confirmDelete || deleting ? " is-visible" : ""}${confirmDelete || deleting ? " is-confirm" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {confirmDelete || deleting ? (
              <Fragment key="confirm">
                <span className="tile__confirm-text">{deleting ? t.card.removing : t.card.confirmRemove}</span>
                <button className="tile__action tile__action--confirm" onClick={handleDelete} disabled={deleting} autoFocus>
                  {deleting ? <span className="spinner" /> : t.common.delete}
                </button>
                {!deleting && (
                  <button className="tile__action" data-tip={t.common.cancel} aria-label={t.common.cancel} onClick={cancelDelete}>{IconX}</button>
                )}
              </Fragment>
            ) : (
              <Fragment key="actions">
            {manualThumbnail && (
              <button className="tile__action tile__action--danger" data-tip={t.card.removeThumb} aria-label={t.card.removeThumb}
                onClick={async (e) => { e.stopPropagation(); await onRemoveThumbnail(); }}>
                {IconX}
              </button>
            )}
            {onComments && (
              <button className={`tile__action tile__action--cm${commentCount > 0 ? " has-count" : ""}`} data-tip={commentCount > 0 ? t.card.seeComments : t.card.comment} aria-label={t.card.comments}
                onClick={(e) => { e.stopPropagation(); onComments(); }}>
                {IconComment}{commentCount > 0 && <span className="tile__action-count">{commentCount}</span>}
              </button>
            )}
            <button
              className={`tile__action tile__action--md${designMdReady ? " is-ready" : ""}`}
              data-tip={designMdLoading ? t.card.generatingDesignMd : designMdReady ? t.card.seeDesignMd : t.card.generateWithAi}
              onClick={(e) => { e.stopPropagation(); onDesignMd(); }}
            >
              {designMdLoading ? <span className="spinner" /> : designMdReady ? <>MD<i className="tile__dot" /></> : "MD"}
            </button>
            <button className="tile__action" data-tip={manualThumbnail ? t.card.replaceThumb : t.card.uploadThumb} aria-label={manualThumbnail ? t.card.replaceThumb : t.card.uploadThumb}
              onClick={triggerUpload}>
              {uploading ? <span className="spinner" /> : IconUpload}
            </button>
            <a className="tile__action tile__action--link" href={item.web} target="_blank" rel="noopener noreferrer"
              data-tip={t.card.openSite} aria-label={t.card.openSite} onClick={(e) => e.stopPropagation()}>
              {IconExternal}
            </a>
            {onDelete && (
              <button
                className="tile__action tile__action--danger"
                data-tip={t.card.removeFromInspo} aria-label={t.card.removeFromInspo}
                onClick={handleDelete}
              >
                {IconTrash}
              </button>
            )}
            </Fragment>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onClick={(e) => e.stopPropagation()} onChange={handleFileChange} />
        </div>
      </article>

      {/* Touch devices: caption under the tile since there is no hover */}
      <div className="tile__caption">
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="display tile__title">{item.name}</span>
          {meta}
          {aiChips}
        </div>
        {onComments && (
          <button className={`tile__caption-md${commentCount > 0 ? " is-ready" : ""}`} onClick={onComments} aria-label={t.card.comments}>
            {IconComment}{commentCount > 0 && commentCount}
          </button>
        )}
        <button className={`tile__caption-md${designMdReady ? " is-ready" : ""}`} onClick={onDesignMd}>{designMdLoading ? <span className="spinner" /> : designMdReady ? <>MD<i className="tile__dot" /></> : "MD"}</button>
        <a className="tile__caption-md tile__caption-link" href={item.web} target="_blank" rel="noopener noreferrer" aria-label={t.card.openSite}>{IconExternal}</a>
        {onDelete && (confirmDelete || deleting ? (
          <Fragment key="confirm">
            <button className="tile__caption-md tile__caption-del is-confirm" onClick={handleDelete} disabled={deleting} aria-label={t.card.confirmDelete}>
              {deleting ? <span className="spinner" /> : t.common.delete}
            </button>
            {!deleting && <button className="tile__caption-md" onClick={cancelDelete} aria-label={t.common.cancel}>{IconX}</button>}
          </Fragment>
        ) : (
          <button key="trash" className="tile__caption-md tile__caption-del" onClick={handleDelete} aria-label={t.card.removeFromInspo}>{IconTrash}</button>
        ))}
      </div>
    </div>
  );
}
