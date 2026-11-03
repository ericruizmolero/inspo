"use client";
// Tino writes what he says: the line comes in letter by letter inside his balloon, fast enough that Polish's question
// per card never holds the answers back (the buttons are there from the start). The whole text is laid out from the
// first frame, the part still to come only transparent, so the balloon never grows while he writes. A screen reader
// gets the whole line at once; with reduced motion it is simply there.
import { useEffect, useState } from "react";
import "./Typed.css";

/** A letter every this many ms, and never longer than MAX_MS for one piece of text */
const CHAR_MS = 22;
const MAX_MS = 700;

/** How long a text takes to write: the delay before what follows it */
export const typedMs = (text: string) => Math.min(text.length * CHAR_MS, MAX_MS);

export default function Typed({ text, delay = 0 }: { text: string; delay?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(text.length); return; }
    setShown(0);
    const per = typedMs(text) / Math.max(text.length, 1);
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const n = Math.max(0, Math.min(text.length, Math.floor((now - t0) / per)));
      setShown(n);
      if (n < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay]);
  const writing = shown < text.length;
  return (
    <span className="typed">
      <span className="cr-visually-hidden">{text}</span>
      <span aria-hidden className={writing ? "typed__on is-writing" : "typed__on"}>{text.slice(0, shown)}</span>
      <span aria-hidden className="typed__rest">{text.slice(shown)}</span>
    </span>
  );
}
