"use client";

// The canvas camera: one transform on one layer, written straight to the DOM in an animation frame, so
// panning and zooming never re-render React. React only hears about the view a few times a second
// (which cards are near the screen, and the zoom level), to mount the right cards at the right size.
//
// Input, in the order people reach for it:
//   trackpad      two-finger scroll pans, pinch zooms (Chrome sends ctrl+wheel, Safari gesture events)
//   mouse         wheel pans, ⌘/ctrl+wheel zooms, drag on empty space or with the middle button pans
//   keyboard      hold Space and drag to pan from anywhere, ⌘0 fits, ⌘+ and ⌘- zoom
//   touch         one finger pans, two pinch
//   double-click  on empty space zooms in there (Shift: out)
// The canvas is as big as the layout, no bigger: the camera stops at its edges (a drag past them gives
// like a rubber band and springs back), and zooming out stops once the whole layout fits.
// A drag that is let go keeps gliding and slows down until it meets an edge.

import { useCallback, useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import type { Rect } from "@/lib/canvas-layout";

export interface Camera { x: number; y: number; z: number }
export interface Insets { top: number; right: number; bottom: number; left: number }
/** What React hears: the visible area in canvas units, the zoom, and whether the camera is at rest */
export interface View { rect: Rect; z: number; resting: boolean }

export const MIN_Z = 0.05;
export const MAX_Z = 2.5;
/** How long after the last movement the camera counts as resting (the layer stops being a bitmap) */
const SETTLE_MS = 160;
const VIEW_EVERY_MS = 90;
/** Room kept between the layout's edge and what floats over the canvas, in px */
const EDGE = 32;
/** How far a wheel or trackpad scroll may go past an edge before it springs back, in px */
const OVERSCROLL = 72;
/** Glide: speed kept per 16 ms frame, and the speed (px/ms) under which it stops */
const FRICTION = 0.94;
const MIN_SPEED = 0.02;

/** CSS cubic-bezier() as a function of progress, for GSAP: the same curves as the stylesheet's tokens */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const bx = (t: number) => 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
  const by = (t: number) => 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  return (p: number) => {
    if (p <= 0 || p >= 1) return p;
    let lo = 0, hi = 1, t = p;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bx(t) < p) lo = t; else hi = t; }
    return by(t);
  };
}
/** --ease-in-out: on-screen movement (a fit, a focus, a zoom by button) */
const EASE_IN_OUT = cubicBezier(0.77, 0, 0.175, 1);
const MOVE_S = 0.4;
/** Spring back from past an edge: Apple-style, 0.5 s, no bounce (critically damped) */
const SPRING_W = (2 * Math.PI) / 0.5;

/** Eats the click that follows a drag (same turn as the pointerup), and nothing after it */
export function swallowNextClick() {
  const eat = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
  window.addEventListener("click", eat, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", eat, { capture: true }), 0);
}

type Size = { w: number; h: number };
/** The viewport's size, measured once and kept by the ResizeObserver: the input handlers read it on every
 *  event, and reading clientWidth there would make the browser lay the page out first */
const sizeOf = (size: { current: Size | null }, vp: HTMLElement): Size => (size.current ??= { w: vp.clientWidth, h: vp.clientHeight });

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);

