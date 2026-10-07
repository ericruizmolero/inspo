"use client";
// The visual half of /library: tokens and parts drawn with the app's own CSS, so what shows here
// is what the app paints. Values are read from the live stylesheet, never copied by hand, and the
// catalogue's samples (one per card of the system, named by "muestra:" in componentes.md) are the real
// components; there are no screenshots.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/components/I18nProvider";
import { areaIcon } from "@/components/area-icons";
import { sectionIcon, SECTION_ICON_NAMES } from "@/components/section-icons";
import Logo from "@/components/Logo";
import { setTheme as applyTheme } from "@/lib/theme";
import { SYSTEM_AREAS } from "@/types/system";
import {
  Avatar, AvatarStack, Balloon, BoardCard, Busy, Button, Card, Checkbox, Chip, Comment, EmptyState, FieldRow, Icon, IconButton, Key, MenuItem,
  MenuLabel, NoteCard, PillBar, PillBarSep, Progress, PromptInput, ReferenceTile, SegmentedControl, Separator, SettingsWindow, StatusBar, StatusCell,
  StatusRing, Switch, TextArea, TextField, TipWindow, toneFor, Wordmark, ZoomControl,
} from "@/components/criterio";
import { Dialog, DialogWindow } from "@/components/ui/dialog";
import "./DesignLibrary.css";
import type { IconName, SegmentItem } from "@/components/criterio";

// The Criterio system's tokens (tokens.json, mirrored as CSS variables in app/globals.css). The brand is the same in
// both themes; the roles and the chrome change between Paper (light) and Board (dark).
const COLORS: { group: string; tokens: string[] }[] = [
  { group: "Marca", tokens: ["--paper", "--paper-light", "--paper-pressed", "--ink", "--board", "--board-card", "--moss", "--moss-light", "--moss-dark", "--ember", "--ember-glow", "--butter"] },
  { group: "Roles (cambian con el tema)", tokens: ["--surface-page", "--surface-raised", "--text", "--text-muted", "--border", "--focus"] },
  { group: "Controles", tokens: ["--field", "--field-ink", "--field-border", "--control-border", "--on-ember", "--on-moss", "--on-butter", "--disabled", "--disabled-text", "--disabled-border", "--danger-deep"] },
  { group: "Cromo (sigue al tema: oscuro en Board, claro en Paper)", tokens: ["--chrome", "--chrome-panel", "--chrome-raised", "--chrome-border", "--chrome-ink", "--chrome-text", "--chrome-text-muted", "--chrome-muted"] },
  { group: "Cristal (solo las pastillas de la Isla y del selector)", tokens: ["--glass-hover", "--glass-on"] },
  { group: "Estados", tokens: ["--danger", "--success", "--warning"] },
];
// The strict scale (fundamentos.md): display 40 / 28 / 20 / 16 in Bricolage, sans 17 / 15 / 13 / 12 in Archivo. Nothing else.
// Each row is drawn with its own .t-* class, and the size is read from its --fs-* token, so this is the live scale
const TYPE = [
  { name: "display", weight: 800, el: "h1", label: "Título de página y titular" },
  { name: "title-l", weight: 700, el: "h2", label: "Título de bloque y de ventana grande" },
  { name: "title-m", weight: 700, el: "h3", label: "Título de tarjeta y de ventana" },
  { name: "title-s", weight: 700, el: "h4 a h6", label: "Globo; el display nunca más pequeño" },
  { name: "body", weight: 400, label: "Texto corrido y entradilla" },
  { name: "ui", weight: 500, label: "Pestañas, botones, campos" },
  { name: "small", weight: 400, label: "Notas, cuentas, ayudas" },
  { name: "label", weight: 500, label: "Etiquetas y tooltips" },
];
const RADII = ["--radius-sm", "--radius-md", "--radius-lg", "--radius-xl", "--radius-pill"];
// Bevels and the sunken field are drawn on a control; only --float lifts something off the page
const SHADOWS = ["--bevel", "--bevel-pressed", "--sunken", "--float"];
const SPACES = ["--space-1", "--space-2", "--space-3", "--space-4", "--space-5", "--space-6", "--space-7", "--space-8"];
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

/** The system's SegmentedControl (it runs through Liquid itself now); kept as a name for the library's pages */
export function LiquidSegmented(props: { items: SegmentItem[]; active?: number; onChange?: (i: number) => void; tone?: "paper" | "chrome"; size?: "m" | "s"; label: string; choice?: boolean; className?: string }) {
  return <SegmentedControl tone="paper" {...props} />;
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
  const set = (v: "light" | "dark") => { applyTheme(v); setTheme(v); };
  const opts = ["light", "dark"] as const;
  return (
    <LiquidSegmented tone="paper" choice className="ds-flip" label="Tema" active={theme ? opts.indexOf(theme) : -1}
      onChange={(i) => set(opts[i])} items={[{ label: t.designLibrary.themeLight }, { label: t.designLibrary.themeDark }]} />
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
      <span className="ds-val">{value}<br />{ms} ms</span>
    </button>
  );
}

