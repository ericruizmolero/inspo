"use client";
// A project that is still gathering: it opens on its board, and this bar, joined to the top of the search dock,
// says what the board is for now (bring in what inspires: sites, images, videos), shows what is already in and
// holds the one step out of it. "I have my references" takes the team to the system, which reads the board;
// from then on the project opens there. The Inbox wears it too, with its own title and line and no step out.
import { useState } from "react";
import { useT } from "./I18nProvider";
import { Busy, Button } from "@/components/criterio";
import "./GatherBar.css";

export default function GatherBar({ count, thumbs, onAdd, onStart, title, lead }: {
  count: number;
  /** The latest references' pictures, newest first (null: one without a picture yet) */
  thumbs: (string | null)[];
  onAdd: () => void;
  /** The step out to the system; without it (the Inbox) the bar only adds */
  onStart?: () => Promise<void>;
  title?: string; lead?: string;
}) {
  const { t } = useT();
  const s = t.gather;
  const [busy, setBusy] = useState(false);
  const start = async () => { if (busy || !onStart) return; setBusy(true); try { await onStart(); } finally { setBusy(false); } };
  const shown = thumbs.filter((x): x is string => !!x).slice(0, 3);
  return (
    <aside className="gather" aria-label={title ?? s.title}>
      {shown.length > 0 && (
        <span className="gather__thumbs" aria-hidden>{shown.map((src) => <img key={src} src={src} alt="" />)}</span>
      )}
      <div className="gather__text">
        <p className="gather__title"><b className="t-title-s">{title ?? s.title}</b><span>{s.count(count)}</span></p>
        <p className="gather__lead">{lead ?? s.lead}</p>
      </div>
      {/* One secondary action: the step out when there is one ("I have my references", secondary m with the arrow
          after it), and adding stays the quiet inline "+ Add" beside it. In the Inbox, adding is the one action */}
      {onStart
        ? <Button variant="quiet" icon="plus" className="gather__add" onClick={onAdd}>{s.add}</Button>
        : <Button icon="plus" className="gather__add" onClick={onAdd}>{s.add}</Button>}
      {onStart && (
        <Button iconEnd="arrow-right" className="gather__go" onClick={() => void start()} disabled={busy}>
          {busy && <Busy label={s.ready} />}{s.ready}
        </Button>
      )}
    </aside>
  );
}
