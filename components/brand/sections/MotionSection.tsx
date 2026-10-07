"use client";
// How the brand moves, shown moving: six small scenes play in the brand's own curve and duration, in its accent,
// while they are in sight. Under them each curve drawn (its handles dragged in the app), the durations, and the
// rules in prose. Asked for less motion, the scenes stand still.
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { AddButton, ItemTools, useSection } from "../BrandPresentation";
import { Editable, EditableNumber } from "../edit/Editable";
import { MOTION_DEMOS, brandId, type BrandCurve, type MotionDemo } from "@/types/brand";
import { bezierCss, clampBezier, type Bezier } from "@/lib/brand-values";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    const on = () => setReduced(q.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** A counter that ticks while the element is in sight: each tick is one move of the scenes */
function useTicker(every: number, still: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [tick, setTick] = useState(0);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!seen || still) return;
    const id = setInterval(() => setTick((n) => n + 1), every);
    return () => clearInterval(id);
  }, [seen, still, every]);
  return { ref, tick };
}

function Scene({ demo, tick }: { demo: MotionDemo; tick: number }) {
  const { refs, spec, fileSrc } = useBrand();
  const pics = [spec.applications.heroFile ? fileSrc(spec.applications.heroFile.key) : null, ...spec.imagery.itemIds.map((id) => refs[id]?.image ?? null), ...spec.imagery.files.map((f) => fileSrc(f.key))].filter((x): x is string => !!x);
  const pic = (i: number) => pics.length ? <img src={pics[i % pics.length]} alt="" draggable={false} /> : null;
  const p = tick % 2;
  switch (demo) {
    case "enter": return <div className="bm-enter"><span className={p ? "is-in" : ""} /></div>;
    case "move": {
      const spots = [[18, 50], [50, 22], [78, 50], [50, 78]];
      const at = spots[tick % spots.length];
      return (
        <div className="bm-move">
          {[[30, 28], [70, 28], [84, 62], [30, 78], [66, 80]].map(([x, y], i) => <span key={i} className="bm-move__ghost" style={{ left: `${x}%`, top: `${y}%` }} />)}
          <span className="bm-move__lead" style={{ left: `${at[0]}%`, top: `${at[1]}%` }} />
        </div>
      );
    }
    case "exchange": return <div className="bm-exchange">{[0, 1].map((i) => <span key={i} className={`bm-card${(tick % 2) === i ? " is-on" : ""}`}>{pic(i)}</span>)}</div>;
    case "carousel": return <div className="bm-carousel"><div style={{ transform: `translateX(calc(${-(tick % 4)} * (var(--card) + 12px)))` }}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} className="bm-card is-on">{pic(i)}</span>)}</div></div>;
    case "toggle": return <div className="bm-toggle"><span className={p ? "is-on" : ""}><i /></span></div>;
    case "reveal": return <div className="bm-reveal">{[0, 1, 2].map((i) => <span key={i} className={p ? "is-in" : ""} style={{ transitionDelay: p ? `calc(${i} * var(--stagger))` : "0ms" }}><i /><b /></span>)}</div>;
  }
}

const W = 200, P = 14;
const X = (x: number) => P + x * (W - 2 * P);
const Y = (y: number) => W - P - y * (W - 2 * P);

/** A curve drawn on its grid; in the app its two handles are dragged and its numbers typed */
function CurveGraph({ curve, onChange, tick, ms }: { curve: BrandCurve; onChange?: (b: Bezier) => void; tick: number; ms: number }) {
  const [draft, setDraft] = useState<Bezier>(curve.bezier as Bezier);
  useEffect(() => { setDraft(curve.bezier as Bezier); }, [curve.bezier]);
  const svg = useRef<SVGSVGElement | null>(null);
  const drag = useRef<0 | 1 | null>(null);
  const [x1, y1, x2, y2] = draft;
  const at = (e: RPointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W, sy = ((e.clientY - r.top) / r.height) * W;
    return [(sx - P) / (W - 2 * P), (W - P - sy) / (W - 2 * P)] as const;
  };
  const move = (e: RPointerEvent) => {
    if (drag.current === null) return;
    const [x, y] = at(e);
    setDraft((b) => clampBezier(drag.current === 0 ? [x, y, b[2], b[3]] : [b[0], b[1], x, y]));
  };
  const up = () => { if (drag.current !== null) { drag.current = null; onChange?.(draft); } };
  const handle = (i: 0 | 1, cx: number, cy: number) => (
    <circle cx={X(cx)} cy={Y(cy)} r={onChange ? 7 : 5} className={`bm-handle${onChange ? " is-live" : ""}`}
      onPointerDown={onChange ? (e) => { drag.current = i; (e.target as Element).setPointerCapture(e.pointerId); } : undefined} />
  );
  return (
    <div className="bm-graph">
      <svg ref={svg} viewBox={`0 0 ${W} ${W}`} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label={`${curve.name}: ${bezierCss(draft)}`}>
        <defs><pattern id="bm-grid" width={(W - 2 * P) / 10} height={(W - 2 * P) / 10} patternUnits="userSpaceOnUse" x={P} y={P}><path d={`M ${(W - 2 * P) / 10} 0 L 0 0 0 ${(W - 2 * P) / 10}`} className="bm-gridline" /></pattern></defs>
        <rect x={P} y={P} width={W - 2 * P} height={W - 2 * P} fill="url(#bm-grid)" className="bm-frame" />
        <line x1={X(0)} y1={Y(0)} x2={X(x1)} y2={Y(y1)} className="bm-arm" />
        <line x1={X(1)} y1={Y(1)} x2={X(x2)} y2={Y(y2)} className="bm-arm" />
        <path d={`M ${X(0)} ${Y(0)} C ${X(x1)} ${Y(y1)}, ${X(x2)} ${Y(y2)}, ${X(1)} ${Y(1)}`} className="bm-path" />
        {handle(0, x1, y1)}{handle(1, x2, y2)}
      </svg>
      <div className="bm-track"><i style={{ left: tick % 2 ? "calc(100% - 12px)" : "0", transition: `left ${ms}ms ${bezierCss(draft)}` }} /></div>
      <code className="bm-css">{bezierCss(draft)}</code>
    </div>
  );
}

