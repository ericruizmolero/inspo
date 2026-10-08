"use client";

import { useState } from "react";
import { videoEmbedOf } from "@/lib/url";
import { Icon } from "@/components/criterio";
import { useT } from "./I18nProvider";

// A video link played inside the thread. Until it is pressed it is only a frame:
// the provider's iframe (and its cookies and scripts) loads when someone wants to watch.
export default function VideoPlayer({ web, title }: { web: string; title: string }) {
  const { t } = useT();
  const [playing, setPlaying] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const video = videoEmbedOf(web);
  if (!video) return null;

  if (video.provider === "file" || video.provider === "screenstudio") {
    return (
      <div className="vp">
        <video className="vp__media" src={video.src} poster={video.poster} controls playsInline preload="metadata" />
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
        <Icon name="play" size={18} />
      </span>
    </button>
  );
}
