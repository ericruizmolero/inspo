"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { InspoItem } from "@/types/inspo";
import { useT } from "./I18nProvider";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { IconButton, SegmentedControl } from "@/components/criterio";
import { readableDomain } from "@/lib/url";

// ─── Panel ────────────────────────────────────────────────────────────────────
// The system's Viewer: one reference over the canvas, which dims behind it; the island and the search dock
// stay where they are, above it. Dark chrome in both themes. The header names the source; the stage holds the
// reference on its card with a step to either side; the conversation is the aside on the right. In a project,
// the page has a twin one press away: what the reference writes in the project's criterio.md.

// Where the last press landed, so the sheet grows out of the card that opened it. Read once when it opens;
// a press older than a second (a link, the keyboard) leaves the sheet growing from its middle.
let lastPress: { x: number; y: number; at: number } | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => { lastPress = { x: e.clientX, y: e.clientY, at: Date.now() }; }, { capture: true, passive: true });
}

export default function ItemPanel({ item, isSite, page, criterio, thread, onClose, onPrev, onNext, libraryName }: {
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
  /** The reference before and after this one on the board; absent at either end, or when it isn't on the board */
  onPrev?: () => void;
  onNext?: () => void;
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

  // The arrows walk the board in its order, unless a field, a lightbox or another dialog has them
  const stepRef = useRef({ onPrev, onNext });
  stepRef.current = { onPrev, onNext };
  const navigable = !!(onPrev || onNext);
  useEffect(() => {
    if (!navigable) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=slider], [role=tablist]")) return;
      if (document.querySelector(".cm-lightbox, [role=dialog][data-open], .modal-backdrop")) return;
      const go = e.key === "ArrowLeft" ? stepRef.current.onPrev : stepRef.current.onNext;
      if (!go) return;
      e.preventDefault();
      go();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigable]);

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

  // A copied picture or video links to the page it was found on
  const origin = item.source ?? url;
  const rawHost = origin.replace(/^https?:\/\//, "").split("/")[0];
  const host = readableDomain(rawHost);
  const [iconOk, setIconOk] = useState(true);
  // Another reference in the same panel starts on its page
  useEffect(() => { setIconOk(true); setView("page"); }, [url]);

  const views = criterio ? ["page", "criterio"] as const : null;

  return (
    <div className={`ip-layer${navigable ? " has-nav" : ""}`}>
      <div ref={dimRef} className="ip-dim" onClick={leave} aria-hidden />
      <aside ref={asideRef} className="ip cr-viewer" role="dialog" aria-modal="true" aria-label={item.name}>
        <header className="ip-bar cr-viewer-head">
          {/* The source: its favicon on a square chrome avatar, or its initial */}
          <span className="cr-avatar cr-avatar-chrome is-square ip-bar__source" aria-hidden>
            {iconOk && isSite && <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(rawHost)}&sz=64`} alt="" onError={() => setIconOk(false)} />}
            {(!iconOk || !isSite) && item.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="cr-viewer-titles">
            <div className="cr-viewer-title">{item.name}</div>
            <Breadcrumb className="cr-viewer-crumb ip-bar__crumbs" aria-label={t.settings.breadcrumb}>
              <BreadcrumbList>
                {libraryName && (
                  <>
                    <BreadcrumbItem><button type="button" className="ip-bar__crumb" onClick={leave}>{libraryName}</button></BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </>
                )}
                <BreadcrumbItem><a href={origin} target="_blank" rel="noopener noreferrer">{isSite || item.source ? host : t.card.openImage}</a></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {views && (
            <SegmentedControl className="ip-bar__tabs" label={t.panel.views}
              items={[{ label: t.panel.tabPage }, { label: t.panel.tabCriterio }]}
              active={views.indexOf(view)} onChange={(i) => setView(views[i])} />
          )}
          <IconButton icon="close" variant="quiet" size="m" className="ip-bar__close" label={t.common.close} onClick={leave} />
        </header>

        {/* The reference itself takes the room, with a step to either side; the conversation is a column down its right */}
        <div className="ip-bento cr-viewer-body">
          <div className="ip-stage cr-viewer-stage">
            {navigable && <IconButton icon="chevron-left" variant="default" size="l" className="ip-nav is-prev" label={t.panel.previous} onClick={onPrev} disabled={!onPrev} />}
            <section className="ip-card ip-card--page cr-viewer-media" aria-label={view === "criterio" ? t.panel.tabCriterio : t.panel.tabPage}>{view === "criterio" && criterio ? criterio : page}</section>
            {navigable && <IconButton icon="chevron-right" variant="default" size="l" className="ip-nav is-next" label={t.panel.next} onClick={onNext} disabled={!onNext} />}
          </div>
          <section className="ip-card--talk cr-viewer-aside">{thread}</section>
        </div>
      </aside>
    </div>
  );
}