export function useCanvasCamera(
  viewportRef: RefObject<HTMLElement | null>,
  worldRef: RefObject<HTMLElement | null>,
  { onView, onFitAll, getBounds, getInsets }: {
    onView: (v: View) => void; onFitAll: (animate: boolean) => void;
    /** The layout's extent in canvas units, and what covers the screen's edges: together they are the limits */
    getBounds: () => Rect | null; getInsets: () => Insets;
  },
) {
  const cam = useRef<Camera>({ x: 0, y: 0, z: 0.5 });
  const size = useRef<Size | null>(null);
  const frame = useRef(0);
  /** The zoom last written as --z: a pan leaves it alone, so the cards' styles aren't recalculated */
  const writtenZ = useRef(NaN);
  const tween = useRef<gsap.core.Tween | null>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  const lastView = useRef(0);
  const viewTimer = useRef<number | undefined>(undefined);
  const onViewRef = useRef(onView);
  onViewRef.current = onView;
  const onFitAllRef = useRef(onFitAll);
  onFitAllRef.current = onFitAll;
  const boundsRef = useRef(getBounds);
  boundsRef.current = getBounds;
  const insetsRef = useRef(getInsets);
  insetsRef.current = getInsets;
  const glide = useRef(0);
  const stopGlide = () => { cancelAnimationFrame(glide.current); glide.current = 0; };

  /** The smallest zoom: the one where the whole layout fits between what covers the screen */
  const minZ = useCallback(() => {
    const b = boundsRef.current();
    const vp = viewportRef.current;
    if (!b || !vp || !b.w || !b.h) return MIN_Z;
    const i = insetsRef.current();
    const { w, h } = sizeOf(size, vp);
    const fit = Math.min((w - i.left - i.right - EDGE * 2) / b.w, (h - i.top - i.bottom - EDGE * 2) / b.h);
    return Math.max(MIN_Z, Math.min(1, fit));
  }, [viewportRef]);
  const clampZ = useCallback((z: number) => Math.max(minZ(), Math.min(MAX_Z, z)), [minZ]);

  /**
   * How far (px) the camera is past the layout's edges, per axis. Larger than the free area (the screen minus
   * what covers it): its edges may not come inside it. Smaller: it moves freely but never leaves it.
   */
  const overshoot = useCallback((c: Camera) => {
    const b = boundsRef.current();
    const vp = viewportRef.current;
    if (!b || !vp) return { x: 0, y: 0 };
    const i = insetsRef.current();
    const axis = (pos: number, start: number, size: number, from: number, to: number) => {
      const a = from + EDGE - start * c.z;           // the layout's start sits on the free area's start
      const b = to - EDGE - (start + size) * c.z;    // its end sits on the free area's end
      const lo = Math.min(a, b), hi = Math.max(a, b);
      return pos > hi ? pos - hi : pos < lo ? pos - lo : 0;
    };
    const { w, h } = sizeOf(size, vp);
    return {
      x: axis(c.x, b.x, b.w, i.left, w - i.right),
      y: axis(c.y, b.y, b.h, i.top, h - i.bottom),
    };
  }, [viewportRef]);
  /** The camera moved back inside the limits */
  const inside = useCallback((c: Camera): Camera => {
    const o = overshoot(c);
    return { ...c, x: c.x - o.x, y: c.y - o.y };
  }, [overshoot]);

  const emitView = useCallback((resting = false) => {
    const vp = viewportRef.current;
    if (!vp) return;
    lastView.current = performance.now();
    const { x, y, z } = cam.current;
    const { w, h } = sizeOf(size, vp);
    onViewRef.current({ rect: { x: -x / z, y: -y / z, w: w / z, h: h / z }, z, resting });
  }, [viewportRef]);

  // Writes the transform on the next frame, marks the layer as moving, and tells React about the view
  // at most every VIEW_EVERY_MS and once more when the camera rests
  const apply = useCallback(() => {
    if (!frame.current) {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const w = worldRef.current;
        if (!w) return;
        const { x, y, z } = cam.current;
        w.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${z})`;
        // --z is inherited by every card (the post-its' dots read it): writing it restyles them all
        if (z !== writtenZ.current) { w.style.setProperty("--z", String(z)); writtenZ.current = z; }
      });
    }
    const vp = viewportRef.current;
    if (vp && !vp.dataset.moving) vp.dataset.moving = "";
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (vp) delete vp.dataset.moving;
      emitView(true);
    }, SETTLE_MS);
    if (performance.now() - lastView.current > VIEW_EVERY_MS) emitView();
    else if (viewTimer.current === undefined) {
      viewTimer.current = window.setTimeout(() => { viewTimer.current = undefined; emitView(); }, VIEW_EVERY_MS);
    }
  }, [viewportRef, worldRef, emitView]);

  const stopTween = () => { tween.current?.kill(); tween.current = null; stopGlide(); };

  /** Moves the camera, at once or gliding there */
  const set = useCallback((next: Camera, animate = false) => {
    stopTween();
    // Wherever it is asked to go (a fit, a focus, a zoom), it lands inside the layout
    const z = clampZ(next.z);
    // A clamped zoom keeps the point the zoom was about (the target's centre) where it was meant to be
    const vp = viewportRef.current;
    const k = z / next.z;
    const vs = vp ? sizeOf(size, vp) : { w: 0, h: 0 };
    const cx = vs.w / 2, cy = vs.h / 2;
    const target = inside(k === 1 ? next : { x: cx - (cx - next.x) * k, y: cy - (cy - next.y) * k, z });
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduced) { cam.current = target; apply(); return; }
    const from = { ...cam.current };
    const p = { t: 0 };
    tween.current = gsap.to(p, {
      t: 1, duration: MOVE_S, ease: EASE_IN_OUT,
      onUpdate: () => {
        // Zoom in log space so each step feels the same size; position follows the same curve as the zoom
        const z = from.z * Math.pow(target.z / from.z, p.t);
        const t = Math.abs(target.z - from.z) < 1e-6 ? p.t : (z - from.z) / (target.z - from.z);
        cam.current = { x: from.x + (target.x - from.x) * t, y: from.y + (target.y - from.y) * t, z };
        apply();
      },
      onComplete: () => { tween.current = null; },
    });
  }, [apply, clampZ, inside, viewportRef]);

  /** Zooms keeping the screen point (sx, sy), relative to the viewport, still */
  const zoomAt = useCallback((z: number, sx: number, sy: number, animate = false) => {
    const c = cam.current;
    const nz = clampZ(z);
    const wx = (sx - c.x) / c.z, wy = (sy - c.y) / c.z;
    set({ x: sx - wx * nz, y: sy - wy * nz, z: nz }, animate);
  }, [set, clampZ]);

  /** The camera that shows `rect` inside the viewport minus `insets`. Taller than the screen: from its top. */
  const cameraFor = useCallback((rect: Rect, insets: Insets, { maxZ = 1, pad = 40 } = {}): Camera | null => {
    const vp = viewportRef.current;
    if (!vp || !rect.w || !rect.h) return null;
    const { w, h } = sizeOf(size, vp);
    const availW = Math.max(80, w - insets.left - insets.right - pad * 2);
    const availH = Math.max(80, h - insets.top - insets.bottom - pad * 2);
    const fit = Math.min(availW / rect.w, availH / rect.h);
    // Never so small that the pages turn into confetti: past that, start from the top and let people pan
    const z = Math.min(MAX_Z, Math.min(maxZ, Math.max(fit, 0.22)));
    const x = insets.left + pad + Math.max(0, (availW - rect.w * z) / 2) - rect.x * z;
    const y = rect.h * z > availH ? insets.top + pad - rect.y * z : insets.top + pad + (availH - rect.h * z) / 2 - rect.y * z;
    return { x, y, z };
  }, [viewportRef]);

  const fitTo = useCallback((rect: Rect, insets: Insets, opts?: { maxZ?: number; pad?: number; animate?: boolean }) => {
    const c = cameraFor(rect, insets, opts);
    if (c) set(c, opts?.animate ?? true);
  }, [cameraFor, set]);

  /** By a button it glides; by a keyboard shortcut it's instant (pressed too often to wait for) */
  const zoomBy = useCallback((f: number, animate = true) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const { w, h } = sizeOf(size, vp);
    zoomAt(cam.current.z * f, w / 2, h / 2, animate);
  }, [viewportRef, zoomAt]);

  /** A point on screen (clientX/Y) in canvas units */
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const r = viewportRef.current!.getBoundingClientRect();
    const c = cam.current;
    return { x: (clientX - r.left - c.x) / c.z, y: (clientY - r.top - c.y) / c.z };
  }, [viewportRef]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    // Whatever the camera already holds (the first fit) reaches the screen, even if its frame was cancelled
    apply();
    const local = (e: { clientX: number; clientY: number }) => {
      const r = vp.getBoundingClientRect();
      return { sx: e.clientX - r.left, sy: e.clientY - r.top };
    };

    // ─── Wheel and trackpad ───
    const onWheel = (e: WheelEvent) => {
      // A scrollable menu or panel over the canvas keeps its own wheel
      if (e.target instanceof Element && e.target.closest("[data-canvas-scroll]")) return;
      e.preventDefault();
      stopTween();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? sizeOf(size, vp).h : 1;
      const dx = e.deltaX * unit, dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey) {
        const { sx, sy } = local(e);
        const step = Math.max(-60, Math.min(60, dy));
        zoomAt(cam.current.z * Math.exp(-step * 0.0105), sx, sy);
      } else {
        // Past an edge the scroll gives a little (more resistance the further it goes), then springs
        // back once the wheel or the trackpad's own momentum stops: the edge is felt, never a wall
        const c = cam.current;
        const next = { ...c, x: c.x - dx, y: c.y - dy };
        const o = overshoot(next);
        const give = (v: number) => OVERSCROLL * Math.tanh(v / (OVERSCROLL * 2));
        cam.current = { ...next, x: next.x - o.x + give(o.x), y: next.y - o.y + give(o.y) };
        apply();
        window.clearTimeout(wheelEnd);
        if (o.x || o.y) wheelEnd = window.setTimeout(settleInside, 120);
      }
    };
    let wheelEnd: number | undefined;

    // Back inside the edge on a spring: let go past it, the content returns like something elastic,
    // fast at first and settling without overshooting (critically damped, from rest)
    const settleInside = () => {
      const o = overshoot(cam.current);
      if (Math.abs(o.x) <= 0.5 && Math.abs(o.y) <= 0.5) return;
      stopGlide();
      const from = { ...cam.current };
      const t0 = performance.now();
      const step = (now: number) => {
        const t = (now - t0) / 1000;
        const k = (1 + SPRING_W * t) * Math.exp(-SPRING_W * t);
        cam.current = { ...from, x: from.x - o.x * (1 - k), y: from.y - o.y * (1 - k) };
        apply();
        glide.current = k > 0.002 ? requestAnimationFrame(step) : 0;
      };
      glide.current = requestAnimationFrame(step);
    };
    // After a drag: keep the speed it was let go with and lose it frame by frame
    const startGlide = (vx: number, vy: number) => {
      stopGlide();
      let last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(48, now - last); last = now;
        const k = Math.pow(FRICTION, dt / 16);
        vx *= k; vy *= k;
        const c = cam.current;
        const next = { ...c, x: c.x + vx * dt, y: c.y + vy * dt };
        const o = overshoot(next);
        // Hitting the edge kills the speed along that axis
        if (o.x) { next.x -= o.x; vx = 0; }
        if (o.y) { next.y -= o.y; vy = 0; }
        cam.current = next;
        apply();
        if (Math.hypot(vx, vy) > MIN_SPEED) glide.current = requestAnimationFrame(step);
        else glide.current = 0;
      };
      glide.current = requestAnimationFrame(step);
    };

    // ─── Safari pinch ───
    let gestureZ = 1;
    const onGestureStart = (e: Event) => { e.preventDefault(); stopTween(); gestureZ = cam.current.z; };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Event & { scale: number; clientX: number; clientY: number };
      const { sx, sy } = local(g);
      zoomAt(gestureZ * g.scale, sx, sy);
    };

    // ─── Pointers: drag to pan, two fingers to pinch ───
    let spaceHeld = false;
    const pointers = new Map<number, { x: number; y: number }>();
    let pan: { id: number; x: number; y: number; moved: boolean; samples: { t: number; x: number; y: number }[] } | null = null;
    let pinch: { d: number; mx: number; my: number } | null = null;
    const pinchState = () => {
      const [a, b] = [...pointers.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    };

    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (t.closest("[data-canvas-ignore]")) return;
      const onTile = !!t.closest("[data-canvas-tile]");
      const touch = e.pointerType === "touch";
      // Mouse on a card belongs to the card (click opens, drag moves it); everywhere else it pans
      const pans = e.button === 1 || spaceHeld || touch || (e.button === 0 && !onTile);
      if (!pans) return;
      stopTween();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) { pan = null; pinch = pinchState(); return; }
      if (pointers.size > 2) return;
      pan = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, samples: [{ t: performance.now(), x: e.clientX, y: e.clientY }] };
      if (e.button === 1 || spaceHeld) { e.preventDefault(); vp.setPointerCapture(e.pointerId); vp.dataset.panning = ""; }
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const now = pinchState();
        const { sx, sy } = local({ clientX: now.mx, clientY: now.my });
        const c = cam.current;
        // Pan by the midpoint's travel, then zoom around the new midpoint
        cam.current = { ...c, x: c.x + (now.mx - pinch.mx), y: c.y + (now.my - pinch.my) };
        zoomAt(cam.current.z * (now.d / pinch.d), sx, sy);
        pinch = now;
        return;
      }
      if (!pan || pan.id !== e.pointerId) return;
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!pan.moved) {
        if (Math.hypot(dx, dy) < 3) return;
        // Captured only once it is a drag: capturing on down would steal the click from the card under a finger
        pan.moved = true;
        try { vp.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
        vp.dataset.panning = "";
      }
      pan.x = e.clientX; pan.y = e.clientY;
      const now = performance.now();
      pan.samples.push({ t: now, x: e.clientX, y: e.clientY });
      while (pan.samples.length > 2 && now - pan.samples[0].t > 80) pan.samples.shift();
      // Past the edge the content follows at a third of the hand: a rubber band
      const c = cam.current;
      const o = overshoot(c);
      const kx = o.x && Math.sign(o.x) === Math.sign(dx) ? 0.33 : 1;
      const ky = o.y && Math.sign(o.y) === Math.sign(dy) ? 0.33 : 1;
      cam.current = { ...c, x: c.x + dx * kx, y: c.y + dy * ky };
      apply();
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pan?.id === e.pointerId) {
        // A pan that moved must not end as a click on whatever is under the pointer. The click, if any,
        // comes in the same turn as the pointerup: the guard goes away right after.
        if (pan.moved) {
          swallowNextClick();
          // The speed over the last moments of the drag carries on, unless it was held still at the end
          const s = pan.samples, a = s[0], b = s[s.length - 1];
          const dt = b.t - a.t;
          const idle = performance.now() - b.t;
          const o = overshoot(cam.current);
          if (o.x || o.y) settleInside();
          else if (dt > 10 && idle < 60) startGlide((b.x - a.x) / dt, (b.y - a.y) / dt);
        }
        pan = null;
        delete vp.dataset.panning;
      }
    };

    // ─── Double-click on empty space: zoom in there (Shift: out) ───
    const onDblClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest("[data-canvas-tile], [data-canvas-ignore]")) return;
      const { sx, sy } = local(e);
      zoomAt(cam.current.z * (e.shiftKey ? 0.5 : 2), sx, sy, true);
    };

    // ─── Keys ───
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === "Space" && !e.repeat) { spaceHeld = true; vp.dataset.space = ""; e.preventDefault(); return; }
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "0") { e.preventDefault(); onFitAllRef.current(false); }
      else if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomBy(1.4, false); }
      else if (e.key === "-") { e.preventDefault(); zoomBy(1 / 1.4, false); }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === "Space") { spaceHeld = false; delete vp.dataset.space; } };
    const onBlur = () => { spaceHeld = false; delete vp.dataset.space; };

    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("gesturestart", onGestureStart);
    vp.addEventListener("gesturechange", onGestureChange);
    vp.addEventListener("pointerdown", onDown);
    vp.addEventListener("dblclick", onDblClick);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    // A new size is a view at rest: nothing is moving, and the cards near the screen may have changed
    const ro = new ResizeObserver(() => { size.current = { w: vp.clientWidth, h: vp.clientHeight }; emitView(true); });
    ro.observe(vp);
    return () => {
      vp.removeEventListener("wheel", onWheel);
      window.clearTimeout(wheelEnd);
      vp.removeEventListener("gesturestart", onGestureStart);
      vp.removeEventListener("gesturechange", onGestureChange);
      vp.removeEventListener("pointerdown", onDown);
      vp.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      ro.disconnect();
      // Reset as well as cancelled: a frame id left behind would read as "already scheduled" and the
      // camera would never be written again (React runs this cleanup between its two dev mounts)
      cancelAnimationFrame(frame.current); frame.current = 0;
      writtenZ.current = NaN;
      window.clearTimeout(settleTimer.current);
      window.clearTimeout(viewTimer.current); viewTimer.current = undefined;
      stopTween();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set and overshoot read refs only
  }, [viewportRef, apply, zoomAt, zoomBy, emitView]);

  return { cam, set, fitTo, cameraFor, zoomBy, toWorld };
}
