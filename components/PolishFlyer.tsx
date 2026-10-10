"use client";
import { useLayoutEffect, useRef } from "react";
import type { InspoItem } from "@/types/inspo";
import { EASE_OUT, stillMotion } from "./polish-tornado";
import { Face } from "./PolishFace";

export const FLY_MS = 640;
export const LAND = 0.8; // the part of the flight after which the card is on its tab: the tab bumps, and a forgotten card is taken out of the project then, so the Inbox counts it as it arrives
const EASE_FLY = "cubic-bezier(0.55, 0, 0.25, 1)";
/** Where a decided card lands: the tab that stands for the place it goes to */
export const LANDING = { inbox: '.island a[href*="in=inbox"]', board: '.topbar__modes [role="tab"]', polish: '.topbar__modes [role="tab"]:nth-of-type(2)' } as const;
/** The tab a card landed on takes it with a small bump */
export const bump = (tab: HTMLElement) => tab.animate([{ transform: "scale(1)" }, { transform: "scale(1.16)" }, { transform: "scale(1)" }], { duration: 380, easing: EASE_OUT });

export type Flight = { id: number; item: InspoItem; to: keyof typeof LANDING; x: number; y: number; w: number; h: number };

/** A decided card on its way: a copy of it, from where it stood to the tab of the place it goes to (the board for
 *  one kept, the Inbox for one forgotten, Polish itself for a vote), which takes it with a small bump. The card
 *  itself has already left the tornado */
export default function Flyer({ flight, image, text, onGone }: { flight: Flight; image: string | null; text: string; onGone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let anim: Animation;
    if (stillMotion()) anim = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
    else {
      // Where the tab is not on screen (the island on a phone), to the corner the menu opens from
      const tab = document.querySelector<HTMLElement>(LANDING[flight.to]);
      const to = tab && tab.offsetParent ? tab.getBoundingClientRect() : null;
      const r = el.getBoundingClientRect();
      const dx = (to ? to.left + to.width / 2 : 32) - (r.left + r.width / 2), dy = (to ? to.top + to.height / 2 : 28) - (r.top + r.height / 2);
      const landed = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) rotate(${flight.to === "inbox" ? -8 : 8}deg) scale(${Math.max(0.03, 28 / r.width).toFixed(3)})`;
      anim = el.animate([
        { transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)", opacity: 1 },
        { transform: landed, opacity: 1, offset: 0.9 },
        { transform: landed, opacity: 0 },
      ], { duration: FLY_MS, easing: EASE_FLY, fill: "forwards" });
      if (to && tab) window.setTimeout(() => bump(tab), FLY_MS * LAND);
    }
    void anim.finished.then(onGone, onGone);
    // Once, when it mounts: it only exists to leave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className="polish__fly" aria-hidden style={{ left: flight.x, top: flight.y, width: flight.w, height: flight.h }}>
      <Face item={flight.item} image={image} text={text} />
    </div>
  );
}
