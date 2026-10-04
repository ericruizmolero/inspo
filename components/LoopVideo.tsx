"use client";
// A short recording looping on a card or a thumbnail, muted: it plays only while it is in view and lies over
// the frame until it has something to show, so a slow load never blanks the picture.
import { useEffect, useRef, useState } from "react";

export default function LoopVideo({ src, className = "" }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // React leaves the muted attribute out of the markup: without it the browser refuses to play on its own
    v.muted = true; v.defaultMuted = true;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) void v.play().catch(() => {}); else v.pause(); }, { rootMargin: "100px 0px" });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  if (failed) return null;
  return (
    <video ref={ref} className={`${className}${ready ? "" : " is-hidden"}`} src={src} muted autoPlay loop playsInline preload="metadata"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", maxHeight: "none", objectFit: "cover", objectPosition: "top", opacity: ready ? 1 : 0 }}
      onPlaying={() => setReady(true)} onError={() => setFailed(true)} aria-hidden />
  );
}
