// Driving Agentation's hidden bar from anywhere: the floating dock (FeedbackTool), the
// "Give feedback" entry at the foot of the sidebars (FeedbackEntry) and the command palette.
//
// Agentation exposes no API to start or stop feedback mode, so its bar is clicked
// programmatically. Since 3.1 the bar lives in the shadow root of an <agentation-toolbar>
// element: nothing in it is reached from the document, neither by a selector nor by the
// app's CSS, so it is looked for in there and hidden with a style of its own. Only its
// stable attributes are used: the one button that starts and ends the mode carries the
// shortcut (aria-keyshortcuts) and says which it is in (aria-expanded), and "Clear all"
// is the data-danger one. The version is pinned in package.json: a new one is read first.

const HOST = "agentation-toolbar";
const TOOLBAR = "[data-agentation-toolbar]";
/** The button that starts feedback mode and, once on, ends it */
const TOGGLE = "button[aria-keyshortcuts][aria-expanded]";

/** Where Agentation draws its bar, once it has mounted */
export const agentationRoot = (): ShadowRoot | null => document.querySelector(HOST)?.shadowRoot ?? null;

const toggle = () => agentationRoot()?.querySelector<HTMLElement>(`${TOOLBAR} ${TOGGLE}`) ?? null;

/** The app's CSS stops at the shadow root: the bar is hidden from inside it. Safe to call again. */
export function hideAgentationBar(root: ShadowRoot) {
  if (root.querySelector("style[data-criterio]")) return;
  const style = document.createElement("style");
  style.setAttribute("data-criterio", "");
  style.textContent = `${TOOLBAR} { display: none !important; }`;
  root.append(style);
}

export const isFeedbackModeOn = () => toggle()?.getAttribute("aria-expanded") === "true";

/** Agentation loads on first use (FeedbackTool): asking before it is there loads it, and the mode starts once its bar shows */
export const FEEDBACK_LOAD_EVENT = "feedback:load";
let pendingEnter = false;

export function enterFeedbackMode() {
  const t = toggle();
  if (t) { if (!isFeedbackModeOn()) t.click(); return; }
  pendingEnter = true;
  window.dispatchEvent(new Event(FEEDBACK_LOAD_EVENT));
}

/** Starts the mode asked for before Agentation had loaded, once its toggle is in the page */
export function flushPendingEnter() {
  if (!pendingEnter) return;
  const t = toggle();
  if (!t) return;
  pendingEnter = false;
  if (!isFeedbackModeOn()) t.click();
}

export function exitFeedbackMode() {
  if (isFeedbackModeOn()) toggle()?.click();
}

/** Agentation's "Clear all": removes the markers and its localStorage, then calls onAnnotationsClear */
export function clearFeedbackMarkers() {
  agentationRoot()?.querySelector<HTMLButtonElement>(`${TOOLBAR} button[data-danger]`)?.click();
}
