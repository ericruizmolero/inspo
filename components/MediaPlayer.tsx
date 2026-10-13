"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Icon, IconButton } from "@/components/criterio";
import { useT } from "./I18nProvider";

// Our player for a video in the sheet: it starts as it always did (looping, silent) and lets you watch it properly,
// with sound, without the browser's own controls. The video can be a plain <video> or one inside the tiny frame that
// keeps X's Referer out (PostView's Moving): the controls live out here and drive whichever element it is.

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

const SLEEP_MS = 1500;

export default function MediaPlayer({ video, ratio, className = "", children }: {
  /** The element to drive, once it exists (a frame's video turns up on its load) */
  video: HTMLVideoElement | null;
  ratio: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useT();
  const p = t.player;
  const box = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  const [awake, setAwake] = useState(false);
  const [full, setFull] = useState(false);
  const sleep = useRef(0);
  // The handlers reach the element through a ref: it belongs to the page, not to this render
  const media = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = video;
    media.current = v;
    if (!v) return;
    const read = () => {
      setPaused(v.paused); setMuted(v.muted || v.volume === 0);
      setLength(Number.isFinite(v.duration) ? v.duration : 0);
    };
    // The fill follows by transform on every frame; the clock in seconds only renders when its second changes
    let raf = 0;
    const tick = () => {
      const d = v.duration;
      if (fill.current && d > 0) fill.current.style.transform = `scaleX(${v.currentTime / d})`;
      setTime(Math.floor(v.currentTime));
      raf = requestAnimationFrame(tick);
    };
    read(); raf = requestAnimationFrame(tick);
    const evs = ["play", "pause", "volumechange", "loadedmetadata", "durationchange"] as const;
    evs.forEach((e) => v.addEventListener(e, read));
    return () => { cancelAnimationFrame(raf); evs.forEach((e) => v.removeEventListener(e, read)); };
  }, [video]);

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", on);
    return () => { document.removeEventListener("fullscreenchange", on); window.clearTimeout(sleep.current); };
  }, []);

  // The bar comes up as the pointer enters or moves over the video and goes after 1.5 s still, paused or not
  // (Eric, 13-10: "que se quite el reproductor cuando han pasado 1,5 s"; "al hovering que aparezca otra vez")
  const wake = useCallback(() => {
    setAwake(true);
    window.clearTimeout(sleep.current);
    sleep.current = window.setTimeout(() => setAwake(false), SLEEP_MS);
  }, []);

  const toggle = () => {
    const video = media.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {}); else video.pause();
    wake();
  };
  // The first time sound comes in the video goes back to the start: it was playing silent as a loop until now
  const heard = useRef(false);
  const sound = () => {
    const video = media.current;
    if (!video) return;
    const on = video.muted;
    video.muted = !on;
    if (on && !heard.current) { heard.current = true; video.currentTime = 0; }
    if (on && video.paused) void video.play().catch(() => {});
    wake();
  };
  const fullscreen = () => {
    const el = box.current, video = media.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
    else (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void } | null)?.webkitEnterFullscreen?.();
  };

  // Scrubbing: press on the line and drag; the video follows the pointer
  const seekAt = (e: PointerEvent<HTMLDivElement>) => {
    const video = media.current;
    if (!video || !(video.duration > 0)) return;
    const r = e.currentTarget.getBoundingClientRect();
    video.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * video.duration;
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") { if (e.target !== e.currentTarget && k === " ") return; e.preventDefault(); toggle(); }
    else if (k === "m") { e.preventDefault(); sound(); }
    else if (k === "f") { e.preventDefault(); fullscreen(); }
  };

  const shown = awake;
  return (
    <div ref={box} className={`mp${shown ? " is-awake" : ""}${full ? " is-full" : ""} ${className}`} style={{ aspectRatio: ratio }}
      tabIndex={0} onKeyDown={onKey} onPointerEnter={wake} onPointerMove={wake} onPointerLeave={() => { window.clearTimeout(sleep.current); setAwake(false); }}>
      {children}
      <button type="button" className="mp__hit" aria-label={paused ? p.play : p.pause} onClick={toggle} onDoubleClick={fullscreen} tabIndex={-1} />
      {paused && <span className="mp__big" aria-hidden><Icon name="play" size={22} /></span>}
      {/* Silent and untouched, the sound is the one thing said up front */}
      {muted && !shown && (
        <IconButton className="mp__corner" icon="mute" label={p.unmute} variant="default" size="s" onClick={sound} />
      )}
      <div className="mp__bar cr-on-chrome">
        <IconButton icon={paused ? "play" : "pause"} label={paused ? p.play : p.pause} variant="quiet" size="s" onClick={toggle} />
        <span className="mp__time">{fmt(time)}<span> / {fmt(length)}</span></span>
        <div className="mp__track" role="slider" aria-label={p.seek} aria-valuemin={0} aria-valuemax={Math.round(length)} aria-valuenow={time}
          aria-valuetext={`${fmt(time)} / ${fmt(length)}`} tabIndex={-1}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekAt(e); }}
          onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) seekAt(e); }}>
          <span className="mp__rail"><span ref={fill} className="mp__fill" /></span>
        </div>
        <IconButton icon={muted ? "mute" : "volume"} label={muted ? p.unmute : p.mute} variant="quiet" size="s" toggle active={!muted} onClick={sound} />
        <IconButton icon={full ? "collapse" : "expand"} label={full ? p.exitFullscreen : p.fullscreen} variant="quiet" size="s" onClick={fullscreen} />
      </div>
    </div>
  );
}
