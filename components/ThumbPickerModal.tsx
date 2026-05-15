"use client";

import { useEffect, useState, useRef } from "react";

interface ThumbPickerModalProps {
  onSelect: (blobUrl: string) => Promise<void>;
  onCancel: () => void;
}

export default function ThumbPickerModal({ onSelect, onCancel }: ThumbPickerModalProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/thumbnail/list")
      .then((r) => r.json())
      .then((d) => { setUrls(d.urls ?? []); setLoading(false); });
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onCancel(); }}
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
        }}>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#0F1923" }}>
            ELIGE THUMBNAIL
          </span>
          <span style={{ fontSize: "10px", color: "#A09890" }}>{urls.length} imágenes</span>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8A8580", fontSize: "18px", lineHeight: 1, padding: "2px 4px" }}
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
                const isActive = hovered === url || isSelecting;
                return (
                  <button
                    key={url}
                    onClick={async () => {
                      if (selecting) return;
                      setSelecting(url);
                      await onSelect(url);
                      setSelecting(null);
                    }}
                    onMouseEnter={() => setHovered(url)}
                    onMouseLeave={() => setHovered(null)}
                    disabled={!!selecting}
                    style={{
                      padding: 0, border: "none",
                      cursor: selecting ? (isSelecting ? "wait" : "default") : "pointer",
                      borderRadius: "4px", overflow: "hidden",
                      outline: isActive ? "2px solid #0F1923" : "2px solid transparent",
                      outlineOffset: "2px",
                      transition: "outline-color 0.15s, transform 0.15s, opacity 0.15s",
                      transform: isActive && !selecting ? "scale(1.03)" : "scale(1)",
                      opacity: selecting && !isSelecting ? 0.4 : 1,
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
                        background: "rgba(15,25,35,0.45)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
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
