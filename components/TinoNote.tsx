"use client";
// A note from Tino inside a view, where the thing it is about sits: the balloon's butter and bevel (.cr-balloon-body)
// laid flat as a row, Tino himself framed in a dark tile on the left (the plush, cut to his face as the dock cuts
// him), a line of his in bold and one sentence, the answers on the right. The System page uses it for a result built
// from an older criterio.md and for a proposal waiting under an area. The title is a pool, picked as HomeTino picks
// his lines; title and sentence are written as he says them, and his face is the one the line asks for.
import type { ReactNode } from "react";
import Tino from "./Tino";
import Typed, { typedMs } from "./Typed";
import { useLine } from "./HomeTino";
import { moodProps, type TinoMood } from "./tino/moods";
import "./TinoNote.css";

export default function TinoNote({ lineKey, title, text, mood, actions, className = "" }: {
  /** Which note it is: its line is picked once per key, never the one this kind said last (the kind is before ":") */
  lineKey: string;
  title: string | readonly string[];
  text: string;
  /** His face for this line (components/tino/moods.ts) */
  mood: TinoMood;
  actions?: ReactNode;
  className?: string;
}) {
  const line = useLine(lineKey, title) ?? "";
  return (
    <div className={`cr-balloon-body tino-note ${className}`} role="status">
      {/* The tile is always ink, so he is lit as on a dark ground; without WebGL, Tino shows his flat mark himself */}
      <span className="tino-note__face" aria-hidden><Tino dark petting={false} {...moodProps(mood)} /></span>
      <p className="tino-note__say">
        <b className="tino-note__title"><Typed text={line} /></b>
        {text && <span className="tino-note__text"><Typed text={text} delay={typedMs(line)} /></span>}
      </p>
      {actions && <div className="tino-note__actions">{actions}</div>}
    </div>
  );
}
