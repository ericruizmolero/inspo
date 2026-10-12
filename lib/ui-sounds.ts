// The interface's few sounds (cuelume, synthesized live, no files): only the moments that decide something, a card
// kept or forgotten, a reference saved, an error; and one of our own, the wind of the board turning into the tornado
// (`gust`, cuelume has none). Off until the person turns them on in Settings, and remembered in
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

/** The wind at its loudest: a breath under the cues, not over them */
const WIND_VOLUME = 0.06;
let windCtx: AudioContext | null = null;
let windNoise: AudioBuffer | null = null;

/** How fast a cubic-bezier curve moves at each of `n` even steps of its time, 0 to 1 of its fastest */
function speeds(x1: number, y1: number, x2: number, y2: number, n: number): number[] {
  const b = (a1: number, a2: number, s: number) => 3 * (1 - s) ** 2 * s * a1 + 3 * (1 - s) * s * s * a2 + s ** 3;
  const d = (a1: number, a2: number, s: number) => 3 * (1 - s) ** 2 * a1 + 6 * (1 - s) * s * (a2 - a1) + 3 * s * s * (1 - a2);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let lo = 0, hi = 1;
    for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (b(x1, x2, m) < t) lo = m; else hi = m; }
    const s = (lo + hi) / 2, dx = d(x1, x2, s);
    out.push(dx > 1e-4 ? d(y1, y2, s) / dx : 0);
  }
  const top = Math.max(...out) || 1;
  return out.map((v) => Math.max(0, v / top));
}

/** The wind that carries the board's cards into the tornado: soft noise whose loudness and pitch follow the speed of
 *  the flight's curve (`EASE_WIND`), so it blows hardest when the cards go fastest and dies as they land, moving
 *  across the room. Played when the flight starts. `back` is the way home, Polish to the board: the wind dropping,
 *  lower, right to left. `bright` is the way into the system: a higher, brighter wind, the sound of something
 *  done. `force` plays it with the sounds off (the design library). */
export function gust(ms = 900, { back = false, bright = false, force = false }: { back?: boolean; bright?: boolean; force?: boolean } = {}) {
  if (!read() && !force) return;
  try {
    windCtx ??= new AudioContext();
    const ctx = windCtx;
    if (ctx.state === "suspended") void ctx.resume();
    if (!windNoise) {
      windNoise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = windNoise.getChannelData(0);
      let b = 0;
      for (let i = 0; i < d.length; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 6; } // soft, brown-ish
    }
    const t = ctx.currentTime, dur = ms / 1000, N = 48;
    // The flight's speed, eased in over the first steps so it never starts with a click
    const v = speeds(0.3, 0.2, 0.1, 1, N).map((x, i) => x * Math.min(1, i / 4));
    const src = ctx.createBufferSource();
    src.buffer = windNoise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.9;
    const [low, rise] = bright ? [700, 2100] : back ? [160, 480] : [220, 700];
    band.frequency.setValueCurveAtTime(Float32Array.from(v, (x) => low + rise * x), t, dur);
    const gain = ctx.createGain();
    gain.gain.setValueCurveAtTime(Float32Array.from(v, (x) => WIND_VOLUME * (bright ? 0.7 : back ? 0.8 : 1) * x ** 1.4), t, dur);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(back ? 0.3 : -0.3, t);
    pan.pan.linearRampToValueAtTime(back ? -0.3 : 0.3, t + dur);
    src.connect(band).connect(gain).connect(pan).connect(ctx.destination);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  } catch { /* no audio here */ }
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
