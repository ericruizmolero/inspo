"use client";

import { useState } from "react";
import { videoEmbedOf } from "@/lib/url";
import { useT } from "./I18nProvider";

// A video link played inside the thread. Until it is pressed it is only a frame:
// the provider's iframe (and its cookies and scripts) loads when someone wants to watch.
export default function VideoPlayer({ web, title }: { web: string; title: string }) {
  const { t } = useT();
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const video = videoEmbedOf(web);
  if (!video) return null;

  if (video.provider === "file") {
    return (
      <div className="vp">
        <video className="vp__media" src={web} controls playsInline preload="metadata" />
      </div>
    );
  }

  if (playing) {
    const src = `${video.src}${video.src.includes("?") ? "&" : "?"}autoplay=1`;
    return (
      <div className="vp">
        <iframe className="vp__media" src={src} title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
      </div>
    );
  }

  // YouTube hands out its frame by id; for the rest, the page's og:image
  const poster = video.poster ?? `/api/og?url=${encodeURIComponent(web)}`;
  return (
    <button type="button" className="vp vp--poster" onClick={() => setPlaying(true)} aria-label={`${t.card.play}: ${title}`}>
      {!posterFailed && <img className="vp__media" src={poster} alt="" onError={() => setPosterFailed(true)} />}
      <span className="vp__play" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor"><path d="M4 2.5v9a.5.5 0 00.77.42l7-4.5a.5.5 0 000-.84l-7-4.5A.5.5 0 004 2.5z" /></svg>
      </span>
    </button>
  );
}
