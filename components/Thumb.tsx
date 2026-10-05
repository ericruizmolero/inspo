"use client";
// A reference in small: its picture (stored, the video's poster, the card's cached one, its og:image), or its
// initial when none loads. A screen recording loops over its frame
import { useState } from "react";
import type { InspoItem } from "@/types/inspo";
import { cachedCardImage } from "./InspoCard";
import LoopVideo from "./LoopVideo";
import { mediaKindOf, videoEmbedOf } from "@/lib/url";

export function Thumb({ item, image, className = "" }: { item: InspoItem; image: string | null; className?: string }) {
  const [at, setAt] = useState(0);
  const embed = mediaKindOf(item.web) === "video" ? videoEmbedOf(item.web) : null;
  const srcs = [image, embed?.poster, cachedCardImage(item.web), `/api/og?url=${encodeURIComponent(item.web)}`].filter((x): x is string => !!x);
  const src = srcs[at];
  return (
    <span className={`sysv-thumb${className ? ` ${className}` : ""}`} aria-hidden style={embed?.loops ? { position: "relative" } : undefined}>
      {src ? <img key={src} src={src} alt="" loading="lazy" decoding="async" onError={() => setAt((i) => i + 1)} /> : item.name.slice(0, 1).toUpperCase()}
      {embed?.loops && <LoopVideo src={embed.src} />}
    </span>
  );
}
