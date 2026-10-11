"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { mediaFileFrom } from "@/lib/media-client";
import { normalizeWebUrl } from "@/lib/url";
import type { Dict } from "@/lib/i18n/en";
import type { ToastNote } from "@/components/Toast";

/** The add dialog, and the ways it opens without a click: N, a paste or a file dropped on the board */
export function useAddDialog({ t, setToast }: { t: Dict; setToast: Dispatch<SetStateAction<ToastNote | null>> }) {
  // Uncompiled, as it was inside InspoClient (which the React Compiler skips): the same renders and closures
  "use no memo";
  const [showAdd, setShowAdd] = useState(false);
  // What was pasted or dropped on the board: the add dialog opens with it in place
  const [addInitial, setAddInitial] = useState<{ file?: File; web?: string; text?: string } | undefined>();
  const [boardDrag, setBoardDrag] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector(".modal-backdrop, .cp")) return; // something open on top
      e.preventDefault();
      setShowAdd(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  // ⌘V or a file dropped anywhere on the board: no need to open the dialog first.
  // It opens with the image, the link or the text already in it, waiting for what caught your eye.
  // Whatever handled the paste or the drop on its own (a field, the comments, the project start) has prevented it.
  useEffect(() => {
    const free = (e: Event) => {
      if (e.defaultPrevented) return false;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return false;
      return !document.querySelector(".modal-backdrop, .cp");
    };
    const open = (initial: { file?: File; web?: string; text?: string }) => { setAddInitial(initial); setShowAdd(true); };
    const onPaste = (e: ClipboardEvent) => {
      if (!free(e)) return;
      const file = mediaFileFrom(e.clipboardData);
      if (file) { e.preventDefault(); open({ file }); return; }
      const pasted = (e.clipboardData?.getData("text/plain") ?? "").trim();
      // A link, or several lines (a text to keep); a stray word stays out
      if (!/\s/.test(pasted) && normalizeWebUrl(pasted)) { e.preventDefault(); open({ web: pasted }); }
      else if (/\n/.test(pasted)) { e.preventDefault(); open({ text: pasted }); }
    };
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e) || !free(e)) { setBoardDrag(false); return; }
      e.preventDefault(); setBoardDrag(true);
    };
    const onDragLeave = (e: DragEvent) => { if (!e.relatedTarget) setBoardDrag(false); };
    const onDrop = (e: DragEvent) => {
      setBoardDrag(false);
      if (!hasFiles(e) || !free(e)) return;
      e.preventDefault();
      const file = mediaFileFrom(e.dataTransfer);
      if (file) open({ file });
      else setToast({ title: t.errors.imagesOnly, detail: "" });
    };
    document.addEventListener("paste", onPaste);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [t, setToast]);
  return { showAdd, setShowAdd, addInitial, setAddInitial, boardDrag };
}
