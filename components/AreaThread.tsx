"use client";
// The team talking about one area of the system, under its decision: what they wrote about the area, and what
// they said on the references it draws from (each marked with the reference). Anyone in the workspace writes
// here; whoever wrote a line can take it back.
import { useEffect, useRef, useState } from "react";
import type { InspoItem } from "@/types/inspo";
import type { SystemArea } from "@/types/system";
import type { AreaNote } from "@/lib/area-comments";
import { loadAreaThread, postAreaComment, removeAreaComment } from "@/app/actions/area-comments";
import { timeAgo } from "@/lib/i18n/format";
import { Avatar } from "./CommentsPanel";
import { useT } from "./I18nProvider";

export default function AreaThread({ projectId, area, refs }: {
  projectId: string; area: SystemArea; refs: InspoItem[];
}) {
  const { t, locale } = useT();
  const s = t.areaThread;
  const [notes, setNotes] = useState<AreaNote[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const ids = refs.map((r) => r.id!).filter(Boolean);
  const idsKey = ids.join(",");
  const refOf = (id?: string) => refs.find((r) => r.id === id);

  useEffect(() => {
    let alive = true;
    setNotes(null);
    loadAreaThread(projectId, area, idsKey ? idsKey.split(",") : []).then((r) => { if (!alive) return; if (r.ok) setNotes(r.data); else setError(r.error); });
    return () => { alive = false; };
  }, [projectId, area, idsKey]);
  // The newest line in sight
  useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [notes?.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true); setError("");
    const r = await postAreaComment(projectId, area, body);
    setSending(false);
    if (r.ok) { setNotes((n) => [...(n ?? []), r.data]); setDraft(""); } else setError(r.error);
  };
  const remove = async (id: string) => {
    setNotes((n) => (n ?? []).filter((x) => x.id !== id));
    const r = await removeAreaComment(id);
    if (!r.ok) setError(r.error);
  };

  const people = [...new Map((notes ?? []).map((n) => [n.authorName, n])).values()].slice(0, 4);
  return (
    <section className="ath" aria-label={s.title}>
      <header className="ath-head">
        <span className="ath-title">{s.title}{notes && notes.length > 0 && <span className="ath-count">{notes.length}</span>}</span>
        {people.length > 0 && (
          <span className="ath-people" aria-hidden>{people.map((p) => <Avatar key={p.authorName} name={p.authorName} image={p.authorImage} size={20} />)}</span>
        )}
      </header>
      {notes === null ? (
        <p className="ath-empty"><span className="spinner spinner--sm" /></p>
      ) : notes.length === 0 ? (
        <p className="ath-empty">{s.empty}</p>
      ) : (
        <ol ref={listRef} className="ath-list">
          {notes.map((n) => {
            const ref = n.kind === "ref" ? refOf(n.itemId) : undefined;
            return (
              <li key={n.id} className="ath-note">
                <Avatar name={n.authorName} image={n.authorImage} size={24} />
                <div className="ath-note__body">
                  <p className="ath-note__meta">
                    <b>{n.authorName}</b>
                    {ref && <span className="ath-note__ref">{s.on(ref.name)}</span>}
                    <span>{timeAgo(n.createdAt, locale, t)}</span>
                    {n.mine && <button type="button" className="ath-note__x" onClick={() => void remove(n.id)}>{s.remove}</button>}
                  </p>
                  <p className="ath-note__text">{n.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <form className="ath-form" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <textarea value={draft} rows={2} placeholder={s.placeholder} aria-label={s.placeholder} disabled={sending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} />
        <button type="submit" className="ath-send" disabled={sending || !draft.trim()}>{sending ? <span className="spinner spinner--sm" /> : s.send}</button>
      </form>
      {error && <p className="sysv-error" role="alert">{error}</p>}
    </section>
  );
}
