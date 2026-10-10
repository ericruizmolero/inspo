"use client";

// Visual feedback on every page, built on Agentation.
//
// Agentation does the hard part: picking an element on the page, the note popup, the
// markers and the notes per route in localStorage. But its toolbar is made for people
// who paste markdown into a coding agent: eight unlabeled icons (pause animations, layout
// mode, copy, settings...). Someone who has never used it does not know what to press.
// So the toolbar is hidden (components/feedback-mode.ts, from inside its shadow root) and
// driven from here: a labeled "Give feedback" pill, a panel that says what to do in three
// steps, and one "Send to the team" button.
//
// Agentation exposes no API to start or stop feedback mode: components/feedback-mode.ts
// clicks its hidden bar. Where the page has a sidebar, the way in is "Give feedback" at its
// foot (FeedbackEntry) and the floating dock only shows with unsent notes; elsewhere
// (login, invitations, plans) the dock is a small icon. See globals.css.
//
// Each note is saved on the server as it is added (/api/feedback), just in case; the
// email to the partners only goes out on "Send to the team". Signed out (login, plans,
// invitation) it works the same and notes stay in localStorage, but sending asks to sign
// in first: /api/feedback requires a session.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { Annotation } from "agentation";
import { feedbackMarkdown, pathOf } from "@/lib/feedback-core";
import { useT } from "./I18nProvider";
import { Icon, IconButton, StatusRing } from "@/components/criterio";
import { FEEDBACK_LOAD_EVENT, agentationRoot, clearFeedbackMarkers as clearMarkers, enterFeedbackMode as enterMode, exitFeedbackMode as exitMode, flushPendingEnter, hideAgentationBar as hideBar, isFeedbackModeOn as isModeOn } from "./feedback-mode";

// Agentation is most of this tool's weight and only does anything in feedback mode: it loads the
// first time someone asks for it (the pill, the sidebar entry, the palette, Cmd+Shift+F) or when
// this route already has notes. Hovering the pill fetches it ahead.
const loadAgentation = () => import("agentation");
const Agentation = dynamic(() => loadAgentation().then((m) => m.Agentation), { ssr: false });

// Agentation's own loadAnnotations, read here so the notes count needs no Agentation: one key
// per route, notes older than 7 days dropped
const NOTES_PREFIX = "feedback-annotations-";
const NOTES_DAYS = 7;
function loadAnnotations(pathname: string): Annotation[] {
  try {
    const data = JSON.parse(localStorage.getItem(NOTES_PREFIX + pathname) ?? "[]") as Annotation[];
    const cutoff = Date.now() - NOTES_DAYS * 24 * 60 * 60 * 1000;
    return data.filter((a) => !a.timestamp || a.timestamp > cutoff);
  } catch { return []; }
}

const ENDPOINT = "/api/feedback";
type SendState = "idle" | "sending" | "sent" | "error";

/**
 * Runs on the client before Agentation mounts (a state initializer of the parent runs
 * before the child renders). Its popup follows its own theme, saved in localStorage:
 * it is set to the app's so a light app does not get a dark popup. And "Hide until
 * restart", which someone may have pressed on the old bar, would leave the pill dead:
 * it is forgotten.
 */
function prepareAgentation() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("feedback-toolbar-theme", document.documentElement.dataset.theme === "light" ? "light" : "dark");
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.endsWith("toolbar-hidden")) sessionStorage.removeItem(k);
    }
  } catch { /* private mode: the defaults apply */ }
}

// ─── Where the dock sits ─────────────────────────────────────────────────────
// By default the pill owns the bottom-right corner and the CSS keeps it clear of what else docks
// there. It can also be dragged anywhere; that spot is kept per browser, as offsets from the corner.

const POS_KEY = "feedback-dock-pos";
type DockPos = { right: number; bottom: number };
const EDGE = 8;

function loadPos(): DockPos | null {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) ?? "null");
    return typeof p?.right === "number" && typeof p?.bottom === "number" ? p : null;
  } catch { return null; }
}
function savePos(p: DockPos | null) {
  try { if (p) localStorage.setItem(POS_KEY, JSON.stringify(p)); else localStorage.removeItem(POS_KEY); } catch { /* private mode */ }
}
/** Keeps a box of w×h inside the viewport, EDGE px from every side */
function clampPos(p: DockPos, w: number, h: number): DockPos {
  return {
    right: Math.round(Math.min(Math.max(p.right, EDGE), Math.max(EDGE, window.innerWidth - w - EDGE))),
    bottom: Math.round(Math.min(Math.max(p.bottom, EDGE), Math.max(EDGE, window.innerHeight - h - EDGE))),
  };
}

// ─── The tool ────────────────────────────────────────────────────────────────

