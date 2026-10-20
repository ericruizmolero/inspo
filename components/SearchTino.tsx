"use client";
// Tino is the search on the boards: he sits in the dock's left end, his ears over its top edge, and when a search
// settles he reports on it in a balloon over himself (the copy sheet's Search): several found, one, or nothing and
// where else to look. The × closes the balloon and clears the search. While the person types he only follows; while
// the search reads he thinks, and the bar says how much he is going through.
import { useEffect, useRef, useState } from "react";
import Tino from "./Tino";
import type { TinoApi, TinoState } from "./tino/engine";
import { Balloon, Button, Icon } from "@/components/criterio";
import { useDark, useLine } from "./HomeTino";
import { filterKey, type Filter } from "@/lib/search-query";
import { filterLabel } from "./SearchBar";
import { useT } from "./I18nProvider";
import type { Dict } from "@/lib/i18n/en";
import "./SearchTino.css";

/** How long the search must sit still before Tino reports: while the person types, he stays quiet */
const SETTLE_MS = 700;
/** How long a search can take before he says there is a lot to look at */
const SLOW_MS = 3000;

/** What Tino says when a search settles. `key` is the search itself, so a new one is answered with a new line */
export type SearchReport = { key: string; title: readonly string[]; text: string; found: number; act?: string };

/** How Tino names the search in his sentence: who saved it, when, what it has, or what it is about */
function whatOf(filters: Filter[], text: string, t: Dict): string {
  const w = t.tino.what;
  const parts = filters.map((f) => (f.kind === "person" ? w.by(f.value) : f.kind === "date" ? w.from(filterLabel(f, t)) : w.with(filterLabel(f, t).toLowerCase())));
  if (text.trim()) parts.push(w.about(text.trim()));
  return parts.join(" ");
}

/** The report for a settled search, or null when there is no search */
export function searchReport(filters: Filter[], text: string, found: { name: string }[], inbox: number, t: Dict): SearchReport | null {
  if (!filters.length && !text.trim()) return null;
  const s = t.tino, what = whatOf(filters, text, t);
  const key = `${filters.map(filterKey).join("+")}|${text.trim()}`;
  if (!found.length) return { key: `none:${key}`, title: s.noneTitle, text: s.noneText(what, inbox), found: 0, act: inbox ? s.lookInbox : undefined };
  if (found.length === 1) return { key: `one:${key}`, title: s.oneTitle, text: s.oneText(found[0].name, what), found: 1 };
  return { key: `several:${key}`, title: s.severalTitle, text: s.severalText(found.length, what, found.map((i) => i.name)), found: found.length };
}

/** True once `on` has held for `ms` */
export function useAfter(on: boolean, ms: number, key?: string): boolean {
  const [held, setHeld] = useState<string | null>(null);
  const id = `${on}|${key ?? ""}`;
  useEffect(() => {
    if (!on) return;
    const timer = window.setTimeout(() => setHeld(id), ms);
    return () => window.clearTimeout(timer);
  }, [on, ms, id]);
  return on && held === id;
}

/** The line in the dock's status bar while a search reads: how much he is going through, then that it is a lot */
export function useSearchingLine(busy: boolean, total: number): string {
  const { t } = useT();
  return useAfter(busy, SLOW_MS) ? t.tino.searchSlow : t.tino.searching(total);
}

export default function SearchTino({ report, busy, typing, onClose, onAct }: {
  report: SearchReport | null;
  /** The search is still reading (meaning, Jev) */
  busy: boolean;
  /** The field has the focus and words in it */
  typing: boolean;
  /** The ×: closes the balloon and clears the search */
  onClose: () => void;
  /** The report's one way elsewhere (nothing found: the inbox) */
  onAct?: () => void;
}) {
  const { t } = useT();
  const dark = useDark();
  const tino = useRef<TinoApi>(null);
  const settled = useAfter(!!report && !busy, SETTLE_MS, report?.key);
  const shown = settled ? report : null;
  const title = useLine(shown?.key, shown?.title);
  const state: TinoState = busy ? "pensando" : shown ? (shown.found ? "aprueba" : "curiosa") : typing || report ? "leyendo" : "reposo";
  // A find gets a small hop, never a party
  useEffect(() => { if (shown?.found) tino.current?.jump(0.6); }, [shown?.key, shown?.found]);
  return (
    <div className="sb-tino">
      {shown && title && (
        <Balloon key={shown.key} className="sb-tino__say" tail="left"
          title={<><span className="sb-tino__who">Tino</span><span>{title}</span></>}
          actions={shown.act && onAct ? <Button size="s" onClick={onAct}>{shown.act}</Button> : null}>
          {shown.text}
          <button type="button" className="cr-window-close sb-tino__close" aria-label={t.tino.closeSearch} onClick={onClose}>
            <Icon name="close" size={10} weight="bold" />
          </button>
        </Balloon>
      )}
      <span className="sb-tino__body" aria-hidden>
        <Tino ref={tino} state={state} dark={dark} look={[110, 0]} petting={false} />
      </span>
    </div>
  );
}
