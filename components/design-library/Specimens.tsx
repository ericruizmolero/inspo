"use client";
// The visual half of /library: tokens and parts drawn with the app's own CSS, so what shows here
// is what the app paints. Values are read from the live stylesheet, never copied by hand.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/components/I18nProvider";
import { areaIcon } from "@/components/area-icons";
import { sectionIcon } from "@/components/section-icons";
import Logo from "@/components/Logo";
import { setTheme as applyTheme } from "@/lib/theme";
import { SYSTEM_AREAS } from "@/types/system";
import {
  Avatar, AvatarStack, Balloon, Busy, Button, Card, Checkbox, Chip, Comment, EmptyState, Icon, IconButton, Key, MenuItem, MenuLabel, PillBar,
  Progress, PromptInput, SegmentedControl, Separator, StatusBar, StatusCell, StatusRing, Switch, TextArea, TextField, TipWindow, toneFor,
} from "@/components/criterio";
import { Dialog, DialogWindow } from "@/components/ui/dialog";
import "./DesignLibrary.css";
import type { SegmentItem } from "@/components/criterio";

// The Criterio system's tokens (tokens.json, mirrored as CSS variables in app/globals.css). The brand and the chrome
// are the same in both themes; the roles change between Paper (light) and Board (dark).
const COLORS: { group: string; tokens: string[] }[] = [
  { group: "Marca", tokens: ["--paper", "--paper-light", "--paper-pressed", "--ink", "--board", "--board-card", "--moss", "--moss-light", "--moss-dark", "--ember", "--ember-glow", "--butter"] },
  { group: "Roles (cambian con el tema)", tokens: ["--surface-page", "--surface-raised", "--text", "--text-muted", "--border", "--focus"] },
  { group: "Controles", tokens: ["--field", "--control-border", "--on-ember", "--on-moss", "--on-butter", "--disabled", "--disabled-text", "--disabled-border"] },
  { group: "Cromo (oscuro en los dos temas)", tokens: ["--chrome", "--chrome-panel", "--chrome-raised", "--chrome-border", "--chrome-text", "--chrome-text-muted", "--chrome-muted"] },
  { group: "Estados", tokens: ["--danger"] },
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
export function LiquidSegmented(props: { items: SegmentItem[]; active?: number; onChange?: (i: number) => void; tone?: "paper" | "chrome"; label: string; choice?: boolean; className?: string }) {
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

export function FoundationsSpecimen() {
  const all = [...COLORS.flatMap((c) => c.tokens), ...RADII, ...SHADOWS, ...SPACES, ...EASES.map((e) => e.token), ...TYPE.map((r) => `--fs-${r.name}`), "--font-sans", "--font-display"];
  const v = useTokens(all);
  return (
    <div className="ds-specimen">
      <Block title="Color" aside={<ThemeFlip />}>
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

      <Block title="Tipografía">
        <p className="ds-note">Bricolage Grotesque (display, 700 y 800) para titulares y títulos, nunca por debajo de 16 px ni en texto corrido. Archivo para todo lo demás. Sin monoespaciada salvo datos literales.</p>
        <div className="ds-type">
          {TYPE.map((r) => (
            <div key={r.name} className="ds-type__row">
              <span className={`ds-type__sample t-${r.name}`}>Tu criterio, junto</span>
              <span className="ds-type__meta"><span className="ds-type__name">.t-{r.name}{r.el ? `, ${r.el}` : ""}</span>{r.label}<span className="ds-val">{v[`--fs-${r.name}`]}, {r.weight}</span></span>
            </div>
          ))}
        </div>
      </Block>

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

      <Block title="Bisel y sombra">
        <p className="ds-note">El guiño al 2000: los controles llevan borde de tinta y bisel; campos, casillas y progreso van hundidos. Las tarjetas son planas. Solo la barra de comandos flota.</p>
        <div className="ds-tiles">
          {SHADOWS.map((s) => (
            <div key={s} className="ds-tile">
              <span className={`ds-tile__box ds-tile__box--${s.slice(2)}`} style={{ boxShadow: `var(${s})` }} />
              <span className="ds-swatch__name">{s}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Espaciado">
        <div className="ds-space">
          {SPACES.map((n) => (
            <div key={n} className="ds-space__row"><span className="ds-space__bar" style={{ width: `var(${n})` }} /><span className="ds-swatch__name">{n}</span><span className="ds-val">{v[n]}</span></div>
          ))}
        </div>
      </Block>

      <Block title="Movimiento">
        <p className="ds-note">Pulsa cada curva para verla.</p>
        <div className="ds-eases">
          {EASES.map((e) => <Ease key={e.token} name={e.token} value={v[e.token] ?? ""} ms={e.ms} />)}
        </div>
      </Block>

      <Block title="Cromo">
        <div className="ds-chrome-stage">
          <div className="ds-chrome">
            <span className="t-title-s ds-chrome__title">Barra de producto</span>
            <span className="ds-chrome__line">Tokens --chrome-*: oscura en los dos temas, texto papel y una línea fina. Sin cristal ni desenfoque.</span>
          </div>
        </div>
      </Block>

      <Block title="Componentes del sistema">
        <div className="ds-sys">
          <div className="ds-row"><Button variant="primary">Añadir al sistema</Button><Button>Ahora no</Button><Button variant="dark">Ver un tablero</Button><Button variant="quiet" icon="plus">Añadir</Button></div>
          <div className="ds-row"><Button size="l" variant="primary">Empezar</Button><Button icon="folder">Proyecto</Button><Button iconEnd="arrow-right">Ya tengo las referencias</Button><Button size="s">Copiar</Button></div>
          <div className="ds-row"><Chip>Papel</Chip><Chip tone="butter">Sugerencia</Chip><Chip tone="moss">Librería</Chip><Chip tone="ember">Regla activa</Chip></div>
          <div className="ds-row ds-row--narrow"><TextField label="Nombre del proyecto" placeholder="Librería Criterio" /></div>
          <div className="ds-row"><Checkbox label="Mostrar consejos al empezar" defaultChecked /><StatusRing tone="synced" /><StatusRing tone="new" /><StatusRing tone="idle" /></div>
          <div className="ds-row ds-row--narrow"><Progress value={14} max={23} label="Mirando tu librería" /></div>
          <div className="ds-row"><Card title="Tarjeta" eyebrow="raised" className="ds-sys__card">Plana, con una línea fina.</Card><Card tone="moss" title="Moss" className="ds-sys__card">Texto papel encima.</Card></div>
        </div>
      </Block>

      <Block title="El guiño al 2000">
        <p className="ds-note">Las piezas pequeñas copiadas de las de arriba: ventanas de papel, globos, campos hundidos y teclas con bisel. Todo vivo, como lo pinta la app.</p>
        <TwoThousand />
      </Block>
    </div>
  );
}

/** The 2000 pieces, live: windows, balloons, the menu, the tooltip, the switch, the list well, the status bar,
 *  waiting, the keycap, people and the inputs that write. */
function TwoThousand() {
  const [on, setOn] = useState(true);
  const [pick, setPick] = useState(1);
  const [dialog, setDialog] = useState(false);
  const [chip, setChip] = useState(true);
  const people = ["Alberto", "Eric", "Andoni"];
  return (
    <div className="ds-sys">
      <div className="ds-row ds-row--top">
        <Balloon title="Un consejo">Arrastra una referencia a un proyecto para archivarla.</Balloon>
        <TipWindow title="criterio.design" heading="Ventana de consejo" onClose={false}
          footer={<><Button size="s" variant="quiet">Ahora no</Button><Button size="s" variant="primary">Vale</Button></>}>
          Barra moss con el título, cuerpo en papel y los botones al pie.
        </TipWindow>
      </div>
      <div className="ds-row">
        <Button onClick={() => setDialog(true)}>Abrir una ventana de diálogo</Button>
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogWindow bar="Ejemplo" heading="Una ventana de diálogo" closeLabel="Cerrar"
            footer={<><Button size="s" onClick={() => setDialog(false)}>Déjalo</Button><Button size="s" variant="danger" onClick={() => setDialog(false)}>Sí, borrar</Button></>}>
            <p className="ds-note">Cada diálogo es una ventana: barra moss, título en display y el pie con las respuestas.</p>
          </DialogWindow>
        </Dialog>
        <Button variant="danger">Sí, borrar</Button>
        <span className="ds-tipped" data-tip="Un globo pequeño de mantequilla" tabIndex={0}>Pasa por aquí (tooltip)</span>
      </div>
      <div className="ds-row ds-row--top">
        <div className="cr-menu ds-menu" role="menu" aria-label="Menú de ejemplo">
          <MenuLabel bar>Proyecto</MenuLabel>
          <MenuItem icon="folder">Abrir</MenuItem>
          <MenuItem icon="text" checked>Renombrar</MenuItem>
          <Separator />
          <MenuLabel>Peligro</MenuLabel>
          <MenuItem icon="close" danger>Borrar</MenuItem>
        </div>
        <div className="cr-listbox ds-listbox" role="listbox" aria-label="Lista de ejemplo">
          {["Librería", "Tipografía", "Color", "Movimiento"].map((x, i) => (
            <button key={x} type="button" role="option" aria-selected={pick === i} className="cr-listbox-item" onClick={() => setPick(i)}>{x}</button>
          ))}
        </div>
        <div className="ds-row ds-row--col">
          <label className="ds-row"><Switch checked={on} onChange={setOn} label="Mostrar consejos" /> Mostrar consejos</label>
          <div className="ds-row"><Busy label="Trabajando" /> <span className="ds-note">Esperando</span></div>
          <div className="ds-row"><Key>⌘</Key><Key>K</Key><Key>Esc</Key><Key>/</Key></div>
          <div className="ds-row"><Chip pressed={chip} onClick={() => setChip((v) => !v)}>Pulsada</Chip><Chip onRemove={() => {}} removeLabel="Quitar">Quitable</Chip></div>
        </div>
      </div>
      <StatusBar><StatusCell grow>Entras como alberto@criterio.design</StatusCell><StatusCell>Guardado</StatusCell><StatusCell>24 referencias</StatusCell></StatusBar>
      <div className="ds-row">
        {people.map((n) => <Avatar key={n} initials={n.slice(0, 1)} name={n} tone={toneFor(n)} size={32} />)}
        <Avatar initials="C" name="Criterio" tone="chrome" square size={32} />
        <AvatarStack people={people.map((n) => ({ initials: n.slice(0, 1), name: n, tone: toneFor(n) }))} />
      </div>
      <div className="ds-row ds-row--top">
        <Card className="ds-sys__card"><EmptyState title="Nada todavía">Cuando alguien comente, aparecerá aquí.</EmptyState></Card>
        <Card className="ds-sys__card"><Comment author="Eric" initials="E">Este azul se parece demasiado al de Windows.</Comment></Card>
      </div>
      <div className="ds-row ds-row--narrow">
        <TextArea placeholder="Escribe un comentario" toolbar={<><button type="button" className="cr-textbox-tool"><Icon name="image" size={16} />Imagen</button><Button size="s" variant="primary">Enviar</Button></>} />
      </div>
      <div className="ds-chrome-stage ds-chrome-stage--sm">
        <PromptInput id="ds-prompt" label="¿Qué estás haciendo hoy?" placeholder="Una presentación para una ronda" sendLabel="Empezar" />
      </div>
    </div>
  );
}

/** Small live samples for the component catalogue, drawn with the app's real classes. */
const SAMPLES: Record<string, () => ReactNode> = {
  botones: () => (
    <div className="ds-row">
      <Button variant="primary">Primario</Button>
      <Button>Secundario</Button>
      <Button variant="dark">Oscuro</Button>
      <Button variant="quiet" icon="plus">Añadir</Button>
      <Button size="s">Pequeño</Button>
      <Button size="l">Grande</Button>
      <Button variant="danger">Sí, borrar</Button>
    </div>
  ),
  "boton-icono": () => (
    <div className="ds-row">
      {(["layout", "motion", "color"] as const).map((a, i) => <IconButton key={a} icon={areaIcon(a)} variant={(["quiet", "default", "strong"] as const)[i]} size="m" label={a} />)}
    </div>
  ),
  campo: () => <div className="ds-row ds-row--col"><TextField label="Enlace" placeholder="Pega una URL o escribe una orden" /></div>,
  logo: () => <div className="ds-row"><Logo size={40} /><Logo size={24} /></div>,
  "iconos-area": () => <div className="ds-row ds-row--icons">{SYSTEM_AREAS.map((a) => <span key={a} data-tip={a}>{areaIcon(a, 20)}</span>)}</div>,
  "iconos-seccion": () => (
    <div className="ds-row ds-row--icons">
      {["account", "workspace", "members", "plan", "extension", "overview", "usage", "feedback", "access"].map((n) => <span key={n} data-tip={n}>{sectionIcon(n)}</span>)}
    </div>
  ),
  // Glass was retired by the Criterio system: the old sample now shows what replaced it, the dark chrome
  cristal: () => (
    <div className="ds-chrome-stage ds-chrome-stage--sm">
      <div className="ds-chrome"><span className="t-title-s ds-chrome__title">Dock</span><span className="ds-chrome__line">Cromo oscuro</span></div>
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
      <Chip tone="moss">Vigente</Chip>
      <Chip>Producto</Chip>
      <Chip pressed>Elegida</Chip>
      <Chip onRemove={() => {}} removeLabel="Quitar filtro">Tipografía</Chip>
    </div>
  ),
  segmentado: () => (
    <div className="ds-row ds-row--col">
      <LiquidSegmented tone="paper" choice className="theme-seg" label="Tema" active={0} items={[{ label: "Sistema" }, { label: "Claro" }, { label: "Oscuro" }]} />
      <PillBar><SegmentedControl label="Vista" active={0} items={[{ label: "Board" }, { label: "System" }]} /></PillBar>
    </div>
  ),
  skeleton: () => (
    <div className="ds-row ds-row--col">
      <div className="sk ds-sk ds-sk--block" />
      <div className="sk ds-sk ds-sk--line" />
    </div>
  ),
};

export function Sample({ name }: { name: string }) {
  const draw = SAMPLES[name];
  return draw ? <>{draw()}</> : null;
}
