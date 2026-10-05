// Driving Agentation's hidden bar from anywhere: the floating dock (FeedbackTool), the
// "Give feedback" entry at the foot of the sidebars (FeedbackEntry) and the command palette.
//
// Agentation exposes no API to start or stop feedback mode, so its bar (hidden with CSS)
// is clicked programmatically. Only its stable attributes are used: the toggle's title
// ("Start feedback mode", which disappears while active, and is how the mode is
// detected), data-danger on "Clear all", and the position of the close button.

const TOOLBAR = "[data-agentation-toolbar]";
/** The closed toggle: Agentation drops its role and title while feedback mode is on */
const TOGGLE = '[role="button"][title="Start feedback mode"]';

const toolbar = () => document.querySelector<HTMLElement>(TOOLBAR);

export const isFeedbackModeOn = () => { const t = toolbar(); return !!t && !t.querySelector(TOGGLE); };

/** Agentation loads on first use (FeedbackTool): asking before it is there loads it, and the mode starts once its bar shows */
export const FEEDBACK_LOAD_EVENT = "feedback:load";
let pendingEnter = false;

export function enterFeedbackMode() {
  const toggle = toolbar()?.querySelector<HTMLElement>(TOGGLE);
  if (toggle) { toggle.click(); return; }
  pendingEnter = true;
  window.dispatchEvent(new Event(FEEDBACK_LOAD_EVENT));
}

/** Starts the mode asked for before Agentation had loaded, once its toggle is in the page */
export function flushPendingEnter() {
  if (!pendingEnter) return;
  const toggle = toolbar()?.querySelector<HTMLElement>(TOGGLE);
  if (!toggle) return;
  pendingEnter = false;
  toggle.click();
}

export function exitFeedbackMode() {
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
export function clearFeedbackMarkers() {
  toolbar()?.querySelector<HTMLButtonElement>("button[data-danger]")?.click();
}
