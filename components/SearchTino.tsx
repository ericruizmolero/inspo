"use client";
// Tino is the search on the boards: he sits in the bottom-right corner as on the home (TinoCorner), and when a search
// settles he reports on it in his balloon (the copy sheet's Search): several found, one, or nothing and
// where else to look. The × closes the balloon and clears the search. With no search on, he brings up what the
// board could use next (the nudges), one at a time, as on the home. While the person types he only follows; while
// the search reads he thinks, and the bar says how much he is going through.
import { useEffect, useRef, useState } from "react";
import Typed, { typedMs } from "./Typed";
import type { TinoApi } from "./tino/engine";
import type { TinoMood } from "./tino/moods";
import { Button } from "@/components/criterio";
import HomeTino, { useLine, type CornerSay, type TinoNudge } from "./HomeTino";
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

export default function SearchTino({ report, busy, typing, focused, failed, total, chips, onClose, onAct, saving = null, nudges = [], scope, quiet = false, idle }: {
  report: SearchReport | null;
  /** Something added is still on its way (a file uploading, a link or a text saving): he says so while it lasts */
  saving?: "upload" | "save" | null;
  /** The search is still reading (meaning, Jev) */
  busy: boolean;
  /** The field has words in it */
  typing: boolean;
  /** The field has the focus: empty, he offers what to ask */
  focused: boolean;
  /** The search could not run (network or server): he says so, plainly */
  failed: boolean;
  /** How many references the search goes through */
  total: number;
  /** What to ask, from this board's own tags: up to four */
  chips: { key: string; label: string; onPick: () => void }[];
  /** The ×: closes the balloon and clears the search */
  onClose: () => void;
  /** The report's one way elsewhere (nothing found: the inbox) */
  onAct?: () => void;
  /** What he brings up on his own when the search is quiet: what the board could use next (lib/board-nudges.ts) */
  nudges?: TinoNudge[];
  /** Where "Later" holds: this board */
  scope: string;
  /** Another of his windows is open (the agent's card): nothing unprompted */
  quiet?: boolean;
  /** What he says when asked with nothing pending (boardIdle): how the board stands. By default, what to ask him */
  idle?: TinoNudge;
}) {
  const { t } = useT();
  const tino = useRef<TinoApi>(null);
  const settled = useAfter(!!report && !busy, SETTLE_MS, report?.key);
  const shown = settled ? report : null;
  // The same search again, after another or a clear, once a visit and only when it found something
  const [same, setSame] = useState<string | null>(null);
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (!shown) return;
    if (shown.key === lastKey.current && shown.found && !readOnce()) { setSame(shown.key); markOnce(); }
    lastKey.current = shown.key;
  }, [shown]);
  const again = shown && same === shown.key;
  const asking = !report && focused && chips.length > 0;
  const say = saving ? { key: `saving:${saving}`, title: t.tino.savingTitle, text: saving === "upload" ? t.tino.uploading : t.tino.saving }
    : failed && report ? { key: `failed:${report.key}`, title: [t.tino.failed] }
    : again ? { key: `same:${shown.key}`, title: t.tino.sameTitle, text: t.tino.sameText(shown.found, total) }
    : shown ? { key: shown.key, title: shown.title, text: shown.text, act: shown.act }
    : asking ? { key: "ask:me", title: [t.tino.askMe] }
    : null;
  const title = useLine(say?.key, say?.title);
  // The copy sheet's faces: following the words, searching, then how it went; at rest, the corner's own
  const mood: TinoMood | undefined = saving ? "thinking" : failed && report ? "sad" : busy ? "searching" : again ? "judge"
    : shown ? (shown.found > 1 ? "smug" : shown.found ? "admirer" : "suspect") : typing || report || asking ? "following" : undefined;
  // A find gets a small hop, never a party
  useEffect(() => { if (shown?.found) tino.current?.jump(0.6); }, [shown?.key, shown?.found]);
  const text = say && "text" in say && say.text ? <Typed text={say.text} delay={title ? typedMs(title) : 0} /> : null;
  const speak: CornerSay | null = say && title ? {
    key: say.key, title,
    text: asking && say.key === "ask:me" ? (
      <span className="sb-tino__chips">
        {/* Before the field's blur, so the click lands and the box keeps the focus */}
        {chips.map((c) => <button key={c.key} type="button" className="cr-chip cr-chip-paper cr-chip-button" onMouseDown={(e) => { e.preventDefault(); c.onPick(); }}>{c.label}</button>)}
      </span>
    ) : text,
    actions: "act" in say && say.act && onAct ? <Button size="s" onClick={onAct}>{say.act}</Button> : null,
    onClose: !asking && !saving ? onClose : undefined,
  } : null;
  // Searching, he says it while a search is on even with nothing to say yet: the nudges wait
  return <HomeTino className="board-tino" tinoRef={tino} nudges={nudges} scope={scope} speak={speak} face={mood} quiet={quiet || !!report || typing || asking}
    idle={idle ?? { key: "idle", title: t.tino.board.idleTitle, text: t.tino.board.idleText, mood: "watching" }} />;
}

const SAME_KEY = "criterio:tino-same";
const readOnce = () => { try { return sessionStorage.getItem(SAME_KEY) === "1"; } catch { return true; } };
const markOnce = () => { try { sessionStorage.setItem(SAME_KEY, "1"); } catch { /* no storage */ } };
