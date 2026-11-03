// The tour of a page's capture, as if it had been recorded with Screen Studio: a camera that scrolls down the page
// on its own, stops, glides a cursor to the busiest part of what it sees and zooms in on it, then zooms out while it
// moves on. Only keyframes: PageView plays them with the Web Animations API, so the compositor moves the page.

/** Camera and cursor at one moment. The page is drawn at the viewport's width, origin top left */
type Shot = { left: number; top: number; z: number; cx: number; cy: number; dur: number };

/** stops: when the camera has arrived at each view, and that view's top */
export type TourPlan = { camera: Keyframe[]; cursor: Keyframe[]; duration: number; stops: { at: number; top: number }[] };

/** How close the camera gets on a zoom */
const ZOOM = 1.4;
/** One stop to the next, in viewports */
const STEP = 0.82;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

/** Where there is most to look at: luminance edges of the capture on a 64-px-wide grid, as an integral image.
 *  Null when the image cannot be read (another origin) or is not loaded: the tour falls back to a fixed rhythm. */
export function saliency(img: HTMLImageElement): { w: number; h: number; sum: Float64Array } | null {
  try {
    const w = 64;
    const h = Math.max(1, Math.round((img.naturalHeight * w) / (img.naturalWidth || 1)));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    const lum = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) lum[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114;
    const sum = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const gx = x + 1 < w ? Math.abs(lum[i + 1] - lum[i]) : 0;
        const gy = y + 1 < h ? Math.abs(lum[i + w] - lum[i]) : 0;
        row += gx + gy;
        sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
      }
    }
    return { w, h, sum };
  } catch {
    return null;
  }
}

type Sal = NonNullable<ReturnType<typeof saliency>>;

/** Edge energy per grid cell inside a rectangle given in page pixels */
function density(s: Sal, scale: number, x: number, y: number, w: number, h: number): number {
  const x0 = Math.max(0, Math.floor(x * scale)), y0 = Math.max(0, Math.floor(y * scale));
  const x1 = Math.min(s.w, Math.ceil((x + w) * scale)), y1 = Math.min(s.h, Math.ceil((y + h) * scale));
  if (x1 <= x0 || y1 <= y0) return 0;
  const W = s.w + 1;
  const total = s.sum[y1 * W + x1] - s.sum[y0 * W + x1] - s.sum[y1 * W + x0] + s.sum[y0 * W + x0];
  return total / ((x1 - x0) * (y1 - y0));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The tour of a page `H` px tall, drawn `W` px wide in a viewport `V` px tall */
export function planTour(W: number, V: number, H: number, sal: Sal | null): TourPlan {
  const maxTop = Math.max(0, H - V);
  const n = Math.max(1, Math.ceil(maxTop / (V * STEP)) + 1);
  const step = n > 1 ? maxTop / (n - 1) : 0;
  const scale = sal ? sal.w / W : 0;
  const mean = sal ? density(sal, scale, 0, 0, W, H) : 0;
  const zw = W / ZOOM, zh = V / ZOOM;

  const shots: Shot[] = [];
  const stops: TourPlan["stops"] = [];
  let cursor = { x: W * 0.62, y: V * 0.7 };
  let zoomedLast = false;
  let t = 0;
  const push = (s: Shot) => { shots.push(s); t += s.dur; };

  for (let i = 0; i < n; i++) {
    const top = Math.round(i * step);
    // Arrive: the camera zooms out (if it was in) and scrolls here; the cursor stays where it was on screen
    const travel = i === 0 ? 0 : Math.min(1700, 1000 + Math.abs(step) * 0.5);
    push({ left: 0, top, z: 1, cx: cursor.x, cy: cursor.y, dur: travel });
    stops.push({ at: t, top });

    // Where to look: the busiest window the zoom could frame in this view
    let focus: { x: number; y: number } | null = null;
    if (sal) {
      let best = -1;
      for (let gy = 0; gy <= 2; gy++) for (let gx = 0; gx <= 4; gx++) {
        const x = (gx / 4) * (W - zw), y = top + (gy / 2) * (V - zh);
        const d = density(sal, scale, x, y, zw, zh);
        if (d > best) { best = d; focus = { x: x + zw / 2, y: y + zh / 2 }; }
      }
      // A plain band (a photo, empty space) is not worth a zoom
      if (best < mean * 1.1 && i !== 0) focus = null;
    } else if (i % 2 === 0) {
      focus = { x: W * 0.38, y: top + V * 0.42 };
    }
    // Not two zooms in a row, except the first view, which always gets one
    if (focus && zoomedLast && i !== 0) focus = null;

    if (!focus) {
      zoomedLast = false;
      // A short look, the cursor drifting a little
      cursor = { x: clamp(cursor.x + (i % 2 ? -1 : 1) * W * 0.08, W * 0.15, W * 0.85), y: clamp(cursor.y + V * 0.06, V * 0.2, V * 0.8) };
      push({ left: 0, top, z: 1, cx: cursor.x, cy: cursor.y, dur: 1500 });
      continue;
    }
    zoomedLast = true;
    // The cursor goes first, to the thing; then the camera follows it in
    const onScreen = { x: focus.x, y: focus.y - top };
    push({ left: 0, top, z: 1, cx: onScreen.x, cy: onScreen.y, dur: 700 });
    const left = clamp(focus.x - zw / 2, 0, W - zw);
    const ztop = clamp(focus.y - zh / 2, 0, Math.max(0, H - zh));
    const zx = (focus.x - left) * ZOOM, zy = (focus.y - ztop) * ZOOM;
    push({ left: 0, top, z: 1, cx: onScreen.x, cy: onScreen.y, dur: 300 });
    push({ left, top: ztop, z: ZOOM, cx: zx, cy: zy, dur: 1100 });
    cursor = { x: zx, y: zy };
    push({ left, top: ztop, z: ZOOM, cx: zx, cy: zy, dur: 1700 });
  }
  // At the end it rests, then goes back up to the start and loops
  push({ ...shots[shots.length - 1], dur: 1400 });
  push({ left: 0, top: 0, z: 1, cx: cursor.x, cy: cursor.y, dur: n > 1 ? 1800 : 900 });

  // Each shot is reached at the end of its duration: offsets are cumulative
  const duration = t;
  let at = 0;
  const camera: Keyframe[] = [], cur: Keyframe[] = [];
  const first = shots[0];
  camera.push({ offset: 0, transform: tf(first), easing: EASE });
  cur.push({ offset: 0, transform: `translate(${first.cx}px, ${first.cy}px)`, easing: EASE });
  for (const s of shots) {
    at += s.dur;
    if (s.dur === 0) continue;
    const offset = Math.min(1, at / duration);
    camera.push({ offset, transform: tf(s), easing: EASE });
    cur.push({ offset, transform: `translate(${s.cx}px, ${s.cy}px)`, easing: EASE });
  }
  // The loop closes where it opened
  camera[camera.length - 1] = { offset: 1, transform: tf(first) };
  cur[cur.length - 1] = { offset: 1, transform: `translate(${first.cx}px, ${first.cy}px)` };
  return { camera, cursor: cur, duration, stops };
}

export function tf(s: { left: number; top: number; z: number }): string {
  return `translate(${-s.left * s.z}px, ${-s.top * s.z}px) scale(${s.z})`;
}