/** The visual half of each page of the library, drawn above its Markdown. Pages that are only text draw nothing. */
export function PageSpecimen({ slug }: { slug: string }) {
  switch (slug) {
    case "fundamentos": return <TokensSpecimen />;
    case "color": return <ColorSpecimen />;
    case "tipografia": return <TypeSpecimen />;
    case "espaciado": return <SpaceSpecimen />;
    case "radios-y-sombras": return <RadiiSpecimen />;
    case "movimiento": return <MotionSpecimen />;
    case "iconos": return <IconsSpecimen />;
    case "pantalla": return <ScreenSpecimen />;
    case "botones": return <ButtonsSpecimen />;
    case "marca": return <BrandSpecimen />;
    default: return null;
  }
}

const BRAND = [
  { token: "--paper", name: "Papel", ink: "var(--ink)" },
  { token: "--ink", name: "Tinta", ink: "var(--paper)" },
  { token: "--board", name: "Board", ink: "var(--paper)" },
  { token: "--moss", name: "Moss", ink: "var(--paper)" },
  { token: "--ember", name: "Ember", ink: "var(--ink)" },
  { token: "--butter", name: "Butter", ink: "var(--ink)" },
];

/** The Tokens hub: the system in one glance, the five brand colours with the type and a button on them. */
function TokensSpecimen() {
  const v = useTokens(BRAND.map((b) => b.token));
  return (
    <div className="ds-specimen">
      <div className="ds-poster">
        {BRAND.map((b) => (
          <div key={b.token} className="ds-poster__tile" style={{ background: `var(${b.token})`, color: b.ink }}>
            <span className="t-title-l">{b.name}</span>
            <span className="ds-poster__val">{b.token}<br />{v[b.token]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Text on each ground: the pairs the system allows, so the contrast of each one is seen, not read
const PAIRS = [
  { bg: "var(--paper)", fg: "var(--ink)", label: "Tinta sobre papel", border: true },
  { bg: "var(--board)", fg: "var(--paper)", label: "Papel sobre board", border: true },
  { bg: "var(--ember)", fg: "var(--ink)", label: "Tinta sobre ember" },
  { bg: "var(--moss)", fg: "var(--paper)", label: "Papel sobre moss" },
  { bg: "var(--butter)", fg: "var(--ink)", label: "Tinta sobre butter" },
  { bg: "var(--chrome)", fg: "var(--chrome-ink)", label: "Texto sobre cromo", border: true },
  { bg: "var(--surface-raised)", fg: "var(--text-muted)", label: "Secundario sobre panel", border: true },
  { bg: "var(--field)", fg: "var(--field-ink)", label: "Texto en un campo", border: true },
];

function ColorSpecimen() {
  const v = useTokens(COLORS.flatMap((c) => c.tokens));
  return (
    <div className="ds-specimen">
      <Block title="Paleta" aside={<ThemeFlip />}>
        {COLORS.map((g) => (
          <div key={g.group} className="ds-colors">
            <h3 className="t-label">{g.group}</h3>
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
      <Block title="Texto sobre cada suelo">
        <p className="ds-note">Las parejas que el sistema permite. Si una combinación no está aquí, no se usa.</p>
        <div className="ds-pairs">
          {PAIRS.map((p) => (
            <div key={p.label} className={`ds-pair${p.border ? " ds-pair--line" : ""}`} style={{ background: p.bg, color: p.fg }}>
              <span className="t-title-l">Aa</span>
              <span className="ds-pair__text">Tu criterio, junto</span>
              <span className="ds-pair__label">{p.label}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

const FAMILIES = [
  { name: "Bricolage Grotesque", token: "--font-display", cls: "ds-family__sample--display", weights: "700 y 800", role: "Titulares y títulos. Nunca por debajo de 16 px ni en texto corrido." },
  { name: "Archivo", token: "--font-sans", cls: "ds-family__sample--sans", weights: "400 y 500", role: "La base: texto corrido, interfaz, botones, campos." },
  { name: "Monoespaciada", token: "--font-mono", cls: "ds-family__sample--mono", weights: "400", role: "Solo datos literales: hex, código, el fichero crudo." },
];

function TypeSpecimen() {
  const v = useTokens([...TYPE.map((r) => `--fs-${r.name}`), ...TYPE.map((r) => `--lh-${r.name}`)]);
  return (
    <div className="ds-specimen">
      <Block title="Familias">
        <div className="ds-families">
          {FAMILIES.map((f) => (
            <div key={f.token} className="ds-family">
              <span className={`ds-family__sample ${f.cls}`} aria-hidden>Aa Bb Cc 0123</span>
              <span className="ds-family__name">{f.name}</span>
              <span className="ds-family__role">{f.role}</span>
              <span className="ds-val">{f.token}, {f.weights}</span>
            </div>
          ))}
        </div>
      </Block>
      <Block title="Escala">
        <p className="ds-note">Ocho pasos, cada uno pintado con su clase y leído de su token. El elemento da el nivel; la clase, solo si el aspecto debe ser otro.</p>
        <div className="ds-type">
          {TYPE.map((r) => (
            <div key={r.name} className="ds-type__row">
              <span className={`ds-type__sample t-${r.name}`}>Tu criterio, junto</span>
              <span className="ds-type__meta"><span className="ds-type__name">.t-{r.name}{r.el ? `, ${r.el}` : ""}</span>{r.label}<span className="ds-val">{v[`--fs-${r.name}`]} / {r.weight} / {v[`--lh-${r.name}`]}</span></span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

function SpaceSpecimen() {
  const v = useTokens(SPACES);
  return (
    <div className="ds-specimen">
      <Block title="Escala">
        <div className="ds-space">
          {SPACES.map((n) => (
            <div key={n} className="ds-space__row"><span className="ds-space__bar" style={{ width: `var(${n})` }} /><span className="ds-swatch__name">{n}</span><span className="ds-val">{v[n]}</span></div>
          ))}
        </div>
      </Block>
      <Block title="Una sola altura">
        <p className="ds-note">Tres tallas de control, y en una misma fila todas iguales: el botón, el campo y el segmentado miden lo mismo.</p>
        <div className="ds-heights">
          {([["s", 34, "Barras y menús"], ["m", 44, "Lo normal en producto"], ["l", 52, "Héroes"]] as const).map(([size, px, where]) => (
            <div key={size} className="ds-heights__row">
              <span className="ds-heights__rule" style={{ height: px }}><span className="ds-val">{px}</span></span>
              <Button size={size} variant="primary">Talla {size}</Button>
              <Button size={size}>Secundario</Button>
              {size !== "l" && <SegmentedControl tone="paper" size={size} label={`Talla ${size}`} active={0} items={[{ label: "Uno" }, { label: "Dos" }]} />}
              {size === "m" && <TextField label="" placeholder="Un campo de 44" className="ds-field--bare ds-heights__field" />}
              <span className="ds-heights__where">{where}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

const POPS = ["--shadow-pop", "--shadow-modal", "--float"];

function RadiiSpecimen() {
  const v = useTokens([...RADII, ...POPS]);
  return (
    <div className="ds-specimen">
      <Block title="Radios">
        <div className="ds-tiles">
          {RADII.map((r) => (
            <div key={r} className="ds-tile">
              <span className="ds-tile__box" style={{ borderRadius: `var(${r})` }} />
              <span className="ds-swatch__name">{r}</span><span className="ds-val">{v[r]}</span>
            </div>
          ))}
        </div>
      </Block>
      <Block title="Bordes y bisel">
        <p className="ds-note">El guiño al 2000: los controles llevan borde de tinta y bisel; campos, casillas y progreso van hundidos. Las tarjetas son planas.</p>
        <div className="ds-tiles">
          {SHADOWS.filter((s) => s !== "--float").map((s) => (
            <div key={s} className="ds-tile">
              <span className={`ds-tile__box ds-tile__box--${s.slice(2)}`} style={{ boxShadow: `var(${s})` }} />
              <span className="ds-swatch__name">{s}</span>
            </div>
          ))}
          <div className="ds-tile">
            <span className="ds-tile__box ds-tile__box--bevel-dark" style={{ boxShadow: "var(--bevel-dark)" }} />
            <span className="ds-swatch__name">--bevel-dark</span>
          </div>
          <div className="ds-tile">
            <span className="ds-tile__box" />
            <span className="ds-swatch__name">--shadow-card</span><span className="ds-val">none</span>
          </div>
        </div>
      </Block>
      <Block title="Sombras">
        <p className="ds-note">Solo lo que se levanta de la página: menús, diálogos y la barra de comandos.</p>
        <div className="ds-tiles ds-tiles--shadows">
          {POPS.map((s) => (
            <div key={s} className="ds-tile">
              <span className={`ds-tile__box ds-tile__box--pop${s === "--float" ? " ds-tile__box--float" : ""}`} style={{ boxShadow: `var(${s})` }} />
              <span className="ds-swatch__name">{s}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

const KEYFRAMES = [
  { name: "fade-in", ms: 300 },
  { name: "pop-in", ms: 300 },
  { name: "shimmer", ms: 1200 },
  { name: "spin", ms: 900 },
];

function Keyframe({ name, ms }: { name: string; ms: number }) {
  const [tick, setTick] = useState(0);
  return (
    <button type="button" className="ds-key" onClick={() => setTick((t) => t + 1)} aria-label={`Repetir ${name}`}>
      <span className="ds-key__stage">
        <span key={tick} className={`ds-key__box ds-key__box--${name}`} style={{ animationDuration: `${ms}ms` }} />
      </span>
      <span className="ds-swatch__name">{name}</span>
      <span className="ds-val">{ms} ms</span>
    </button>
  );
}

function MotionSpecimen() {
  const v = useTokens(EASES.map((e) => e.token));
  return (
    <div className="ds-specimen">
      <Block title="Curvas">
        <p className="ds-note">Pulsa cada curva para verla.</p>
        <div className="ds-eases">
          {EASES.map((e) => <Ease key={e.token} name={e.token} value={v[e.token] ?? ""} ms={e.ms} />)}
        </div>
      </Block>
      <Block title="Keyframes">
        <p className="ds-note">Los cuatro que existen. Pulsa para repetir.</p>
        <div className="ds-keys">
          {KEYFRAMES.map((k) => <Keyframe key={k.name} {...k} />)}
        </div>
      </Block>
      <Block title="Pulsar">
        <p className="ds-note">Un control con bisel se hunde al pulsarlo, no encoge. Mantén pulsado el botón.</p>
        <div className="ds-row"><Button variant="primary">Mantén pulsado</Button><Button>Y este</Button><Button pressed>Así queda pulsado</Button></div>
      </Block>
    </div>
  );
}

const ALL_ICONS: IconName[] = ["home", "plus", "minus", "close", "chevron-down", "chevron-left", "chevron-right", "arrow-right", "arrow-up-right", "search", "sun", "mute", "grid", "sparkle", "gauge", "plug", "text", "image", "play", "folder", "compass", "comment", "quote", "check", "trash", "copy"];

function IconsSpecimen() {
  return (
    <div className="ds-specimen">
      <Block title="Del sistema" aside={<span className="ds-val">24 px, trazo 2</span>}>
        <div className="ds-icons">{ALL_ICONS.map((n) => <span key={n} className="ds-icon"><Icon name={n} size={20} /><span>{n}</span></span>)}</div>
      </Block>
      <Block title="De área" aside={<span className="ds-val">16 px, trazo 1,5</span>}>
        <div className="ds-icons">{SYSTEM_AREAS.map((a) => <span key={a} className="ds-icon">{areaIcon(a, 20)}<span>{a}</span></span>)}</div>
      </Block>
      <Block title="De sección" aside={<span className="ds-val">16 px, trazo 1,5</span>}>
        <div className="ds-icons">{SECTION_ICON_NAMES.map((n) => <span key={n} className="ds-icon">{sectionIcon(n)}<span>{n}</span></span>)}</div>
      </Block>
    </div>
  );
}

const BREAKS = [560, 640, 800, 900, 1100];
const LAYERS = [
  { z: "0–3", what: "Dentro de tarjetas" },
  { z: "5–6", what: "Dentro de una vista" },
  { z: "12", what: "Pastilla de la esquina" },
  { z: "20", what: "Barra superior, Isla" },
  { z: "25", what: "Dock" },
  { z: "30", what: "Sugerencias, ficha" },
  { z: "40", what: "Sidebar flotante" },
  { z: "50–55", what: "Hojas y popovers" },
  { z: "60", what: "Ficha en móvil" },
  { z: "80", what: "Lightbox" },
  { z: "150", what: "Avisos" },
  { z: "200", what: "Diálogos" },
  { z: "100000", what: "Feedback" },
];

function ScreenSpecimen() {
  return (
    <div className="ds-specimen">
      <Block title="Puntos de corte">
        <p className="ds-note">A escala: cada línea es un corte. El de 800 es el de la app; por debajo, la Isla se esconde y el sidebar es una hoja.</p>
        <div className="ds-breaks">
          {BREAKS.map((b) => (
            <span key={b} className={`ds-breaks__mark${b === 800 ? " is-app" : ""}`} style={{ left: `${(b / 1200) * 100}%` }}><span className="ds-val">{b}</span></span>
          ))}
          <span className="ds-breaks__zone" style={{ width: `${(800 / 1200) * 100}%` }}>Móvil</span>
          <span className="ds-breaks__zone ds-breaks__zone--desk" style={{ left: `${(800 / 1200) * 100}%` }}>Escritorio</span>
        </div>
      </Block>
      <Block title="Capas">
        <p className="ds-note">De la página hacia arriba. Una pieza nueva entra en una de estas bandas.</p>
        <ol className="ds-layers">
          {LAYERS.map((l, i) => (
            <li key={l.z} className="ds-layer" style={{ marginLeft: i * 10 }}><span className="ds-val">z {l.z}</span><span>{l.what}</span></li>
          ))}
        </ol>
      </Block>
      <Block title="Foco">
        <p className="ds-note">Tabula por estas piezas: el anillo es de 2 px en el color de foco, desplazado 2 px. Nunca el azul del navegador.</p>
        <div className="ds-row ds-row--top">
          <Button>Un botón</Button>
          <IconButton icon="search" label="Buscar" variant="default" size="m" />
          <TextField label="" placeholder="Un campo" className="ds-field--bare ds-heights__field" />
          <Chip onClick={() => {}}>Un chip</Chip>
        </div>
      </Block>
    </div>
  );
}

const VARIANTS = ["primary", "secondary", "dark", "quiet", "danger"] as const;
const VARIANT_LABEL: Record<(typeof VARIANTS)[number], string> = { primary: "Primario", secondary: "Secundario", dark: "Oscuro", quiet: "Quiet", danger: "Peligro" };

function ButtonsSpecimen() {
  return (
    <div className="ds-specimen">
      <Block title="Variantes y tallas">
        <div className="ds-matrix">
          {(["s", "m", "l"] as const).map((size) => (
            <div key={size} className="ds-matrix__row">
              <span className="ds-val">{size} {size === "s" ? 34 : size === "m" ? 44 : 52}</span>
              {VARIANTS.map((vt) => <span key={vt} className="ds-matrix__cell"><Button size={size} variant={vt}>{VARIANT_LABEL[vt]}</Button></span>)}
            </div>
          ))}
        </div>
      </Block>
      <Block title="Estados">
        <div className="ds-row">
          <Button variant="primary">Normal</Button>
          <Button variant="primary" pressed>Pulsado</Button>
          <Button variant="primary" disabled>Desactivado</Button>
          <Button variant="primary" disabled><Busy label="Guardando" /> Ocupado</Button>
          <Button icon="folder">Con icono</Button>
          <Button iconEnd="arrow-right">Y detrás</Button>
        </div>
      </Block>
      <Block title="Botón de icono">
        <div className="ds-row ds-row--col ds-row--wide">
          <div className="ds-row">{(["quiet", "default", "strong"] as const).map((variant) => <span key={variant} className="ds-row"><IconButton icon="folder" variant={variant} size="m" label={variant} /><span className="ds-val">{variant}</span></span>)}</div>
          <div className="ds-row">{(["xs", "s", "m", "l"] as const).map((size) => <span key={size} className="ds-row"><IconButton icon="plus" variant="default" size={size} label={`Talla ${size}`} /><span className="ds-val">{size}</span></span>)}</div>
          <div className="ds-chrome ds-chrome--inline cr-on-chrome"><IconButton icon="search" variant="quiet" size="s" label="Buscar" /><IconButton icon="plus" variant="quiet" size="s" label="Añadir" /><IconButton icon="home" variant="quiet" size="s" label="Inicio" active /><span className="ds-chrome__line">sobre el cromo</span></div>
        </div>
      </Block>
      <Block title="Confirmar algo que destruye">
        <p className="ds-note">Secundario para dejarlo, danger para hacerlo. Nunca el primario para borrar.</p>
        <div className="ds-row"><Button size="s">Déjalo</Button><Button size="s" variant="danger">Sí, borrar</Button></div>
      </Block>
    </div>
  );
}

const LOGO_SIZES = [24, 28, 36, 48, 88];

function BrandSpecimen() {
  return (
    <div className="ds-specimen">
      <Block title="Logotipo">
        <p className="ds-note">La criatura, transparente, a los tamaños que usa la app. Sobre la página y sobre el cromo.</p>
        <div className="ds-row ds-row--top">
          <div className="ds-logos">{LOGO_SIZES.map((n) => <span key={n} className="ds-logos__one"><Logo size={n} /><span className="ds-val">{n}</span></span>)}</div>
          <div className="ds-logos ds-logos--chrome cr-on-chrome">{[24, 36].map((n) => <span key={n} className="ds-logos__one"><Logo size={n} /><span className="ds-val">{n}</span></span>)}</div>
        </div>
      </Block>
      <Block title="Favicon e iconos">
        <div className="ds-row ds-row--top">
          <span className="ds-logos__one"><img src="/icon.png" alt="Favicon" width={32} height={32} /><span className="ds-val">favicon 32</span></span>
          <span className="ds-logos__one"><img src="/apple-icon.png" alt="Icono de Apple" width={64} height={64} className="ds-apple" /><span className="ds-val">apple-icon</span></span>
          <span className="ds-logos__one"><img src="/icon-512.png" alt="Icono grande" width={96} height={96} /><span className="ds-val">icon-512</span></span>
        </div>
      </Block>
      <Block title="Nombre">
        <div className="ds-row ds-row--top">
          <span className="ds-pair ds-pair--line" style={{ background: "var(--paper)", color: "var(--ink)" }}><Wordmark size={32} /><span className="ds-pair__label">Tinta sobre papel</span></span>
          <span className="ds-pair" style={{ background: "var(--moss)", color: "var(--paper)" }}><Wordmark size={32} tone="paper" /><span className="ds-pair__label">Papel sobre moss</span></span>
        </div>
      </Block>
      <Block title="Colores de marca">
        <div className="ds-poster ds-poster--four">
          {BRAND.filter((b) => ["--paper", "--ink", "--moss", "--ember"].includes(b.token)).map((b) => (
            <div key={b.token} className="ds-poster__tile" style={{ background: `var(${b.token})`, color: b.ink }}>
              <span className="t-title-m">{b.name}</span>
              <span className="ds-poster__val">{b.token}</span>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}

/** A piece of product chrome with the pieces that live on it: the view switcher pill, the zoom and an icon button. */
function ChromeSample() {
  const [view, setView] = useState(0);
  const [zoom, setZoom] = useState(100);
  return (
    <div className="ds-chrome cr-on-chrome">
      <span className="t-title-s ds-chrome__title">Barra de producto</span>
      <span className="ds-chrome__line">Tokens --chrome-*: siguen al tema, con --chrome-ink para el texto fuerte y una línea --chrome-border.</span>
      <div className="ds-row">
        <PillBar>
          <SegmentedControl label="Vista" active={view} onChange={setView} items={[{ label: "Tablón", icon: "grid", count: 24 }, { label: "Sistema", icon: "sparkle", count: "3/8" }]} />
          <PillBarSep />
          <IconButton icon="plus" label="Añadir" variant="quiet" size="s" />
        </PillBar>
        <ZoomControl value={zoom} onIn={() => setZoom((z) => Math.min(150, z + 10))} onOut={() => setZoom((z) => Math.max(50, z - 10))} onReset={() => setZoom(100)} inDisabled={zoom >= 150} outDisabled={zoom <= 50} />
      </div>
    </div>
  );
}

function DialogSample() {
  const [open, setOpen] = useState(false);
  return (
    <div className="ds-row">
      <Button onClick={() => setOpen(true)}>Abrir una ventana de diálogo</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogWindow bar="Ejemplo" heading="Una ventana de diálogo" closeLabel="Cerrar"
          footer={<><Button size="s" onClick={() => setOpen(false)}>Déjalo</Button><Button size="s" variant="danger" onClick={() => setOpen(false)}>Sí, borrar</Button></>}>
          <p className="ds-note">Barra moss, título en display y el pie con las respuestas. Sigue al tema.</p>
        </DialogWindow>
      </Dialog>
    </div>
  );
}

function SwitchSample() {
  const [on, setOn] = useState(true);
  return <label className="ds-row"><Switch checked={on} onChange={setOn} label="Mostrar consejos" /> Mostrar consejos</label>;
}

function ListSample() {
  const [pick, setPick] = useState(1);
  return (
    <div className="cr-listbox ds-listbox" role="listbox" aria-label="Lista de ejemplo">
      {["Librería", "Tipografía", "Color", "Movimiento"].map((x, i) => (
        <button key={x} type="button" role="option" aria-selected={pick === i} className="cr-listbox-item" onClick={() => setPick(i)}>{x}</button>
      ))}
    </div>
  );
}

function ChipSample() {
  const [chip, setChip] = useState(true);
  return (
    <div className="ds-row">
      <Chip>Papel</Chip>
      <Chip tone="butter">Sugerencia</Chip>
      <Chip tone="moss">Librería</Chip>
      <Chip tone="ember">Regla activa</Chip>
      <Chip pressed={chip} onClick={() => setChip((v) => !v)}>Elegida</Chip>
      <Chip onRemove={() => {}} removeLabel="Quitar filtro">Tipografía</Chip>
    </div>
  );
}

function SegmentedSample() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  return (
    <div className="ds-row ds-row--col">
      <LiquidSegmented tone="paper" choice label="Tema" active={a} onChange={setA} items={[{ label: "Sistema" }, { label: "Claro" }, { label: "Oscuro" }]} />
      <LiquidSegmented tone="paper" size="s" label="Filtro" active={b} onChange={setB} items={[{ label: "Todo" }, { label: "Recién llegados" }, { label: "Destacados" }]} />
      <div className="ds-chrome cr-on-chrome ds-chrome--inline"><SegmentedControl label="Vista" active={0} items={[{ label: "Tablón", icon: "grid" }, { label: "Sistema", icon: "sparkle" }]} /></div>
    </div>
  );
}

const people = ["Alberto", "Eric", "Andoni"];
const ICON_NAMES: IconName[] = ["home", "plus", "close", "search", "folder", "compass", "comment", "sparkle", "image", "play", "trash", "copy", "check", "arrow-right"];

/** Small live samples for the component catalogue, drawn with the app's real classes. One per "muestra:" of componentes.md. */
const SAMPLES: Record<string, () => ReactNode> = {
  // ─── Sistema Criterio ───
  botones: () => (
    <div className="ds-row ds-row--col ds-row--wide">
      <div className="ds-row"><Button variant="primary">Primario</Button><Button>Secundario</Button><Button variant="dark">Oscuro</Button><Button variant="quiet" icon="plus">Añadir</Button><Button variant="danger">Sí, borrar</Button></div>
      <div className="ds-row"><Button size="l" variant="primary">Empezar</Button><Button icon="folder">Proyecto</Button><Button iconEnd="arrow-right">Ya tengo las referencias</Button><Button size="s">Copiar</Button><Button disabled>Desactivado</Button></div>
    </div>
  ),
  "boton-icono": () => (
    <div className="ds-row ds-row--col">
      <div className="ds-row">{(["quiet", "default", "strong"] as const).map((variant) => <IconButton key={variant} icon="folder" variant={variant} size="m" label={variant} />)}</div>
      <div className="ds-row">{(["xs", "s", "m", "l"] as const).map((size) => <IconButton key={size} icon="plus" variant="default" size={size} label={`Talla ${size}`} />)}<IconButton icon="mute" variant="default" size="m" label="Sonido" toggle active /></div>
    </div>
  ),
  segmentado: () => <SegmentedSample />,
  prompt: () => (
    <div className="ds-chrome-stage ds-chrome-stage--sm">
      <PromptInput id="ds-prompt" label="¿Qué estás haciendo hoy?" placeholder="Una presentación para una ronda" sendLabel="Empezar" leading={<IconButton icon="image" label="Adjuntar" variant="quiet" size="m" />} />
    </div>
  ),
  campo: () => (
    <div className="ds-row ds-row--narrow ds-row--col">
      <TextField label="Nombre del proyecto" placeholder="Librería Criterio" hint="Se puede cambiar después" />
      <TextField label="Enlace" defaultValue="criterio" hint={<span className="cr-field-hint is-error">Hace falta una URL entera</span>} />
    </div>
  ),
  compositor: () => (
    <div className="ds-row ds-row--narrow ds-row--col">
      <TextArea placeholder="Una nota de dos líneas" rows={2} />
      <TextArea placeholder="Escribe un comentario" toolbar={<><button type="button" className="cr-textbox-tool"><Icon name="image" size={16} />Imagen</button><Button size="s" variant="primary">Enviar</Button></>} />
    </div>
  ),
  casilla: () => <div className="ds-row ds-row--col"><Checkbox label="Mostrar consejos al empezar" defaultChecked /><Checkbox label="Avisarme por correo" /></div>,
  interruptor: () => <SwitchSample />,
  pastillas: () => <ChipSample />,
  tarjeta: () => (
    <div className="ds-row ds-row--top">
      <Card title="Tarjeta" eyebrow="raised" className="ds-sys__card">Plana, con una línea fina; sigue al tema.</Card>
      <Card tone="moss" title="Moss" className="ds-sys__card">Texto papel encima.</Card>
      <Card tone="butter" title="Butter" className="ds-sys__card">Una sugerencia.</Card>
    </div>
  ),
  globo: () => <Balloon title="Un consejo" actions={<Button size="s" variant="quiet">Vale</Button>}>Arrastra una referencia a un proyecto para archivarla.</Balloon>,
  ventana: () => (
    <TipWindow title="criterio.design" heading="Ventana de consejo" onClose={false}
      footer={<><Button size="s" variant="quiet">Ahora no</Button><Button size="s" variant="primary">Vale</Button></>}>
      Barra moss con el título, cuerpo y los botones al pie. Sigue al tema.
    </TipWindow>
  ),
  dialogo: () => <DialogSample />,
  "ventana-ajustes": () => (
    <SettingsWindow title="Cuenta" figure="2 sesiones" description="Cómo te ven los demás en Criterio." note="Guardado hace un momento" actions={<Button size="s" variant="primary">Guardar</Button>} className="ds-sys__window">
      <FieldRow label="Nombre" hint="Como lo ven en los comentarios" htmlFor="ds-name"><TextField id="ds-name" label="" defaultValue="Eric" className="ds-field--bare" /></FieldRow>
    </SettingsWindow>
  ),
  "fila-campo": () => (
    <div className="ds-row ds-row--col ds-row--wide">
      <FieldRow label="Idioma" hint="De la interfaz"><LiquidSegmented tone="paper" choice label="Idioma" active={1} items={[{ label: "English" }, { label: "Castellano" }]} /></FieldRow>
      <FieldRow label="Correo" htmlFor="ds-mail" action={<Button>Cambiar</Button>} error="Este correo ya está en uso"><TextField id="ds-mail" label="" defaultValue="eric@criterio.design" className="ds-field--bare" /></FieldRow>
    </div>
  ),
  menu: () => (
    <div className="cr-menu ds-menu" role="menu" aria-label="Menú de ejemplo">
      <MenuLabel>Proyecto</MenuLabel>
      <MenuItem icon="folder">Abrir</MenuItem>
      <MenuItem icon="text" checked>Renombrar</MenuItem>
      <Separator />
      <MenuLabel>Peligro</MenuLabel>
      <MenuItem icon="trash" danger>Borrar</MenuItem>
    </div>
  ),
  separador: () => (
    <div className="ds-row ds-row--col ds-row--narrow">
      <span className="ds-note">Un grupo</span><Separator /><span className="ds-note">Otro grupo</span>
      <div className="ds-row"><Key>⌘</Key><Separator vertical /><Key>K</Key></div>
    </div>
  ),
  tooltip: () => <div className="ds-row"><span className="ds-tipped" data-tip="Un globo pequeño de mantequilla" tabIndex={0}>Pasa por aquí</span><IconButton icon="search" label="Buscar (el label es el tooltip)" variant="default" size="m" /></div>,
  lista: () => <ListSample />,
  "barra-estado": () => <StatusBar><StatusCell grow>Entras como alberto@criterio.design</StatusCell><StatusCell>Guardado</StatusCell><StatusCell>24 referencias</StatusCell></StatusBar>,
  espera: () => <div className="ds-row"><Busy label="Trabajando" /><span className="ds-note">Esperando</span><Button variant="primary" disabled><Busy label="Guardando" /> Guardando</Button></div>,
  tecla: () => <div className="ds-row"><Key>⌘</Key><Key>K</Key><Key>Esc</Key><Key>/</Key></div>,
  anillo: () => (
    <div className="ds-row">
      <span className="ds-row"><StatusRing tone="synced" /><span className="ds-note">Al día</span></span>
      <span className="ds-row"><StatusRing tone="new" /><span className="ds-note">Algo nuevo</span></span>
      <span className="ds-row"><StatusRing tone="idle" /><span className="ds-note">Sin empezar</span></span>
      <span className="ds-row"><StatusRing tone="idle" progress={7 / 8} /><span className="ds-note">7 de 8 áreas</span></span>
    </div>
  ),
  progreso: () => <div className="ds-row ds-row--narrow ds-row--col"><Progress value={14} max={23} label="Mirando tu librería" /><span className="ds-note">Mirando tu librería: 14 de 23</span></div>,
  avatar: () => (
    <div className="ds-row">
      {people.map((n) => <Avatar key={n} initials={n.slice(0, 1)} name={n} tone={toneFor(n)} size={32} />)}
      <Avatar initials="C" name="Criterio" tone="chrome" square size={32} />
      <AvatarStack people={people.map((n) => ({ initials: n.slice(0, 1), name: n, tone: toneFor(n) }))} />
    </div>
  ),
  comentario: () => <Card className="ds-sys__card"><Comment author="Eric" initials="E">Este azul se parece demasiado al de Windows.</Comment></Card>,
  "tarjeta-tablero": () => (
    <div className="ds-row ds-row--top">
      <BoardCard name="Landing Savvia" count={24} countLabel="24 referencias" status="synced" statusLabel="Al día" tiles={["#4F6B3A", "#E8892B", "#FBF1C7", "#1B1B18", "#7E9A5C", "#EDE6D6"]} className="ds-sys__board" />
      <BoardCard name="Tipografía 2027" count={3} countLabel="3 referencias" status="new" statusLabel="Algo nuevo" tiles={["#1A1A1A", "#D9CFBA", "#F6A848"]} className="ds-sys__board" />
    </div>
  ),
  referencia: () => (
    <div className="ds-row ds-row--top">
      <ReferenceTile kind="image" tone="var(--moss)" height={120} caption="Una imagen" className="ds-sys__ref" />
      <ReferenceTile kind="video" tone="var(--chrome-raised)" height={120} played={35} caption="Un vídeo" className="ds-sys__ref" />
      <ReferenceTile kind="link" tone="var(--paper-pressed)" height={120} caption="Un enlace" className="ds-sys__ref" />
    </div>
  ),
  nota: () => <NoteCard title="Menos sitios para lo mismo" kindLabel="Texto" height={160} className="ds-sys__card">Si dos lugares sirven para comentar o para decidir, sobra uno. El tablón es el sitio de las referencias y el fichero el de las decisiones.</NoteCard>,
  vacio: () => <Card className="ds-sys__card"><EmptyState title="Nada todavía" suggestions={["Pegar un enlace", "Subir una imagen"]}>Cuando alguien comente, aparecerá aquí.</EmptyState></Card>,
  zoom: () => <div className="ds-chrome-stage ds-chrome-stage--sm"><div className="cr-on-chrome"><ZoomControl value={80} valueLabel="4 columnas" /></div></div>,
  pillbar: () => (
    <div className="ds-chrome-stage ds-chrome-stage--sm">
      <div className="cr-on-chrome"><PillBar><SegmentedControl label="Vista" active={0} items={[{ label: "Tablón", icon: "grid", count: 24 }, { label: "Sistema", icon: "sparkle", count: "3/8" }]} /><PillBarSep /><IconButton icon="plus" label="Añadir" variant="quiet" size="s" /></PillBar></div>
    </div>
  ),
  iconos: () => <div className="ds-row ds-row--icons">{ICON_NAMES.map((n) => <span key={n} data-tip={n}><Icon name={n} size={20} /></span>)}</div>,
  wordmark: () => <div className="ds-row"><Wordmark size={28} /><span className="ds-chrome ds-chrome--inline"><Wordmark size={20} tone="paper" /></span></div>,
  cromo: () => <div className="ds-chrome-stage ds-chrome-stage--sm"><ChromeSample /></div>,
  // ─── Comunes ───
  logo: () => <div className="ds-row"><Logo size={40} /><Logo size={24} /></div>,
  "iconos-area": () => <div className="ds-row ds-row--icons">{SYSTEM_AREAS.map((a) => <span key={a} data-tip={a}>{areaIcon(a, 20)}</span>)}</div>,
  "iconos-seccion": () => (
    <div className="ds-row ds-row--icons">
      {["account", "workspace", "members", "plan", "extension", "overview", "usage", "feedback", "access"].map((n) => <span key={n} data-tip={n}>{sectionIcon(n)}</span>)}
    </div>
  ),
  skeleton: () => (
    <div className="ds-row ds-row--col">
      <div className="sk ds-sk ds-sk--block" />
      <div className="sk ds-sk ds-sk--line" />
    </div>
  ),
};

/** The names a card can ask for with "muestra:"; checked by scripts/check-design-system.ts against componentes.md. */
export const SAMPLE_NAMES = Object.keys(SAMPLES);

export function Sample({ name }: { name: string }) {
  const draw = SAMPLES[name];
  return draw ? <>{draw()}</> : null;
}
