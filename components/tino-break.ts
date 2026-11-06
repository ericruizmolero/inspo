"use client";
// Tino's break: after a good while of real work in the app (the tab on screen and someone using it), now and then he
// suggests something else for a moment: put the music on, switch the theme, go and look at Resources, or get up
// and stretch. One at a time, taking turns, never while he has something more pressing (Eric, 06-11: "de vez en
// cuando si ve que llevas X tiempo en la plataforma activo que te recomiende ponerte musiquita o igual cambiar de
// dark mode a light mode, o que vayas a recursos a ver inspiración").
import { useCallback, useEffect, useState } from "react";
import { musicOn, startMusic } from "./SoundControl";
import { switchTheme } from "@/lib/theme";
import { pushUrl } from "@/lib/url-history";
import type { Dict } from "@/lib/i18n/en";
import type { TinoNudge } from "./HomeTino";

/** Active time since the last break, in this tab (ms): kept across reloads, not across tabs */
const ACTIVE_KEY = "criterio:tino-active";
/** Which break comes next, and when the last one was said (across tabs, so two tabs do not both say it) */
const TURN_KEY = "criterio:tino-break-turn";
const SAID_KEY = "criterio:tino-break-at";
/** Active time before the first break, and between one and the next */
export const BREAK_AFTER_MS = 40 * 60 * 1000;
/** However active, never two breaks closer than this on the clock */
const GAP_MS = 30 * 60 * 1000;
/** How often the time is counted, and how recent the last input must be for that slice to count as active */
const TICK_MS = 15 * 1000;
const IDLE_MS = 90 * 1000;

const num = (store: Storage, key: string) => { try { return Number(store.getItem(key)) || 0; } catch { return 0; } };
const put = (store: Storage, key: string, v: number) => { try { store.setItem(key, String(v)); } catch { /* no storage */ } };

/** How long, said as people say it: "media hora", "una hora", "hora y media", "dos horas" */
function howLong(t: Dict, ms: number): string {
  return t.tino.pause.long(Math.round(ms / (15 * 60 * 1000)) / 4);
}

type Kind = "music" | "theme" | "resources" | "stretch";
const KINDS: Kind[] = ["music", "theme", "resources", "stretch"];

/** The break due now, if any, and what to call once it has been said (taken, put off or closed) */
export function useTinoBreak(t: Dict): { nudge: TinoNudge | null; done: () => void } {
  const [due, setDue] = useState<{ kind: Kind; active: number } | null>(null);
  useEffect(() => {
    let lastInput = Date.now();
    const touch = () => { lastInput = Date.now(); };
    const events = ["pointerdown", "keydown", "wheel", "pointermove"] as const;
    for (const e of events) window.addEventListener(e, touch, { passive: true });
    const tick = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastInput > IDLE_MS) return;
      const active = num(sessionStorage, ACTIVE_KEY) + TICK_MS;
      put(sessionStorage, ACTIVE_KEY, active);
      if (active < BREAK_AFTER_MS || Date.now() - num(localStorage, SAID_KEY) < GAP_MS) return;
      // What makes sense now: music only if it is off, Resources only away from Discover
      const here = new URLSearchParams(window.location.search).get("in");
      const fits = KINDS.filter((k) => (k !== "music" || !musicOn()) && (k !== "resources" || here !== "discover"));
      const turn = num(localStorage, TURN_KEY);
      const kind = fits.find((k) => KINDS.indexOf(k) >= turn % KINDS.length) ?? fits[0];
      setDue((d) => d ?? { kind, active });
    };
    const timer = window.setInterval(tick, TICK_MS);
    return () => { window.clearInterval(timer); for (const e of events) window.removeEventListener(e, touch); };
  }, []);

  const done = useCallback(() => {
    setDue((d) => {
      if (d) {
        put(sessionStorage, ACTIVE_KEY, 0);
        put(localStorage, SAID_KEY, Date.now());
        put(localStorage, TURN_KEY, KINDS.indexOf(d.kind) + 1);
      }
      return null;
    });
  }, []);

  if (!due) return { nudge: null, done };
  const p = t.tino.pause, long = howLong(t, due.active);
  const key = `pause:${due.kind}`;
  const nudge: TinoNudge =
    due.kind === "music" ? { key, title: p.musicTitle, text: p.musicText(long), act: p.musicAct, mood: "accomplice", go: () => { startMusic(); done(); } }
    : due.kind === "theme" ? (() => {
      const dark = document.documentElement.dataset.theme !== "light";
      return { key, title: p.themeTitle, text: dark ? p.toLightText(long) : p.toDarkText(long), act: dark ? p.toLightAct : p.toDarkAct, mood: "watching" as const,
        go: () => { switchTheme(dark ? "light" : "dark"); done(); } };
    })()
    : due.kind === "resources" ? { key, title: p.resourcesTitle, text: p.resourcesText(long), act: p.resourcesAct, mood: "smug", go: () => { pushUrl("/?in=discover"); done(); } }
    : { key, title: p.stretchTitle, text: p.stretchText(long), act: p.stretchAct, mood: "watching", go: done };
  return { nudge, done };
}
