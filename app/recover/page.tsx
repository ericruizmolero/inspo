"use client";

import { useEffect, useState, useRef } from "react";

interface ThumbBlob {
  url: string;
  pathname: string;
  uploadedAt: string;
}

interface RecoverData {
  mapBlobs: { url: string; ok: boolean; keys?: string[] }[];
  thumbUrls: ThumbBlob[];
}

interface InspoItem {
  empresa: string;
  web: string;
}

// ─── Autocomplete input ────────────────────────────────────────────────────────
function ProjectPicker({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (url: string) => void;
  items: InspoItem[];
}) {
  const [query, setQuery] = useState(value ? (items.find((i) => i.web === value)?.empresa ?? value) : "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? items.filter(
        (i) =>
          i.empresa.toLowerCase().includes(query.toLowerCase()) ||
          i.web.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (item: InspoItem) => {
    setQuery(item.empresa);
    onChange(item.web);
    setOpen(false);
  };

  const clear = () => {
    setQuery("");
    onChange("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <input
          type="text"
          placeholder="Buscar proyecto…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(""); }}
          onFocus={() => setOpen(true)}
          style={{
            flex: 1, boxSizing: "border-box",
            background: value ? "#E8F0E8" : "#EDE8DF",
            border: `1px solid ${value ? "#A0C8A0" : "#D8D0C6"}`,
            borderRadius: "3px", padding: "5px 7px",
            fontSize: "10px", color: "#0F1923",
            outline: "none", fontFamily: "system-ui",
            minWidth: 0,
          }}
        />
        {(query || value) && (
          <button
            onClick={clear}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A09890", fontSize: "13px", lineHeight: 1, padding: "2px 4px", flexShrink: 0 }}
          >×</button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0,
          background: "#F5F1EB", border: "1px solid #D8D0C6", borderRadius: "4px",
          zIndex: 100, maxHeight: "180px", overflowY: "auto",
          boxShadow: "0 4px 12px rgba(15,25,35,0.12)",
        }}>
          {filtered.slice(0, 30).map((item) => (
            <button
              key={item.web}
              onMouseDown={() => select(item)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "none", border: "none", padding: "7px 10px",
                cursor: "pointer", borderBottom: "1px solid #E8E3DA",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#EDE8DF")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#0F1923", lineHeight: 1.2 }}>{item.empresa}</div>
              <div style={{ fontSize: "9px", color: "#A09890", fontFamily: "monospace", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.web}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function RecoverPage() {
  const [data, setData] = useState<RecoverData | null>(null);
  const [items, setItems] = useState<InspoItem[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load blobs + inspo items in parallel
    Promise.all([
      fetch("/api/thumbnail/recover").then((r) => r.json()),
      fetch("/api/inspo").then((r) => r.json()).catch(() => []),
    ]).then(([recoverData, inspoData]) => {
      setData(recoverData);
      setItems(Array.isArray(inspoData) ? inspoData : []);
    });
  }, []);

  const handleAssign = (blobUrl: string, webUrl: string) => {
    setAssignments((prev) => ({ ...prev, [blobUrl]: webUrl }));
  };

  const handleSave = async () => {
    const pin = pinRef.current?.value;
    if (!pin) { setError("Introduce el PIN"); return; }

    // Build map: webUrl → blobUrl
    const map: Record<string, string> = {};
    for (const [blobUrl, webUrl] of Object.entries(assignments)) {
      if (webUrl.trim()) map[webUrl.trim()] = blobUrl;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/thumbnail/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-upload-pin": pin },
        body: JSON.stringify({ map }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Error"); return; }
      setSaved(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const assignedCount = Object.values(assignments).filter(Boolean).length;

  if (!data) return (
    <div style={{ background: "#EDE8DF", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
      <span style={{ color: "#8A8580", fontSize: "13px" }}>Cargando…</span>
    </div>
  );

  // Deduplicate: keep latest per filename stem
  const seen = new Set<string>();
  const uniqueThumbs = data.thumbUrls
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .filter((t) => {
      const stem = t.pathname.split("/").pop()?.replace(/^\d+-/, "") ?? t.url;
      if (seen.has(stem)) return false;
      seen.add(stem);
      return true;
    });

  return (
    <div style={{ background: "#EDE8DF", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #D8D0C6", padding: "0 32px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: "#0F1923" }}>RECOVER THUMBNAILS</span>
          <span style={{ fontSize: "11px", color: "#8A8580" }}>
            {uniqueThumbs.length} imágenes · <span style={{ color: assignedCount > 0 ? "#4A8A4A" : "#8A8580", fontWeight: assignedCount > 0 ? 600 : 400 }}>{assignedCount} asignadas</span>
          </span>
          {saved && <span style={{ fontSize: "11px", color: "#4A8A4A", fontWeight: 600 }}>✓ Guardado — recarga la app</span>}
        </div>
        <a href="/" style={{ fontSize: "11px", color: "#8A8580", textDecoration: "none" }}>← Volver</a>
      </div>

      {/* Info */}
      <div style={{ padding: "14px 32px", borderBottom: "1px solid #E4DFD8" }}>
        <p style={{ fontSize: "11px", color: "#8A8580", margin: 0, lineHeight: 1.6 }}>
          Busca el proyecto en cada campo y selecciónalo. Las que no reconozcas déjalas vacías.
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", padding: "16px 32px 100px" }}>
        {uniqueThumbs.map((thumb) => {
          const filename = thumb.pathname.split("/").pop()?.replace(/^\d+-/, "") ?? "";
          const assigned = !!assignments[thumb.url];
          return (
            <div key={thumb.url} style={{
              background: "#F5F1EB", borderRadius: "4px", overflow: "hidden",
              border: `1px solid ${assigned ? "#A0C8A0" : "#E2DDD6"}`,
              transition: "border-color 0.2s",
            }}>
              <div style={{ height: "140px", overflow: "hidden", background: "#E8E3DA" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/thumbnail/img?url=${encodeURIComponent(thumb.url)}`}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  loading="lazy"
                />
              </div>
              <div style={{ padding: "8px 8px 10px" }}>
                <div style={{ fontSize: "9px", color: "#B0A8A0", fontFamily: "monospace", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={filename}>
                  {filename}
                </div>
                <ProjectPicker
                  value={assignments[thumb.url] ?? ""}
                  onChange={(url) => handleAssign(thumb.url, url)}
                  items={items}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#EDE8DF", borderTop: "1px solid #D8D0C6",
        padding: "12px 32px", display: "flex", alignItems: "center", gap: "12px",
      }}>
        <input
          ref={pinRef}
          type="password"
          placeholder="PIN"
          style={{
            background: "#F5F1EB", border: "1px solid #D8D0C6", borderRadius: "3px",
            padding: "7px 10px", fontSize: "12px", color: "#0F1923", outline: "none", width: "80px",
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving || assignedCount === 0}
          style={{
            background: "#0F1923", color: "#EDE8DF", border: "none", borderRadius: "3px",
            padding: "7px 18px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
            cursor: saving || assignedCount === 0 ? "not-allowed" : "pointer",
            opacity: assignedCount === 0 ? 0.4 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {saving ? "Guardando…" : assignedCount === 0 ? "Asigna al menos una" : `Guardar ${assignedCount} thumbnail${assignedCount !== 1 ? "s" : ""}`}
        </button>
        {error && <span style={{ fontSize: "11px", color: "#B04040" }}>{error}</span>}
      </div>
    </div>
  );
}
