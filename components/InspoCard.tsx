"use client";

import { proxiedSrc } from "@/lib/proxied-src";

import { useState, useEffect, useRef } from "react";
import { InspoItem, InspoTags } from "@/types/inspo";
import { ESTILOS, TAGS, TAG_THRESHOLD, labelOf } from "@/lib/taxonomy";

const BLOCKED = ["x.com", "twitter.com", "linkedin.com", "primevideo.com", "instagram.com", "youtube.com"];

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}
function isBlocked(url: string) {
  const d = getDomain(url);
  return BLOCKED.some((b) => d.includes(b));
}

type ImgSource = "idle" | "og" | "shot" | "error";

interface InspoCardProps {
  item: InspoItem;
  tags?: InspoTags;
  score?: number;
  reason?: string;
  manualThumbnail?: string;
  onUpload: (file: File) => Promise<void>;
  onRemoveThumbnail: () => Promise<void>;
  onPickFromLibrary: () => void;
  onDesignMd: () => void;
  designMdLoading?: boolean;
  designMdReady?: boolean;
  designCover?: string;   // portada 720x450 generada con el DESIGN.md
  designScroll?: string;  // tira larga que se desplaza al hover
}

const IconUpload = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10V2M7 2L4 5M7 2l3 3" /><path d="M2 12h10" />
  </svg>
);
const IconLibrary = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" /><rect x="8" y="1.5" width="4.5" height="4.5" rx="1" />
    <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" /><rect x="8" y="8" width="4.5" height="4.5" rx="1" />
  </svg>
);
const IconX = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 2l8 8M10 2l-8 8" />
  </svg>
);

