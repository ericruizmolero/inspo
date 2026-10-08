"use client";
// The app's optional music, in the pill of the bottom-left corner (components/ZoomPill.tsx) of every screen once
// signed in: the speaker turns it on and off, a click each way, and while it plays the chevron beside it opens
// the stations and the tracks by name. It is off every time the page opens, whatever it was left at: it only ever
// starts with a click. Nothing is fetched until then; it fades in and out, one track follows the other within the
// station that is on, and the last station and track heard are where it starts again (public/polish/*.mp3, listed
// in TRACKS, each with its station).
// The music belongs to no view: it lives here, outside React, so going from one screen to another does not cut it.
// It plays only while one of its buttons is on screen: on a screen without one it fades out, and it comes back in
// with the next. Another tab of the browser is not away: it keeps playing behind it.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Icon, MenuItem, MenuLabel, Separator } from "@/components/criterio";
import { useT } from "./I18nProvider";

const TRACK_KEY = "inspo:polish-track";
const STATION_KEY = "inspo:polish-station";
// The stations: a track belongs to one of them, and "all" plays every track in this order
export type Station = "all" | "lofi" | "instrumental";
const STATIONS: Station[] = ["all", "lofi", "instrumental"];
// The music, all of it by HoliznaCC0 (CC0) and brought to the same loudness. A file in public/polish/ per track.
// The lo-fi ones are the "Lo-Fi And Chill" collection, the instrumental ones "Relaxing Instrumentals"
const TRACKS: { id: string; title: string; station: Exclude<Station, "all"> }[] = [
  { id: "laundry-on-the-wire", title: "Laundry On The Wire", station: "lofi" },
  { id: "first-snow", title: "First Snow", station: "lofi" },
  { id: "snow-drift", title: "Snow Drift", station: "lofi" },
  { id: "keeping-cool", title: "Keeping Cool", station: "lofi" },
  { id: "windows-down", title: "Windows Down", station: "lofi" },
  { id: "everything-you-ever-dreamed", title: "Everything You Ever Dreamed", station: "lofi" },
  { id: "two-hour-delay", title: "2 Hour Delay", station: "lofi" },
  { id: "night-driving", title: "Night Driving", station: "instrumental" },
  { id: "boredom", title: "Boredom", station: "instrumental" },
  { id: "love", title: "Love", station: "instrumental" },
  { id: "lost-in-your-eyes", title: "Lost In Your Eyes", station: "instrumental" },
  { id: "you-loved-me-once", title: "You Loved Me Once", station: "instrumental" },
];
/** The tracks a station plays, in order; indexes into TRACKS */
const playlist = (station: Station) => TRACKS.flatMap((t, i) => (station === "all" || t.station === station ? [i] : []));
const SOUND_VOLUME = 0.5;
const SOUND_FADE_MS = 700;
const SOUND_SWAP_MS = 260; // the track that is leaving fades out this fast
const LEAVE_MS = 1500; // this long with no button on screen, it goes quiet: one view handing over to the next is not leaving, however long the next one takes to load

interface Ambience {
  /** Whether the person has it on, the station that is on and the track (an index into TRACKS) that is on */
  on: boolean; station: Station; track: number;
  audio: HTMLAudioElement | null; ramp: number;
  /** Whether it should be sounding now: on, and with a button on screen */
  wanted: boolean;
  /** Goes up with every change of track: a play() asked for an earlier one answers to nobody */
  turn: number;
  /** How many of its buttons are on screen, and the wait before going quiet without any */
  holders: number; leave: number;
  read: boolean;
  subs: Set<() => void>;
}
// One for the page, kept across a hot reload of this file so a track left playing is never orphaned
const page = globalThis as typeof globalThis & { __criterioAmbience?: Ambience };
const A: Ambience = (page.__criterioAmbience ??= { on: false, station: "all", track: 0, audio: null, ramp: 0, wanted: false, turn: 0, holders: 0, leave: 0, read: false, subs: new Set() });

const emit = () => { for (const f of A.subs) f(); };
const subscribe = (f: () => void) => { A.subs.add(f); return () => { A.subs.delete(f); }; };
const mod = (a: number, n: number) => ((a % n) + n) % n;

