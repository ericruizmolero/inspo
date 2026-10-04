"use client";

// The reference itself (a page's capture, or an image), with the team's pinned comments stuck on it like post-its. A click anywhere on the page
// opens a blank one at that spot; it pins with ↵. Each keeps its place as a fraction of the page, plus the
// page height it was pinned on, so a new capture of a longer page doesn't move it. A post-it is a comment
// like any other: it carries the number it has in the comments column, shows its latest replies and takes
// new ones in place. The whole thread is also in the column.

import { useEffect, useMemo, useRef, useState } from "react";
import type { InspoComment, CommentAnchor } from "@/types/inspo";
import type { SessionUser } from "@/lib/workspace-core";
import { useT } from "./I18nProvider";
import { Avatar } from "./CommentsPanel";
import { timeAgo } from "@/lib/i18n/format";

const IcX = (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
);

/** A small, stable tilt per note: paper never sits perfectly square */
function tiltOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return ((h % 7) - 3) * 0.45;
}

/** Page height in 1440px-wide pixels: the unit a pin remembers */
const at1440 = (img: HTMLImageElement) => Math.round((img.naturalHeight * 1440) / (img.naturalWidth || 1440));

/** An image taller than this (in 1440px-wide pixels) is read like a page, by scrolling; shorter, it is shown whole */
const FIT_MAX_H = 3200;

/** Replies shown on the paper; the rest wait in the comments column */
const SHOWN_REPLIES = 3;

