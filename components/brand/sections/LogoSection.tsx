"use client";
// The primary logo and the mark, each on light, on dark, and with its clear space drawn: hatched zone, the 1x
// squares in the accent. A background with no file of its own shows the other one as a silhouette, and says so.
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { useSection } from "../BrandPresentation";
import { FileSlot } from "../edit/FileSlot";
import { EditableNumber } from "../edit/Editable";
import type { BrandFile } from "@/types/brand";

const LOGO_TYPES = "image/svg+xml,image/png,image/webp,image/jpeg";

function Mark({ file, on, fallback, wordmark }: { file: BrandFile | null; on: "light" | "dark"; fallback: BrandFile | null; wordmark: string }) {
  const { fileSrc, display } = useBrand();
  const shown = file ?? fallback;
  if (!shown) return <span className="bl-word" style={{ fontFamily: display }}>{wordmark}</span>;
  // Another background's file, as a flat silhouette in this one's ink
  const derived = !file ? (on === "dark" ? "brightness(0) invert(1)" : "brightness(0)") : undefined;
  return <img className="bl-img" src={fileSrc(shown.key)} alt="" style={derived ? { filter: derived } : undefined} draggable={false} />;
}

function ClearSpace({ file, wordmark, x }: { file: BrandFile | null; wordmark: string; x: number }) {
  const { fileSrc, display } = useBrand();
  // The zone is x times half the logo's height on every side; the logo is drawn 64 units high
  const h = 64, w = file?.w && file?.h ? Math.min(260, (file.w / file.h) * h) : Math.max(80, wordmark.length * 34);
  const pad = (h / 2) * x;
  const W = w + pad * 2, H = h + pad * 2;
  const s = Math.max(14, Math.min(26, pad * 0.7));
  return (
    <div className="bl-clear">
      <svg viewBox={`${-24} ${-24} ${W + 48} ${H + 48}`} aria-hidden>
        <defs>
          <pattern id="bl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" className="bl-hatch" /></pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill="url(#bl-hatch)" className="bl-zone" />
        <rect x={pad} y={pad} width={w} height={h} className="bl-box" />
        {file ? <image href={fileSrc(file.key)} x={pad} y={pad} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
          : <text x={pad + w / 2} y={pad + h * 0.78} textAnchor="middle" style={{ fontFamily: display, fontSize: h * 0.9, fontWeight: 700 }}>{wordmark}</text>}
        {[[0, 0], [W - s, 0], [0, H - s], [W - s, H - s]].map(([cx, cy], i) => (
          <g key={i}><rect x={cx} y={cy} width={s} height={s} className="bl-unit" /><text x={cx + s / 2} y={cy + s * 0.66} textAnchor="middle" className="bl-unit__t" style={{ fontSize: s * 0.42 }}>1x</text></g>
        ))}
      </svg>
    </div>
  );
}

function Row({ kind }: { kind: "primary" | "mark" }) {
  const { t } = useT();
  const { name, mode } = useBrand();
  const [logo, set] = useSection("logo");
  const pair = logo[kind];
  const put = (on: "light" | "dark", file: BrandFile | null) => set({ [kind]: { ...pair, [on]: file } } as Partial<typeof logo>);
  const wordmark = kind === "mark" ? name.slice(0, 1).toUpperCase() : name;
  const s = t.brand.logo;
  const xText = logo.clearSpace === 1 ? s.half : s.times(logo.clearSpace);
  const panel = (on: "light" | "dark") => (
    <div className={`bl-panel bl-panel--${on}`}>
      <span className="bl-panel__label">{on === "light" ? s.light : s.dark}</span>
      <FileSlot purpose="logo" accept={LOGO_TYPES} has={!!pair[on]} onFile={(f) => put(on, f)} onClear={() => put(on, null)} className="bl-slot">
        <div className="bl-stage"><Mark file={pair[on]} on={on} fallback={pair[on === "light" ? "dark" : "light"]} wordmark={wordmark} /></div>
      </FileSlot>
      {mode === "edit" && !pair[on] && pair[on === "light" ? "dark" : "light"] && <p className="bl-note">{s.derived}</p>}
    </div>
  );
  return (
    <div className="bl-row">
      {panel("light")}
      {panel("dark")}
      <div className="bl-panel bl-panel--clear">
        <span className="bl-panel__label">{s.clear}</span>
        <ClearSpace file={pair.light ?? pair.dark} wordmark={wordmark} x={logo.clearSpace} />
        <div className="bl-panel__foot">
          <p className="bl-accent">{s.unit}{mode === "edit" && <> · <EditableNumber value={logo.clearSpace} min={0} max={4} step={0.5} label={s.clear} suffix="x" onCommit={(clearSpace) => set({ clearSpace })} /></>}</p>
          <p>{s.clearRule(xText)}</p>
          {(logo.minPx || mode === "edit") && kind === "primary" && <p className="bl-min">{s.minPx}: <EditableNumber value={logo.minPx ?? 0} min={0} max={2000} label={s.minPx} suffix={` ${s.px}`} onCommit={(n) => set({ minPx: n || null })} /></p>}
        </div>
      </div>
    </div>
  );
}

export default function LogoSection() {
  const { t } = useT();
  return (
    <div className="bl">
      <Row kind="primary" />
      <h3 className="brand-h brand-h--sub">{t.brand.logo.mark}</h3>
      <Row kind="mark" />
    </div>
  );
}
