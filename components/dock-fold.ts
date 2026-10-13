// The board's bottom bar folding into its tab and back, liquid (Eric, 13-10): like the tabs' fill (components/ui/liquid.tsx),
// the edges don't move together. Folding, the top comes down first and the sides follow it in, so the panel pours
// into the pill; unfolding, the pill spreads sideways first and then rises into the bar. One clip-path on the bar,
// sampled by hand (WAAPI can't ease each edge of an inset apart); what is inside fades out early and in late.

/** The folded tab (CSS .dock__tab): its size is fixed so the bar can pour into it exactly */
export const TAB_W = 84;
export const TAB_H = 36;
const FOLD_MS = 460;
const SAMPLES = 24;
/** The edge that leads is there at this share of the time; the one that trails leaves a little later */
const LEAD_END = 0.6;
const TRAIL_START = 0.12;
const out = (t: number, power: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), power);
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Runs the bar's fold ("in": bar to tab) or unfold ("out": tab to bar). Resolves when done, at once with reduced motion */
export function pourDock(bar: HTMLElement, way: "in" | "out"): Promise<void> {
  if (still()) return Promise.resolve();
  const w = bar.offsetWidth, h = bar.offsetHeight;
  const radius = parseFloat(getComputedStyle(bar).borderTopLeftRadius) || 16;
  const side = Math.max(0, (w - TAB_W) / 2), top = Math.max(0, h - TAB_H);
  const frames: Keyframe[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    // Folding, the top leads and the sides trail; unfolding, the sides lead (back out) and the top trails
    const lead = out(t / LEAD_END, 3), trail = out((t - TRAIL_START) / (1 - TRAIL_START), 2.4);
    const topP = way === "in" ? lead : 1 - trail;
    const sideP = way === "in" ? trail : 1 - lead;
    const r = radius + (TAB_H / 2 - radius) * Math.max(topP, sideP);
    frames.push({ clipPath: `inset(${(top * topP).toFixed(1)}px ${(side * sideP).toFixed(1)}px 0px ${(side * sideP).toFixed(1)}px round ${r.toFixed(1)}px)` });
  }
  const kids = [...bar.children] as HTMLElement[];
  const fade = way === "in"
    ? [{ opacity: 1 }, { opacity: 0, offset: 0.35 }, { opacity: 0 }]
    : [{ opacity: 0 }, { opacity: 0, offset: 0.45 }, { opacity: 1 }];
  for (const k of kids) k.animate(fade, { duration: FOLD_MS, easing: "linear", fill: way === "in" ? "forwards" : "none" });
  const run = bar.animate(frames, { duration: FOLD_MS, easing: "linear", fill: way === "in" ? "forwards" : "none" });
  return run.finished.then(() => undefined, () => undefined);
}
