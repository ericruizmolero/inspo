"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { InspoItem } from "@/types/inspo";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { readableDomain } from "@/lib/url";

const IcX = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
);

// ─── Panel ────────────────────────────────────────────────────────────────────
// A sheet over the canvas, which dims behind it; the island and the search dock stay where they are, above
// it. A board of two halves: the page, and the conversation, which is what people come here for. In a
// project, the page has a twin one press away: what the reference writes in the project's criterio.md.

// Where the last press landed, so the sheet grows out of the card that opened it. Read once when it opens;
// a press older than a second (a link, the keyboard) leaves the sheet growing from its middle.
let lastPress: { x: number; y: number; at: number } | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => { lastPress = { x: e.clientX, y: e.clientY, at: Date.now() }; }, { capture: true, passive: true });
}

export default function ItemPanel({ item, isSite, page, criterio, thread, onClose, libraryName }: {
  item: InspoItem;
  /** A site (not an image, a video, a post or a text): its favicon and its address head the sheet */
  isSite: boolean;
  /** The page (PageView), or the video, post or text itself */
  page: ReactNode | null;
  /** What it writes in its project's criterio.md (RefCriterio): one press away from the page */
  criterio?: ReactNode;
  /** The conversation: the note, the comments and their replies */
  thread: ReactNode;
  onClose: () => void;
  /** Name of the library it belongs to, first step of the breadcrumb */
  libraryName?: string;
}) {
  const { t } = useT();
  const url = item.web;
  const [view, setView] = useState<"page" | "criterio">("page");

  // Escape closes the sheet. A note being written eats its own Escape.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector(".cm-lightbox, [role=dialog][data-open], .modal-backdrop")) return;
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Opened from a card, the sheet grows out of that point: the origin goes on the sheet before its first paint
  const asideRef = useRef<HTMLElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = asideRef.current;
    if (!el || !lastPress || Date.now() - lastPress.at > 1000) return;
    const r = el.getBoundingClientRect();
    el.style.transformOrigin = `${lastPress.x - r.left}px ${lastPress.y - r.top}px`;
  }, []);

  // Closed by a click it goes back into where it came from, quicker than it came, and the dim lifts with it.
  // With reduced motion only the fade stays. Escape (a key) closes at once.
  const leaving = useRef(false);
  const leave = () => {
    const el = asideRef.current;
    if (leaving.current) return;
    if (!el) { onClose(); return; }
    leaving.current = true;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timing = { duration: 150, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" as const };
    dimRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], timing);
    el.animate(still
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [{ transform: "none", opacity: 1 }, { transform: "scale(0.96)", opacity: 0 }], timing).finished.then(onClose, onClose);
  };

  const rawHost = url.replace(/^https?:\/\//, "").split("/")[0];
  const host = readableDomain(rawHost);
  const [iconOk, setIconOk] = useState(true);
  // Another reference in the same panel starts on its page
  useEffect(() => { setIconOk(true); setView("page"); }, [url]);

  return (
    <div className="ip-layer">
      <div ref={dimRef} className="ip-dim" onClick={leave} aria-hidden />
      <aside ref={asideRef} className="ip" role="dialog" aria-modal="true" aria-label={item.name}>
        <header className="ip-bar">
          <div className="dm-bar__id">
            <span className="dm-bar__icon" aria-hidden>
              {iconOk && isSite && <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(rawHost)}&sz=64`} alt="" onError={() => setIconOk(false)} />}
              {(!iconOk || !isSite) && <span>{item.name.slice(0, 1).toUpperCase()}</span>}
            </span>
            <div className="dm-bar__title">
              <span className="display dm-bar__brand">{item.name}</span>
              <Breadcrumb className="dm-bar__meta" aria-label={t.settings.breadcrumb}>
                <BreadcrumbList>
                  {libraryName && (
                    <>
                      <BreadcrumbItem><button type="button" className="dm-bar__crumb" onClick={leave}>{libraryName}</button></BreadcrumbItem>
                      <BreadcrumbSeparator />
                    </>
                  )}
                  <BreadcrumbItem><a href={url} target="_blank" rel="noopener noreferrer">{isSite ? host : t.card.openImage}</a></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
          {criterio && (
            <div className="dm-tabs ip-bar__tabs" role="tablist">
              {([["page", t.panel.tabPage], ["criterio", t.panel.tabCriterio]] as const).map(([v, label]) => (
                <button key={v} role="tab" aria-selected={view === v} className={`dm-tab${view === v ? " is-active" : ""}`} onClick={() => setView(v)}>{label}</button>
              ))}
            </div>
          )}
          <Button variant="icon" className="ip-bar__close" onClick={leave} aria-label={t.common.close}>{IcX}</Button>
        </header>

        {/* The reference itself takes the room, the conversation is a column down its right */}
        <div className="ip-bento">
          <section className="ip-card ip-card--page" aria-label={view === "criterio" ? t.panel.tabCriterio : t.panel.tabPage}>{view === "criterio" && criterio ? criterio : page}</section>
          <section className="ip-card ip-card--talk">{thread}</section>
        </div>
      </aside>
    </div>
  );
}
