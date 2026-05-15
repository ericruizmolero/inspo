"use client";

import { useState, useEffect, useRef } from "react";
import { InspoItem } from "@/types/inspo";

interface AddInspoModalProps {
  onClose: () => void;
  onAdd: (item: InspoItem) => void;
  defaultAutor: "Eric" | "Andoni";
}

const TIPOS = ["Inspiración", "Videos", "Ideas", "Documentales"] as const;
const AUTORES = ["Eric", "Andoni", "Ambos"] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "10px", color: "#A09890", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#EDE8DF",
  border: "1px solid #D8D0C6",
  borderRadius: "3px",
  fontSize: "12px",
  color: "#0F1923",
  padding: "8px 10px",
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

export default function AddInspoModal({ onClose, onAdd, defaultAutor }: AddInspoModalProps) {
  const [empresa, setEmpresa] = useState("");
  const [web, setWeb] = useState("");
  const [tipo, setTipo] = useState<InspoItem["tipo"]>("Inspiración");
  const [puestoPor, setPuestoPor] = useState<InspoItem["puestoPor"]>(defaultAutor);
  const [comentarios, setComentarios] = useState("");
  const [subcomentarios, setSubcomentarios] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresa.trim() || !web.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/inspo/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa: empresa.trim(), web: web.trim(), tipo, puestoPor, comentarios: comentarios.trim(), subcomentarios: subcomentarios.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error desconocido"); return; }
      onAdd(data.item);
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(15,25,35,0.25)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#F5F1EB",
          borderRadius: "6px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 8px 40px rgba(15,25,35,0.15)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2DDD6" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F1923", letterSpacing: "-0.01em" }}>
            Nueva inspo
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A09890", fontSize: "18px", lineHeight: 1, padding: "2px" }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Empresa / Proyecto">
              <input
                ref={firstRef}
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Nombre"
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#A09890")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#D8D0C6")}
              />
            </Field>
            <Field label="URL">
              <input
                value={web}
                onChange={(e) => setWeb(e.target.value)}
                placeholder="https://..."
                required
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#A09890")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#D8D0C6")}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Tipo">
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as InspoItem["tipo"])}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Puesto por">
              <select
                value={puestoPor}
                onChange={(e) => setPuestoPor(e.target.value as InspoItem["puestoPor"])}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {AUTORES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Comentarios">
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="¿Qué te ha gustado?"
              rows={2}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#A09890")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D8D0C6")}
            />
          </Field>

          <Field label="Subcomentarios (opcional)">
            <textarea
              value={subcomentarios}
              onChange={(e) => setSubcomentarios(e.target.value)}
              placeholder="Detalle adicional..."
              rows={2}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#A09890")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D8D0C6")}
            />
          </Field>

          {error && (
            <p style={{ fontSize: "11px", color: "#C0392B", margin: 0 }}>{error}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "4px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ background: "none", border: "1px solid #D8D0C6", borderRadius: "3px", padding: "8px 16px", fontSize: "12px", color: "#8A8580", cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !empresa.trim() || !web.trim()}
              style={{
                background: loading ? "#A09890" : "#0F1923",
                border: "none", borderRadius: "3px",
                padding: "8px 20px", fontSize: "12px",
                color: "#EDE8DF", cursor: loading ? "wait" : "pointer",
                fontFamily: "inherit", fontWeight: 500,
                display: "flex", alignItems: "center", gap: "8px",
                transition: "background 0.15s",
              }}
            >
              {loading && <span className="spinner" style={{ borderColor: "rgba(237,232,223,0.3)", borderTopColor: "#EDE8DF" }} />}
              {loading ? "Añadiendo…" : "Añadir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
