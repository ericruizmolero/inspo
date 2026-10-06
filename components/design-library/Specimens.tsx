"use client";
// The visual half of /library: tokens and parts drawn with the app's own CSS, so what shows here
// is what the app paints. Values are read from the live stylesheet, never copied by hand.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/components/I18nProvider";
import { areaIcon } from "@/components/area-icons";
import { sectionIcon } from "@/components/section-icons";
import Logo from "@/components/Logo";
import { SYSTEM_AREAS } from "@/types/system";
import "./DesignLibrary.css";
import { Liquid } from "@/components/ui/liquid";

const COLORS: { group: string; tokens: string[] }[] = [
  { group: "Superficies", tokens: ["--bg", "--panel", "--surface", "--surface-2", "--surface-3"] },
  { group: "Texto", tokens: ["--text-strong", "--text", "--text-2", "--muted", "--muted-2"] },
  { group: "Líneas", tokens: ["--border", "--border-strong", "--focus-ring"] },
  { group: "Estados", tokens: ["--danger", "--success", "--warning"] },
];
const TYPE = [
  { size: 32, weight: 600, label: "Título grande", display: true },
  { size: 24, weight: 600, label: "Título", display: true },
  { size: 18, weight: 600, label: "Subtítulo" },
  { size: 16, weight: 500, label: "Destacado" },
  { size: 14, weight: 400, label: "Cuerpo (base)" },
  { size: 13, weight: 500, label: "Botón y UI" },
  { size: 12.5, weight: 550, label: "Etiqueta" },
  { size: 12, weight: 400, label: "Ayuda" },
  { size: 11, weight: 500, label: "Meta" },
];
const RADII = ["--radius-s", "--radius-m", "--radius-l"];
const SHADOWS = ["--shadow-card", "--shadow-pop", "--shadow-modal"];
const EASES = [
  { token: "--ease-out", ms: 450 },
  { token: "--ease-in-out", ms: 550 },
  { token: "--ease-drawer", ms: 500 },
];

/** Re-reads computed values whenever the theme attribute changes. */
function useTokens(names: string[]) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const key = names.join(",");
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setVals(Object.fromEntries(key.split(",").map((n) => [n, cs.getPropertyValue(n).trim()])));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [key]);
  return vals;
}

function Block({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="ds-block">
      <header className="ds-block__head"><h2>{title}</h2>{aside}</header>
      {children}
    </section>
  );
}

/** Flips the page's theme for a look at the other one; the saved preference is untouched. */
function ThemeFlip() {
  const { t } = useT();
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const el = document.documentElement;
    setTheme(el.dataset.theme === "light" ? "light" : "dark");
  }, []);
  const set = (v: "light" | "dark") => { document.documentElement.dataset.theme = v; setTheme(v); };
  return (
    <Liquid className="ds-seg" role="group">
      <button type="button" aria-pressed={theme === "light"} onClick={() => set("light")}>{t.designLibrary.themeLight}</button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => set("dark")}>{t.designLibrary.themeDark}</button>
    </Liquid>
  );
}

function Ease({ name, value, ms }: { name: string; value: string; ms: number }) {
  const { t } = useT();
  const dot = useRef<HTMLSpanElement>(null);
  const play = () => {
    const el = dot.current;
    if (!el) return;
    const w = el.parentElement!.clientWidth - el.offsetWidth;
    el.animate([{ transform: "translateX(0)" }, { transform: `translateX(${w}px)` }], { duration: ms, easing: value, fill: "forwards", direction: el.dataset.at === "end" ? "reverse" : "normal" });
    el.dataset.at = el.dataset.at === "end" ? "start" : "end";
  };
  return (
    <button type="button" className="ds-ease" onClick={play} aria-label={`${t.designLibrary.replay} ${name}`}>
      <span className="ds-ease__name">{name}</span>
      <span className="ds-ease__track"><span ref={dot} className="ds-ease__dot" /></span>
      <span className="ds-val">{value} · {ms} ms</span>
    </button>
  );
}

