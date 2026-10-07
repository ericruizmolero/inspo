"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InspoItem, InspoComment, CommentAttachment } from "@/types/inspo";
import type { SessionUser } from "@/lib/workspace-core";
import { prepareScreenshot } from "@/lib/image-client";
import { fmtDate, fmtDateTime } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { Dict } from "@/lib/i18n/en";
import { useT, messageOf } from "./I18nProvider";
import { mediaKindOf, readableDomain } from "@/lib/url";
import VideoPlayer from "./VideoPlayer";
import PostView from "./PostView";
import { Avatar as SysAvatar, Busy, Button, Chip, EmptyState, IconButton, TextArea, toneFor } from "@/components/criterio";

// Side panel for an inspo's comments. The original note from whoever saved it opens the list; then each
// comment as a thread, oldest first: pinned ones (post-its on the page) carry their number and a way to the
// pin, the rest are about the whole reference. Any member can reply under any comment, one level deep.
// Screenshots are pasted (⌘V), dragged onto the panel or attached with the clip; they upload
// as soon as they're dropped and travel with the comment as a list of URLs.

const MAX_FILES = 6;

interface CommentsPanelProps {
  item: InspoItem;
  comments: InspoComment[];
  user: SessionUser;
  canManage: boolean;
  /** Member avatars by name (for the original note, which has no autorId) */
  memberImages: Record<string, string>;
  /** Workspace member names (for the empty state: who will see the comment) */
  memberNames?: string[];
  /** Inspo thumbnail for context above the thread */
  image?: string | null;
  /** Something to know about the reference before reading its thread (a closed polish forgot it), above the list */
  notice?: React.ReactNode;
  onPost: (body: string, attachments: CommentAttachment[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Rewrites the original note or sub-note. Without it, the note is read-only. */
  onEditNote?: (field: "note" | "subNote", text: string) => Promise<void>;
  /** Without it (the reference sheet, where the conversation is a card) there is no close button */
  onClose?: () => void;
  /** The reference's picture, video or post above the comments; off where the page has its own card */
  showMedia?: boolean;
  /**
   * `drawer` (default): fixed side panel with a dark backdrop, closes with Escape.
   * `column`: column embedded in the DESIGN.md sheet; no backdrop, no Escape
   * (the sheet handles it) and a short header, since the brand is already in the bar.
   */
  variant?: "drawer" | "column";
  /** A post from X reports the picture it got once imported (it becomes the card's thumbnail) */
  onPostThumb?: (thumb: string) => void;
  /** This site's DESIGN.md status, for the "generate the MD to get the full sheet" notice */
  designMd?: { status: "none" | "loading" | "ready"; onGenerate: () => void; onOpen: () => void };
  /** Answers a comment. Without it, threads are read-only */
  onReply?: (parentId: string, body: string) => Promise<void>;
}

const IcTrash = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.6 8h4.8L10 4" /></svg>
);
const IcEdit = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2.5l2 2L5 11l-2.5.5L3 9z" /></svg>
);
const IcImage = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.75" y="2.25" width="10.5" height="9.5" rx="1.5" /><circle cx="5" cy="5.5" r="1" /><path d="M12 9.5L9 6.5l-4 4-1.5-1.5L1.75 11" /></svg>
);
const IcArrow = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l6-6M4 3h5v5" /></svg>
);
const IcDoc = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"><path d="M3 1.5h5l3 3v8H3z" /><path d="M8 1.5v3h3M5 7.5h4M5 10h4" /></svg>
);

// Stable color per name to tell people apart at a glance
const HUES = [212, 28, 152, 268, 88, 340, 190, 48];
export function hueFor(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/** A person by name: the system's Avatar in that person's tone (the same one everywhere), their picture when
 * there is one. Kept as a name-based shortcut for InspoCard, SystemDoc and SystemMarkdown. */
export function Avatar({ name, image, size = 26 }: { name: string; image?: string | null; size?: number }) {
  return <SysAvatar className="cm-avatar" initials={name.slice(0, 1).toUpperCase()} name={name} tone={toneFor(name)} size={size} src={image} />;
}

function relTime(iso: string, now: number, locale: Locale, t: Dict): string {
  const at = Date.parse(iso);
  if (isNaN(at)) return iso;
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return t.comments.now;
  const m = Math.round(s / 60);
  if (m < 60) return t.comments.minsAgo(m);
  const h = Math.round(m / 60);
  if (h < 24) return t.comments.hoursAgo(h);
  const d = Math.round(h / 24);
  if (d === 1) return t.comments.yesterday;
  if (d < 7) return t.comments.daysAgo(d);
  return fmtDate(at, locale, { day: "numeric", month: "short", year: d > 300 ? "numeric" : undefined });
}

function listNames(names: string[], and: string): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
}

