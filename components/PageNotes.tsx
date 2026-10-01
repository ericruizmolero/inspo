"use client";

// The whole page, with the team's notes stuck on it like post-its. A click anywhere on the page
// opens a blank one at that spot; it pins with ↵. Each note keeps its place as a fraction of the
// page, plus the page height it was pinned on, so a new capture of a longer page doesn't move it.

import { useEffect, useMemo, useRef, useState } from "react";
import type { InspoComment, CommentAnchor } from "@/types/inspo";
import type { SessionUser } from "@/lib/workspace-core";
import { useT } from "./I18nProvider";
import { Avatar } from "./CommentsPanel";
import { timeAgo } from "@/lib/i18n/format";

const IcX = (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
);
const IcLock = (
  <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor"><path d="M2 4V3a2.5 2.5 0 015 0v1h.5a1 1 0 011 1v3.5a1 1 0 01-1 1h-6a1 1 0 01-1-1V5a1 1 0 011-1H2zm1 0h3V3a1.5 1.5 0 00-3 0v1z" /></svg>
);

/** A small, stable tilt per note: paper never sits perfectly square */
function tiltOf(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return ((h % 7) - 3) * 0.45;
}

/** Page height in 1440px-wide pixels: the unit a pin remembers */
const at1440 = (img: HTMLImageElement) => Math.round((img.naturalHeight * 1440) / (img.naturalWidth || 1440));

export default function PageNotes({ src, alt, host, dark, notes, user, canManage, onPin, onDelete }: {
  /** The page image, or null when there is no capture yet */
  src: string | null;
  alt: string;
  host: string;
  /** The site is dark: the window bar follows */
  dark?: boolean;
  /** Only the notes pinned on the page; the rest of the thread lives in its own column */
  notes: InspoComment[];
  user: SessionUser;
  canManage: boolean;
  onPin: (body: string, anchor: CommentAnchor) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { t, locale } = useT();
  const [pageH, setPageH] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number; text: string; sending: boolean; error?: string } | null>(null);
  const [front, setFront] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

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

  const submit = async () => {
    if (!draft || !pageH || draft.sending) return;
    const body = draft.text.trim();
    if (!body) { setDraft(null); return; }
    setDraft({ ...draft, sending: true, error: undefined });
    try {
      await onPin(body, { x: draft.x, y: draft.y, h: pageH });
      setDraft(null);
    } catch (e) {
      setDraft((d) => d && { ...d, sending: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  const sorted = useMemo(() => [...notes].sort((a, b) => (a.anchor!.y - b.anchor!.y)), [notes]);

  return (
    <div className="pn">
      <div className={`pn-bar${dark ? " is-dark" : ""}`}>
        <span className="dm-frame__lights" aria-hidden><i /><i /><i /></span>
        <span className="pn-bar__url">{IcLock}<span>{host}</span></span>
        <span className="pn-bar__end">
          {notes.length > 0 && (
            <button type="button" className="pn-bar__toggle" onClick={() => setHidden((h) => !h)} aria-pressed={hidden}>
              <i className="pn-bar__dot" aria-hidden />{hidden ? t.panel.showNotes : t.panel.hideNotes}<span className="pn-bar__count">{notes.length}</span>
            </button>
          )}
        </span>
      </div>

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
              <div key={c.id} className={`postit${p.flip ? " is-flipped" : ""}${front === c.id ? " is-front" : ""}`}
                style={{ left: p.left, top: p.top, "--tilt": `${tiltOf(c.id)}deg` } as React.CSSProperties}
                onPointerDown={() => setFront(c.id)}>
                <i className="postit__pin" aria-hidden />
                <div className="postit__paper">
                  <div className="postit__head">
                    <Avatar name={c.authorName} image={c.authorImage} size={16} />
                    <span className="postit__who">{c.authorName}</span>
                    <span className="postit__when">{timeAgo(c.createdAt, locale, t)}</span>
                    {(mine || canManage) && (
                      <button type="button" className="postit__del" onClick={() => onDelete(c.id)} aria-label={t.panel.deleteNote} title={t.panel.deleteNote}>{IcX}</button>
                    )}
                  </div>
                  <p className="postit__body">{c.body}</p>
                  {older && <span className="postit__older">{t.panel.olderCapture}</span>}
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
                    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDraft(null); }
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
  );
}
