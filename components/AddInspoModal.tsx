"use client";

import { useState, useRef } from "react";
import { InspoItem } from "@/types/inspo";
import { normalizeWebUrl, tipoFromUrl } from "@/lib/url";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  const { t } = useT();
  const [raw, setRaw] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [tipo, setTipo] = useState<InspoItem["tipo"] | null>(null); // null = la que sugiera la URL
  const [error, setError] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);

  const web = normalizeWebUrl(raw);
  const suggested = web ? tipoFromUrl(web) : "Inspiración";
  const tipoFinal = tipo ?? suggested;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!web) { setError(t.add.notUrl); return; }
    if (isDuplicate?.(web)) { setError(t.add.alreadyInLibrary); return; }
    onSubmit({ web, tipo: tipoFinal, comentarios: comentarios.trim() });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent initialFocus={urlRef}>
        <div className="modal__header">
          <DialogTitle>{t.add.title}</DialogTitle>
          <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
        </div>

        <form onSubmit={handleSubmit} className="modal__body">
          <div className="field">
            <Input size="lg"
              ref={urlRef}
              
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setError(""); }}
              placeholder={t.start.pasteUrl}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <p className="modal__hint">{t.add.urlHint}</p>
          </div>

          <div className="field">
            <Input
              
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder={t.add.whatYouLiked}
            />
          </div>

          <div className="pills" role="radiogroup" aria-label={t.add.collection}>
            {TIPOS.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={tipoFinal === v}
                className={`pill${tipoFinal === v ? " is-on" : ""}`}
                onClick={() => setTipo(v)}
              >
                {t.labels.tipo[v]}
              </button>
            ))}
          </div>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__footer">
            <Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button>
            <Button variant="primary" type="submit" disabled={!raw.trim()}>{t.common.save}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