export default function FeedbackTool({ canSend = true }: { canSend?: boolean }) {
  const pathname = usePathname();
  const { t } = useT();
  const [notes, setNotes] = useState<Map<string, Annotation>>(() => new Map());
  const [state, setState] = useState<SendState>("idle");
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useState(prepareAgentation);

  // Dragging the dock. `pos` is null until the person moves it: the CSS corner applies.
  const [pos, setPos] = useState<DockPos | null>(null);
  const [dragging, setDragging] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; right: number; bottom: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const dockSize = () => ({ w: dockRef.current?.offsetWidth ?? 160, h: dockRef.current?.offsetHeight ?? 40 });
  useEffect(() => {
    const saved = loadPos();
    if (saved) { const { w, h } = dockSize(); setPos(clampPos(saved, w, h)); }
  }, []);
  useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((p) => { if (!p) return p; const { w, h } = dockSize(); return clampPos(p, w, h); });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos !== null]); // eslint-disable-line react-hooks/exhaustive-deps
  const onDockPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !dockRef.current) return;
    const r = dockRef.current.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom, moved: false };
  };
  const onDockPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    // A few px of slack, so a plain click never counts as a drag
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    // The pointer is captured only once it is a drag: captured from pointerdown, Chrome sends
    // the click to the dock instead of the button under it, and a plain click did nothing
    if (!d.moved) { d.moved = true; setDragging(true); dockRef.current?.setPointerCapture(e.pointerId); }
    const { w, h } = dockSize();
    setPos(clampPos({ right: d.right - dx, bottom: d.bottom - dy }, w, h));
  };
  const onDockPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    setDragging(false);
    justDragged.current = true;
    setPos((p) => { savePos(p); return p; });
  };
  // The click that ends a drag must not open feedback mode
  const onDockClickCapture = (e: React.MouseEvent) => {
    if (!justDragged.current) return;
    justDragged.current = false;
    e.preventDefault(); e.stopPropagation();
  };
  // Double-click sends the dock back to its corner
  const resetPos = () => { setPos(null); savePos(null); };
  // The open panel is wider than the dock: same spot, but kept inside the viewport
  const panelStyle = pos ? { right: Math.max(EDGE, Math.min(pos.right, window.innerWidth - 320 - EDGE)), bottom: pos.bottom } : undefined;

  // Agentation keeps its notes per route in localStorage: they come back when the page changes
  useEffect(() => {
    const saved = loadAnnotations(pathname);
    setNotes(new Map(saved.map((a) => [a.id, a])));
    setState("idle");
    if (saved.length) setLoaded(true);
  }, [pathname]);

  // Loading on request. Before Agentation is there its Cmd+Shift+F is not either: the first one is caught here.
  useEffect(() => {
    if (loaded) return;
    const load = () => setLoaded(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "f" || e.key === "F")) { e.preventDefault(); enterMode(); }
    };
    window.addEventListener(FEEDBACK_LOAD_EVENT, load);
    document.addEventListener("keydown", onKey);
    return () => { window.removeEventListener(FEEDBACK_LOAD_EVENT, load); document.removeEventListener("keydown", onKey); };
  }, [loaded]);

  // Feedback mode on or off, read from the hidden bar: its toggle says so in aria-expanded.
  // Esc and Cmd+Shift+F are handled by Agentation and land here too.
  useEffect(() => {
    let inner: MutationObserver | null = null;
    const sync = () => { flushPendingEnter(); setActive(isModeOn()); };
    const watch = (root: ShadowRoot) => {
      hideBar(root);
      inner = new MutationObserver(sync);
      inner.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-expanded"] });
      sync();
    };
    // Agentation mounts in a portal after hydration and draws its bar in a shadow root: wait for it, then
    // watch only that (what changes in there never reaches an observer of the document)
    const outer = new MutationObserver(() => {
      const root = agentationRoot();
      if (root) { outer.disconnect(); watch(root); }
    });
    const root = agentationRoot();
    if (root) watch(root);
    else outer.observe(document.body, { childList: true, subtree: true });
    return () => { outer.disconnect(); inner?.disconnect(); };
  }, []);

  const post = useCallback((body: Record<string, unknown>) => {
    const payload = JSON.stringify({ url: window.location.href, viewport: `${window.innerWidth}×${window.innerHeight}`, ...body });
    return fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
  }, []);

  const track = useCallback((event: "annotation.add" | "annotation.update", a: Annotation) => {
    setNotes((m) => new Map(m).set(a.id, a));
    setState("idle");
    if (canSend) post({ event, annotation: a }).catch(() => {});
  }, [post, canSend]);

  const forget = useCallback((a: Annotation) => {
    setNotes((m) => { const n = new Map(m); n.delete(a.id); return n; });
    if (canSend) post({ event: "annotation.delete", annotation: a }).catch(() => {});
  }, [post, canSend]);

  const list = useMemo(() => [...notes.values()].sort((a, b) => a.timestamp - b.timestamp), [notes]);

  // "Clear": the unsent drafts go from the server too, then Agentation drops the markers
  const clear = useCallback(() => {
    if (canSend) for (const a of list) post({ event: "annotation.delete", annotation: a }).catch(() => {});
    clearMarkers();
    setNotes(new Map());
  }, [list, post, canSend]);

  const send = useCallback(async () => {
    if (!list.length || state === "sending") return;
    if (!canSend) {
      // The notes stay in localStorage: back on this route with a session, they can be sent
      const here = window.location.pathname + window.location.search;
      window.location.assign(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    setState("sending");
    if (stateTimer.current) clearTimeout(stateTimer.current);
    const path = pathOf(window.location.href);
    const output = feedbackMarkdown(list, path, `${window.innerWidth}×${window.innerHeight}`);
    try {
      const res = await post({ event: "submit", output, annotations: list });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
      // Sent: a moment to read it, then the page is clean and feedback mode closes
      stateTimer.current = setTimeout(() => {
        clearMarkers();
        exitMode();
        setNotes(new Map());
        setState("idle");
      }, 2000);
    } catch {
      setState("error");
    }
  }, [list, state, post, canSend]);

  useEffect(() => () => { if (stateTimer.current) clearTimeout(stateTimer.current); }, []);

  const count = list.length;
  const sendLabel = !canSend ? t.feedback.signInToSend : state === "sending" ? t.feedback.sending : state === "sent" ? t.feedback.sent : state === "error" ? t.feedback.failed : t.feedback.send;

  const sendButton = (
    <button
      type="button"
      className="cr-btn cr-btn-secondary cr-btn-s fb-btn--send"
      data-state={state}
      onClick={send}
      disabled={state === "sending" || state === "sent"}
      aria-live="polite"
    >
      {state === "sent" ? <IconCheck /> : <IconSend />}
      <span>{sendLabel}</span>
      {state === "idle" && <span className="fb-count">{count}</span>}
    </button>
  );

  // A share link is for people outside the team: no tool for the team's notes there
  if (pathname.startsWith("/s/")) return null;
  return (
    <>
      {loaded && <Agentation
        copyToClipboard
        onAnnotationAdd={(a) => track("annotation.add", a)}
        onAnnotationUpdate={(a) => track("annotation.update", a)}
        onAnnotationDelete={forget}
        onAnnotationsClear={() => setNotes(new Map())}
      />}
      {/* data-feedback-toolbar: Agentation ignores clicks and hovers inside it, so our own
          buttons cannot be annotated while feedback mode is on */}
      {active ? (
        <section className="cr-window fb-panel" role="dialog" aria-label={t.feedback.title} data-feedback-toolbar="true" style={panelStyle}>
          <header className="cr-window-bar">
            <span className="cr-window-title"><StatusRing tone="new" label={t.feedback.title} />{t.feedback.title}</span>
            <IconButton icon="close" variant="strong" size="xs" className="fb-panel__close" onClick={exitMode} label={t.feedback.exit} />
          </header>
          <div className="cr-window-body fb-panel__body">
          {count === 0 ? (
            <>
              <p className="fb-panel__lead">{t.feedback.lead}</p>
              <ol className="fb-steps">
                {t.feedback.steps.map((s) => <li key={s}>{s}</li>)}
              </ol>
            </>
          ) : (
            <>
              <p className="fb-panel__lead">{t.feedback.count(count)}</p>
              <div className="fb-panel__actions">
                {sendButton}
                <button type="button" className="cr-btn cr-btn-secondary cr-btn-s" onClick={clear} disabled={state === "sending" || state === "sent"}>{t.feedback.clear}</button>
              </div>
            </>
          )}
          <p className="fb-panel__hint">{t.feedback.esc}</p>
          </div>
        </section>
      ) : (
        <div
          ref={dockRef}
          className={`fb-dock${dragging ? " is-dragging" : ""}${count > 0 ? " has-notes" : ""}`}
          data-feedback-toolbar="true"
          style={pos ? { right: pos.right, bottom: pos.bottom } : undefined}
          onPointerDown={onDockPointerDown}
          onPointerMove={onDockPointerMove}
          onPointerUp={onDockPointerUp}
          onPointerCancel={onDockPointerUp}
          onClickCapture={onDockClickCapture}
          onDoubleClick={resetPos}
          data-tip={t.feedback.dragHint}
        >
          {count > 0 && sendButton}
          <button type="button" className="cr-pillbar fb-pill" onClick={enterMode} onPointerEnter={() => void loadAgentation()} onFocus={() => void loadAgentation()} data-tip={count > 0 ? undefined : t.feedback.entryHint}>
            <IconBubble />
            <span>{count > 0 ? t.feedback.resume : t.feedback.open}</span>
            {count > 0 && <span className="fb-count">{count}</span>}
          </button>
        </div>
      )}
    </>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const IconBubble = () => <Icon name="chat" size={16} />;
const IconSend = () => <Icon name="send" size={16} />;
const IconCheck = () => <Icon name="check" size={16} />;
