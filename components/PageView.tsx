"use client";

// The reference itself in its panel: a page's whole capture, read by scrolling, or an image. Only to look at;
// what the team says about it is in the conversation beside it.

import { useEffect, useRef, useState } from "react";
import { useT } from "./I18nProvider";
import { EmptyState } from "@/components/criterio";

/** Page height in 1440px-wide pixels */
const at1440 = (img: HTMLImageElement) => Math.round((img.naturalHeight * 1440) / (img.naturalWidth || 1440));

/** An image taller than this (in 1440px-wide pixels) is read like a page, by scrolling; shorter, it is shown whole */
const FIT_MAX_H = 3200;

export default function PageView({ src, alt, fit }: {
  /** The page image, or null when there is no capture yet */
  src: string | null;
  alt: string;
  /** An image: shown whole and centred, at the size the card allows, instead of across its width */
  fit?: boolean;
}) {
  const { t } = useT();
  const [pageH, setPageH] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // A new page (another item, or the real capture replacing the quick one): measure it again
  useEffect(() => {
    setPageH(null); setFailed(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setPageH(at1440(img));
  }, [src]);

  return (
    <div className="pn-wrap">
      <div className={`pn${fit && !(pageH && pageH > FIT_MAX_H) ? " is-fit" : ""}`}>
        {src && !failed ? (
          <div className="pn-page">
            {!pageH && <div className="shimmer" />}
            <img
              ref={imgRef}
              src={src}
              alt={alt}
              className={pageH ? "is-loaded" : ""}
              onLoad={(e) => setPageH(at1440(e.currentTarget))}
              onError={() => setFailed(true)}
              draggable={false}
            />
          </div>
        ) : (
          <EmptyState className="pn-empty" title={t.panel.noCapture} />
        )}
      </div>
    </div>
  );
}
