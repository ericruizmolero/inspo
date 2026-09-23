"use client";

import { useState, useRef } from "react";
import { InspoItem } from "@/types/inspo";
import { normalizeWebUrl, typeFromUrl } from "@/lib/url";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface NewInspoInput {
  web: string;
  type: InspoItem["type"];
  note: string;
}

interface AddInspoModalProps {
  onClose: () => void;
  /** Called with the URL already normalized; whoever opens the modal handles saving and the card. */
  onSubmit: (input: NewInspoInput) => void;
  /** Is that URL already saved? Saves a trip to the server to hear the same thing. */
  isDuplicate?: (web: string) => boolean;
}

const TYPES = ["inspiration", "videos", "ideas", "documentaries"] as const;

/** Only the URL is needed: name, screenshot, tags and collection are inferred. */
export default function AddInspoModal({ onClose, onSubmit, isDuplicate }: AddInspoModalProps) {
  const { t } = useT();
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<InspoItem["type"] | null>(null); // null = whatever the URL suggests
  const [error, setError] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);

  const web = normalizeWebUrl(raw);
  const suggested = web ? typeFromUrl(web) : "inspiration";
  const finalType = type ?? suggested;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!web) { setError(t.add.notUrl); return; }
    if (isDuplicate?.(web)) { setError(t.add.alreadyInLibrary); return; }
    onSubmit({ web, type: finalType, note: note.trim() });
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
              
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.add.whatYouLiked}
            />
          </div>

          <div className="pills" role="radiogroup" aria-label={t.add.collection}>
            {TYPES.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={finalType === v}
                className={`pill${finalType === v ? " is-on" : ""}`}
                onClick={() => setType(v)}
              >
                {t.labels.type[v]}
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
