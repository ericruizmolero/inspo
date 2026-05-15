"use client";

import { useEffect, useState, useRef } from "react";

interface ThumbPickerModalProps {
  // Returns error string on failure, null on success
  onSelect: (blobUrl: string) => Promise<string | null>;
  onCancel: () => void;
}

export default function ThumbPickerModal({ onSelect, onCancel }: ThumbPickerModalProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/thumbnail/list")
      .then((r) => r.json())
      .then((d) => { setUrls(d.urls ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !selecting) onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, selecting]);

  const handleClick = async (url: string) => {
    if (selecting) return;
    setSelecting(url);
    setError(null);
    const err = await onSelect(url);
    if (err) {
      // Keep modal open, show error
      setSelecting(null);
      setError(err);
    }
    // On success: InspoClient calls setPickerWebUrl(null) which unmounts us
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current && !selecting) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,25,35,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{
        background: "#F5F1EB", borderRadius: "6px",
        width: "min(780px, 100%)", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 16px 48px rgba(15,25,35,0.22)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", borderBottom: "1px solid #E2DDD6", flexShrink: 0,
          gap: "12px",
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1923" }}>
            ELIGE THUMBNAIL
          </span>
          {error && (
            <span style={{ fontSize: "11px", color: "#B04040", flex: 1 }}>⚠ {error}</span>
          )}
          {selecting && (
            <span style={{ fontSize: "11px", color: "#8A8580", flex: 1 }}>Guardando…</span>
          )}
          <span style={{ fontSize: "10px", color: "#A09890", flexShrink: 0 }}>{urls.length} imágenes</span>
          <button
            onClick={() => { if (!selecting) onCancel(); }}
            disabled={!!selecting}
            style={{ background: "none", border: "none", cursor: selecting ? "default" : "pointer", color: "#8A8580", fontSize: "18px", lineHeight: 1, padding: "2px 4px", opacity: selecting ? 0.4 : 1 }}
          >×</button>
        </div>

        {/* Grid */}
        <div style={{ overflowY: "auto", padding: "14px", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
              <span style={{ fontSize: "12px", color: "#8A8580" }}>Cargando…</span>
            </div>
          ) : urls.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
              <span style={{ fontSize: "12px", color: "#8A8580" }}>No hay imágenes subidas todavía</span>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "8px",
            }}>
              {urls.map((url) => {
                const isSelecting = selecting === url;
                const isActive = (hovered === url || isSelecting) && !selecting;
                return (
                  <button
                    key={url}
                    onClick={() => handleClick(url)}
                    onMouseEnter={() => { if (!selecting) setHovered(url); }}
                    onMouseLeave={() => setHovered(null)}
                    disabled={!!selecting}
                    style={{
                      padding: 0, border: "none",
                      cursor: selecting ? (isSelecting ? "wait" : "default") : "pointer",
                      borderRadius: "4px", overflow: "hidden",
                      outline: isActive ? "2px solid #0F1923" : "2px solid transparent",
                      outlineOffset: "2px",
                      transition: "outline-color 0.15s, transform 0.15s, opacity 0.15s",
                      transform: isActive ? "scale(1.03)" : "scale(1)",
                      opacity: (selecting && !isSelecting) ? 0.35 : 1,
                      background: "#E8E3DA",
                      aspectRatio: "4/3",
                      display: "block",
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/thumbnail/img?url=${encodeURIComponent(url)}`}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                    {isSelecting && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(15,25,35,0.5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 } as React.CSSProperties} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
