"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InspoItem, InspoComment, CommentAttachment } from "@/types/inspo";
import type { SessionUser } from "@/lib/workspace-core";
import { proxiedSrc } from "@/lib/proxied-src";
import { prepareScreenshot } from "@/lib/image-client";
import { fmtDate, fmtDateTime } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { Dict } from "@/lib/i18n/en";
import { useT, messageOf } from "./I18nProvider";
import { Button } from "@/components/ui/button";

// Side panel for an inspo's comments, like a Figma pin thread:
// the original note from whoever saved it opens the thread and any member replies below.
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
  onPost: (body: string, attachments: CommentAttachment[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  /**
   * `drawer` (default): fixed side panel with a dark backdrop, closes with Escape.
   * `column`: column embedded in the DESIGN.md sheet; no backdrop, no Escape
   * (the sheet handles it) and a short header, since the brand is already in the bar.
   */
  variant?: "drawer" | "column";
  /** This site's DESIGN.md status, for the "generate the MD to get the full sheet" notice */
  designMd?: { status: "none" | "loading" | "ready"; onGenerate: () => void; onOpen: () => void };
}

const IcX = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l8 8M11 3l-8 8" /></svg>
);
const IcSend = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
);
const IcTrash = (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.6 8h4.8L10 4" /></svg>
);
const IcImage = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.75" y="2.25" width="10.5" height="9.5" rx="1.5" /><circle cx="5" cy="5.5" r="1" /><path d="M12 9.5L9 6.5l-4 4-1.5-1.5L1.75 11" /></svg>
);
const IcChevron = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5" /></svg>
);
const IcArrow = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l6-6M4 3h5v5" /></svg>
);
const IcDoc = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round"><path d="M3 1.5h5l3 3v8H3z" /><path d="M8 1.5v3h3M5 7.5h4M5 10h4" /></svg>
);