export default function InspoCard({ item, tags, score, reason, manualThumbnail, onUpload, onRemoveThumbnail, onPickFromLibrary, onDesignMd, designMdLoading, designMdReady, designCover, designScroll }: InspoCardProps) {
  const [source, setSource] = useState<ImgSource>(() => isBlocked(item.web) ? "error" : "idle");
  const [imgSrc, setImgSrc] = useState<string | null>(null); // blob URL
  const [manualLoaded, setManualLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false); // móvil: el globo del % se abre al tocar
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [scrollDist, setScrollDist] = useState(0);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const manualImgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suppressClick = useRef(false);

  // Reset on thumbnail change, then check if the image was already cached
  useEffect(() => {
    setManualLoaded(false);
    const id = setTimeout(() => {
      const el = manualImgRef.current;
      if (el && el.complete && el.naturalWidth > 0) setManualLoaded(true);
    }, 0);
    return () => clearTimeout(id);
  }, [manualThumbnail]);

  // Start loading when the tile enters the viewport
  useEffect(() => {
    if (manualThumbnail || designCover || source !== "idle") return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setSource("og"); observer.disconnect(); } },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [source, manualThumbnail, designCover]);

  // Fetch as blob so failed sources don't spam the console
  useEffect(() => {
    if (source === "idle" || source === "error") return;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), source === "shot" ? 60000 : 15000);
    // og:image first (cheap); if the site has none, capture its hero server-side
    const apiUrl = source === "og"
      ? `/api/og?url=${encodeURIComponent(item.web)}`
      : `/api/shot?url=${encodeURIComponent(item.web)}`;

    fetch(apiUrl, { signal: ctrl.signal })
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.blob(); })
      .then((blob) => { clearTimeout(timeout); setImgSrc(URL.createObjectURL(blob)); })
      .catch(() => {
        clearTimeout(timeout);
        if (source === "og") { setSource("shot"); setImgSrc(null); }
        else setSource("error");
      });

    return () => { ctrl.abort(); clearTimeout(timeout); };
  }, [source, item.web]);

  useEffect(() => {
    return () => { if (imgSrc) URL.revokeObjectURL(imgSrc); };
  }, [imgSrc]);

  const domain = getDomain(item.web);
  const useDesign = !manualThumbnail && !!designCover;
  const isError = !manualThumbnail && !useDesign && source === "error";
  const isLoaded = manualThumbnail ? manualLoaded : useDesign ? coverLoaded : !!imgSrc;

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

  const triggerUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    suppressClick.current = true;
    fileInputRef.current?.click();
    setTimeout(() => { suppressClick.current = false; }, 500);
  };

  const meta = (
    <div className="tile__meta">
      <span>{item.tipo}</span>
      {item.puestoPor !== "Ambos" && (<><span className="tile__meta-sep">·</span><span>{item.puestoPor}</span></>)}
      {domain && (<><span className="tile__meta-sep">·</span><span>{domain}</span></>)}
    </div>
  );

  const activeTags = tags
    ? TAGS.filter((t) => (tags.tags[t.key] ?? 0) >= TAG_THRESHOLD)
        .sort((a, b) => tags.tags[b.key] - tags.tags[a.key]).slice(0, 3)
    : [];
  const aiChips = tags && (
    <div className="tile__tags">
      <span className="tile__tag tile__tag--style">{labelOf(ESTILOS, tags.estilo)}</span>
      {activeTags.map((t) => <span key={t.key} className="tile__tag">{t.label}</span>)}
    </div>
  );

  return (
    <div>
      <article
        className="tile"
        onClick={() => { if (suppressClick.current) return; window.open(item.web, "_blank", "noopener,noreferrer"); }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div ref={containerRef} className={`tile__media${!isLoaded && !isError ? " is-loading" : ""}`}>
          {!isLoaded && !isError && <div className="shimmer" />}

          {manualThumbnail && (
            <img
              ref={manualImgRef}
              className={`tile__img${manualLoaded ? "" : " is-hidden"}`}
              src={manualThumbnail.startsWith("https://")
                ? `/api/thumbnail/img?url=${encodeURIComponent(manualThumbnail)}`
                : manualThumbnail}
              alt={item.empresa}
              onLoad={() => setManualLoaded(true)}
            />
          )}

          {useDesign && (
            <>
              <img
                className={`tile__img${coverLoaded ? "" : " is-hidden"}`}
                src={proxiedSrc(designCover!)}
                alt={item.empresa}
                loading="lazy"
                onLoad={() => setCoverLoaded(true)}
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

          {!manualThumbnail && !useDesign && imgSrc && (
            <img
              className="tile__img"
              src={imgSrc}
              alt={item.empresa}
              onError={() => {
                // Blob fetched but not a renderable image (bad og:image): try next source
                setImgSrc(null);
                setSource(source === "og" ? "shot" : "error");
              }}
            />
          )}

          {isError && (
            <div className="tile__fallback">
              <span className="display">{item.empresa}</span>
              {domain && <span className="tile__fallback-domain">{domain}</span>}
            </div>
          )}

          <div className="tile__overlay">
            <div className="display tile__title">{item.empresa}</div>
            {meta}
            {item.comentarios && <p className="tile__comment">{item.comentarios}</p>}
            {aiChips}
          </div>

          {score !== undefined && (
            <div
              className={`tile__score${reason ? " has-why" : ""}${whyOpen && reason ? " is-open" : ""}`}
              onClick={(e) => { e.stopPropagation(); if (reason) setWhyOpen((v) => !v); }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseLeave={() => setWhyOpen(false)}
            >
              <span className="tile__score-pct" title={reason ? undefined : "Afinidad con la búsqueda"}>{Math.round(score * 100)}%</span>
              {reason && <span className="tile__score-why" role="tooltip">{reason}</span>}
            </div>
          )}

          <div
            className={`tile__actions${uploading || designMdLoading ? " is-visible" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {manualThumbnail && (
              <button className="tile__action tile__action--danger" title="Quitar thumbnail"
                onClick={async (e) => { e.stopPropagation(); await onRemoveThumbnail(); }}>
                {IconX}
              </button>
            )}
            <button
              className={`tile__action tile__action--md${designMdReady ? " is-ready" : ""}`}
              title={designMdLoading ? "Generando DESIGN.md…" : designMdReady ? "Ver DESIGN.md" : "Generar DESIGN.md con IA (30-90 s)"}
              onClick={(e) => { e.stopPropagation(); onDesignMd(); }}
            >
              {designMdLoading ? <span className="spinner" /> : designMdReady ? <>MD<i className="tile__dot" /></> : "MD"}
            </button>
            <button className="tile__action" title="Elegir de la librería"
              onClick={(e) => { e.stopPropagation(); onPickFromLibrary(); }}>
              {IconLibrary}
            </button>
            <button className="tile__action" title={manualThumbnail ? "Reemplazar thumbnail" : "Subir thumbnail"}
              onClick={triggerUpload}>
              {uploading ? <span className="spinner" /> : IconUpload}
            </button>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onClick={(e) => e.stopPropagation()} onChange={handleFileChange} />
        </div>
      </article>

      {/* Touch devices: caption under the tile since there is no hover */}
      <div className="tile__caption">
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="display tile__title">{item.empresa}</span>
          {meta}
          {aiChips}
        </div>
        <button className={`tile__caption-md${designMdReady ? " is-ready" : ""}`} onClick={onDesignMd}>{designMdLoading ? <span className="spinner" /> : designMdReady ? <>MD<i className="tile__dot" /></> : "MD"}</button>
      </div>
    </div>
  );
}
