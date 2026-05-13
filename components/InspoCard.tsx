"use client";

import { useState, useEffect, useRef } from "react";
import { InspoItem } from "@/types/inspo";

// Dominios que sabemos que bloquean proxy/screenshots — van directo a fallback
const BLOCKED = ["x.com", "twitter.com", "linkedin.com", "primevideo.com", "instagram.com", "youtube.com"];

function getDomain(url: string) {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function isBlocked(url: string) {
  const d = getDomain(url);
  return BLOCKED.some((b) => d.includes(b));
}

// Color de fondo determinista a partir del nombre (muted, warm)
function bgFromName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 14%, 84%)`;
}

type ImgSource = "idle" | "og" | "microlink" | "error";

interface InspoCardProps {
  item: InspoItem;
  onClick: () => void;
}

export default function InspoCard({ item, onClick }: InspoCardProps) {
  const [hovered, setHovered] = useState(false);
  const [source, setSource] = useState<ImgSource>(() => isBlocked(item.web) ? "error" : "idle");
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Solo empezamos a cargar cuando la card entra en el viewport
  useEffect(() => {
    if (source !== "idle") return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSource("og");
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [source]);

  const ogSrc = `/api/og?url=${encodeURIComponent(item.web)}`;
  const microlinkSrc = `https://api.microlink.io?url=${encodeURIComponent(item.web)}&screenshot=true&embed=screenshot.url`;
  const currentSrc = source === "og" ? ogSrc : microlinkSrc;

  // Timeout de seguridad: arranca desde que la card entra en viewport (source="og"), no desde el mount
  useEffect(() => {
    if (loaded || source === "error" || source === "idle") return;
    const t = setTimeout(() => setSource("error"), 15000);
    return () => clearTimeout(t);
  }, [loaded, source]);

  const domain = getDomain(item.web);

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#F5F1EB",
        border: "1px solid #D8D0C6",
        borderRadius: "2px",
        cursor: "pointer",
        overflow: "hidden",
        transition: "border-color 0.2s",
        borderColor: hovered ? "#A09890" : "#D8D0C6",
      }}
    >
      {/* Thumbnail */}
      <div ref={containerRef} style={{ height: "220px", position: "relative", overflow: "hidden", background: "#EDE8DF" }}>

        {/* Imagen OG o screenshot */}
        {source !== "error" && source !== "idle" && (
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
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              opacity: loaded ? 1 : 0,
              transition: "opacity 0.35s, transform 0.4s",
              transform: hovered ? "scale(1.03)" : "scale(1)",
              transformOrigin: "center",
            }}
          />
        )}

        {/* Shimmer mientras carga */}
        {!loaded && source !== "error" && source !== "idle" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, #EDE8DF 25%, #E5E0D8 50%, #EDE8DF 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Fallback: fondo con color único + nombre */}
        {source === "error" && (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: bgFromName(item.empresa),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "15px",
                fontWeight: 500,
                color: "rgba(15,25,35,0.45)",
                letterSpacing: "-0.02em",
                textAlign: "center",
                padding: "0 16px",
                lineHeight: 1.3,
              }}
            >
              {item.empresa}
            </span>
            {domain && (
              <span
                style={{
                  fontSize: "10px",
                  color: "rgba(15,25,35,0.25)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                }}
              >
                {domain}
              </span>
            )}
          </div>
        )}

        {/* Hover overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(237,232,223,0.12)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.3s",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Meta */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "#0F1923",
              letterSpacing: "-0.01em",
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
          <div style={{ display: "flex", gap: "6px", flexShrink: 0, alignItems: "center" }}>
            <span
              style={{
                fontSize: "10px",
                color: "#0F1923",
                opacity: 0.35,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              {item.tipo}
            </span>
            {item.puestoPor !== "Ambos" && (
              <>
                <span style={{ color: "#C8C0B8", fontSize: "10px" }}>·</span>
                <span style={{ fontSize: "10px", color: "#8A8580", letterSpacing: "0.04em" }}>
                  {item.puestoPor}
                </span>
              </>
            )}
          </div>
        </div>

        {item.comentarios && (
          <p
            style={{
              fontSize: "11px",
              color: "#8A8580",
              lineHeight: 1.5,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.comentarios}
          </p>
        )}
      </div>
    </article>
  );
}
