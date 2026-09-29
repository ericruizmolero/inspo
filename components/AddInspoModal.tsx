"use client";

import { useState, useRef, useEffect } from "react";
import { InspoItem } from "@/types/inspo";
import { normalizeWebUrl, typeFromUrl } from "@/lib/url";
import { MEDIA_ACCEPT, isMediaFile, mediaFileFrom } from "@/lib/media-client";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export interface NewInspoInput {
  /** The link (a site or a video); empty when it is an image */
  web: string;
  /** An image or GIF to upload instead of a link */
  file?: File;
  type: InspoItem["type"];
  note: string;
}

interface AddInspoModalProps {
  onClose: () => void;
  /** Called with the URL already normalized, or with the image; whoever opens the modal handles saving and the card. */
  onSubmit: (input: NewInspoInput) => void;
  /** Is that URL already saved? Saves a trip to the server to hear the same thing. */
  isDuplicate?: (web: string) => boolean;
  /** Name of the project it will be filed in, when opened from inside one */
  project?: string;
}

const TYPES = ["inspiration", "videos", "ideas", "documentaries"] as const;

const IconImage = (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1.75" y="2.25" width="10.5" height="9.5" rx="1.5" /><circle cx="5" cy="5.5" r="1" /><path d="M12 9.5L9 6.5l-4 4-1.5-1.5L1.75 11" /></svg>
);

/** Only the link (or the image) is needed: name, screenshot, tags and collection are inferred.
 *  An image can be chosen, dropped anywhere on the dialog or pasted with ⌘V. */
export default function AddInspoModal({ onClose, onSubmit, isDuplicate, project }: AddInspoModalProps) {
  const { t } = useT();
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<InspoItem["type"] | null>(null); // null = whatever the URL suggests
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const web = normalizeWebUrl(raw);
  const suggested = !file && web ? typeFromUrl(web) : "inspiration";
  const finalType = type ?? suggested;

  const pick = (f: File | null) => {
    if (!f) return;
    if (!isMediaFile(f)) { setError(t.errors.imagesOnly); return; }
    setFile(f); setRaw(""); setError("");
  };
  const clearFile = () => { setFile(null); if (fileRef.current) fileRef.current.value = ""; setTimeout(() => urlRef.current?.focus(), 0); };
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ⌘V with an image on the clipboard: it becomes the inspo (a pasted link still goes to the field)
  const onPaste = (e: React.ClipboardEvent) => {
    const f = mediaFileFrom(e.clipboardData);
    if (f) { e.preventDefault(); pick(f); }
  };
  const onDragOver = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault(); setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault(); setDragging(false);
    pick(mediaFileFrom(e.dataTransfer) ?? e.dataTransfer.files[0] ?? null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) { onSubmit({ web: "", file, type: finalType, note: note.trim() }); onClose(); return; }
    if (!web) { setError(t.add.notUrl); return; }
    if (isDuplicate?.(web)) { setError(t.add.alreadyInLibrary); return; }
    onSubmit({ web, type: finalType, note: note.trim() });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent initialFocus={urlRef}>
        <div className="modal__header">
          <DialogTitle>{project ? t.add.titleIn(project) : t.add.title}</DialogTitle>
          <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
        </div>

        <form onSubmit={handleSubmit} className={`modal__body add${dragging ? " is-dragging" : ""}`}
          onPaste={onPaste} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
          {dragging && <div className="add__drop" aria-hidden><span className="display">{t.add.dropHere}</span></div>}
          {file && preview ? (
            <div className="field">
              <div className="add__preview">
                <img src={preview} alt="" />
                <button type="button" className="add__remove" onClick={clearFile} aria-label={t.add.removeImage} data-tip={t.add.removeImage}>{Icons.x}</button>
              </div>
              <p className="modal__hint">{t.add.imageHint}</p>
            </div>
          ) : (
            <>
              <div className="field">
                <Input size="lg"
                  ref={urlRef}
                  value={raw}
                  onChange={(e) => { setRaw(e.target.value); setError(""); }}
                  placeholder={t.add.pasteLink}
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="modal__hint">{t.add.linkHint}</p>
              </div>
              <button type="button" className="add__pick" onClick={() => fileRef.current?.click()}>
                <span className="add__pick-icon" aria-hidden>{IconImage}</span>
                <span>{t.add.dropImage} <u>{t.add.chooseFile}</u></span>
              </button>
            </>
          )}
          <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />

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
            <Button variant="primary" type="submit" disabled={!raw.trim() && !file}>{t.common.save}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
