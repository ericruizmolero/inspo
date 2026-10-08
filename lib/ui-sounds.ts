// The interface's few sounds (cuelume, synthesized live, no files): only the moments that decide something, a card
// kept or forgotten, a reference saved, an error. Off until the person turns them on in Settings, and remembered in
// this browser. Separate from the music (components/SoundControl.tsx): one is a choice of ambience, this is feedback.
import { useSyncExternalStore } from "react";
import { play, setTheme, type PlayOptions, type SoundName } from "cuelume";

const KEY = "inspo:ui-sounds";
const subs = new Set<() => void>();
let on: boolean | null = null;

function read(): boolean {
  if (on === null) {
    try { on = localStorage.getItem(KEY) === "on"; } catch { on = false; }
    setTheme("press");
  }
  return on;
}

export function cue(sound: SoundName, options?: PlayOptions) {
  if (read()) play(sound, options);
}

/** Plays a cue whether or not the person has the sounds on: for the design library's sample, to hear them there. */
export function audition(sound: SoundName, options?: PlayOptions) {
  read();
  play(sound, options);
}

export function setUiSounds(value: boolean) {
  on = value;
  try { localStorage.setItem(KEY, value ? "on" : "off"); } catch { /* this visit only */ }
  for (const f of subs) f();
  if (value) cue("toggle");
}

export function useUiSounds(): boolean {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => { subs.delete(f); }; },
    read,
    () => false,
  );
}
