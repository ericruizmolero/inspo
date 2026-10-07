"use client";
// The visual half of /library: tokens and parts drawn with the app's own CSS, so what shows here
// is what the app paints. Values are read from the live stylesheet, never copied by hand, and the
// catalogue's samples (one per card of the system, named by "muestra:" in componentes.md) are the real
// components; there are no screenshots.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/components/I18nProvider";
import { areaIcon } from "@/components/area-icons";
import { sectionIcon } from "@/components/section-icons";
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

/** The tokens page: colour, type, radii, bevel, spacing, motion and the chrome. The components live in the catalogue. */
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
        <p className="ds-note">Bricolage Grotesque (display, 700 y 800) para titulares y títulos, nunca por debajo de 16 px ni en texto corrido. Archivo para todo lo demás. Sin monoespaciada salvo datos literales. Un solo sitio: el elemento da el nivel y la clase solo cambia el aspecto.</p>
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
        <p className="ds-note">El cromo del producto (Isla, selector de vista, zoom, dock, ficha) es sólido y sigue al tema: oscuro en Board, claro en Paper. Sin cristal ni desenfoque en barras ni superficies; el cristal es solo de las pastillas de hover y activa de la Isla y del selector.</p>
        <div className="ds-chrome-stage">
          <ChromeSample />
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
    <div className="ds-row ds-row--col">
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