export function FoundationsSpecimen() {
  const all = [...COLORS.flatMap((c) => c.tokens), ...RADII, ...SHADOWS, ...EASES.map((e) => e.token)];
  const v = useTokens(all);
  return (
    <div className="ds-specimen">
      <Block title="Color" aside={<ThemeFlip />}>
        {COLORS.map((g) => (
          <div key={g.group} className="ds-colors">
            <h3>{g.group}</h3>
            <div className="ds-colors__row">
              {g.tokens.map((tk) => (
                <div key={tk} className="ds-swatch">
                  <span className="ds-swatch__chip" style={{ background: `var(${tk})` }} />
                  <span className="ds-swatch__name">{tk}</span>
                  <span className="ds-val">{v[tk]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Block>

      <Block title="Tipografía">
        <p className="ds-note">Inter variable con eje óptico. Una sola familia; la jerarquía sale de tamaño y peso.</p>
        <div className="ds-type">
          {TYPE.map((r) => (
            <div key={r.size} className="ds-type__row">
              <span className={r.display ? "display" : undefined} style={{ fontSize: r.size, fontWeight: r.weight }}>Referencias que se convierten en criterio</span>
              <span className="ds-type__meta">{r.label}<span className="ds-val">{r.size} px · {r.weight}</span></span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Radios y sombras">
        <div className="ds-tiles">
          {RADII.map((r) => (
            <div key={r} className="ds-tile">
              <span className="ds-tile__box" style={{ borderRadius: `var(${r})` }} />
              <span className="ds-swatch__name">{r}</span><span className="ds-val">{v[r]}</span>
            </div>
          ))}
          {SHADOWS.map((s) => (
            <div key={s} className="ds-tile">
              <span className="ds-tile__box ds-tile__box--lift" style={{ boxShadow: `var(${s})` }} />
              <span className="ds-swatch__name">{s}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Espaciado">
        <div className="ds-space">
          {[2, 4, 6, 8, 10, 12, 16, 20, 24, 32].map((n) => (
            <div key={n} className="ds-space__row"><span className="ds-space__bar" style={{ width: n * 4 }} /><span className="ds-val">{n} px</span></div>
          ))}
        </div>
      </Block>

      <Block title="Movimiento">
        <p className="ds-note">Pulsa cada curva para verla.</p>
        <div className="ds-eases">
          {EASES.map((e) => <Ease key={e.token} name={e.token} value={v[e.token] ?? ""} ms={e.ms} />)}
        </div>
      </Block>

      <Block title="Cristal">
        <div className="ds-glass-stage">
          <div className="ds-glass">
            <span className="ds-glass__title">Superficie flotante</span>
            <span className="ds-glass__line">Tokens --dock-*: casi transparente, desenfoque y una línea de luz que apenas se ve.</span>
          </div>
        </div>
      </Block>
    </div>
  );
}

/** Small live samples for the component catalogue, drawn with the app's real classes. */
const SAMPLES: Record<string, () => ReactNode> = {
  botones: () => (
    <div className="ds-row">
      <button type="button" className="btn btn--primary">Primario</button>
      <button type="button" className="btn">Por defecto</button>
      <button type="button" className="btn btn--sm">Pequeño</button>
      <button type="button" className="btn is-danger">Sacar</button>
    </div>
  ),
  "boton-icono": () => (
    <div className="ds-row">
      {(["layout", "motion", "color"] as const).map((a) => <button key={a} type="button" className="btn-icon" aria-label={a}>{areaIcon(a)}</button>)}
    </div>
  ),
  campo: () => <input className="input" placeholder="Pega una URL o escribe una orden" />,
  logo: () => <div className="ds-row"><Logo size={40} /><Logo size={24} /></div>,
  "iconos-area": () => <div className="ds-row ds-row--icons">{SYSTEM_AREAS.map((a) => <span key={a} title={a}>{areaIcon(a, 20)}</span>)}</div>,
  "iconos-seccion": () => (
    <div className="ds-row ds-row--icons">
      {["account", "workspace", "members", "plan", "extension", "overview", "usage", "feedback", "access"].map((n) => <span key={n} title={n}>{sectionIcon(n)}</span>)}
    </div>
  ),
  cristal: () => (
    <div className="ds-glass-stage ds-glass-stage--sm">
      <div className="ds-glass"><span className="ds-glass__title">Dock</span><span className="ds-glass__line">Superficie de cristal</span></div>
    </div>
  ),
  estado: () => (
    <div className="ds-row">
      <div className="ds-state"><span className="ds-state__dot" />{areaIcon("typography")}<span>Tipografía</span></div>
      <div className="ds-state ds-state--open">{areaIcon("motion")}<span>Movimiento</span></div>
    </div>
  ),
  pastillas: () => (
    <div className="ds-row">
      <span className="ds-pill ds-pill--vigente">Vigente</span>
      <span className="ds-pill">Producto</span>
      <span className="ds-pill ds-pill--retirada">Retirada</span>
    </div>
  ),
  segmentado: () => (
    <Liquid className="ds-seg" role="group">
      <button type="button" aria-pressed="true">Todo</button>
      <button type="button" aria-pressed="false">Sin proyecto</button>
    </Liquid>
  ),
  skeleton: () => (
    <div className="ds-row ds-row--col">
      <div className="sk" style={{ height: 80, width: "100%", borderRadius: 12 }} />
      <div className="sk" style={{ height: 12, width: "60%", borderRadius: 6 }} />
    </div>
  ),
};

export function Sample({ name }: { name: string }) {
  const draw = SAMPLES[name];
  return draw ? <>{draw()}</> : null;
}
