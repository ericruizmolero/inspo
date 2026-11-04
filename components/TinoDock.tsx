"use client";
// Tino's composer on the System page: the board's dock (.dock, .dock__bar) with its field (SearchBar's .sb--dock
// look), centred at the bottom of the Agent, Human and Result views, and Tino in the bottom-right corner as on the
// home and the board (TinoCorner). On Result it takes what to build; on Agent and Human, what to change in the file, in
// words. What he says goes in his balloon: the shortcuts while the field is focused and empty, or a line the view
// hands him. His face follows: thinking while busy, following the words.
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import Typed, { typedMs } from "./Typed";
import type { TinoMood } from "./tino/moods";
import HomeTino, { useLine, type CornerSay, type TinoNudge } from "./HomeTino";
import { Busy, IconButton } from "@/components/criterio";
import { useT } from "./I18nProvider";
import "./SearchTino.css";
import "./TinoDock.css";

/** A line of his, handed by the view (nothing to change, a failure): `key` makes a new one a new line */
/** What he says from the dock. `options`: answers to pick from under the line (his "which way?") */
export type DockSay = { key: string; title: string | readonly string[]; text?: string; mood?: TinoMood; options?: { key: string; label: string; onPick: () => void }[] };

export default function TinoDock({ label, placeholder, value, onChange, onSubmit, busy, mood, say, onSayClose, chips = [], hint, nudges = NONE, focusRef, idle }: {
  /** The field's accessible name */
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  busy: boolean;
  /** His face at rest; busy and typing win over it */
  mood?: TinoMood;
  say?: DockSay | null;
  onSayClose?: () => void;
  /** Offered in his balloon while the field is focused and empty: picking one fills the field */
  chips?: { key: string; label: string }[];
  /** A line under the shortcuts (what a build costs) */
  hint?: string;
  /** What he brings up on his own while nobody asks (components/board-nudges.ts systemNudges) */
  nudges?: TinoNudge[];
  /** What he says when asked with nothing pending (systemIdle): how the file stands */
  idle?: TinoNudge;
  /** The field, for a nudge that fills it and puts the cursor there */
  focusRef?: RefObject<HTMLInputElement | null>;
}) {
  const { t } = useT();
  const own = useRef<HTMLInputElement>(null);
  const field = focusRef ?? own;
  const [focused, setFocused] = useState(false);
  const asking = !say && focused && !value && !busy && chips.length > 0;
  const shown: DockSay | null = say ?? (asking ? { key: "ask:me", title: [t.tino.askMe], text: hint } : null);
  const title = useLine(shown?.key, shown?.title);
  // At rest his face is the nudge's (HomeTino's own), unless the view asks for one
  const face: TinoMood | undefined = busy ? "thinking" : value.trim() ? "following" : say?.mood ?? mood;
  const send = () => { if (!busy && value.trim()) onSubmit(value.trim()); };
  // Tino in the bottom-right corner, as on the home and the board: in <body>, since the dock's transform would carry
  // a fixed corner with it. Muted or not, what he says here was asked for
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  const speak: CornerSay | null = shown && title ? {
    key: shown.key, title,
    text: <>
      {shown.text && <Typed text={shown.text} delay={typedMs(title)} />}
      {shown.options?.length ? (
        <span className="sb-tino__chips">
          {shown.options.map((o) => <button key={o.key} type="button" className="cr-chip cr-chip-paper cr-chip-button" disabled={busy} onClick={o.onPick}>{o.label}</button>)}
        </span>
      ) : null}
      {asking && (
        <span className="sb-tino__chips">
          {/* Before the field's blur, so the click lands and the field keeps the focus */}
          {chips.map((c) => <button key={c.key} type="button" className="cr-chip cr-chip-paper cr-chip-button" onMouseDown={(e) => { e.preventDefault(); onChange(c.label); }}>{c.label}</button>)}
        </span>
      )}
    </>,
    onClose: say && onSayClose ? onSayClose : undefined,
  } : null;
  return (
    <form className="dock tdock" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <div className="dock__bar">
        <div className="sb sb--dock">
          <div className="sb__field" onClick={() => field.current?.focus()}>
            <input ref={field} className="sb__input" aria-label={label} placeholder={placeholder} value={value} maxLength={400} disabled={busy}
              onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
            <span className="sb__right">
              {busy ? <Busy label={placeholder} />
                : value.trim() && <IconButton type="submit" icon="arrow-right" variant="quiet" size="s" className="tdock__send" label={t.tino.dock.send} />}
            </span>
          </div>
        </div>
      </div>
      {host && createPortal(<HomeTino className="board-tino" nudges={nudges} scope=":system" speak={speak} face={face} quiet={busy || focused || !!value}
        idle={idle ?? { key: "idle", title: t.tino.system.idleTitle, text: t.tino.system.idleText, mood: "watching" }} />, host)}
    </form>
  );
}

const NONE: TinoNudge[] = [];
