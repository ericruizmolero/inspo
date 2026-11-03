"use client";

// The reference itself in its panel: a page's whole capture, or an image. Only to look at;
// what the team says about it is in the conversation beside it.
// A page plays itself, as if recorded with Screen Studio (page-tour.ts): the camera scrolls down, a cursor points
// and the camera zooms in on it. Touching the page (wheel, click, touch) hands it back to be read by scrolling;
// the button in the corner plays it again from where it is.

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "./I18nProvider";
import { EmptyState, IconButton } from "@/components/criterio";
import { planTour, saliency, tf, type TourPlan } from "./page-tour";

/** Page height in 1440px-wide pixels */
const at1440 = (img: HTMLImageElement) => Math.round((img.naturalHeight * 1440) / (img.naturalWidth || 1440));

/** An image taller than this (in 1440px-wide pixels) is read like a page, by scrolling; shorter, it is shown whole */
const FIT_MAX_H = 3200;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function PageView({ src, alt, fit, posters }: {
  /** The page image, or null when there is no capture yet */
  src: string | null;
  alt: string;
  /** What to show while the capture loads, in order: the site's og:image, then the board card's image (or the top of
   *  the capture the card shows). The first that
   *  loads stays until the capture arrives, which fades in over it */
  posters?: string[];
  /** An image: shown whole and centred, at the size the card allows, instead of across its width */
  fit?: boolean;
}) {
  const { t } = useT();
  const [pageH, setPageH] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const fitted = !!fit && !(pageH && pageH > FIT_MAX_H);
  // A page tours on its own when it opens; an image does not
  const [touring, setTouring] = useState(() => !fit && !reducedMotion());
  const anims = useRef<Animation[]>([]);
  const planRef = useRef<TourPlan | null>(null);
  const [poster, setPoster] = useState(0);
  const [posterGone, setPosterGone] = useState(false);

  // A new page (another item, or the real capture replacing the quick one): measure it again
  useEffect(() => {
    setPageH(null); setFailed(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setPageH(at1440(img));
  }, [src]);

  // Once the capture is in, the poster under it goes after the capture's fade
  useEffect(() => {
    if (!pageH) return;
    const id = setTimeout(() => setPosterGone(true), 400);
    return () => clearTimeout(id);
  }, [pageH]);

  const cancelAll = () => { for (const a of anims.current) a.cancel(); anims.current = []; };

  /** Starts the tour at the view nearest `fromTop`, gliding there from where the page is now */
  const play = useCallback((fromTop: number, fromTransform: string) => {
    const view = viewRef.current, page = pageRef.current, img = imgRef.current, cur = cursorRef.current;
    if (!view || !page || !img?.naturalWidth || !cur) return;
    cancelAll();
    const W = view.clientWidth, V = view.clientHeight;
    const H = (W * img.naturalHeight) / img.naturalWidth;
    if (!W || !V) return;
    const plan = planTour(W, V, H, saliency(img));
    planRef.current = plan;
    view.scrollTop = 0;
    let k = 0;
    for (let i = 1; i < plan.stops.length; i++) if (Math.abs(plan.stops[i].top - fromTop) < Math.abs(plan.stops[k].top - fromTop)) k = i;
    const start = plan.stops[k];
    const startMain = () => {
      const opts: KeyframeAnimationOptions = { duration: plan.duration, iterations: Infinity, fill: "both" };
      const cam = page.animate(plan.camera, opts);
      const cu = cur.animate(plan.cursor, opts);
      cam.currentTime = cu.currentTime = start.at;
      anims.current = [cam, cu];
    };
    if (fromTransform === tf({ left: 0, top: start.top, z: 1 })) { startMain(); return; }
    const lead = page.animate([{ transform: fromTransform }, { transform: tf({ left: 0, top: start.top, z: 1 }) }],
      { duration: 600, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "both" });
    anims.current = [lead];
    lead.finished.then(startMain, () => {});
  }, []);

  /** Hands the page back to scrolling, from exactly where the camera is */
  const stop = useCallback(() => {
    const view = viewRef.current, page = pageRef.current;
    setTouring(false);
    if (!view || !page) { cancelAll(); return; }
    const m = new DOMMatrix(getComputedStyle(page).transform === "none" ? undefined : getComputedStyle(page).transform);
    cancelAll();
    const z = m.a || 1, V = view.clientHeight;
    const centre = (-m.f + V / 2) / z;
    const top = Math.max(0, Math.min(view.scrollHeight - V, centre - V / 2));
    view.scrollTop = top;
    // The page lies where the camera left it and settles into the scroll
    if (z !== 1 || Math.abs(-m.f - top) > 0.5) {
      page.animate([{ transform: `translate(${m.e}px, ${m.f + top}px) scale(${z})` }, { transform: "none" }],
        { duration: 450, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
    }
  }, []);

  // Touring: start once the capture is measured, and again (same place) when the card changes size
  useEffect(() => {
    if (!touring || fitted || !pageH) return;
    const view = viewRef.current;
    if (!view) return;
    play(0, tf({ left: 0, top: 0, z: 1 }));
    let last = { w: view.clientWidth, h: view.clientHeight };
    const ro = new ResizeObserver(() => {
      const w = view.clientWidth, h = view.clientHeight;
      if (Math.abs(w - last.w) < 2 && Math.abs(h - last.h) < 2) return;
      last = { w, h };
      const page = pageRef.current;
      const m = page ? new DOMMatrix(getComputedStyle(page).transform === "none" ? undefined : getComputedStyle(page).transform) : new DOMMatrix();
      play(-m.f / (m.a || 1), `translate(0px, ${m.f / (m.a || 1)}px) scale(1)`);
    });
    ro.observe(view);
    return () => { ro.disconnect(); cancelAll(); };
  }, [touring, fitted, pageH, play]);

  // Any hand on the page takes it over
  useEffect(() => {
    const view = viewRef.current;
    if (!touring || !view) return;
    const take = () => stop();
    view.addEventListener("wheel", take, { passive: true });
    view.addEventListener("pointerdown", take);
    view.addEventListener("touchstart", take, { passive: true });
    return () => {
      view.removeEventListener("wheel", take);
      view.removeEventListener("pointerdown", take);
      view.removeEventListener("touchstart", take);
    };
  }, [touring, stop]);

  const resume = () => {
    const view = viewRef.current;
    if (!view) return;
    const top = view.scrollTop;
    // Same picture, now drawn by the transform instead of the scroll
    planRef.current = null;
    setTouring(true);
    requestAnimationFrame(() => play(top, tf({ left: 0, top, z: 1 })));
  };

  const canTour = !fitted && !!pageH && !failed && !!src;

  return (
    <div className="pn-wrap">
      <div ref={viewRef} className={`pn${fitted ? " is-fit" : ""}${touring && canTour ? " is-touring" : ""}`}>
        {src && !failed ? (
          <div ref={pageRef} className="pn-page">
            {!pageH && <div className="shimmer" />}
            {!fit && !posterGone && posters?.[poster] && (
              <img
                key={posters[poster]}
                src={posters[poster]}
                alt=""
                aria-hidden
                className="pn-poster"
                onLoad={(e) => e.currentTarget.classList.add("is-loaded")}
                onError={() => setPoster((i) => i + 1)}
                draggable={false}
              />
            )}
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
        {canTour && (
          <div ref={cursorRef} className="pn-cursor" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 22 22"><path d="M4 2.5v16.2l4.3-4.1 2.9 6.4 2.9-1.3-2.8-6.3h6z" /></svg>
          </div>
        )}
      </div>
      {canTour && (
        <IconButton
          icon={touring ? "pause" : "play"}
          label={touring ? t.panel.tourStop : t.panel.tourPlay}
          variant="default"
          size="m"
          className="pn-tour"
          onClick={touring ? stop : resume}
        />
      )}
    </div>
  );
}
