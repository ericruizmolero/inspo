"use client";
// Liquid: the track of a group of tabs whose hover flows. Under the pointer a faint pill travels from tab to tab
// stretching towards the next one (the edge ahead arrives first, the one behind catches up). The chosen tab's fill
// is a pill too, but it does not travel: it is on the tab clicked at once. It wraps the tabs as they are: the chosen
// one is whichever child says so (aria-selected or aria-pressed, or the selector given in `on`), read off the DOM,
// so the control keeps its own markup and classes, whether its tabs are plain buttons or pieces of several (the
// Island's).
// The fill goes to the tab in the click itself, before the control says it is chosen: what the click sets off may
// be a heavy render, and a fill that waited for it would sit on the old tab meanwhile.
// Measured before moving and moved with WAAPI on transform alone; with reduced motion the hover jumps and only fades.
import { useLayoutEffect, useRef, type ComponentProps, type Ref } from "react";

const ON = ':scope > [aria-selected="true"], :scope > [aria-pressed="true"]';
/** What chooses when clicked: a link or a tab that says whether it is chosen. Not a menu's trigger nor a close button */
const CHOOSES = "a[href], [role='tab'], [aria-selected], [aria-pressed]";
const NO_TAB = ":disabled, input, .liquid__pill";
const FLOW = "liquid-flow";
/** How long the fill under the pointer takes to reach the next tab */
const HOVER_MS = 260;
const SAMPLES = 24;
/** The edge ahead is there at this share of the time; the one behind leaves a little later and takes it all */
const LEAD_END = 0.6;
const TRAIL_START = 0.1;
/** A click the control never answered (a new window, a choice refused): the fill goes back after this long */
const WISH_MS = 1500;
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const out = (t: number, power: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), power);

/** Runs what a click on a tab sets off once the fill has been painted on it. A heavy render started inside the
    click would hold that frame back, and the tab would not answer until it ended */
export function afterPaint(run: () => void) {
  let done = false;
  const once = () => { if (!done) { done = true; run(); } };
  requestAnimationFrame(() => setTimeout(once, 0));
  // A page that is not being painted (a hidden preview) never gets its frame: the click must not be lost
  setTimeout(once, 80);
}

/** Where the pill rests: on the tab, with its size and its corners */
function rest(pill: HTMLElement, tab: HTMLElement) {
  pill.style.width = `${tab.offsetWidth}px`;
  pill.style.height = `${tab.offsetHeight}px`;
  pill.style.translate = `${tab.offsetLeft}px ${tab.offsetTop}px`;
  pill.style.borderRadius = getComputedStyle(tab).borderRadius;
}

/** Takes the pill to a tab from wherever it is now, even mid-way to another; in `ms`, or at once with 0 */
function flow(pill: HTMLElement, tab: HTMLElement, ms: number) {
  const box = pill.parentElement;
  if (!box) return;
  const now = pill.getBoundingClientRect();
  const frame = box.getBoundingClientRect();
  const from = { l: now.left - frame.left - box.clientLeft, r: now.right - frame.left - box.clientLeft, y: now.top - frame.top - box.clientTop };
  const to = { l: tab.offsetLeft, r: tab.offsetLeft + tab.offsetWidth, y: tab.offsetTop };
  for (const a of pill.getAnimations()) if (a.id === FLOW) a.cancel();
  rest(pill, tab);
  if (!ms || still() || !now.width || !tab.offsetWidth) return;
  const rightwards = to.l + to.r > from.l + from.r;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const p = i / SAMPLES;
    const lead = out(p / LEAD_END, 4);
    const trail = out((p - TRAIL_START) / (1 - TRAIL_START), 3);
    const l = from.l + (to.l - from.l) * (rightwards ? trail : lead);
    const r = from.r + (to.r - from.r) * (rightwards ? lead : trail);
    const y = from.y + (to.y - from.y) * lead;
    frames.push({ transform: `translate(${l - to.l}px, ${y - to.y}px) scaleX(${Math.max(r - l, 1) / tab.offsetWidth})` });
  }
  pill.animate(frames, { duration: ms, easing: "linear", id: FLOW });
}

