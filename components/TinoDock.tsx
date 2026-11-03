"use client";
// Tino's composer on the System page: the board's dock (.dock, .dock__bar) with its field (SearchBar's .sb--dock
// look) and Tino seated in its left end as on the board (SearchTino's .sb-tino), centred at the bottom of the
// Agent, Human and Result views. On Result it takes what to build; on Agent and Human, what to change in the file, in
// words. What he says goes in his balloon: the shortcuts while the field is focused and empty, or a line the view
// hands him. His face follows: thinking while busy, following the words.
import { useRef, useState } from "react";
import Tino from "./Tino";
import Typed, { typedMs } from "./Typed";
import { moodProps, type TinoMood } from "./tino/moods";
import { useDark, useLine } from "./HomeTino";
import { Balloon, Busy, Icon, IconButton } from "@/components/criterio";
import { useT } from "./I18nProvider";
import "./SearchTino.css";
import "./TinoDock.css";

/** A line of his, handed by the view (nothing to change, a failure): `key` makes a new one a new line */
export type DockSay = { key: string; title: string | readonly string[]; text?: string; mood?: TinoMood };

export default function TinoDock({ label, placeholder, value, onChange, onSubmit, busy, mood, say, onSayClose, chips = [], hint }: {
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
}) {
  const { t } = useT();
  const dark = useDark();
  const field = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const asking = !say && focused && !value && !busy && chips.length > 0;
  const shown: DockSay | null = say ?? (asking ? { key: "ask:me", title: [t.tino.askMe], text: hint } : null);
  const title = useLine(shown?.key, shown?.title);
  const face: TinoMood = busy ? "thinking" : value.trim() ? "following" : say?.mood ?? mood ?? "watching";
  const send = () => { if (!busy && value.trim()) onSubmit(value.trim()); };
  return (
    <form className="dock tdock" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <div className="dock__bar">
        <div className="sb sb--dock">
          <div className="sb__field" onClick={() => field.current?.focus()}>
            <span className="sb__tino-room" aria-hidden />
            <input ref={field} className="sb__input" aria-label={label} placeholder={placeholder} value={value} maxLength={400} disabled={busy}
              onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
            <span className="sb__right">
              {busy ? <Busy label={placeholder} />
                : value.trim() && <IconButton type="submit" icon="arrow-right" variant="quiet" size="s" className="tdock__send" label={t.tino.dock.send} />}
            </span>
          </div>
        </div>
        <div className="sb-tino">
          {shown && title && (
            <Balloon key={shown.key} className="sb-tino__say" tail="left"
              title={<><span className="sb-tino__who">Tino</span><span><Typed text={title} /></span></>}>
              {shown.text && <Typed text={shown.text} delay={typedMs(title)} />}
              {asking && (
                <span className="sb-tino__chips">
                  {/* Before the field's blur, so the click lands and the field keeps the focus */}
                  {chips.map((c) => <button key={c.key} type="button" className="cr-chip cr-chip-paper cr-chip-button" onMouseDown={(e) => { e.preventDefault(); onChange(c.label); }}>{c.label}</button>)}
                </span>
              )}
              {say && onSayClose && (
                <button type="button" className="cr-window-close sb-tino__close" aria-label={t.tino.close} onClick={onSayClose}>
                  <Icon name="close" size={10} weight="bold" />
                </button>
              )}
            </Balloon>
          )}
          <span className="sb-tino__body" aria-hidden>
            <Tino dark={dark} petting={false} {...moodProps(face)} />
          </span>
        </div>
      </div>
    </form>
  );
}