function fade(to: number, ms: number, then?: () => void) {
  const el = A.audio;
  if (!el) return;
  cancelAnimationFrame(A.ramp);
  const from = el.volume, t0 = performance.now();
  const step = (t: number) => {
    const x = Math.min(1, Math.max(0, (t - t0) / ms));
    el.volume = from + (to - from) * x;
    if (x < 1) A.ramp = requestAnimationFrame(step);
    else then?.();
  };
  A.ramp = requestAnimationFrame(step);
}
function start() {
  const el = A.audio;
  if (!el) return;
  const mine = A.turn;
  // An answer only counts for the audio and the track that are still the ones playing: a play() cut short by a
  // change of track must not turn the button off
  const current = () => A.audio === el && mine === A.turn;
  el.play().then(
    () => { if (current() && A.wanted) fade(SOUND_VOLUME, SOUND_FADE_MS); },
    (err: unknown) => {
      if (!current() || (err as { name?: string } | null)?.name === "AbortError") return;
      // Refused, or no file: the button goes back to off
      A.wanted = false; A.on = false;
      emit();
    },
  );
}
/** Puts another track on (an index into TRACKS): the one playing fades out first, unless it has just ended by itself */
function go(index: number, faded: boolean) {
  const i = mod(index, TRACKS.length);
  if (i === A.track && A.audio && !A.audio.paused) return;
  A.track = i;
  emit();
  try { localStorage.setItem(TRACK_KEY, TRACKS[i].id); } catch { /* no storage */ }
  const el = A.audio;
  if (!el) return;
  A.turn++;
  const swap = () => {
    el.src = `/polish/${TRACKS[i].id}.mp3`;
    if (A.wanted) start();
  };
  if (faded && !el.paused) fade(0, SOUND_SWAP_MS, swap);
  else swap();
}
/** The track that follows the one on, within the station that is on */
function next(): number {
  const list = playlist(A.station);
  const at = list.indexOf(A.track);
  return list[mod(at + 1, list.length)];
}
/** Tunes to a station: what is playing goes on if it belongs to it, otherwise its first track comes in */
function tune(station: Station) {
  if (station === A.station) return;
  A.station = station;
  emit();
  try { localStorage.setItem(STATION_KEY, station); } catch { /* no storage */ }
  const list = playlist(station);
  if (!list.includes(A.track)) go(list[0], true);
}
function play(want: boolean) {
  A.wanted = want;
  if (!A.audio) {
    if (!want) return;
    const el = new Audio(`/polish/${TRACKS[A.track].id}.mp3`);
    el.volume = 0;
    el.addEventListener("ended", () => go(next(), false));
    A.audio = el;
  }
  if (want) start();
  else fade(0, SOUND_FADE_MS, () => A.audio?.pause());
}
function toggle() {
  A.on = !A.on;
  emit();
  play(A.on);
}
/** A button of the music is on screen. Returns what to call when it no longer is */
function hold(): () => void {
  A.holders++;
  window.clearTimeout(A.leave);
  if (!A.read) {
    A.read = true;
    try {
      const station = localStorage.getItem(STATION_KEY) as Station | null;
      if (station && STATIONS.includes(station)) A.station = station;
      const last = TRACKS.findIndex((t) => t.id === localStorage.getItem(TRACK_KEY));
      if (last >= 0 && playlist(A.station).includes(last)) A.track = last;
      else A.track = playlist(A.station)[0];
    } catch { /* no storage */ }
    emit();
  }
  if (A.on && !A.wanted) play(true);
  return () => {
    A.holders--;
    if (A.holders > 0) return;
    A.leave = window.setTimeout(() => { if (A.holders <= 0 && A.wanted) play(false); }, LEAVE_MS);
  };
}

export default function SoundControl() {
  const { t } = useT();
  const s = t.polish;
  const on = useSyncExternalStore(subscribe, () => A.on, () => false);
  const track = useSyncExternalStore(subscribe, () => A.track, () => 0);
  const station = useSyncExternalStore(subscribe, () => A.station, () => "all" as Station);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  // It counts while it is seen: a pill hidden by its view (a phone's board has none) holds nothing
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let release: (() => void) | null = null;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !release) release = hold();
      else if (!entry.isIntersecting && release) { release(); release = null; }
    });
    io.observe(el);
    return () => { io.disconnect(); release?.(); };
  }, []);
  // The speaker is the system's IconButton (quiet, s, a toggle); the chevron a quiet Button s that opens the
  // stations and, under a line, the tracks of the one tuned, as the system's Menu (.cr-menu), the ones on checked.
  // Tooltips by data-tip, no native title
  const pick = `${s.soundPick}: ${TRACKS[track].title}`;
  const list = playlist(station);
  // The one playing is in view when the list opens or the station changes
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(".is-checked")?.scrollIntoView({ block: "nearest" });
  }, [open, station, track]);
  return (
    <>
      {/* The system's IconButton (quiet, s, a toggle) as its classes: the ref is needed to see it on screen */}
      <button ref={ref} type="button" className={`cr-iconbtn cr-iconbtn-quiet cr-iconbtn-s zoom-pill__sound${on ? " is-active is-on" : ""}`} onClick={toggle}
        aria-pressed={on} aria-label={on ? s.soundOff : s.soundOn} data-tip={on ? s.soundOff : s.soundOn}>
        {on ? <Volume2 size={16} strokeWidth={2} aria-hidden /> : <VolumeX size={16} strokeWidth={2} aria-hidden />}
      </button>
      {on && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className={`cr-btn cr-btn-quiet cr-btn-s zoom-pill__track${open ? " is-open" : ""}`} aria-label={pick} data-tip={open ? undefined : pick}>
            <Icon name="chevron-down" size={16} />
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="cr-menu sound-tracks">
            <MenuLabel>{s.station}</MenuLabel>
            {STATIONS.map((st) => (
              <MenuItem key={st} role="menuitemradio" aria-checked={st === station} checked={st === station}
                onClick={() => tune(st)}>
                {s.stations[st]}
              </MenuItem>
            ))}
            <Separator />
            {/* The tracks scroll within a fixed height, the stations stay put: the menu never grows with the catalogue */}
            <div className="sound-tracks__list cr-scroll-fade" ref={listRef}>
              {list.map((i) => (
                <MenuItem key={TRACKS[i].id} role="menuitemradio" aria-checked={i === track} checked={i === track}
                  onClick={() => { setOpen(false); if (i !== track) go(i, true); }}>
                  {TRACKS[i].title}
                </MenuItem>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