export function Liquid({ as: Tag = "div", on = ON, ref, className, children, ...props }: Omit<ComponentProps<"div">, "ref"> & {
  as?: "div" | "nav" | "span";
  /** Which child is the chosen tab, when it does not say so with aria-selected or aria-pressed */
  on?: string;
  ref?: Ref<HTMLElement>;
}) {
  const root = useRef<HTMLElement | null>(null);
  const hold = (el: HTMLElement | null) => {
    root.current = el;
    if (typeof ref === "function") ref(el); else if (ref) ref.current = el;
  };
  const chosen = useRef<HTMLSpanElement>(null);
  const hovered = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const box = root.current, pill = chosen.current, ghost = hovered.current;
    if (!box || !pill || !ghost) return;
    /** The tab the chosen fill is on */
    let at: HTMLElement | null = null;
    /** The tab just clicked, taken as chosen until the control says so */
    let wish: HTMLElement | null = null;
    let wishTimer = 0;
    let over: HTMLElement | null = null;
    const tabOf = (target: EventTarget | null) => {
      let tab = target as HTMLElement | null;
      while (tab && tab.parentElement !== box) tab = tab.parentElement;
      return tab && !tab.matches(NO_TAB) ? tab : null;
    };
    // The fill under the pointer fades away; under a tab just chosen it goes at once, or for a moment the two
    // fills, one over the other, would read as a third colour
    const leave = (cut = false) => {
      over = null;
      ghost.classList.toggle("is-cut", cut);
      ghost.classList.remove("is-shown");
    };
    const away = () => leave();
    // While the control has not answered, the tab clicked wears the chosen ink and the one it leaves loses it
    // (`data-liquid-wish` and `data-liquid-wishing`, app/globals.css): fill and text change in the same frame
    const forget = () => {
      wish?.removeAttribute("data-liquid-wish");
      box.removeAttribute("data-liquid-wishing");
      wish = null;
      window.clearTimeout(wishTimer);
    };
    // The chosen fill sits on the tab clicked, or on the one the control says, wherever and however wide it is now
    const settle = () => {
      const said = box.querySelector<HTMLElement>(on);
      if (wish && (said === wish || !wish.isConnected)) forget();
      const tab = wish ?? said;
      if (!tab) { at = null; delete box.dataset.liquid; return; }
      rest(pill, tab);
      at = tab;
      if (over === tab) leave(true);
      else if (over) rest(ghost, over);
      box.dataset.liquid = "";
    };
    // In the click itself, ahead of the control's own handler: the fill is already there when the work starts
    const pick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const tab = tabOf(e.target);
      const hit = (e.target as HTMLElement).closest(CHOOSES);
      if (!tab || tab === at || !hit || !tab.contains(hit)) return;
      forget();
      wish = tab;
      tab.setAttribute("data-liquid-wish", "");
      box.setAttribute("data-liquid-wishing", "");
      wishTimer = window.setTimeout(() => { forget(); settle(); }, WISH_MS);
      settle();
    };
    // Under the pointer: the fainter pill appears on the first tab it meets and flows to the next ones. Mouse only
    const point = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const tab = tabOf(e.target);
      if (tab === over) return;
      if (!tab || tab === at) { if (tab) leave(); return; }
      flow(ghost, tab, ghost.classList.contains("is-shown") ? HOVER_MS : 0);
      over = tab;
      ghost.classList.remove("is-cut");
      ghost.classList.add("is-shown");
    };
    settle();
    const seen = new MutationObserver(settle);
    seen.observe(box, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-selected", "aria-pressed", "aria-current", "class"] });
    const sized = new ResizeObserver(settle);
    sized.observe(box);
    box.addEventListener("click", pick);
    box.addEventListener("pointerover", point);
    box.addEventListener("pointerleave", away);
    return () => {
      forget();
      seen.disconnect();
      sized.disconnect();
      box.removeEventListener("click", pick);
      box.removeEventListener("pointerover", point);
      box.removeEventListener("pointerleave", away);
    };
  }, [on]);

  return (
    <Tag ref={hold} className={className ? `liquid ${className}` : "liquid"} {...props}>
      <span ref={hovered} className="liquid__pill liquid__pill--hover" aria-hidden />
      <span ref={chosen} className="liquid__pill" aria-hidden />
      {children}
    </Tag>
  );
}
