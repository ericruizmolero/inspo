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

export default function RecoverPage() {
  const [data, setData] = useState<RecoverData | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/thumbnail/recover")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        // Pre-fill with existing map entries
        const existing: Record<string, string> = {};
        // We have blob URLs as values, need to match to assignment keys
        setAssignments(existing);
      });
  }, []);

  const handleAssign = (blobUrl: string, webUrl: string) => {
    setAssignments((prev) => ({ ...prev, [blobUrl]: webUrl }));
  };

  const handleSave = async () => {
    const pin = pinRef.current?.value;
    if (!pin) { setError("Introduce el PIN"); return; }

    // Build map: webUrl → blobUrl (invert assignments, skip empties)
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

  // Deduplicate by keeping latest uploadedAt per filename stem
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
        <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", color: "#0F1923" }}>RECOVER THUMBNAILS</span>
        <a href="/" style={{ fontSize: "11px", color: "#8A8580", textDecoration: "none" }}>← Volver</a>
      </div>

      {/* Status */}
      <div style={{ padding: "20px 32px 0", display: "flex", gap: "24px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#8A8580" }}>
          {uniqueThumbs.length} imágenes · {assignedCount} asignadas
        </span>
        {saved && <span style={{ fontSize: "11px", color: "#4A8A4A", fontWeight: 600 }}>✓ Mapa guardado — recarga la app principal</span>}
      </div>

      {/* Info */}
      <div style={{ padding: "12px 32px 20px" }}>
        <p style={{ fontSize: "11px", color: "#8A8580", margin: 0, lineHeight: 1.6, maxWidth: "600px" }}>
          Cada imagen tiene un campo donde pegas la URL del website al que pertenece (ej: <code>https://dribbble.com/shots/...</code>).
          Asigna las que reconozcas, deja vacías las que no. Al guardar, los thumbnails aparecerán en sus cards.
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", padding: "0 32px 32px" }}>
        {uniqueThumbs.map((thumb) => (
          <div key={thumb.url} style={{ background: "#F5F1EB", borderRadius: "4px", overflow: "hidden", border: "1px solid #E2DDD6" }}>
            <div style={{ height: "140px", overflow: "hidden", background: "#E8E3DA", position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/thumbnail/img?url=${encodeURIComponent(thumb.url)}`}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                loading="lazy"
              />
            </div>
            <div style={{ padding: "8px" }}>
              <div style={{ fontSize: "9px", color: "#A09890", fontFamily: "monospace", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {thumb.pathname.split("/").pop()?.replace(/^\d+-/, "")}
              </div>
              <input
                type="url"
                placeholder="https://..."
                value={assignments[thumb.url] ?? ""}
                onChange={(e) => handleAssign(thumb.url, e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#EDE8DF", border: "1px solid #D8D0C6",
                  borderRadius: "3px", padding: "5px 7px",
                  fontSize: "10px", color: "#0F1923",
                  outline: "none", fontFamily: "monospace",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Save bar */}
      <div style={{
        position: "sticky", bottom: 0, background: "#EDE8DF",
        borderTop: "1px solid #D8D0C6", padding: "12px 32px",
        display: "flex", alignItems: "center", gap: "12px",
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
            padding: "7px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em",
            cursor: saving || assignedCount === 0 ? "not-allowed" : "pointer",
            opacity: assignedCount === 0 ? 0.4 : 1,
          }}
        >
          {saving ? "Guardando…" : `Guardar ${assignedCount} asignaciones`}
        </button>
        {error && <span style={{ fontSize: "11px", color: "#B04040" }}>{error}</span>}
      </div>
    </div>
  );
}