export default function PageNotes({ src, alt, fit, notes, user, canManage, onPin, onDelete, pins = {}, replies = {}, focusId, onFocus, onReply }: {
  /** The page image, or null when there is no capture yet */
  src: string | null;
  alt: string;
  /** An image: shown whole and centred, at the size the card allows, instead of across its width */
  fit?: boolean;
  /** Only the comments pinned on the page; all of them, with their replies, are in the comments column */
  notes: InspoComment[];
  user: SessionUser;
  canManage: boolean;
  onPin: (body: string, anchor: CommentAnchor) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Each pinned comment's number, the same as in the comments column */
  pins?: Record<string, number>;
  /** Each one's replies, oldest first */
  replies?: Record<string, InspoComment[]>;
  /** The comment picked in the column: its post-it comes to the front and into view */
  focusId?: string | null;
  /** Opens a post-it's thread in the comments column */
  onFocus?: (id: string) => void;
  /** Answers a post-it from the paper itself */
  onReply?: (parentId: string, body: string) => Promise<void>;
}) {
  const { t, locale } = useT();
  const [pageH, setPageH] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number; text: string; sending: boolean; error?: string } | null>(null);
  const [front, setFront] = useState<string | null>(null);
  // The reply being written on a post-it
  const [reply, setReply] = useState<{ id: string; text: string; sending: boolean; error?: string } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // A comment picked in the column: its post-it comes to the front and into view
  useEffect(() => {
    if (!focusId) return;
    setFront(focusId);
    const el = pageRef.current?.querySelector<HTMLElement>(`[data-note="${CSS.escape(focusId)}"]`);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
  }, [focusId]);

  // A new page (another item, or the real capture replacing the quick one): measure it again
  useEffect(() => {
    setPageH(null); setFailed(false); setDraft(null);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setPageH(at1440(img));
  }, [src]);

  const place = (a: CommentAnchor) => {
    // The pin's distance from the top, in the page it was pinned on, over the page shown now
    const top = pageH ? Math.min(1, (a.y * a.h) / pageH) : a.y;
    return { left: `${a.x * 100}%`, top: `${top * 100}%`, flip: a.x > 0.6 };
  };

  const onPageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pageH || hidden) return;
    if ((e.target as Element).closest(".postit")) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    // A blank draft moves to the new spot; one with words stays where it was started
    if (draft?.text.trim()) return;
    setDraft({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), text: "", sending: false });
  };

  const sendReply = async () => {
    if (!reply || !onReply || reply.sending) return;
    const body = reply.text.trim();
    if (!body) { setReply(null); return; }
    setReply({ ...reply, sending: true, error: undefined });
    try {
      await onReply(reply.id, body);
      closeReply(reply.id);
    } catch (e) {
      setReply((r) => r && { ...r, sending: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  // The keyboard's way to pin: a draft in the middle of the part of the page in view
  const pinInView = () => {
    const page = pageRef.current;
    if (!page || !pageH || hidden) return;
    const r = page.getBoundingClientRect();
    const top = Math.max(r.top, 0), bottom = Math.min(r.bottom, window.innerHeight);
    const y = r.height ? ((top + bottom) / 2 - r.top) / r.height : 0.5;
    setDraft({ x: 0.5, y: Math.max(0, Math.min(1, y)), text: "", sending: false });
  };

  // When the draft closes (pinned or dropped), the keyboard goes back to "Pin a note"
  const closeDraft = () => {
    setDraft(null);
    requestAnimationFrame(() => pageRef.current?.closest(".pn-wrap")?.querySelector<HTMLElement>("[data-pin-note]")?.focus());
  };

  // When a post-it's reply field closes, the keyboard goes back to its Reply link
  const closeReply = (id: string) => {
    setReply(null);
    requestAnimationFrame(() => pageRef.current?.querySelector<HTMLElement>(`[data-reply-for="${CSS.escape(id)}"]`)?.focus());
  };

  const submit = async () => {
    if (!draft || !pageH || draft.sending) return;
    const body = draft.text.trim();
    if (!body) { setDraft(null); return; }
    setDraft({ ...draft, sending: true, error: undefined });
    try {
      await onPin(body, { x: draft.x, y: draft.y, h: pageH });
      closeDraft();
    } catch (e) {
      setDraft((d) => d && { ...d, sending: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  const sorted = useMemo(() => [...notes].sort((a, b) => (a.anchor!.y - b.anchor!.y)), [notes]);

  return (
    <div className="pn-wrap">
      {/* No window around it: the reference is what is looked at. What can be done to it floats in a corner */}
      <div className="pn-tools">
        {src && !failed && !!pageH && !hidden && !draft && (
          <button type="button" className="pn-tools__btn" data-pin-note onClick={pinInView}>{t.panel.addNote}</button>
        )}
        {notes.length > 0 && (
          <button type="button" className="pn-tools__btn" onClick={() => setHidden((h) => !h)} aria-pressed={hidden}>
            <i className="pn-tools__dot" aria-hidden />{hidden ? t.panel.showNotes : t.panel.hideNotes}<span className="pn-tools__count">{notes.length}</span>
          </button>
        )}
      </div>
      <div className={`pn${fit && !(pageH && pageH > FIT_MAX_H) ? " is-fit" : ""}`}>

      {src && !failed ? (
        <div ref={pageRef} className={`pn-page${pageH && !hidden ? " is-pinnable" : ""}${hidden ? " is-hidden-notes" : ""}`} onClick={onPageClick}>
          {!pageH && <div className="shimmer" />}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={pageH ? "is-loaded" : ""}
            onLoad={(e) => setPageH(at1440(e.currentTarget))}
            onError={() => setFailed(true)}
            draggable={false}
          />
          {!!pageH && !hidden && sorted.map((c) => {
            const p = place(c.anchor!);
            const mine = c.authorId === user.id;
            const older = Math.abs(c.anchor!.h - pageH) > 40;
            return (
              <div key={c.id} data-note={c.id} className={`postit${p.flip ? " is-flipped" : ""}${front === c.id ? " is-front" : ""}${focusId === c.id ? " is-focus" : ""}`}
                style={{ left: p.left, top: p.top, "--tilt": `${tiltOf(c.id)}deg` } as React.CSSProperties}
                onPointerDown={() => setFront(c.id)}>
                <i className="postit__pin" aria-hidden />
                <div className="postit__paper">
                  <div className="postit__head">
                    {pins[c.id] !== undefined && (onFocus
                      ? <button type="button" className="postit__num" onClick={() => onFocus(c.id)} aria-label={t.comments.openThread(pins[c.id])} title={t.comments.openThread(pins[c.id])}>{pins[c.id]}</button>
                      : <span className="postit__num" aria-hidden>{pins[c.id]}</span>)}
                    <Avatar name={c.authorName} image={c.authorImage} size={16} />
                    <span className="postit__who" title={c.authorName}>{c.authorName}</span>
                    <span className="postit__when">{timeAgo(c.createdAt, locale, t)}</span>
                    {(mine || canManage) && (
                      <button type="button" className="postit__del" onClick={() => onDelete(c.id)} aria-label={t.panel.deleteNote} title={t.panel.deleteNote}>{IcX}</button>
                    )}
                  </div>
                  <p className="postit__body">{c.body}</p>
                  {older && <span className="postit__older">{t.panel.olderCapture}</span>}
                  {(() => {
                    const rs = replies[c.id] ?? [];
                    const earlier = rs.length - SHOWN_REPLIES;
                    const writing = reply?.id === c.id;
                    if (!rs.length && !onReply) return null;
                    return (
                      <div className="postit__replies">
                        {earlier > 0 && (
                          <button type="button" className="postit__link" onClick={() => onFocus?.(c.id)} disabled={!onFocus}>{t.comments.earlier(earlier)}</button>
                        )}
                        {rs.slice(-SHOWN_REPLIES).map((r) => (
                          <div key={r.id} className="postit__reply">
                            <Avatar name={r.authorName} image={r.authorImage} size={14} />
                            <p><b>{r.authorName.split(" ")[0]}</b> {r.body}</p>
                          </div>
                        ))}
                        {onReply && (writing ? (
                          <>
                            <textarea
                              className="postit__input postit__input--reply"
                              autoFocus
                              rows={2}
                              value={reply.text}
                              disabled={reply.sending}
                              placeholder={t.comments.reply}
                              aria-label={t.comments.reply}
                              onChange={(e) => setReply({ ...reply, text: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
                                if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeReply(c.id); }
                              }}
                              onBlur={() => { if (!reply.text.trim()) setReply(null); }}
                            />
                            <div className="postit__foot">
                              {reply.error ? <span className="postit__error">{reply.error}</span> : <span>{t.comments.replyKeys}</span>}
                              <button type="button" className="postit__send" onMouseDown={(e) => e.preventDefault()} onClick={sendReply} disabled={reply.sending || !reply.text.trim()}>
                                {reply.sending ? <span className="spinner spinner--sm" /> : t.comments.send}
                              </button>
                            </div>
                          </>
                        ) : (
                          <button type="button" className="postit__link" data-reply-for={c.id} onClick={() => { setFront(c.id); setReply({ id: c.id, text: "", sending: false }); }}>{t.comments.replyTo}</button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
          {!!pageH && draft && (
            <div className={`postit is-draft is-front${draft.x > 0.6 ? " is-flipped" : ""}`} style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, "--tilt": "0deg" } as React.CSSProperties}>
              <i className="postit__pin" aria-hidden />
              <div className="postit__paper">
                <div className="postit__head">
                  <Avatar name={user.name || user.email} image={user.image} size={16} />
                  <span className="postit__who">{user.name || user.email}</span>
                </div>
                <textarea
                  className="postit__input"
                  autoFocus
                  rows={3}
                  value={draft.text}
                  disabled={draft.sending}
                  placeholder={t.panel.notePlaceholder}
                  onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
                    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeDraft(); }
                  }}
                  onBlur={() => { if (!draft.text.trim()) setDraft(null); }}
                />
                <div className="postit__foot">
                  {draft.error ? <span className="postit__error">{draft.error}</span> : <span>{t.panel.keysHint}</span>}
                  <button type="button" className="postit__send" onMouseDown={(e) => e.preventDefault()} onClick={submit} disabled={draft.sending || !draft.text.trim()}>
                    {draft.sending ? <span className="spinner spinner--sm" /> : t.panel.pin}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="pn-empty">{t.panel.noCapture}</div>
      )}

      {src && !failed && !!pageH && !hidden && !draft && <div className="pn-hint" aria-hidden>{t.panel.pinHint}</div>}
      </div>
    </div>
  );
}
