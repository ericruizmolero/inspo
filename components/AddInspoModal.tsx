"use client";

import { useState, useEffect, useRef } from "react";
import { InspoItem } from "@/types/inspo";
import { normalizeWebUrl, tipoFromUrl } from "@/lib/url";
import { Icons } from "./Sidebar";

export interface NewInspoInput {
  web: string;
  tipo: InspoItem["tipo"];
  comentarios: string;
}

interface AddInspoModalProps {
  onClose: () => void;
  /** Se llama con la URL ya normalizada; el alta y la tarjeta las gestiona quien abre el modal. */
  onSubmit: (input: NewInspoInput) => void;
  /** ¿Esa URL ya está guardada? Evita ir al servidor para decir lo mismo. */
  isDuplicate?: (web: string) => boolean;
}

const TIPOS = ["Inspiración", "Videos", "Ideas", "Documentales"] as const;

/** Solo hace falta la URL: nombre, captura, etiquetas y colección se deducen. */
export default function AddInspoModal({ onClose, onSubmit, isDuplicate }: AddInspoModalProps) {
  const [raw, setRaw] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [tipo, setTipo] = useState<InspoItem["tipo"] | null>(null); // null = la que sugiera la URL
  const [error, setError] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const web = normalizeWebUrl(raw);
  const suggested = web ? tipoFromUrl(web) : "Inspiración";
  const tipoFinal = tipo ?? suggested;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!web) { setError("Eso no parece una URL"); return; }
    if (isDuplicate?.(web)) { setError("Esa URL ya está en tu librería"); return; }
    onSubmit({ web, tipo: tipoFinal, comentarios: comentarios.trim() });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="display modal__title">Nueva inspo</span>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar">{Icons.x}</button>
        </div>

        <form onSubmit={handleSubmit} className="modal__body">
          <div className="field">
            <input
              ref={urlRef}
              className="input input--lg"
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setError(""); }}
              placeholder="Pega una URL"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <p className="modal__hint">El nombre, la captura y las etiquetas se sacan solos.</p>
          </div>

          <div className="field">
            <input
              className="input"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="¿Qué te ha gustado? (opcional)"
            />
          </div>

          <div className="pills" role="radiogroup" aria-label="Colección">
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipoFinal === t}
                className={`pill${tipoFinal === t ? " is-on" : ""}`}
                onClick={() => setTipo(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={!raw.trim()}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
