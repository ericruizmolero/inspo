"use client";
// The team talking about one area of the system, under its decision: what they wrote about the area, and what
// they said on the references it draws from (each marked with the reference). Anyone in the workspace writes
// here; whoever wrote a line can take it back. A line can point at what it talks about: the option being tried
// on the sample when it was written (touching it puts the sample back on that option) or one of the references.
import { useEffect, useRef, useState } from "react";
import type { InspoItem } from "@/types/inspo";
import type { SystemArea } from "@/types/system";
import type { AreaAbout, AreaNote } from "@/lib/area-comments";
import { useSampleChoices, type SampleChoices } from "./SystemSample";
import { loadAreaThread, postAreaComment, removeAreaComment } from "@/app/actions/area-comments";
import { timeAgo } from "@/lib/i18n/format";
import { Avatar } from "./CommentsPanel";
import { useT } from "./I18nProvider";

/** The sample's classic curves (components/SystemSample.tsx PRESETS), read by their name */
const CLASSICS: Record<string, string> = { "cubic-bezier(0.23, 1, 0.32, 1)": "ease-out", "cubic-bezier(0.77, 0, 0.175, 1)": "ease-in-out", "cubic-bezier(0.34, 1.56, 0.64, 1)": "spring" };

/** The option the sample is wearing for this area, as a line can point at it; null when the area has none */
function optionOf(area: SystemArea, c: SampleChoices): { choice: Partial<SampleChoices>; label: string } | null {
  const pick = <K extends keyof SampleChoices>(...keys: K[]) => Object.fromEntries(keys.filter((k) => c[k] !== undefined).map((k) => [k, c[k]])) as Partial<SampleChoices>;
  if (area === "motion" && c.easing) {
    const curve = CLASSICS[c.easing] ?? (c.easing.startsWith("cubic-bezier(") ? c.easing.slice(12) : c.easing);
    return { choice: pick("easing", "durationMs"), label: c.durationMs ? `${curve} · ${c.durationMs} ms` : curve };
  }
  if (area === "color" && (c.bg || c.ink || c.accent)) return { choice: pick("bg", "ink", "accent", "light"), label: [c.bg, c.ink, c.accent].filter(Boolean).join(" / ") };
  if (area === "layout" && c.radius) return { choice: pick("radius"), label: `radius ${c.radius}` };
  if (area === "voice" && c.headline) return { choice: pick("headline", "subline"), label: `\u201c${c.headline.length > 40 ? `${c.headline.slice(0, 40)}\u2026` : c.headline}\u201d` };
  return null;
}
const isChoice = (a?: AreaAbout): a is Extract<AreaAbout, { choice: unknown }> => !!a && "choice" in a;

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
  const [tried, setChoice] = useSampleChoices(projectId);
  const option = optionOf(area, tried);
  // What the next line points at: the option on the sample (by default, when there is one), a reference, or nothing
  const [pointAt, setPointAt] = useState<"option" | string | null>("option");
  const about: AreaAbout | undefined = pointAt === "option" ? (option ? { choice: option.choice as Record<string, string | number | boolean>, label: option.label } : undefined)
    : pointAt ? { itemId: pointAt } : undefined;
  const wearing = (a: Extract<AreaAbout, { choice: unknown }>) => Object.entries(a.choice).every(([k, v]) => tried[k as keyof SampleChoices] === v);
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
    const r = await postAreaComment(projectId, area, body, about);
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
            const ref = n.kind === "ref" ? refOf(n.itemId) : n.about && "itemId" in n.about ? refOf(n.about.itemId) : undefined;
            const opt = isChoice(n.about) ? n.about : undefined;
            return (
              <li key={n.id} className="ath-note">
                <Avatar name={n.authorName} image={n.authorImage} size={24} />
                <div className="ath-note__body">
                  <p className="ath-note__meta">
                    <b>{n.authorName}</b>
                    {ref && <span className="ath-note__ref">{s.on(ref.name)}</span>}
                    {n.about && "pin" in n.about && <span className="ath-note__ref">{s.on(`\u00ab${n.about.pin.quote.length > 48 ? `${n.about.pin.quote.slice(0, 47)}\u2026` : n.about.pin.quote}\u00bb`)}</span>}
                    <span>{timeAgo(n.createdAt, locale, t)}</span>
                    {n.mine && <button type="button" className="ath-note__x" onClick={() => void remove(n.id)}>{s.remove}</button>}
                  </p>
                  {opt && (
                    <button type="button" className={`ath-tag${wearing(opt) ? " is-on" : ""}`} title={s.tryIt} onClick={() => setChoice(opt.choice as Partial<SampleChoices>)}>
                      <i aria-hidden />{opt.label}
                    </button>
                  )}
                  {n.about && "proposal" in n.about && (
                    <p className={`ath-proposal is-${n.about.proposal.state}`}><b>{t.doc.proposal} ({t.system.md.states[n.about.proposal.state]})</b> {n.about.proposal.decision}</p>
                  )}
                  {!(n.about && "proposal" in n.about && n.body === n.about.proposal.decision) && <p className="ath-note__text">{n.body}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <form className="ath-form" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        {(option || refs.length > 0) && (
          <div className="ath-about" role="group" aria-label={s.about}>
            <span>{s.about}</span>
            {option && <button type="button" className={`ath-tag${pointAt === "option" ? " is-on" : ""}`} aria-pressed={pointAt === "option"} onClick={() => setPointAt(pointAt === "option" ? null : "option")}><i aria-hidden />{option.label}</button>}
            {refs.map((r) => <button key={r.id} type="button" className={`ath-tag ath-tag--ref${pointAt === r.id ? " is-on" : ""}`} aria-pressed={pointAt === r.id} onClick={() => setPointAt(pointAt === r.id ? null : r.id!)}>{r.name}</button>)}
          </div>
        )}
        <textarea value={draft} rows={2} placeholder={s.placeholder} aria-label={s.placeholder} disabled={sending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} />
        <button type="submit" className="ath-send" disabled={sending || !draft.trim()}>{sending ? <span className="spinner spinner--sm" /> : s.send}</button>
      </form>
      {error && <p className="sysv-error" role="alert">{error}</p>}
    </section>
  );
}