export default function MotionSection() {
  const { t } = useT();
  const { mode, accent } = useBrand();
  const [motion, set] = useSection("motion");
  const reduced = useReducedMotion();
  const s = t.brand.motion;
  const curve = motion.curves[0]?.bezier as Bezier | undefined ?? [0.2, 0, 0, 1];
  const ms = motion.durations.find((d) => /base/i.test(d.name))?.ms ?? motion.durations[Math.floor(motion.durations.length / 2)]?.ms ?? 420;
  const { ref, tick } = useTicker(ms + 1100, reduced);
  const vars = { ["--ease" as string]: bezierCss(curve), ["--dur" as string]: `${ms}ms`, ["--stagger" as string]: `${motion.staggerMs}ms`, ["--accent" as string]: accent } as CSSProperties;
  const putCurve = (id: string, next: Partial<BrandCurve>) => set({ curves: motion.curves.map((c) => (c.id === id ? { ...c, ...next } : c)) });
  return (
    <div className="bm" style={vars}>
      <h3 className="t-label brand-k">{s.inMotion}</h3>
      {reduced && <p className="brand-hint">{s.reduced}</p>}
      <div ref={ref} className={`bm-demos${reduced ? " is-still" : ""}`}>
        {MOTION_DEMOS.map((d) => (
          <figure key={d} className="bm-demo">
            <div className="bm-demo__stage"><Scene demo={d} tick={tick} /></div>
            <figcaption>{s.demos[d]}</figcaption>
          </figure>
        ))}
      </div>
      {(motion.curves.length > 0 || mode === "edit") && (
        <div className="bm-curves">
          <div>
            <h3 className="t-label brand-k">{s.curve}</h3>
            <div className="bm-curves__list">
              {motion.curves.map((c, i) => (
                <div key={c.id} className="bm-curve">
                  <CurveGraph curve={c} tick={tick} ms={ms} onChange={mode === "edit" ? (bezier) => putCurve(c.id, { bezier }) : undefined} />
                  <Editable as="p" className="bm-curve__name" value={c.name} onCommit={(name) => name && putCurve(c.id, { name })} placeholder={s.name} maxLength={40} />
                  <Editable as="p" className="bm-curve__use" value={c.use} onCommit={(use) => putCurve(c.id, { use })} placeholder={s.use} maxLength={200} />
                  <ItemTools list={motion.curves} index={i} onChange={(curves) => set({ curves })} />
                </div>
              ))}
            </div>
            {motion.curves.length < 4 && <AddButton label={s.addCurve} onClick={() => set({ curves: [...motion.curves, { id: brandId(), name: motion.curves.length ? "Secondary" : "Standard", bezier: [0.2, 0, 0, 1], use: "" }] })} />}
          </div>
          <div className="bm-prose">
            <Editable as="p" className="bm-rule" value={motion.rule} onCommit={(rule) => set({ rule })} placeholder={t.brand.write} multiline maxLength={1200} />
            {(motion.durations.length > 0 || mode === "edit") && (
              <div className="bm-durations">
                <h3 className="t-label brand-k">{s.durations}</h3>
                <ul>
                  {motion.durations.map((d, i) => (
                    <li key={d.id}>
                      <Editable value={d.name} onCommit={(name) => name && set({ durations: motion.durations.map((x) => (x.id === d.id ? { ...x, name } : x)) })} placeholder={s.name} maxLength={40} className="bm-d__name" />
                      <EditableNumber value={d.ms} min={0} max={5000} step={10} label={s.ms} suffix=" ms" onCommit={(n) => set({ durations: motion.durations.map((x) => (x.id === d.id ? { ...x, ms: n } : x)) })} className="bm-d__ms" />
                      <Editable value={d.use} onCommit={(use) => set({ durations: motion.durations.map((x) => (x.id === d.id ? { ...x, use } : x)) })} placeholder={s.use} maxLength={200} className="bm-d__use" />
                      <ItemTools list={motion.durations} index={i} onChange={(durations) => set({ durations })} />
                    </li>
                  ))}
                </ul>
                {motion.durations.length < 5 && <AddButton label={s.addDuration} onClick={() => set({ durations: [...motion.durations, { id: brandId(), name: "Base", ms: 300, use: "" }] })} />}
                <p className="bm-stagger">{mode === "edit" ? <>{s.staggerLabel} <EditableNumber value={motion.staggerMs} min={0} max={1000} step={5} label={s.staggerLabel} suffix=" ms" onCommit={(staggerMs) => set({ staggerMs })} /></> : s.stagger(motion.staggerMs)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
