"use client";

import { useState, useRef, useEffect } from "react";
import { InspoItem } from "@/types/inspo";
import { SYSTEM_AREAS, type SystemArea } from "@/types/system";
import { areaIcon } from "./area-icons";
import { normalizeWebUrl, typeFromUrl } from "@/lib/url";
import { MEDIA_ACCEPT, isMediaFile, mediaFileFrom } from "@/lib/media-client";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import "./TextRef.css";

export interface NewInspoInput {
  /** The link (a site or a video); empty when it is an image */
  web: string;
  /** An image or GIF to upload instead of a link */
  file?: File;
  /** A text to keep whole instead of a link: the project's content (services, copy) */
  text?: { title: string; body: string };
  type: InspoItem["type"];
  note: string;
  /** Areas of the project's system it is filed under on saving (only when saved into a project) */
  areas?: SystemArea[];
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

const IconText = (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 3.5h9M2.5 6.5h9M2.5 9.5h5.5" /></svg>
);

const IconImage = (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="1.75" y="2.25" width="10.5" height="9.5" rx="1.5" /><circle cx="5" cy="5.5" r="1" /><path d="M12 9.5L9 6.5l-4 4-1.5-1.5L1.75 11" /></svg>
);

/** Only the link (or the image) is needed: name, screenshot, tags and collection are inferred.
 *  An image can be chosen, dropped anywhere on the dialog or pasted with ⌘V. */
export default function AddInspoModal({ onClose, onSubmit, isDuplicate, project }: AddInspoModalProps) {
  const { t } = useT();
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");
  // Saved into a project, it can go straight under one or several areas of its system
  const [areas, setAreas] = useState<SystemArea[]>([]);
  const toggleArea = (a: SystemArea) => setAreas((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // A text instead of a link: null until it is asked for (or a paragraph is pasted where the link goes)
  const [text, setText] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const writing = text !== null;
  const startText = (body = "") => { setText(body); setRaw(""); setError(""); setTimeout(() => titleRef.current?.focus(), 0); };
  const clearText = () => { setText(null); setTitle(""); setTimeout(() => urlRef.current?.focus(), 0); };

  const web = normalizeWebUrl(raw);
  const suggested = !file && web ? typeFromUrl(web) : "inspiration";
  const finalType = suggested;

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
    if (f) { e.preventDefault(); pick(f); return; }
    // Several lines pasted where the link goes are not a link: they are a text to keep
    const pasted = e.clipboardData.getData("text/plain");
    if (!writing && !file && e.target === urlRef.current && /\n/.test(pasted.trim()) && !normalizeWebUrl(pasted)) { e.preventDefault(); startText(pasted.trim()); }
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
    if (file) { onSubmit({ web: "", file, type: finalType, note: note.trim(), areas }); onClose(); return; }
    if (writing) {
      if (!title.trim() || !text.trim()) return;
      onSubmit({ web: "", text: { title: title.trim(), body: text }, type: "inspiration", note: note.trim() });
      onClose();
      return;
    }
    if (!web) { setError(t.add.notUrl); return; }
    if (isDuplicate?.(web)) { setError(t.add.alreadyInLibrary); return; }
    onSubmit({ web, type: finalType, note: note.trim(), areas });
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
          ) : writing ? (
            <div className="field">
              <Input size="lg" ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.add.textTitle} maxLength={80} autoComplete="off" />
              <textarea className="add__text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.add.textBody} aria-label={t.add.textBody} />
              <p className="modal__hint">{t.add.textHint}</p>
              <button type="button" className="add__text-back" onClick={clearText}>{t.add.removeText}</button>
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
              <button type="button" className="add__pick" onClick={() => startText()}>
                <span className="add__pick-icon" aria-hidden>{IconText}</span>
                <span>{t.add.pickText}</span>
              </button>
            </>
          )}
          <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />

          <div className="field">
            <Input
              
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={writing ? t.add.textNote : t.add.whatYouLiked}
            />
          </div>

          {project && !writing && (
            <div className="pills" role="group" aria-label={t.add.areas}>
              {SYSTEM_AREAS.map((a) => (
                <button key={a} type="button" aria-pressed={areas.includes(a)} className={`pill pill--area${areas.includes(a) ? " is-on" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => toggleArea(a)}>
                  {areaIcon(a, 13)}{t.system.areas[a]}
                </button>
              ))}
            </div>
          )}

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__footer">
            <Button variant="ghost" type="button" onClick={onClose}>{t.common.cancel}</Button>
            <Button variant="primary" type="submit" disabled={writing ? !title.trim() || !text.trim() : !raw.trim() && !file}>{t.common.save}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
