"use client";

import { useState, useEffect, useRef } from "react";
import { InspoItem } from "@/types/inspo";
import { Icons } from "./Sidebar";

interface AddInspoModalProps {
  onClose: () => void;
  onAdd: (item: InspoItem) => void;
}

const TIPOS = ["Inspiración", "Videos", "Ideas", "Documentales"] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      {children}
    </div>
  );
}

export default function AddInspoModal({ onClose, onAdd }: AddInspoModalProps) {
  const [empresa, setEmpresa] = useState("");
  const [web, setWeb] = useState("");
  const [tipo, setTipo] = useState<InspoItem["tipo"]>("Inspiración");
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
        body: JSON.stringify({
          empresa: empresa.trim(), web: web.trim(), tipo,
          comentarios: comentarios.trim(), subcomentarios: subcomentarios.trim(),
        }),
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="display modal__title">Nueva inspo</span>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar">{Icons.x}</button>
        </div>

        <form onSubmit={handleSubmit} className="modal__body">
          <div className="grid-2">
            <Field label="Empresa / Proyecto">
              <input ref={firstRef} className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Nombre" required />
            </Field>
            <Field label="URL">
              <input className="input" value={web} onChange={(e) => setWeb(e.target.value)} placeholder="https://" required />
            </Field>
          </div>

          <Field label="Colección">
            <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as InspoItem["tipo"])}>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Comentarios">
            <textarea className="input" value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="¿Qué te ha gustado?" rows={2} />
          </Field>

          <Field label="Subcomentarios (opcional)">
            <textarea className="input" value={subcomentarios} onChange={(e) => setSubcomentarios(e.target.value)} placeholder="Detalle adicional" rows={2} />
          </Field>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={loading || !empresa.trim() || !web.trim()}>
              {loading && <span className="spinner" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} />}
              {loading ? "Añadiendo" : "Añadir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
