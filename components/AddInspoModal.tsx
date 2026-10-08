"use client";

import { useState, useRef, useEffect } from "react";
import { InspoItem } from "@/types/inspo";
import { SYSTEM_AREAS, type SystemArea } from "@/types/system";
import { areaIcon } from "./area-icons";
import { normalizeWebUrl, typeFromUrl } from "@/lib/url";
import { MEDIA_ACCEPT, isMediaFile, mediaFileFrom } from "@/lib/media-client";
import { useT } from "./I18nProvider";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button, Chip, Icon, IconButton, TextArea } from "@/components/criterio";
import { boardOf, PLATFORM_NAME } from "@/lib/boards/match";
import { BoardProgress, type BoardStep, type ImportBoard } from "./BoardImport";
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
  /** What was pasted or dropped on the board: the dialog opens with it in place, waiting for the note */
  initial?: { file?: File; web?: string; text?: string };
  /** A board pasted (Are.na, Pinterest, Cosmos): its websites come in, in a project of their own */
  onImportBoard: ImportBoard;
}

/** Only the link (or the image) is needed: name, screenshot, tags and collection are inferred.
 *  An image can be chosen, dropped anywhere on the dialog or pasted with ⌘V. */
export default function AddInspoModal({ onClose, onSubmit, isDuplicate, project, initial, onImportBoard }: AddInspoModalProps) {
  const { t } = useT();
  // Closing plays the dialog out first; whoever opened it unmounts it once it is gone
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  const [raw, setRaw] = useState(initial?.web ?? "");
  const [note, setNote] = useState("");
  // Saved into a project, it can go straight under one or several areas of its system
  const [areas, setAreas] = useState<SystemArea[]>([]);
  const toggleArea = (a: SystemArea) => setAreas((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(initial?.file ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // A text instead of a link: null until it is asked for (or a paragraph is pasted where the link goes)
  const [text, setText] = useState<string | null>(initial?.text ?? null);
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const writing = text !== null;
  const startText = (body = "") => { setText(body); setRaw(""); setError(""); setTimeout(() => titleRef.current?.focus(), 0); };
  const clearText = () => { setText(null); setTitle(""); setTimeout(() => urlRef.current?.focus(), 0); };

  const web = normalizeWebUrl(raw);
  // A board instead of a site: the dialog stays open while it comes in, then the user lands in its project
  const board = !file && !writing ? boardOf(raw) : null;
  const [step, setStep] = useState<BoardStep | null>(null);
  const importBoard = async () => {
    setError("");
    const failed = await onImportBoard(raw, setStep);
    setStep(null);
    if (failed) setError(failed); else close();
  };
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
    if (file) { onSubmit({ web: "", file, type: finalType, note: note.trim(), areas }); close(); return; }
    if (writing) {
      if (!title.trim() || !text.trim()) return;
      onSubmit({ web: "", text: { title: title.trim(), body: text }, type: "inspiration", note: note.trim() });
      close();
      return;
    }
    if (board) { if (!step) importBoard(); return; }
    if (!web) { setError(t.add.notUrl); return; }
    if (isDuplicate?.(web)) { setError(t.add.alreadyInLibrary); return; }
    onSubmit({ web, type: finalType, note: note.trim(), areas });
    close();
  };

  const canSave = writing ? !!title.trim() && !!text.trim() : !!raw.trim() || !!file;

  return (
    <Dialog open={open} onOpenChange={setOpen} onOpenChangeComplete={(o) => { if (!o) onClose(); }}>
      {/* The flat modal, not the moss window: a header with the title and the close, the form, the footer (Eric, 07-10) */}
      <DialogContent initialFocus={initial?.text ? titleRef : initial ? noteRef : urlRef}>
        <div className="modal__header">
          <DialogTitle className="t-title-s">{project ? t.add.titleIn(project) : t.add.title}</DialogTitle>
          <DialogClose render={<IconButton icon="close" variant="default" size="s" label={t.common.close} />} />
        </div>
        <form id="add-inspo" onSubmit={handleSubmit} className={`modal__body add${dragging ? " is-dragging" : ""}`}
          onPaste={onPaste} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
          {dragging && <div className="add__drop" aria-hidden><span className="t-title-l">{t.add.dropHere}</span></div>}
          {file && preview ? (
            <div className="field">
              <div className="add__preview">
                <img src={preview} alt="" />
                <IconButton icon="close" variant="default" size="s" className="add__remove" onClick={clearFile} label={t.add.removeImage} />
              </div>
              <p className="modal__hint">{t.add.imageHint}</p>
            </div>
          ) : writing ? (
            <div className="field">
              <Input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.add.textTitle} maxLength={80} autoComplete="off" />
              <TextArea className="add__text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.add.textBody} aria-label={t.add.textBody} />
              <p className="modal__hint">{t.add.textHint}</p>
              <Button variant="quiet" size="s" className="add__text-back" onClick={clearText}>{t.add.removeText}</Button>
            </div>
          ) : (
            <>
              <div className="field">
                <Input
                  ref={urlRef}
                  value={raw}
                  disabled={!!step}
                  onChange={(e) => { setRaw(e.target.value); setError(""); }}
                  placeholder={t.add.pasteLink}
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                />
                {step ? <BoardProgress step={step} className="board-progress" />
                  : <p className="modal__hint">{board ? t.board.hint(PLATFORM_NAME[board.platform]) : t.add.linkHint}</p>}
              </div>
              {/* The other two ways in: sunken wells, the field's shape, since an image can be dropped on them */}
              {!board && <>
              <button type="button" className="add__pick" onClick={() => fileRef.current?.click()}>
                <Icon name="image" size={16} />
                <span>{t.add.dropImage} <u>{t.add.chooseFile}</u></span>
              </button>
              <button type="button" className="add__pick" onClick={() => startText()}>
                <Icon name="text" size={16} />
                <span>{t.add.pickText}</span>
              </button>
              </>}
            </>
          )}
          <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />

          {!board && <div className="field">
            <Input
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={writing ? t.add.textNote : t.add.whatYouLiked}
            />
          </div>}

          {project && !writing && !board && (
            <div className="pills" role="group" aria-label={t.add.areas}>
              {SYSTEM_AREAS.map((a) => (
                <Chip key={a} className="add__area" pressed={areas.includes(a)} onClick={() => toggleArea(a)}>
                  {areaIcon(a, 13)}{t.system.areas[a]}
                </Chip>
              ))}
            </div>
          )}

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__footer">
            <Button onClick={close}>{t.common.cancel}</Button>
            <Button variant="primary" type="submit" disabled={!canSave || !!step}>{board ? (step ? t.board.importing : t.board.import) : t.common.save}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