function esDateToIso(es: string): string {
  const m = es.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T12:00:00` : es;
}

interface Msg {
  id: string;
  name: string;
  image: string | null;
  body: string;
  attachments: CommentAttachment[];
  at: string;
  mine: boolean;
  /** true for the original note and the item's subcomment */
  original?: boolean;
  deletable?: boolean;
  /** Original note or sub-note this person may rewrite */
  editable?: boolean;
}

/** A comment and the replies under it */
interface Thread { head: Msg; replies: Msg[] }

// Links inside the comment: http(s):// and www. are detected and rendered as hyperlinks
// with a short domain (no protocol or trailing slash) so they don't break the panel width.
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"'）)]+)/gi;
function linkLabel(raw: string) {
  const s = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
  return s.length > 48 ? s.slice(0, 45) + "…" : s;
}
function renderBody(text: string) {
  const parts = text.split(URL_RE);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    // Trailing punctuation (comma, period, parenthesis) isn't part of the link
    const m = part.match(/^(.*?)([.,;:!?)\]]*)$/);
    const url = m ? m[1] : part;
    const tail = m ? m[2] : "";
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return (
      <Fragment key={i}>
        <a className="cm-link" href={href} target="_blank" rel="noopener noreferrer" title={url}>{linkLabel(url)}{IcArrow}</a>
        {tail}
      </Fragment>
    );
  });
}

/** Screenshot in the composer: uploads as soon as it's added and is sent with the comment once `ready`. */
interface Pending {
  key: string;
  preview: string;       // local object URL, for the instant thumbnail
  name: string;
  status: "uploading" | "ready" | "error";
  url?: string;
  w: number;
  h: number;
  error?: string;
}

async function uploadPending(file: File): Promise<{ url: string; w: number; h: number; name: string }> {
  const prepared = await prepareScreenshot(file);
  const fd = new FormData();
  fd.append("file", new File([prepared.blob], prepared.name, { type: prepared.blob.type }));
  const res = await fetch("/api/comments/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return { url: data.url as string, w: prepared.w, h: prepared.h, name: prepared.name };
}

function filesFrom(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const out: File[] = [];
  for (const f of Array.from(dt.files ?? [])) if (f.type.startsWith("image/")) out.push(f);
  if (!out.length) {
    for (const it of Array.from(dt.items ?? [])) {
      if (it.kind === "file" && it.type.startsWith("image/")) { const f = it.getAsFile(); if (f) out.push(f); }
    }
  }
  return out;
}

export default function CommentsPanel({ item, comments, user, canManage, memberImages, memberNames = [], image, notice, onPost, onDelete, onEditNote, onClose, showMedia = true, variant = "drawer", designMd, onPostThumb, onReply }: CommentsPanelProps) {
  const { locale, t } = useT();
  const column = variant === "column";
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<{ list: CommentAttachment[]; idx: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const lightboxRef = useRef(lightbox);
  lightboxRef.current = lightbox;
  // Inline editor for the original note: which message and its working text
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;
  // The reply being written, under which comment
  const [replying, setReplying] = useState<{ id: string; text: string; sending: boolean; error?: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lb = lightboxRef.current;
      if (lb) {
        if (e.key === "Escape") setLightbox(null);
        if (e.key === "ArrowRight") setLightbox({ list: lb.list, idx: (lb.idx + 1) % lb.list.length });
        if (e.key === "ArrowLeft") setLightbox({ list: lb.list, idx: (lb.idx - 1 + lb.list.length) % lb.list.length });
        return;
      }
      // Escape inside the note editor cancels the edit, it doesn't close the panel
      if (e.key === "Escape" && !column && !editingRef.current) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { document.removeEventListener("keydown", onKey); clearInterval(t); };
  }, [onClose, column]);

  // In column mode focus isn't stolen: the sheet beside it is what's being read
  useEffect(() => { if (!column) textareaRef.current?.focus(); }, [item.id, column]);
  useEffect(() => { setEditing(null); setEditError(null); setReplying(null); }, [item.id]);

  // On inspo change or close, release the local previews
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => () => { for (const p of pendingRef.current) URL.revokeObjectURL(p.preview); }, [item.id]);

  const addFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    setError(null);
    const room = MAX_FILES - pendingRef.current.length;
    if (room <= 0) { setError(t.comments.maxFiles(MAX_FILES)); return; }
    const batch = files.slice(0, room).map<Pending>((f) => ({
      key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, preview: URL.createObjectURL(f),
      name: f.name || t.comments.screenshotName, status: "uploading", w: 0, h: 0,
    }));
    setPending((prev) => [...prev, ...batch]);
    batch.forEach((p, i) => {
      uploadPending(files[i])
        .then((r) => setPending((prev) => prev.map((x) => x.key === p.key ? { ...x, status: "ready", url: r.url, w: r.w, h: r.h, name: r.name } : x)))
        .catch((e) => setPending((prev) => prev.map((x) => x.key === p.key ? { ...x, status: "error", error: messageOf(e, t, t.comments.uploadFailed) } : x)));
    });
    if (files.length > room) setError(t.comments.filesLeftOut(MAX_FILES, files.length - room));
  }, []);

  const removePending = (key: string) => {
    const p = pendingRef.current.find((x) => x.key === key);
    if (!p) return;
    URL.revokeObjectURL(p.preview);
    if (p.url) fetch(`/api/comments/upload?url=${encodeURIComponent(p.url)}`, { method: "DELETE" }).catch(() => {});
    setPending((prev) => prev.filter((x) => x.key !== key));
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const files = filesFrom(e.clipboardData);
    if (files.length) { e.preventDefault(); addFiles(files); }
  };
  const onDragEnter = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault(); dragDepth.current += 1; setDragging(true);
  };
  const onDragOver = (e: React.DragEvent) => { if (Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault(); };
  const onDragLeave = () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); dragDepth.current = 0; setDragging(false);
    addFiles(filesFrom(e.dataTransfer));
    textareaRef.current?.focus();
  };

  // The note that opens the list, then each comment as a thread with its replies under it
  const { originals, threads } = useMemo(() => {
    const originals: Msg[] = [];
    const author = item.addedBy || t.comments.noAuthor;
    const mine = author === user.name;
    const editable = !!onEditNote && (mine || canManage);
    if (item.note) {
      originals.push({ id: "nota", name: author, image: memberImages[author] ?? null, body: item.note, attachments: [], at: esDateToIso(item.date), mine, original: true, editable });
    }
    if (item.subNote) {
      originals.push({ id: "sub", name: author, image: memberImages[author] ?? null, body: item.subNote, attachments: [], at: esDateToIso(item.date), mine, original: true, editable });
    }
    const toMsg = (c: InspoComment): Msg => {
      const own = c.authorId === user.id;
      return { id: c.id, name: c.authorName, image: c.authorImage, body: c.body, attachments: c.attachments ?? [], at: c.createdAt, mine: own, deletable: own || canManage };
    };
    const ids = new Set(comments.map((c) => c.id));
    const threads: Thread[] = [];
    const byId = new Map<string, Thread>();
    // A reply whose comment is gone stands on its own rather than vanishing
    for (const c of comments) {
      if (c.parentId && ids.has(c.parentId)) continue;
      const th = { head: toMsg(c), replies: [] };
      threads.push(th); byId.set(c.id, th);
    }
    for (const c of comments) if (c.parentId && ids.has(c.parentId)) byId.get(c.parentId)?.replies.push(toMsg(c));
    return { originals, threads };
  }, [item, comments, user, canManage, memberImages, onEditNote]);
  const total = originals.length + threads.reduce((n, th) => n + 1 + th.replies.length, 0);

  // On open or when a new message arrives, scroll to the end of the list
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [total, item.id]);

  // When the reply field closes, the keyboard goes back to its thread's Reply button, not to the top of the page
  const closeReply = (id: string) => {
    setReplying(null);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-reply-for="${CSS.escape(id)}"]`)?.focus());
  };

  const sendReply = async () => {
    if (!replying || !onReply || replying.sending) return;
    const body = replying.text.trim();
    if (!body) return;
    setReplying({ ...replying, sending: true, error: undefined });
    try {
      await onReply(replying.id, body);
      closeReply(replying.id);
    } catch (e) {
      setReplying((r) => r && { ...r, sending: false, error: e instanceof Error ? e.message : t.comments.sendFailed });
    }
  };

  const uploading = pending.some((p) => p.status === "uploading");
  const ready = pending.filter((p): p is Pending & { url: string } => p.status === "ready" && !!p.url);
  const canSend = (!!draft.trim() || ready.length > 0) && !uploading && !sending;

  const submit = async () => {
    const body = draft.trim();
    if (!canSend) return;
    setSending(true); setError(null);
    try {
      await onPost(body, ready.map((p) => ({ url: p.url, w: p.w, h: p.h, name: p.name })));
      setDraft("");
      for (const p of pending) URL.revokeObjectURL(p.preview);
      setPending([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.comments.sendFailed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const saveEdit = async () => {
    if (!editing || !onEditNote || savingEdit) return;
    const field = editing.id === "sub" ? "subNote" : "note";
    const current = field === "note" ? item.note : item.subNote ?? "";
    if (editing.text.trim() === current.trim()) { setEditing(null); return; }
    setSavingEdit(true); setEditError(null);
    try {
      await onEditNote(field, editing.text);
      setEditing(null);
    } catch (e) {
      setEditError(e instanceof Error && e.message ? e.message : t.comments.editFailed);
    } finally {
      setSavingEdit(false);
    }
  };
  const cancelEdit = () => { setEditing(null); setEditError(null); };

  const others = memberNames.filter((n) => n && n !== user.name);

  // An uploaded image is not a site: its link opens the file itself, which is also the picture on top
  const kind = mediaKindOf(item.web);
  const href = kind === "image" && image ? image : item.web;
  const domain = kind === "image" ? t.card.openImage : (() => { try { return readableDomain(new URL(item.web).hostname.replace(/^www\./, "")); } catch { return ""; } })();
  const count = comments.length;

  const renderMsg = (m: Msg, grouped: boolean) => (
    <div key={m.id} className={`cm-msg${m.mine ? " is-mine" : ""}${m.original ? " is-original" : ""}${grouped ? " is-grouped" : ""}`}>
      {!grouped && (
        <div className="cm-msg__head">
          <Avatar name={m.name} image={m.image} />
          <span className="cm-msg__name">{m.name}{m.mine && <Chip className="cm-msg__you">{t.comments.you}</Chip>}</span>
          <span className="cm-msg__time" data-tip={fmtDateTime(m.at, locale)}>{relTime(m.at, now, locale, t)}</span>
        </div>
      )}
      <div className="cm-msg__row">
        <div className="cm-msg__content">
          {editing?.id === m.id ? (
            <div className="cm-edit">
              <TextArea
                className="cm-edit__input"
                value={editing.text}
                rows={Math.min(8, Math.max(2, editing.text.split("\n").length + 1))}
                autoFocus
                onFocus={(e) => { const l = e.currentTarget.value.length; e.currentTarget.setSelectionRange(l, l); }}
                onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); saveEdit(); }
                  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancelEdit(); }
                }}
              />
              <div className="cm-edit__foot">
                {editError
                  ? <span className="cm-composer__error">{editError}</span>
                  : <span className="cm-composer__hint">{t.comments.editHint}</span>}
                <Button size="s" onClick={cancelEdit} disabled={savingEdit}>{t.comments.cancelEdit}</Button>
                <Button variant="primary" size="s" onClick={saveEdit} disabled={savingEdit}>
                  {savingEdit ? <Busy label={t.comments.saveEdit} /> : t.comments.saveEdit}
                </Button>
              </div>
            </div>
          ) : m.body && <p className="cm-msg__body">{renderBody(m.body)}</p>}
          {m.attachments.length > 0 && (
            <div className={`cm-atts cm-atts--${Math.min(m.attachments.length, 3)}`}>
              {m.attachments.map((a, j) => (
                <button
                  key={a.url}
                  type="button"
                  className="cm-att"
                  style={m.attachments.length === 1 && a.w && a.h ? { aspectRatio: `${a.w} / ${a.h}` } : undefined}
                  data-tip={a.name ?? t.comments.seeScreenshot}
                  onClick={() => setLightbox({ list: m.attachments, idx: j })}
                >
                  <img src={a.url} alt={a.name ?? t.comments.screenshot} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        {m.editable && editing?.id !== m.id && (
          <IconButton icon={IcEdit} variant="quiet" size="xs" className="cm-msg__edit" label={t.comments.editNote} onClick={() => { setEditError(null); setEditing({ id: m.id, text: m.body }); }} />
        )}
        {m.deletable && (
          <IconButton icon={IcTrash} variant="quiet" size="xs" className="cm-msg__del" label={t.comments.deleteComment} onClick={() => onDelete(m.id)} />
        )}
      </div>
    </div>
  );

  return (
    <>
      {!column && <div className="cm-backdrop" onClick={() => onClose?.()} />}
      <aside
        className={`cm-panel${column ? " cm-panel--column" : ""}${dragging ? " is-dragging" : ""}`}
        role="dialog"
        aria-label={t.comments.ofLabel(item.name)}
        onPaste={onPaste}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dragging && (
          <div className="cm-drop" aria-hidden>
            <span className="cm-drop__icon">{IcImage}</span>
            <span className="t-title-m cm-drop__title">{t.comments.dropTitle}</span>
            <span className="cm-drop__text">{t.comments.dropText}</span>
          </div>
        )}
        <header className="cm-panel__head cr-viewer-aside-head">
          <div className="cm-panel__title">
            <span className="cr-viewer-aside-title">{column ? t.comments.title : item.name}</span>
            {!column && <a className="cm-panel__link" href={href} target="_blank" rel="noopener noreferrer">{domain}{IcArrow}</a>}
          </div>
          <span className="cm-panel__count cr-viewer-aside-meta">{total === 0 ? t.comments.noComments : t.comments.count(total)}</span>
          {onClose && <IconButton icon="close" variant="quiet" size="s" onClick={onClose} label={column ? t.comments.hide : t.common.close} />}
        </header>

        {designMd && !column && (
          <div className={`cm-md-cta is-${designMd.status}`}>
            <span className="cm-md-cta__icon">{designMd.status === "loading" ? <Busy label={t.comments.mdLoading} /> : IcDoc}</span>
            <span className="cm-md-cta__text">
              {designMd.status === "ready"
                ? t.comments.mdReady
                : designMd.status === "loading"
                  ? t.comments.mdLoading
                  : t.comments.mdNone}
            </span>
            {designMd.status === "ready" && <Button size="s" onClick={designMd.onOpen}>{t.comments.seeSpec}</Button>}
            {designMd.status === "none" && <Button variant="primary" size="s" onClick={designMd.onGenerate}>{t.comments.generateMd}</Button>}
          </div>
        )}

        <div ref={listRef} className="cm-list">
          {notice}
          {!showMedia ? null : kind === "post" ? (
            <PostView web={item.web} onThumb={onPostThumb} />
          ) : kind === "video" ? (
            <VideoPlayer web={item.web} title={item.name} />
          ) : kind === "image" && image ? (
            // Whole, not cropped: the image is the inspo
            <a className="cm-shot cm-shot--whole" href={href} target="_blank" rel="noopener noreferrer" data-tip={t.card.openImage}>
              <img src={image} alt={item.name} loading="lazy" />
            </a>
          ) : image && (
            <a className="cm-shot" href={item.web} target="_blank" rel="noopener noreferrer" data-tip={t.comments.openSite}>
              <img src={image} alt="" loading="lazy" />
            </a>
          )}
          {originals.map((m, i) => renderMsg(m, !!originals[i - 1] && originals[i - 1].name === m.name && Math.abs(Date.parse(originals[i - 1].at) - Date.parse(m.at)) < 5 * 60000))}
          {/* Nobody has answered yet: the invitation to, under the note the reference came with */}
          {total === 0 && (
            <EmptyState
              className="cm-empty"
              title={originals.length ? t.comments.inviteTitle : t.comments.emptyTitle}
              suggestions={[...(kind === "web" ? t.comments.prompts : t.comments.promptsMedia)]}
              onSuggest={(p) => { setDraft(p + " "); textareaRef.current?.focus(); }}
            >
              {others.length === 0
                ? t.comments.emptyAlone
                : t.comments.emptyWithOthers(listNames(others, t.comments.and), others.length > 1)}
            </EmptyState>
          )}
          {threads.map(({ head, replies }) => (
            // A post-it's thread wears the post-it's colour from its comment down to its last reply
            <div key={head.id} data-thread={head.id} className="cm-thread">
              {renderMsg(head, false)}
              {replies.length > 0 && <div className="cm-replies">{replies.map((r, i) => renderMsg(r, !!replies[i - 1] && replies[i - 1].name === r.name && Math.abs(Date.parse(replies[i - 1].at) - Date.parse(r.at)) < 5 * 60000))}</div>}
              {onReply && (replying?.id === head.id ? (
                <form className="cm-reply" onSubmit={(e) => { e.preventDefault(); sendReply(); }}>
                  <TextArea
                    className="cm-reply__box"
                    autoFocus
                    rows={1}
                    value={replying.text}
                    disabled={replying.sending}
                    placeholder={t.comments.reply}
                    aria-label={t.comments.reply}
                    onChange={(e) => setReplying({ ...replying, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
                      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeReply(head.id); }
                    }}
                    onBlur={() => { if (!replying.text.trim()) setReplying(null); }}
                    toolbar={
                      <Button variant="primary" size="s" type="submit" onMouseDown={(e) => e.preventDefault()} disabled={replying.sending || !replying.text.trim()}>
                        {replying.sending ? <Busy label={t.comments.send} /> : t.comments.send}
                      </Button>
                    }
                  />
                  {replying.error && <span className="cm-composer__error">{replying.error}</span>}
                </form>
              ) : (
                <div className="cm-thread__foot">
                  <Button variant="quiet" size="s" className="cm-reply-btn" data-reply-for={head.id} onClick={() => setReplying({ id: head.id, text: "", sending: false })}>
                    {t.comments.replyTo}
                  </Button>
                  {replies.length > 0 && <span className="cm-thread__count">{t.comments.replies(replies.length)}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* One field: the text, the screenshots waiting to go, and a toolbar inside the same box (attach on
            the left, Send on the right), and the keys and how to attach as a line under the field. No avatar (it is
            always you). The little help is on screen again (Eric, 07-10: "antes teníamos una mini ayuda... eso podemos rescatar?") */}
        <form className="cm-composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
            onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          <TextArea
            ref={textareaRef}
            rows={2}
            value={draft}
            aria-label={t.comments.addComment}
            aria-describedby="cm-composer-keys"
            placeholder={count === 0 && !item.note ? t.comments.firstComment : t.comments.addComment}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            toolbar={<>
              <IconButton icon="image" variant="quiet" size="s" label={t.comments.attach} onClick={() => fileRef.current?.click()} />
              {uploading && <span className="cr-textbox-status" role="status">{t.comments.uploading}</span>}
              <Button variant="primary" size="s" type="submit" disabled={!canSend}>
                {sending ? <Busy label={t.comments.send} /> : t.comments.send}
              </Button>
            </>}
          >
            {pending.length > 0 && (
              <div className="cm-files">
                {pending.map((p) => (
                  <div key={p.key} className={`cm-file is-${p.status}`} data-tip={p.status === "error" ? p.error : p.name}>
                    <img src={p.preview} alt="" />
                    {p.status === "uploading" && <Busy className="cm-file__busy" label={t.comments.uploading} />}
                    {p.status === "error" && <span className="cm-file__err">!</span>}
                    <IconButton icon="close" variant="default" size="xs" className="cm-file__rm" label={t.comments.removeScreenshot} onClick={() => removePending(p.key)} />
                  </div>
                ))}
              </div>
            )}
          </TextArea>
          {error && <p className="cm-composer__error" role="alert">{error}</p>}
          {/* The little help under the field, whole and out of the way (Eric, 07-10: in the bar it was cut and in the way) */}
          <p id="cm-composer-keys" className="cm-composer__hint cm-composer__keys">{t.comments.composerHint}</p>
        </form>
      </aside>

      {lightbox && (() => {
        const a = lightbox.list[lightbox.idx];
        const many = lightbox.list.length > 1;
        const go = (d: number) => setLightbox({ list: lightbox.list, idx: (lightbox.idx + d + lightbox.list.length) % lightbox.list.length });
        return (
          <div className="cm-lightbox" role="dialog" aria-label={t.comments.screenshot} onClick={() => setLightbox(null)}>
            <IconButton icon="close" variant="default" size="m" className="cm-lightbox__close" label={t.common.close} onClick={() => setLightbox(null)} />
            {many && <IconButton icon="chevron-left" variant="default" size="l" className="cm-lightbox__nav is-prev" label={t.comments.previous} onClick={(e) => { e.stopPropagation(); go(-1); }} />}
            <img
              key={a.url}
              className="cm-lightbox__img"
              src={a.url}
              alt={a.name ?? t.comments.screenshot}
              onClick={(e) => e.stopPropagation()}
            />
            {many && <IconButton icon="chevron-right" variant="default" size="l" className="cm-lightbox__nav is-next" label={t.comments.next} onClick={(e) => { e.stopPropagation(); go(1); }} />}
            <div className="cm-lightbox__caption">
              {a.name && <span>{a.name}</span>}
              {many && <span className="cm-lightbox__count">{lightbox.idx + 1} / {lightbox.list.length}</span>}
            </div>
          </div>
        );
      })()}
    </>
  );
}
