"use client";

import { useEffect, useRef, useState } from "react";

/* The clouds (Eric, 09-10: "nubecita del color de background", "casi que en todas partes"): two bands of the view's
   own background over the edges of whatever scrolls under the floating bars, so the Island, the dock and the corner
   pill rest on calm ground and no card or line is cut flat by the window's edge. Each shows only where there is more beyond
   it: the top one once the view has scrolled, the bottom one until the view reaches its end, unless `always` says
   the content turns under the bars without scrolling (Polish). Styles in app/globals.css (.cloud). */
export default function Clouds({ top = 64, bottom = 72, always = false, scroller, mode = "sibling", only }: {
  /** The band the top bar takes, in px: the cloud is that plus a tail */
  top?: number;
  /** The band the bottom bars take, in px (the dock, or the pill alone); a floor keeps the pill covered */
  bottom?: number;
  /** Both clouds on from the start: the content moves under the bars by itself */
  always?: boolean;
  /** The element that scrolls; by default the element rendered right before the clouds */
  scroller?: React.RefObject<HTMLElement | null>;
  /** "sibling": two layers beside an absolute scroller. "window": the page scrolls with the window and each cloud
      sticks inside the flow (the top one must be the first child of the column, the bottom one the last) */
  mode?: "sibling" | "window";
  /** In window mode, which one this is */
  only?: "top" | "bottom";
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Which edges have more beyond them: the top one once the view has scrolled, the bottom one until it reaches its
  // end (as the lists do: the fade says there is more, so it goes where there is no more)
  const [edge, setEdge] = useState({ top: always, bottom: true });
  useEffect(() => {
    if (always) return;
    const el = mode === "window" ? null : (scroller?.current ?? (ref.current?.previousElementSibling as HTMLElement | null));
    if (mode !== "window" && !el) return;
    const read = () => {
      const top = el ? el.scrollTop : window.scrollY;
      const seen = el ? el.clientHeight : window.innerHeight;
      const all = el ? el.scrollHeight : document.documentElement.scrollHeight;
      // 8 px of slack at the end: a board grows a few px once its captions are measured, and the scroller stays short of them
      const next = { top: top > 4, bottom: top + seen < all - 8 };
      setEdge((cur) => (cur.top === next.top && cur.bottom === next.bottom ? cur : next));
    };
    read();
    const target: HTMLElement | Window = el ?? window;
    target.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    // The content grows after the first paint (cards arriving, a page loading): watch its size and its children
    const ro = new ResizeObserver(read);
    const watched = el ?? document.body;
    ro.observe(watched);
    for (const child of Array.from(watched.children)) ro.observe(child);
    const mo = new MutationObserver(() => { for (const child of Array.from(watched.children)) ro.observe(child); read(); });
    mo.observe(watched, { childList: true });
    return () => { target.removeEventListener("scroll", read); window.removeEventListener("resize", read); ro.disconnect(); mo.disconnect(); };
  }, [always, mode, scroller]);
  const on = edge.top, more = edge.bottom;
  const sticky = mode === "window" ? " cloud--sticky" : "";
  return (
    <>
      {only !== "bottom" && <div ref={ref} className={`cloud cloud--top${sticky}${on ? " is-on" : ""}`} style={{ "--fade": `${top}px` } as React.CSSProperties} aria-hidden />}
      {only !== "top" && <div className={`cloud cloud--bottom${sticky}${more ? "" : " is-off"}`} style={{ "--fade": `${bottom}px` } as React.CSSProperties} aria-hidden />}
    </>
  );
}
