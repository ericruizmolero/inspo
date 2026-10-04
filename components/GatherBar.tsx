"use client";
// A project that is still gathering: it opens on its board, and this bar, joined to the top of the search dock,
// says what the board is for now (bring in what inspires: sites, images, videos), shows what is already in and
// holds the one step out of it. "I have my references" takes the team to the system, which reads the board;
// from then on the project opens there.
import { useState } from "react";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import "./GatherBar.css";

export default function GatherBar({ count, thumbs, onAdd, onStart }: {
  count: number;
  /** The latest references' pictures, newest first (null: one without a picture yet) */
  thumbs: (string | null)[];
  onAdd: () => void; onStart: () => Promise<void>;
}) {
  const { t } = useT();
  const s = t.gather;
  const [busy, setBusy] = useState(false);
  const start = async () => { if (busy) return; setBusy(true); try { await onStart(); } finally { setBusy(false); } };
  const shown = thumbs.filter((x): x is string => !!x).slice(0, 3);
  return (
    <aside className="gather" aria-label={s.title}>
      {shown.length > 0 && (
        <span className="gather__thumbs" aria-hidden>{shown.map((src) => <img key={src} src={src} alt="" />)}</span>
      )}
      <div className="gather__text">
        <p className="gather__title"><b>{s.title}</b><span>{s.count(count)}</span></p>
        <p className="gather__lead">{s.lead}</p>
      </div>
      <button type="button" className="gather__add" onClick={onAdd}>{Icons.plus} {s.add}</button>
      <button type="button" className="gather__go" onClick={() => void start()} disabled={busy}>
        {busy && <span className="spinner spinner--sm" />}{s.ready} <i aria-hidden>{Icons.arrow}</i>
      </button>
    </aside>
  );
}
