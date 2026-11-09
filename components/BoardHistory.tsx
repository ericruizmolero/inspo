"use client";
// The board's version history, as Google Sheets has it (Eric, 09-11: "como un historial de versiones como hace google
// sheets"), drawn with what the system's versions already use (components/VersionPicker.tsx, its .vpk-* rows and bar):
// a clock in the top bar opens the list, a face per version on the thread; picking one shows the board as it was,
// with what came in marked, and a bar over it to walk the versions, restore that one, or go back to now.
import { useEffect, useMemo, useState } from "react";
import { boardVersions } from "@/app/actions/board-versions";
import type { BoardVersionRow } from "@/lib/board-versions";
import { timeAgo } from "@/lib/i18n/format";
import { Avatar, Busy, Button, Icon, IconButton, toneFor } from "@/components/criterio";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import "./VersionPicker.css";
import "./BoardHistory.css";

/** The project's board versions, newest first, read again whenever `stamp` moves (the board changed) */
export function useBoardVersions(projectId: string | null, stamp: unknown): BoardVersionRow[] | null {
  const [rows, setRows] = useState<BoardVersionRow[] | null>(null);
  useEffect(() => {
    if (!projectId) { setRows(null); return; }
    let live = true;
    void boardVersions(projectId).then((r) => { if (live) setRows(r.ok ? r.data : []); });
    return () => { live = false; };
  }, [projectId, stamp]);
  return rows;
}

function useRowText() {
  const { t, locale } = useT();
  const s = t.boardVersions;
  const how = (via: string) => via === "start" ? s.start : via === "polish" ? s.via.polish
    : via.startsWith("restore:") ? s.via.restore(Number(via.slice(8))) : via.startsWith("mcp:") ? s.via.mcp(via.slice(4) || "MCP") : s.via.app;
  return {
    s,
    how: (r: BoardVersionRow) => how(r.via),
    when: (r: BoardVersionRow) => timeAgo(r.at, locale, t),
    change: (r: BoardVersionRow) => r.via === "start" ? s.count(r.count) : s.change(r.added.length, r.removed.length),
  };
}

/** Who made a version: their photo or initials; the board before the first change has the history's own clock */
function Face({ row, size = 24 }: { row: BoardVersionRow; size?: number }) {
  if (!row.byName) return <span className="vpk-rail--file bh-start" style={{ width: size, height: size }}><Icon name="history" size={size - 6} /></span>;
  const initials = row.byName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <Avatar src={row.byImage} tone={toneFor(row.byName)} size={size} name={row.byName} initials={initials} className="vpk-face" />;
}

/** The clock in the top bar, opening the versions: the live board on top, then each version with who, what and when */
export function BoardHistoryButton({ rows, viewing, onPick }: { rows: BoardVersionRow[] | null; viewing: number | null; onPick: (n: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const { s, how, when, change } = useRowText();
  const pick = (n: number | null) => { setOpen(false); onPick(n); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<IconButton icon="history" label={s.pick} variant="quiet" active={viewing !== null} className="bh-trigger" />} />
      <PopoverContent align="end" className="cr-menu vpk-menu">
        <p className="bh-title">{s.title}</p>
        {rows === null ? <p className="vpk-loading bh-pad" role="status"><Busy label={s.pick} /></p>
          : !rows.length ? <p className="bh-empty">{s.empty}</p> : (
          <ol className="vpk-list">
            {/* Every change is kept, so the newest version is the board as it is: it says "now" and picking it goes back */}
            {rows.map((r, i) => { const on = i === 0 ? viewing === null : viewing === r.n; return (
              <li key={r.n} className="vpk-item"><button type="button" className={`vpk-row${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => pick(i === 0 ? null : r.n)}>
                <span className="vpk-rail"><Face row={r} /></span>
                <span className="vpk-row__main">
                  <span className="vpk-row__who">{r.byName ? <><b>{r.byName}</b> {how(r)}</> : <b>{how(r)}</b>}</span>
                  <span className="vpk-row__areas"><span className="vpk-row__areas-text">{change(r)}</span></span>
                </span>
                <span className="vpk-row__meta"><b>v{r.n}</b><span>{i === 0 ? s.now : when(r)}</span></span>
              </button></li>
            ); })}
          </ol>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Over the board while a version is looked at: walk them (and ← →), restore this one, or go back to now (Escape) */
export function BoardVersionBar({ n, rows, restoring, onPick, onRestore }: {
  n: number; rows: BoardVersionRow[]; restoring: boolean; onPick: (n: number | null) => void; onRestore: () => void;
}) {
  const { s, how, when, change } = useRowText();
  const ns = useMemo(() => rows.map((r) => r.n).sort((a, b) => a - b), [rows]);
  const at = ns.indexOf(n);
  const prev = at > 0 ? ns[at - 1] : null;
  const next = at >= 0 && at < ns.length - 1 ? ns[at + 1] : null;
  const row = rows.find((r) => r.n === n);
  const latest = next === null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "ArrowLeft" && prev !== null) onPick(prev);
      else if (e.key === "ArrowRight") onPick(next);
      else if (e.key === "Escape") onPick(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onPick]);

  return (
    <div className="vpk-bar bh-bar">
      <IconButton icon="chevron-left" variant="quiet" size="s" label={s.prev} disabled={prev === null} onClick={() => prev !== null && onPick(prev)} />
      {row && <Face row={row} size={28} />}
      <div className="vpk-bar__text">
        <p className="vpk-bar__title">{s.viewing(n)}{row && <span className="vpk-bar__when"> {when(row)}</span>}</p>
        {row && <p className="vpk-bar__what">{row.byName ? `${row.byName}${how(row) ? ` ${how(row)}` : ""}. ` : ""}{change(row)}</p>}
      </div>
      <IconButton icon="chevron-right" variant="quiet" size="s" label={s.next} onClick={() => onPick(next)} />
      <div className="vpk-bar__actions">
        {/* The latest version is the board as it is: nothing to restore */}
        {!latest && <Button variant="secondary" size="s" onClick={onRestore} disabled={restoring}>{restoring ? s.restoring : s.restore}</Button>}
        <Button variant="quiet" size="s" onClick={() => onPick(null)}>{s.back}</Button>
      </div>
    </div>
  );
}

/** The bar's height, which the board makes room for over the cards (Grid's headHeight) */
export const BOARD_VERSION_BAR_H = 60;
