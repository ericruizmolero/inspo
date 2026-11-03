"use client";
// A project that is still gathering: it opens on its board, and this bar, joined to the top of the search dock,
// says what the board is for now (bring in what inspires: sites, images, videos), shows what is already in and
// holds the one step out of it. "I have my references" (both at m, the same height: Eric 07-10) takes the team to the system, which reads the board;
// from then on the project opens there. On a project's board it says only how many there are: "The board, add what inspires you"
// repeated what the board and its "+" already say (Andoni, 13-10). The Inbox wears it too, with its own title and line and no step out.
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
  /** The Inbox's name and line; a project's board goes without either */
  title?: string; lead?: string;
}) {
  const { t } = useT();
  const s = t.gather;
  const shown = thumbs.filter((x): x is string => !!x).slice(0, 3);
  return (
    <aside className="gather" aria-label={title ?? s.title}>
      {shown.length > 0 && (
        <span className="gather__thumbs" aria-hidden>{shown.map((src) => <img key={src} src={src} alt="" />)}</span>
      )}
      <div className="gather__text">
        {title
          ? <p className="gather__title"><b className="t-title-s">{title}</b><span>{s.count(count)}</span></p>
          : <p className="gather__title"><b className="t-title-s">{s.count(count)}</b></p>}
        {lead && <p className="gather__lead">{lead}</p>}
      </div>
      {/* One secondary action: the step out when there is one ("I have my references", secondary m with the arrow
          after it), and adding stays the quiet inline "+ Add" beside it. In the Inbox, adding is the one action */}
      {onStart
        ? <Button variant="quiet" icon="plus" className="gather__add" onClick={onAdd}>{s.add}</Button>
        : <Button icon="plus" className="gather__add" onClick={onAdd}>{s.add}</Button>}
      {onStart && <StartButton onStart={onStart} />}
    </aside>
  );
}

/** "I have my references": the step out of gathering to the system. It also sits at the end of the search on a
 *  project's board, where Tino is the bar */
export function StartButton({ onStart, className = "" }: { onStart: () => Promise<void>; className?: string }) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const start = async () => { if (busy) return; setBusy(true); try { await onStart(); } finally { setBusy(false); } };
  return (
    <Button iconEnd="arrow-right" className={`gather__go ${className}`} onClick={() => void start()} disabled={busy}>
      {busy && <Busy label={t.gather.ready} />}{t.gather.ready}
    </Button>
  );
}
