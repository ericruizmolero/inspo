"use client";

// Visual feedback on every page, built on Agentation.
//
// Agentation does the hard part: picking an element on the page, the note popup, the
// markers and the notes per route in localStorage. But its toolbar is made for people
// who paste markdown into a coding agent: eight unlabeled icons (pause animations, layout
// mode, copy, settings...). Someone who has never used it does not know what to press.
// So the toolbar is hidden with CSS (globals.css, "Feedback (Agentation)") and driven
// from here: a labeled "Give feedback" pill, a panel that says what to do in three steps,
// and one "Send to the team" button.
//
// Agentation exposes no API to start or stop feedback mode, so the hidden bar is clicked
// programmatically. Only its stable attributes are used: the toggle's title
// ("Start feedback mode", which disappears while active, and is how the mode is
// detected), data-danger on "Clear all", and the position of the close button.
//
// Each note is saved on the server as it is added (/api/feedback), just in case; the
// email to the partners only goes out on "Send to the team". Signed out (login, plans,
// invitation) it works the same and notes stay in localStorage, but sending asks to sign
// in first: /api/feedback requires a session.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Agentation, loadAnnotations, type Annotation } from "agentation";
import { feedbackMarkdown, pathOf } from "@/lib/feedback-core";
import { useT } from "./I18nProvider";

const ENDPOINT = "/api/feedback";
type SendState = "idle" | "sending" | "sent" | "error";

// ─── Driving Agentation's hidden bar ─────────────────────────────────────────

const TOOLBAR = "[data-agentation-toolbar]";
/** The closed toggle: Agentation drops its role and title while feedback mode is on */
const TOGGLE = '[role="button"][title="Start feedback mode"]';

const toolbar = () => document.querySelector<HTMLElement>(TOOLBAR);
const isModeOn = () => { const t = toolbar(); return !!t && !t.querySelector(TOGGLE); };

function enterMode() {
  toolbar()?.querySelector<HTMLElement>(TOGGLE)?.click();
}

function exitMode() {
  // The close button is the last control of the bar (second child of its container).
  // The settings panel has buttons of its own, so it is left out.
  const t = toolbar();
  if (!t) return;
  const controls = [...t.querySelectorAll<HTMLButtonElement>(":scope > div > div:nth-child(2) button")]
    .filter((b) => !b.closest("[data-agentation-settings-panel]"));
  const close = controls[controls.length - 1];
  if (close) close.click();
  else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

/** Agentation's "Clear all": removes the markers and its localStorage, then calls onAnnotationsClear */
function clearMarkers() {
  toolbar()?.querySelector<HTMLButtonElement>("button[data-danger]")?.click();
}

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

// ─── The tool ────────────────────────────────────────────────────────────────

export default function FeedbackTool({ canSend = true }: { canSend?: boolean }) {
  const pathname = usePathname();
  const { t } = useT();
  const [notes, setNotes] = useState<Map<string, Annotation>>(() => new Map());
  const [state, setState] = useState<SendState>("idle");
  const [active, setActive] = useState(false);
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useState(prepareAgentation);

  // Agentation keeps its notes per route in localStorage: they come back when the page changes
  useEffect(() => {
    setNotes(new Map(loadAnnotations(pathname).map((a) => [a.id, a])));
    setState("idle");
  }, [pathname]);

  // Feedback mode on or off, read from the hidden bar: the toggle's title goes while active.
  // Esc and Cmd+Shift+F are handled by Agentation and land here too.
  useEffect(() => {
    let inner: MutationObserver | null = null;
    const sync = () => setActive(isModeOn());
    const watch = (root: Element) => {
      inner = new MutationObserver(sync);
      inner.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["title"] });
      sync();
    };
    // Agentation mounts in a portal after hydration: wait for its root, then watch only that
    const outer = new MutationObserver(() => {
      const root = document.querySelector("[data-agentation-root]");
      if (root) { outer.disconnect(); watch(root); }
    });
    const root = document.querySelector("[data-agentation-root]");
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
      className="fb-btn fb-btn--send"
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

  return (
    <>
      <Agentation
        copyToClipboard
        onAnnotationAdd={(a) => track("annotation.add", a)}
        onAnnotationUpdate={(a) => track("annotation.update", a)}
        onAnnotationDelete={forget}
        onAnnotationsClear={() => setNotes(new Map())}
      />
      {/* data-feedback-toolbar: Agentation ignores clicks and hovers inside it, so our own
          buttons cannot be annotated while feedback mode is on */}
      {active ? (
        <section className="fb-panel" role="dialog" aria-label={t.feedback.title} data-feedback-toolbar="true">
          <header className="fb-panel__head">
            <span className="fb-panel__dot" aria-hidden />
            <strong className="fb-panel__title">{t.feedback.title}</strong>
            <button type="button" className="fb-panel__close" onClick={exitMode} aria-label={t.feedback.exit} title={t.feedback.exit}>
              <IconClose />
            </button>
          </header>
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
                <button type="button" className="fb-btn fb-btn--ghost" onClick={clear} disabled={state === "sending" || state === "sent"}>{t.feedback.clear}</button>
              </div>
            </>
          )}
          <p className="fb-panel__hint">{t.feedback.esc}</p>
        </section>
      ) : (
        <div className="fb-dock" data-feedback-toolbar="true">
          {count > 0 && sendButton}
          <button type="button" className="fb-pill" onClick={enterMode}>
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

const IconBubble = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 4.5c-4.4 0-8 3-8 6.8 0 2 1 3.8 2.6 5L6 20l4-2c.6.1 1.3.2 2 .2 4.4 0 8-3 8-6.8s-3.6-6.9-8-6.9z" />
  </svg>
);
const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2L6.5 7.5M12 2L8.5 12l-2-4.5L2 5.5z" /></svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.5 7.5l3 3 6-6" /></svg>
);
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="M3 3l8 8M11 3l-8 8" /></svg>
);