// Stable color per name to tell people apart at a glance
const HUES = [212, 28, 152, 268, 88, 340, 190, 48];
export function hueFor(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

export function Avatar({ name, image, size = 26 }: { name: string; image?: string | null; size?: number }) {
  const hue = hueFor(name);
  return (
    <span
      className="cm-avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: image ? undefined : `hsl(${hue} 32% 26%)`, color: `hsl(${hue} 70% 82%)` }}
      aria-hidden
    >
      {image ? <img src={image} alt="" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
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
}

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

export default function CommentsPanel({ item, comments, user, canManage, memberImages, memberNames = [], image, onPost, onDelete, onClose, variant = "drawer", designMd }: CommentsPanelProps) {
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const lb = lightboxRef.current;
      if (lb) {
        if (e.key === "Escape") setLightbox(null);
        if (e.key === "ArrowRight") setLightbox({ list: lb.list, idx: (lb.idx + 1) % lb.list.length });
        if (e.key === "ArrowLeft") setLightbox({ list: lb.list, idx: (lb.idx - 1 + lb.list.length) % lb.list.length });
        return;
      }
      if (e.key === "Escape" && !column) onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => { document.removeEventListener("keydown", onKey); clearInterval(t); };
  }, [onClose, column]);

  // In column mode focus isn't stolen: the sheet beside it is what's being read
  useEffect(() => { if (!column) textareaRef.current?.focus(); }, [item.id, column]);

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

  const msgs = useMemo<Msg[]>(() => {
    const out: Msg[] = [];
    const author = item.addedBy || t.comments.noAuthor;
    const mine = author === user.name;
    if (item.note) {
      out.push({ id: "nota", name: author, image: memberImages[author] ?? null, body: item.note, attachments: [], at: esDateToIso(item.date), mine, original: true });
    }
    if (item.subNote) {
      out.push({ id: "sub", name: author, image: memberImages[author] ?? null, body: item.subNote, attachments: [], at: esDateToIso(item.date), mine, original: true });
    }
    for (const c of comments) {
      const own = c.authorId === user.id;
      out.push({ id: c.id, name: c.authorName, image: c.authorImage, body: c.body, attachments: c.attachments ?? [], at: c.createdAt, mine: own, deletable: own || canManage });
    }
    return out;
  }, [item, comments, user, canManage, memberImages]);

  // On open or when a new message arrives, scroll to the end of the thread
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, item.id]);

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

  const others = memberNames.filter((n) => n && n !== user.name);
  // Ghost rows with the team's real avatars (you included)
  const ghosts = [user.name || user.email, ...others].slice(0, 3).map((n, i) => ({
    name: n, image: n === user.name ? user.image ?? null : memberImages[n] ?? null,
    w1: ["72%", "58%", "80%"][i], w2: ["40%", "66%", "34%"][i],
  }));

  const domain = (() => { try { return new URL(item.web).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const replies = comments.length;

  return (
    <>
      {!column && <div className="cm-backdrop" onClick={onClose} />}
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
            <span className="display cm-drop__title">{t.comments.dropTitle}</span>
            <span className="cm-drop__text">{t.comments.dropText}</span>
          </div>
        )}
        <header className="cm-panel__head">
          <div className="cm-panel__title">
            <span className="display">{column ? t.comments.title : item.name}</span>
            {!column && <a className="cm-panel__link" href={item.web} target="_blank" rel="noopener noreferrer">{domain}{IcArrow}</a>}
          </div>
          <span className="cm-panel__count">{replies === 0 ? t.comments.noReplies : t.comments.replies(replies)}</span>
          <Button variant="icon" onClick={onClose} aria-label={column ? t.comments.hide : t.common.close}>{IcX}</Button>
        </header>

        {designMd && !column && (
          <div className={`cm-md-cta is-${designMd.status}`}>
            <span className="cm-md-cta__icon">{designMd.status === "loading" ? <span className="spinner spinner--sm" /> : IcDoc}</span>
            <span className="cm-md-cta__text">
              {designMd.status === "ready"
                ? t.comments.mdReady
                : designMd.status === "loading"
                  ? t.comments.mdLoading
                  : t.comments.mdNone}
            </span>
            {designMd.status === "ready" && <Button variant="ghost" size="sm" type="button" onClick={designMd.onOpen}>{t.comments.seeSpec}</Button>}
            {designMd.status === "none" && <Button variant="primary" size="sm" type="button" onClick={designMd.onGenerate}>{t.comments.generateMd}</Button>}
          </div>
        )}

        <div ref={listRef} className="cm-list">
          {image && (
            <a className="cm-shot" href={item.web} target="_blank" rel="noopener noreferrer" title={t.comments.openSite}>
              <img src={image} alt="" loading="lazy" />
            </a>
          )}
          {msgs.length === 0 && (
            <div className="cm-empty">
              <div className="cm-empty__ghosts" aria-hidden>
                {ghosts.map((g, i) => (
                  <div key={i} className="cm-empty__ghost" style={{ animationDelay: `${i * 90}ms` }}>
                    <Avatar name={g.name} image={g.image} size={22} />
                    <span className="cm-empty__bars">
                      <span style={{ width: g.w1 }} />
                      <span style={{ width: g.w2 }} />
                    </span>
                  </div>
                ))}
              </div>
              <span className="display cm-empty__title">{t.comments.emptyTitle}</span>
              <span className="cm-empty__text">
                {others.length === 0
                  ? t.comments.emptyAlone
                  : t.comments.emptyWithOthers(listNames(others, t.comments.and), others.length > 1)}
              </span>
              <div className="cm-empty__prompts">
                {t.comments.prompts.map((p) => (
                  <button key={p} type="button" className="chip" onClick={() => { setDraft(p + " "); textareaRef.current?.focus(); }}>{p}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => {
            const prev = msgs[i - 1];
            const grouped = prev && prev.name === m.name && prev.original === m.original && Math.abs(Date.parse(prev.at) - Date.parse(m.at)) < 5 * 60000;
            return (
              <div key={m.id} className={`cm-msg${m.mine ? " is-mine" : ""}${m.original ? " is-original" : ""}${grouped ? " is-grouped" : ""}`}>
                {!grouped && (
                  <div className="cm-msg__head">
                    <Avatar name={m.name} image={m.image} />
                    <span className="cm-msg__name">{m.name}{m.mine && <span className="cm-msg__you">{t.comments.you}</span>}</span>
                    {m.original && <span className="cm-msg__tag">{m.id === "sub" ? t.comments.subComment : t.comments.originalNote}</span>}
                    <span className="cm-msg__time" title={fmtDateTime(m.at, locale)}>{relTime(m.at, now, locale, t)}</span>
                  </div>
                )}
                <div className="cm-msg__row">
                  <div className="cm-msg__content">
                    {m.body && <p className="cm-msg__body">{renderBody(m.body)}</p>}
                    {m.attachments.length > 0 && (
                      <div className={`cm-atts cm-atts--${Math.min(m.attachments.length, 3)}`}>
                        {m.attachments.map((a, j) => (
                          <button
                            key={a.url}
                            type="button"
                            className="cm-att"
                            style={m.attachments.length === 1 && a.w && a.h ? { aspectRatio: `${a.w} / ${a.h}` } : undefined}
                            title={a.name ?? t.comments.seeScreenshot}
                            onClick={() => setLightbox({ list: m.attachments, idx: j })}
                          >
                            <img src={proxiedSrc(a.url)} alt={a.name ?? t.comments.screenshot} loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.deletable && (
                    <button className="cm-msg__del" title={t.comments.deleteComment} onClick={() => onDelete(m.id)}>{IcTrash}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form className="cm-composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Avatar name={user.name || user.email} image={user.image} />
          <div className="cm-composer__box">
            <textarea
              ref={textareaRef}
              className="input cm-composer__input"
              rows={2}
              value={draft}
              placeholder={replies === 0 && !item.note ? t.comments.firstComment : t.comments.reply}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); } }}
            />
            {pending.length > 0 && (
              <div className="cm-files">
                {pending.map((p) => (
                  <div key={p.key} className={`cm-file is-${p.status}`} title={p.status === "error" ? p.error : p.name}>
                    <img src={p.preview} alt="" />
                    {p.status === "uploading" && <span className="spinner spinner--sm" />}
                    {p.status === "error" && <span className="cm-file__err">!</span>}
                    <button type="button" className="cm-file__rm" aria-label={t.comments.removeScreenshot} onClick={() => removePending(p.key)}>{IcX}</button>
                  </div>
                ))}
              </div>
            )}
            <div className="cm-composer__foot">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden
                onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
              <Button variant="icon" type="button" className="cm-composer__attach" title={t.comments.attach} aria-label={t.comments.attach} onClick={() => fileRef.current?.click()}>{IcImage}</Button>
              {error
                ? <span className="cm-composer__error">{error}</span>
                : <span className="cm-composer__hint">{uploading ? t.comments.uploading : t.comments.composerHint}</span>}
              <Button variant="primary" size="sm" type="submit" disabled={!canSend}>
                {sending ? <span className="spinner spinner--sm" /> : <>{t.comments.send} {IcSend}</>}
              </Button>
            </div>
          </div>
        </form>
      </aside>

      {lightbox && (() => {
        const a = lightbox.list[lightbox.idx];
        const many = lightbox.list.length > 1;
        const go = (d: number) => setLightbox({ list: lightbox.list, idx: (lightbox.idx + d + lightbox.list.length) % lightbox.list.length });
        return (
          <div className="cm-lightbox" role="dialog" aria-label={t.comments.screenshot} onClick={() => setLightbox(null)}>
            <Button variant="icon" className="cm-lightbox__close" aria-label={t.common.close} onClick={() => setLightbox(null)}>{IcX}</Button>
            {many && <button className="cm-lightbox__nav is-prev" aria-label={t.comments.previous} onClick={(e) => { e.stopPropagation(); go(-1); }}>{IcChevron}</button>}
            <img
              key={a.url}
              className="cm-lightbox__img"
              src={proxiedSrc(a.url)}
              alt={a.name ?? t.comments.screenshot}
              onClick={(e) => e.stopPropagation()}
            />
            {many && <button className="cm-lightbox__nav is-next" aria-label={t.comments.next} onClick={(e) => { e.stopPropagation(); go(1); }}>{IcChevron}</button>}
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
