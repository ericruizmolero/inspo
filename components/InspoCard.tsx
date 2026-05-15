"use client";

import { useState, useEffect, useRef } from "react";
import { InspoItem } from "@/types/inspo";

const BLOCKED = ["x.com", "twitter.com", "linkedin.com", "primevideo.com", "instagram.com", "youtube.com"];

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}
function isBlocked(url: string) {
  const d = getDomain(url);
  return BLOCKED.some((b) => d.includes(b));
}
function bgFromName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 12%, 83%)`;
}

type ImgSource = "idle" | "og" | "microlink" | "error";

interface InspoCardProps {
  item: InspoItem;
  manualThumbnail?: string;
  onUpload: (file: File) => Promise<void>;
  onRemoveThumbnail: () => Promise<void>;
}

export default function InspoCard({ item, manualThumbnail, onUpload, onRemoveThumbnail }: InspoCardProps) {
  const [hovered, setHovered] = useState(false);
  const [source, setSource] = useState<ImgSource>(() => isBlocked(item.web) ? "error" : "idle");
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (manualThumbnail) return; // si hay thumbnail manual, no lazy-load el auto
    if (source !== "idle") return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setSource("og"); observer.disconnect(); } },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [source, manualThumbnail]);

  useEffect(() => {
    if (loaded || source === "error" || source === "idle") return;
    const t = setTimeout(() => setSource("error"), 15000);
    return () => clearTimeout(t);
  }, [loaded, source]);

  const ogSrc = `/api/og?url=${encodeURIComponent(item.web)}`;
  const microlinkSrc = `https://api.microlink.io?url=${encodeURIComponent(item.web)}&screenshot=true&embed=screenshot.url`;
  const currentSrc = source === "og" ? ogSrc : microlinkSrc;
  const domain = getDomain(item.web);
  const isError = !manualThumbnail && source === "error";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    suppressClick.current = true;
    fileInputRef.current?.click();
    // Resetea la guardia tras el ciclo de eventos
    setTimeout(() => { suppressClick.current = false; }, 500);
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onRemoveThumbnail();
  };

  return (
    <article
      onClick={() => { if (suppressClick.current) return; window.open(item.web, "_blank", "noopener,noreferrer"); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#F5F1EB",
        cursor: "pointer",
        overflow: "hidden",
        display: "block",
        position: "relative",
      }}
    >
      {/* Thumbnail */}
      <div
        ref={containerRef}
        style={{
          height: "200px",
          position: "relative",
          overflow: "hidden",
          background: "#E8E3DA",
        }}
      >
        {/* Thumbnail manual — prioridad máxima */}
        {manualThumbnail && (
          <img
            src={manualThumbnail.startsWith("https://")
              ? `/api/thumbnail/img?url=${encodeURIComponent(manualThumbnail)}`
              : manualThumbnail
            }
            alt={item.empresa}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.5s ease",
              transform: hovered ? "scale(1.04)" : "scale(1)",
              transformOrigin: "center",
            }}
          />
        )}

        {/* Thumbnail automático */}
        {!manualThumbnail && source !== "error" && source !== "idle" && (
          <img
            key={source}
            src={currentSrc}
            alt={item.empresa}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => {
              if (source === "og") { setSource("microlink"); setLoaded(false); }
              else setSource("error");
            }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.4s ease, transform 0.5s ease",
              transform: hovered ? "scale(1.04)" : "scale(1)",
              transformOrigin: "center",
            }}
          />
        )}

        {/* Shimmer — desde idle hasta que carga */}
        {!manualThumbnail && !loaded && source !== "error" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, #E8E3DA 25%, #DED9D0 50%, #E8E3DA 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.6s infinite",
            }}
          />
        )}

        {/* Fallback con color */}
        {isError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: bgFromName(item.empresa),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "16px",
            }}
          >
            <span style={{ fontSize: "15px", fontWeight: 500, color: "rgba(15,25,35,0.5)", letterSpacing: "-0.02em", textAlign: "center", lineHeight: 1.25 }}>
              {item.empresa}
            </span>
            {domain && (
              <span style={{ fontSize: "9px", color: "rgba(15,25,35,0.28)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
                {domain}
              </span>
            )}
          </div>
        )}

        {/* Hover veil */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15,25,35,0.05)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.25s",
            pointerEvents: "none",
          }}
        />

        {/* Botón subir thumbnail — aparece en hover */}
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            display: "flex",
            gap: "4px",
            opacity: hovered || uploading ? 1 : 0,
            transition: "opacity 0.2s",
            pointerEvents: hovered || uploading ? "auto" : "none",
          }}
        >
          {/* Quitar thumbnail manual */}
          {manualThumbnail && (
            <button
              onClick={handleRemove}
              title="Quitar thumbnail manual"
              style={{
                background: "rgba(15,25,35,0.6)",
                border: "none",
                borderRadius: "3px",
                color: "#EDE8DF",
                fontSize: "11px",
                padding: "4px 7px",
                cursor: "pointer",
                backdropFilter: "blur(4px)",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}

          {/* Subir / reemplazar */}
          <button
            onClick={triggerUpload}
            title={manualThumbnail ? "Reemplazar thumbnail" : "Subir thumbnail"}
            style={{
              background: uploading ? "rgba(15,25,35,0.4)" : "rgba(15,25,35,0.6)",
              border: "none",
              borderRadius: "3px",
              color: "#EDE8DF",
              fontSize: "10px",
              padding: "4px 8px",
              cursor: uploading ? "wait" : "pointer",
              backdropFilter: "blur(4px)",
              letterSpacing: "0.03em",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {uploading ? (
              <span className="spinner" />
            ) : (
              <>
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M4.5 6.5V1M4.5 1L2 3.5M4.5 1L7 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 7.5h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {manualThumbnail ? "reemplazar" : "subir thumb"}
              </>
            )}
          </button>
        </div>

      </div>

      {/* Input file oculto — fuera del article flow para no propagar clicks */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onClick={(e) => e.stopPropagation()}
        onChange={handleFileChange}
      />

      {/* Meta */}
      <div style={{ padding: "12px 14px 14px", borderTop: "1px solid #E2DDD6" }}>

        {/* Nombre + badges */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "#0F1923",
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.empresa}
          </span>

          <div style={{ display: "flex", gap: "5px", flexShrink: 0, alignItems: "center" }}>
            <span style={{ fontSize: "9px", color: "#0F1923", opacity: 0.3, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
              {item.tipo}
            </span>
            {item.puestoPor !== "Ambos" && (
              <>
                <span style={{ color: "#D8D0C6", fontSize: "9px" }}>·</span>
                <span style={{ fontSize: "9px", color: "#A09890", letterSpacing: "0.04em" }}>{item.puestoPor}</span>
              </>
            )}
            {item.fecha && (
              <>
                <span style={{ color: "#D8D0C6", fontSize: "9px" }}>·</span>
                <span style={{ fontSize: "9px", color: "rgba(15,25,35,0.22)", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
                  {item.fecha}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Comentarios */}
        {item.comentarios && (
          <p
            style={{
              fontSize: "11px",
              color: "#7A7570",
              lineHeight: 1.5,
              margin: 0,
              marginBottom: item.subcomentarios ? "6px" : "0",
            }}
          >
            {item.comentarios}
          </p>
        )}

        {/* Subcomentarios — completo, sin clamp */}
        {item.subcomentarios && (
          <p
            style={{
              fontSize: "10px",
              color: "#A09890",
              lineHeight: 1.55,
              margin: 0,
              paddingLeft: "8px",
              borderLeft: "1px solid #D8D0C6",
              fontStyle: "italic",
            }}
          >
            {item.subcomentarios}
          </p>
        )}

        {/* Link */}
        {domain && (
          <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
            <span
              style={{
                fontSize: "9px",
                color: hovered ? "#0F1923" : "#C8C0B8",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.04em",
                transition: "color 0.2s",
              }}
            >
              {domain} ↗
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
