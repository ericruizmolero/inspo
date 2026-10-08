"use client";

// The Criterio design system's components, ported from its bundle (window.Criterio) to the app.
// Styles in ./criterio.css, guidelines in docs/design-system/componentes.md and in the system itself.
// The creature (Creature, Profile, Sprite) is left out for now: the wordmark is plain type, and Balloon,
// TipWindow and EmptyState take no drawing.

import { useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";
import { ArrowDown, ArrowRight, ArrowUUpLeft, ArrowUp, ArrowUpRight, Bell, CalendarBlank, CaretDown, CaretLeft, CaretRight, Chat, ChatCircle, Check, Compass, Copy, DotsThree, DownloadSimple, EnvelopeSimple, FileText, FilmStrip, Folder, Gauge, Gear, House, Info, Lightbulb, MagnifyingGlass, Minus, MonitorPlay, Moon, PaperPlaneTilt, PencilSimple, Play, Plug, PlugsConnected, Plus, Pulse, Quotes, Shuffle, SidebarSimple, SlidersHorizontal, Sparkle, SpeakerHigh, SpeakerSlash, SquaresFour, Sun, TextAlignLeft, Trash, Tray, UploadSimple, User, Users, X, Image as ImageIcon } from "@phosphor-icons/react/ssr";
import type { Icon as PhosphorIcon, IconWeight } from "@phosphor-icons/react";
import { Liquid } from "@/components/ui/liquid";
import "./criterio.css";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ─── Brand ─────────────────────────────────────────────────────────────────

/** The name in display 800, lowercase. Ink on paper and butter, paper on moss, ink and board. */
export function Wordmark({ size = 24, tone = "ink", className }: { size?: number; tone?: "ink" | "paper"; className?: string }) {
  return (
    <span className={cx("cr-wordmark", `cr-wordmark-${tone}`, className)} style={{ fontSize: size }} role="img" aria-label="Criterio">
      <span className="cr-wordmark-text" aria-hidden>criterio</span>
    </span>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const ICONS = {
  home: House,
  plus: Plus,
  minus: Minus,
  close: X,
  "chevron-down": CaretDown,
  "chevron-left": CaretLeft,
  "chevron-right": CaretRight,
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  search: MagnifyingGlass,
  sun: Sun,
  moon: Moon,
  volume: SpeakerHigh,
  mute: SpeakerSlash,
  grid: SquaresFour,
  sparkle: Sparkle,
  gauge: Gauge,
  plug: Plug,
  cable: PlugsConnected,
  text: TextAlignLeft,
  image: ImageIcon,
  play: Play,
  folder: Folder,
  compass: Compass,
  comment: Chat,
  quote: Quotes,
  check: Check,
  undo: ArrowUUpLeft,
  info: Info,
  video: MonitorPlay,
  bulb: Lightbulb,
  film: FilmStrip,
  inbox: Tray,
  dots: DotsThree,
  user: User,
  users: Users,
  calendar: CalendarBlank,
  sliders: SlidersHorizontal,
  shuffle: Shuffle,
  upload: UploadSimple,
  mail: EnvelopeSimple,
  gear: Gear,
  activity: Pulse,
  swatches: SquaresFour,
  chat: ChatCircle,
  send: PaperPlaneTilt,
  edit: PencilSimple,
  file: FileText,
  sidebar: SidebarSimple,
  // app: removing something (a reference, a selection out of a project)
  trash: Trash,
  // app: the team's activity (TeamBell)
  bell: Bell,
  // app: copying something (the feedback as markdown, a link)
  copy: Copy,
  // app: bringing a board or bookmarks in from elsewhere (Conectores → Import)
  import: DownloadSimple,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

/** Every system icon, for the library's Iconos page */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** Phosphor, regular weight, currentColor. `play` is the only filled glyph. */
export function Icon({ name, size = 18, weight, className }: { name: IconName; size?: number; weight?: IconWeight; className?: string }) {
  const Glyph = ICONS[name];
  return <Glyph size={size} weight={weight ?? (name === "play" ? "fill" : "regular")} aria-hidden focusable="false" className={cx("cr-icon", className)} />;
}

// ─── Actions ───────────────────────────────────────────────────────────────

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "dark" | "quiet" | "danger";
  /** s 34 (balloons, windows, toolbars), m 44 (default in product), l 52 (heroes) */
  size?: "s" | "m" | "l";
  pressed?: boolean;
  /** leading icon, e.g. folder on the project button */
  icon?: IconName;
  /** trailing icon, e.g. arrow-right on "I have my references" */
  iconEnd?: IconName;
  /** renders an <a> */
  href?: string;
};

/** Chunky, beveled. `primary` (ember) is the one action the view is for; `secondary` (paper) everything else;
 * `dark` (ink) a second strong action on paper; `quiet` no border, bevel or fill until hover (inline actions);
 * `danger` (deep red) only for the confirm step of something destructive. */
export function Button({ variant = "secondary", size = "m", pressed, icon, iconEnd, href, className, children, type = "button", ...rest }: ButtonProps) {
  const cls = cx("cr-btn", `cr-btn-${variant}`, `cr-btn-${size}`, pressed && "is-pressed", className);
  const isz = size === "s" ? 16 : 20;
  const body = <>{icon && <Icon name={icon} size={isz} />}{children}{iconEnd && <Icon name={iconEnd} size={isz} />}</>;
  if (href) return <a className={cls} href={href}>{body}</a>;
  return <button type={type} className={cls} {...rest}>{body}</button>;
}

type IconButtonVariant = "quiet" | "default" | "strong";
type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: IconName | ReactNode;
  /** accessible name, also the tooltip */
  label: string;
  /** quiet: no fill until hover; default: filled with a hairline; strong: paper, ink border, bevel. The old
   * names still work: ghost = quiet, chrome and round = default, raised = strong */
  variant?: IconButtonVariant | "ghost" | "chrome" | "round" | "raised";
  /** xs 24, s 32, m 40, l 48; icons 14, 16, 18, 20 */
  size?: "xs" | "s" | "m" | "l";
  /** the current place (home on home) */
  active?: boolean;
  /** an on/off control (sound): `active` is announced as pressed */
  toggle?: boolean;
};

const IB_ALIAS: Record<string, IconButtonVariant> = { ghost: "quiet", chrome: "default", round: "default", raised: "strong" };
const IB_ICON = { xs: 14, s: 16, m: 18, l: 20 } as const;

/** One icon button for the whole product: always a circle, one icon, a label that is also the tooltip. Inside dark
 * product chrome (or any element with `cr-on-chrome`) the same variants read the chrome tokens. */
export function IconButton({ icon, label, variant = "default", size, active, toggle, className, type = "button", ...rest }: IconButtonProps) {
  const v = IB_ALIAS[variant] ?? (variant as IconButtonVariant);
  const sz = size ?? (variant === "round" ? "l" : "m");
  return (
    <button type={type} aria-label={label} data-tip={label} aria-pressed={toggle ? !!active : undefined} {...rest}
      className={cx("cr-iconbtn", `cr-iconbtn-${v}`, `cr-iconbtn-${sz}`, active && "is-active", className)}>
      {typeof icon === "string" ? <Icon name={icon as IconName} size={IB_ICON[sz]} /> : icon}
    </button>
  );
}

export type SegmentItem = { label: ReactNode; icon?: IconName | ReactNode; count?: number | string; dot?: boolean; title?: string };

/** Mutually exclusive views, one active. `chrome` on dark chrome, `paper` on paper grounds.
 *  app: `choice` makes it a radio group (a setting such as the theme) instead of tabs. */
export function SegmentedControl({ items, active = 0, onChange, tone = "chrome", size = "m", label = "View", choice, className }: {
  items: SegmentItem[]; active?: number; onChange?: (i: number) => void; tone?: "chrome" | "paper";
  /** paper only: m (44, beside a Button m) or s (34, in a toolbar inside the page, beside a Button s) */
  size?: "m" | "s"; label?: string; choice?: boolean; className?: string;
}) {
  return (
    // Through Liquid (components/ui/liquid.tsx): the hover flows from option to option and the chosen fill moves
    // in the click itself; the pills take the segment's colours (criterio.css, .cr-seg)
    <Liquid className={cx("cr-seg", `cr-seg-${tone}`, size === "s" && "cr-seg-s", className)} role={choice ? "radiogroup" : "tablist"} aria-label={label}
      on={choice ? ':scope > [aria-checked="true"]' : undefined}>
      {items.map((it, i) => (
        <button key={i} type="button" role={choice ? "radio" : "tab"} {...(choice ? { "aria-checked": active === i } : { "aria-selected": active === i })} title={it.title}
          className={cx("cr-seg-item", active === i && "is-active")} onClick={() => onChange?.(i)}>
          {typeof it.icon === "string" ? <Icon name={it.icon as IconName} size={16} /> : it.icon}
          {it.label}
          {it.count != null && <span className="cr-seg-count">{it.count}</span>}
          {it.dot && <span className="cr-seg-dot" aria-hidden />}
        </button>
      ))}
    </Liquid>
  );
}

// ─── Inputs ────────────────────────────────────────────────────────────────

/** The home screen's single question: a large rounded field with a round send button. */
export function PromptInput({ placeholder = "A pitch deck for a funding round...", value, defaultValue = "", onChange, onSubmit, label = "What are you making today?", id = "cr-prompt", className, sendLabel = "Start", disabled, leading, below, busy, inputRef, onKeyDown, onPaste, inputProps }: {
  placeholder?: string; value?: string; defaultValue?: string; onChange?: (v: string) => void; onSubmit?: (v: string) => void;
  label?: string; id?: string; className?: string; sendLabel?: string; disabled?: boolean;
  /** app: something before the field (an attach IconButton) */
  leading?: ReactNode;
  /** app: a second line under the field, inside the same shape */
  below?: ReactNode;
  /** app: the send button shows Busy instead of the arrow */
  busy?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onKeyDown?: InputHTMLAttributes<HTMLInputElement>["onKeyDown"];
  onPaste?: InputHTMLAttributes<HTMLInputElement>["onPaste"];
  /** app: anything else the field needs (inputMode, aria-invalid, aria-describedby, spellCheck, a class) */
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id" | "type">;
}) {
  const [own, setOwn] = useState(defaultValue);
  const val = value ?? own;
  return (
    <form className={cx("cr-prompt", below != null && "cr-prompt-two", className)} onSubmit={(e) => { e.preventDefault(); if (val.trim()) onSubmit?.(val); }}>
      <div className="cr-prompt-row">
        {leading}
        <label htmlFor={id} className="cr-visually-hidden">{label}</label>
        <input {...inputProps} ref={inputRef} id={id} type="text" value={val} placeholder={placeholder} disabled={disabled} autoComplete="off" onKeyDown={onKeyDown} onPaste={onPaste}
          onChange={(e) => { if (value == null) setOwn(e.target.value); onChange?.(e.target.value); }} />
        <button type="submit" className={cx("cr-prompt-send", val.trim() && "is-ready")} aria-label={sendLabel} disabled={disabled || busy}>
          {busy ? <Busy label={sendLabel} /> : <Icon name="arrow-right" size={18} />}
        </button>
      </div>
      {below != null && <div className="cr-prompt-below">{below}</div>}
    </form>
  );
}

/** Sunken field with an ink border on white; label above in small muted. */
export function TextField({ label, hint, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={cx("cr-field", className)}>
      <span className="cr-field-label">{label}</span>
      <input type="text" className="cr-input" {...rest} />
      {hint ? <span className="cr-field-hint">{hint}</span> : null}
    </label>
  );
}

/** The TextField's multi-line twin: the same sunken white field with an ink border. With `toolbar` it becomes the
 * composer version: the textarea, anything passed as `children` (attachments waiting to go) and a toolbar sit
 * inside one field, and focus rings the whole field. */
export function TextArea({ toolbar, children, className, ref, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  toolbar?: ReactNode; children?: ReactNode; ref?: Ref<HTMLTextAreaElement>;
}) {
  if (!toolbar && !children) return <textarea ref={ref} className={cx("cr-input", "cr-textarea", className)} {...rest} />;
  return (
    <div className={cx("cr-textbox", className)}>
      <textarea ref={ref} className="cr-textbox-input" {...rest} />
      {children}
      {toolbar ? <div className="cr-textbox-bar">{toolbar}</div> : null}
    </div>
  );
}

/** Square, sunken box with an ink border and an ink tick. */
export function Checkbox({ label, checked, defaultChecked, onChange, id, disabled, className }: {
  label: ReactNode; checked?: boolean; defaultChecked?: boolean; onChange?: (checked: boolean) => void; id?: string; disabled?: boolean; className?: string;
}) {
  const [own, setOwn] = useState(!!defaultChecked);
  const on = checked ?? own;
  return (
    <label className={cx("cr-check", className)}>
      <input type="checkbox" checked={on} id={id} disabled={disabled}
        onChange={(e) => { if (checked == null) setOwn(e.target.checked); onChange?.(e.target.checked); }} />
      <span className="cr-check-box" aria-hidden>
        <Icon name="check" size={10} weight="bold" />
      </span>
      {label}
    </label>
  );
}

/** Pill tags. `paper` default, `butter` suggested, `ember` an active rule, `moss` a library, `chrome` on dark chrome. */
export function Chip({ tone = "paper", children, className, onClick, title, pressed, disabled, onRemove, removeLabel = "Remove" }: {
  tone?: "paper" | "butter" | "ember" | "moss" | "chrome"; children?: ReactNode; className?: string; onClick?: () => void; title?: string;
  /** app: a toggle chip that waits (while the last press is saved) */
  disabled?: boolean;
  /** app: a toggle chip; pressed inverts it (text colour on the ground), never ember */
  pressed?: boolean;
  /** app: a removable chip (a filter): a small x at the end */
  onRemove?: () => void; removeLabel?: string;
}) {
  const cls = cx("cr-chip", `cr-chip-${tone}`, pressed && "is-pressed", onRemove && "cr-chip-removable", className);
  if (onClick) return <button type="button" title={title} aria-pressed={pressed} disabled={disabled} className={cx(cls, "cr-chip-button")} onClick={onClick}>{children}</button>;
  return (
    <span title={title} className={cls}>
      {children}
      {onRemove && <button type="button" className="cr-chip-x" aria-label={removeLabel} onClick={onRemove}><Icon name="close" size={12} /></button>}
    </span>
  );
}

// ─── Surfaces ──────────────────────────────────────────────────────────────

/** Flat cards. `raised` follows the theme; solid tones for color references and feature blocks. One ember per view. */
export function Card({ tone = "raised", eyebrow, title, children, as: Tag = "div", className, style }: {
  tone?: "raised" | "paper" | "moss" | "ink" | "ember" | "butter"; eyebrow?: ReactNode; title?: ReactNode; children?: ReactNode;
  as?: "div" | "section" | "article" | "li"; className?: string; style?: CSSProperties;
}) {
  return (
    <Tag className={cx("cr-card", `cr-card-${tone}`, className)} style={style}>
      {eyebrow ? <div className="cr-card-eyebrow">{eyebrow}</div> : null}
      {title ? <div className="cr-card-title">{title}</div> : null}
      {children}
    </Tag>
  );
}

/** A short tip with a tail. Butter ground, ink border. One on screen at a time. */
export function Balloon({ title, children, actions, tail = "left", width, className }: {
  title: ReactNode; children?: ReactNode; actions?: ReactNode; tail?: "left" | "right"; width?: number; className?: string;
}) {
  return (
    <div className={cx("cr-balloon", `cr-balloon-tail-${tail}`, className)} style={width ? { width } : undefined} role="status">
      <div className="cr-balloon-body">
        <div className="cr-balloon-title">{title}</div>
        <div className="cr-balloon-text">{children}</div>
        {actions ? <div className="cr-actions">{actions}</div> : null}
      </div>
      <span className="cr-balloon-tail" aria-hidden />
    </div>
  );
}

/** A small window for longer tips: moss title bar, beveled close. Once per session at most. */
export function TipWindow({ title, heading, children, footer, width, onClose, className }: {
  title: string; heading?: ReactNode; children?: ReactNode; footer?: ReactNode; width?: number; onClose?: (() => void) | false; className?: string;
}) {
  return (
    <section className={cx("cr-window", className)} style={width ? { width } : undefined} aria-label={title}>
      <header className="cr-window-bar">
        <span className="cr-window-title">{title}</span>
        {onClose !== false ? (
          <button type="button" className="cr-window-close" aria-label="Close" onClick={onClose || undefined}>
            <Icon name="close" size={10} weight="bold" />
          </button>
        ) : null}
      </header>
      <div className="cr-window-body">
        {heading ? <h2 className="cr-window-heading t-title-m">{heading}</h2> : null}
        <div className="cr-window-text">{children}</div>
        {footer ? <div className="cr-window-footer">{footer}</div> : null}
      </div>
    </section>
  );
}

/** app: one section of Settings, Activity or Admin, flat on the page (no frame, no moss bar: Eric, 07-10, "too much"):
 * a hairline over it, the section's name (an h2 at title-m) with an optional figure at its end (plain tabular text,
 * never a chip), the description under the name, the body, and a foot with a one-line note on the left and the
 * actions on the right. Full width of the column. */
export function SettingsWindow({ title, figure, description, children, note, actions, id, className }: {
  title: ReactNode; figure?: ReactNode; description?: ReactNode; children?: ReactNode;
  /** foot, left: a one-line note, a success or an error that belongs to the whole section */
  note?: ReactNode;
  /** foot, right: the section's buttons */
  actions?: ReactNode;
  id?: string; className?: string;
}) {
  const auto = useId();
  const titleId = `${id ?? auto}-title`;
  return (
    <section id={id} className={cx("cr-swin", className)} aria-labelledby={titleId}>
      <header className="cr-swin-head">
        <div className="cr-swin-titles">
          <h2 id={titleId} className="cr-swin-title t-title-m">{title}</h2>
          {description ? <p className="cr-swin-desc t-small">{description}</p> : null}
        </div>
        {figure != null && figure !== false ? <span className="cr-swin-figure t-ui">{figure}</span> : null}
      </header>
      {children ? <div className="cr-swin-body">{children}</div> : null}
      {note || actions ? (
        <footer className="cr-swin-footer">
          <div className="cr-swin-note t-small">{note}</div>
          {actions ? <div className="cr-swin-actions">{actions}</div> : null}
        </footer>
      ) : null}
    </section>
  );
}

/** app: a setting on one line. The label (and a hint under it) in a 200px column, the control and its inline action
 * in the other, all 44 high and centred; an error goes under the control. Stacks under 560px. Pass `htmlFor` when
 * the control is a field (the label becomes a <label>); a radio group or a picture names itself. */
export function FieldRow({ label, hint, htmlFor, children, action, error, className }: {
  label: ReactNode; hint?: ReactNode; htmlFor?: string; children: ReactNode; action?: ReactNode; error?: ReactNode; className?: string;
}) {
  return (
    <div className={cx("cr-fieldrow", className)}>
      <div className="cr-fieldrow-label">
        {htmlFor ? <label htmlFor={htmlFor} className="t-ui">{label}</label> : <span className="t-ui">{label}</span>}
        {hint ? <span className="cr-fieldrow-hint t-small">{hint}</span> : null}
      </div>
      <div className="cr-fieldrow-control">
        <div className="cr-fieldrow-line">{children}{action}</div>
        {error ? <span className="cr-field-hint is-error" role="alert">{error}</span> : null}
      </div>
    </div>
  );
}

// ─── Status and people ─────────────────────────────────────────────────────

/** A board's state: moss ring up to date, ember dot something new, muted ring idle. With `progress` (0 to 1) the
 *  ring is a gauge: the moss arc alone is how far the board has come (its areas decided), with nothing drawn for
 *  the rest, so 7 of 8 reads as a ring almost closed. Nothing done keeps the muted ring; the ember dot ignores
 *  it: something new comes first. */
export function StatusRing({ tone = "synced", progress, label, className }: { tone?: "synced" | "new" | "idle"; progress?: number; label?: string; className?: string }) {
  // Only a partial arc is drawn as such: the closed ring and the empty one are the CSS borders, the cleanest 12px circle
  const gauge = !!progress && progress > 0 && progress < 1 && tone !== "new";
  // An SVG stroke, not a conic gradient: the arc's ends and its edges stay smooth at 12px
  const C = 2 * Math.PI * 5;
  return (
    <span className={cx("cr-ring", `cr-ring-${tone}`, gauge && "cr-ring-gauge", className)} role="img"
      aria-label={label || (tone === "synced" ? "Up to date" : tone === "new" ? "Something new" : "Idle")}>
      {gauge && (
        <svg viewBox="0 0 12 12" aria-hidden>
          <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(-90 6 6)"
            strokeDasharray={`${Math.min(1, progress) * C} ${C}`} />
        </svg>
      )}
    </span>
  );
}

/** Segmented ember progress in a sunken field. Pair it with a label that says what is happening. */
export function Progress({ value, max = 100, segments = 22, label = "Progress", className }: { value: number; max?: number; segments?: number; label?: string; className?: string }) {
  const v = Math.max(0, Math.min(max, value || 0));
  const on = Math.round((segments * v) / max);
  return (
    <div className={cx("cr-progress", className)} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={v} aria-label={label}>
      {Array.from({ length: segments }, (_, i) => <span key={i} className={cx("cr-progress-cell", i < on && "is-on")} />)}
    </div>
  );
}

export type AvatarTone = "moss" | "butter" | "ember" | "chrome";
const TONES: AvatarTone[] = ["moss", "butter", "ember"];
/** The same person always gets the same tone. */
export function toneFor(name: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

/** Initials on a brand color. People only; `chrome` square for a workspace or a source. */
export function Avatar({ initials, name, tone = "moss", size = 28, square, src, className }: {
  initials: string; name?: string; tone?: AvatarTone; size?: number; square?: boolean; src?: string | null; className?: string;
}) {
  // app: a picture that fails to load falls back to the initials
  const [failed, setFailed] = useState<string | null>(null);
  const pic = src && failed !== src ? src : null;
  return (
    <span className={cx("cr-avatar", `cr-avatar-${tone}`, square && "is-square", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), overflow: "hidden" }} role="img" aria-label={name || initials}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {pic ? <img src={pic} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(pic)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </span>
  );
}

export function AvatarStack({ people, size = 24, className }: { people: Parameters<typeof Avatar>[0][]; size?: number; className?: string }) {
  return <span className={cx("cr-avatars", className)}>{people.map((p, i) => <Avatar key={i} size={size} {...p} />)}</span>;
}

/** A short comment under a reference: small avatar, author in bold, two lines at most. */
export function Comment({ author, initials, tone, children, className }: { author: string; initials: string; tone?: AvatarTone; children?: ReactNode; className?: string }) {
  return (
    <div className={cx("cr-comment", className)}>
      <Avatar initials={initials} name={author} tone={tone || toneFor(author)} size={20} />
      <p className="cr-comment-text"><b>{author}</b> {children}</p>
    </div>
  );
}

// ─── Board ─────────────────────────────────────────────────────────────────

/** One reference in a BoardCard's masonry: what it shows and its height over its width, as on the board */
export interface BoardTile { node: ReactNode; ratio: number }

/** A board on home: its first references laid out as the board itself lays them (`columns`: the masonry, each
 *  tile keeping its shape, cropped at the mosaic's bottom), or a flat mosaic of up to 8 `tiles`. Then the name,
 *  the count and a status ring. */
export function BoardCard({ name, count, countLabel, tiles = [], columns, status = "synced", progress, statusLabel, href, onClick, className }: {
  name: string; count: number; countLabel?: string; tiles?: ReactNode[]; columns?: BoardTile[][]; status?: "synced" | "new" | "idle"; progress?: number; statusLabel?: string; href?: string; onClick?: () => void; className?: string;
}) {
  const body = (
    <>
      <span className={cx("cr-boardcard-mosaic", columns && "cr-boardcard-mosaic-masonry")} aria-hidden>
        {columns
          ? columns.map((col, c) => (
            <span key={c} className="cr-boardcard-col">
              {col.map((t, i) => <span key={i} className="cr-boardcard-tile" style={{ aspectRatio: `1 / ${t.ratio}` }}>{t.node}</span>)}
            </span>
          ))
          : tiles.slice(0, 8).map((t, i) => <span key={i} className="cr-boardcard-tile" style={typeof t === "string" ? { background: t } : undefined}>{typeof t === "string" ? null : t}</span>)}
      </span>
      <span className="cr-boardcard-meta">
        <span>
          <span className="cr-boardcard-name">{name}</span>
          <span className="cr-boardcard-count">{countLabel ?? `${count} references`}</span>
        </span>
        <StatusRing tone={status} progress={progress} label={statusLabel} />
      </span>
    </>
  );
  if (href) return <a href={href} className={cx("cr-boardcard", className)} onClick={onClick}>{body}</a>;
  return <button type="button" className={cx("cr-boardcard", className)} onClick={onClick}>{body}</button>;
}

/** One saved reference: image, video or link, as the person saved it. Keeps its own height. */
export function ReferenceTile({ kind = "image", tone = "#2A2A2A", height = 200, played = 35, caption, children, className }: {
  kind?: "image" | "video" | "link"; tone?: string; height?: number; played?: number; caption?: string; children?: ReactNode; className?: string;
}) {
  return (
    <figure className={cx("cr-ref", className)} style={{ height }}>
      <div className="cr-ref-media" style={{ background: tone }}>
        {children}
        {kind === "video" && <span className="cr-ref-play" aria-hidden><Icon name="play" size={18} /></span>}
        {kind === "video" && <span className="cr-ref-scrub" aria-hidden><span style={{ width: `${played}%` }} /></span>}
      </div>
      {caption ? <figcaption className="cr-visually-hidden">{caption}</figcaption> : null}
    </figure>
  );
}

/** A text reference: kind label, a display title and the body fading at the bottom. */
export function NoteCard({ title, kindLabel = "Text", children, height, className }: { title: ReactNode; kindLabel?: string; children?: ReactNode; height?: number; className?: string }) {
  return (
    <article className={cx("cr-note", className)} style={height ? { height } : undefined}>
      <div className="cr-note-kind"><Icon name="text" size={14} />{kindLabel}</div>
      <h3 className="cr-note-title">{title}</h3>
      <div className="cr-note-body">{children}</div>
    </article>
  );
}

/** What an empty place says: a short title, one or two sentences, and suggestions that fill the next step. */
export function EmptyState({ title, children, suggestions, onSuggest, art, className }: {
  title: ReactNode; children?: ReactNode; suggestions?: string[]; onSuggest?: (s: string) => void; art?: ReactNode; className?: string;
}) {
  return (
    <div className={cx("cr-empty", className)}>
      {art ?? null}
      <div className="cr-empty-title">{title}</div>
      {children ? <div className="cr-empty-text">{children}</div> : null}
      {suggestions?.length ? (
        <div className="cr-empty-suggestions">
          {suggestions.map((s) => <button key={s} type="button" className="cr-chip cr-chip-chrome" onClick={() => onSuggest?.(s)}>{s}</button>)}
        </div>
      ) : null}
    </div>
  );
}

// ─── Chrome ────────────────────────────────────────────────────────────────

/** The zoom pill, bottom left: minus, the percentage in tabular figures, plus. */
export function ZoomControl({ value, onIn, onOut, onReset, inDisabled, outDisabled, labels = { group: "Zoom", in: "Zoom in", out: "Zoom out", reset: "Back to 100%" }, valueLabel, className }: {
  value: number; onIn?: () => void; onOut?: () => void; onReset?: () => void; inDisabled?: boolean; outDisabled?: boolean;
  labels?: { group: string; in: string; out: string; reset: string };
  /** app: the value's accessible name when the percentage alone says too little (the board's columns) */
  valueLabel?: string; className?: string;
}) {
  return (
    <div className={cx("cr-zoom", className)} role="group" aria-label={labels.group}>
      <IconButton icon="minus" label={labels.out} variant="quiet" size="s" onClick={onOut} disabled={outDisabled} />
      <button type="button" className="cr-zoom-value" aria-live="polite" aria-label={valueLabel} data-tip={labels.reset} onClick={onReset}>{value}%</button>
      <IconButton icon="plus" label={labels.in} variant="quiet" size="s" onClick={onIn} disabled={inDisabled} />
    </div>
  );
}

/** A chrome pill that holds a segmented control and actions, separated by a hairline (the view switcher). */
export function PillBar({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cx("cr-pillbar", className)}>{children}</div>;
}
export function PillBarSep() {
  return <span className="cr-pillbar-sep" aria-hidden />;
}

// ─── The 2000 nod: small pieces copied from the references above ──────────

/** Tooltips: a small butter Balloon for anything with `data-tip="…"` (IconButton sets it from its label).
 *  One layer for the whole page, rendered once near the root: it shows after 500 ms of hover or at once on
 *  keyboard focus, above the element (below when there is no room), and hides on leave, blur, scroll or Escape.
 *  The text is not read twice: the element keeps its own aria-label. */
export function TipLayer() {
  const [tip, setTip] = useState<{ text: string; cx: number; y: number; below: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warm = useRef(false); // once one tooltip showed, the next ones open at once (like a toolbar)
  useEffect(() => {
    const target = (e: Event) => (e.target instanceof Element ? e.target.closest<HTMLElement>("[data-tip]") : null);
    const place = (el: HTMLElement) => {
      const text = el.dataset.tip?.trim();
      if (!text) return;
      const r = el.getBoundingClientRect();
      const below = r.top < 44;
      setTip({ text, cx: r.left + r.width / 2, y: below ? r.bottom + 8 : r.top - 8, below });
      warm.current = true;
    };
    const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
    const hide = () => { clear(); setTip(null); setTimeout(() => { if (!timer.current) warm.current = false; }, 400); };
    const over = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = target(e); if (!el) return;
      clear(); timer.current = setTimeout(() => place(el), warm.current ? 0 : 500);
    };
    const out = (e: PointerEvent) => { const el = target(e); if (el && !el.contains(e.relatedTarget as Node)) hide(); };
    const focus = (e: FocusEvent) => { const el = target(e); if (el && el.matches(":focus-visible")) place(el); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("focusin", focus);
    document.addEventListener("focusout", hide);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", hide, true);
    return () => {
      clear();
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("focusin", focus);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);
  // Once drawn, the balloon is measured: centred on the element, kept 8px inside the window, and the tail moved
  // to point at the element wherever the balloon ended up
  useLayoutEffect(() => {
    const el = box.current;
    if (!tip || !el) return;
    const w = el.offsetWidth;
    const left = Math.min(Math.max(tip.cx - w / 2, 8), window.innerWidth - 8 - w);
    el.style.left = `${left}px`;
    const tail = el.querySelector<HTMLElement>(".cr-tip-arrow");
    if (tail) tail.style.left = `${Math.min(Math.max(tip.cx - left, 10), w - 10)}px`;
    el.style.visibility = "visible";
  }, [tip]);
  if (!tip) return null;
  return (
    <div ref={box} className={cx("cr-tip", "cr-tip-float", tip.below && "is-below")} role="tooltip" aria-hidden
      style={{ left: tip.cx, top: tip.y, visibility: "hidden" }}>
      {tip.text}
      <span className="cr-tip-arrow" data-side={tip.below ? "bottom" : "top"} />
    </div>
  );
}

/** The engraved line (copies the bevel's shade and light): between groups in menus, windows and lists. */
export function Separator({ vertical, className }: { vertical?: boolean; className?: string }) {
  return <span role="separator" aria-orientation={vertical ? "vertical" : "horizontal"} className={cx("cr-sep", vertical && "cr-sep-v", className)} />;
}

/** A row in a Menu (`.cr-menu` on a popover): 32 high, radius 6, the paper window's ink. */
export function MenuItem({ icon, children, checked, danger, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: IconName | ReactNode; checked?: boolean; danger?: boolean;
}) {
  return (
    <button type="button" role="menuitem" {...rest} className={cx("cr-menu-item", checked && "is-checked", danger && "is-danger", className)}>
      {typeof icon === "string" ? <Icon name={icon as IconName} size={16} /> : icon}
      <span className="cr-menu-label">{children}</span>
      {checked && <Icon name="check" size={16} className="cr-menu-check" />}
    </button>
  );
}
/** A menu's small heading. `bar` (a moss title bar) is kept for the library only: menus in the app do not use it (Eric, 07-10) */
export function MenuLabel({ children, bar }: { children: ReactNode; bar?: boolean }) {
  return <div className={bar ? "cr-menu-bar" : "cr-menu-heading"}>{children}</div>;
}

/** On/off (copies the Checkbox well and the Button bevel): a sunken track, a beveled paper knob, ember when on. */
export function Switch({ checked, onChange, label, disabled, className }: { checked: boolean; onChange?: (on: boolean) => void; label: string; disabled?: boolean; className?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className={cx("cr-switch", checked && "is-on", className)} onClick={() => onChange?.(!checked)}>
      <span aria-hidden />
    </button>
  );
}

/** A strip of sunken cells (copies the field): saved state, counts, who you are signed in as. */
export function StatusBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("cr-statusbar", className)} role="status">{children}</div>;
}
export function StatusCell({ children, grow, className }: { children: ReactNode; grow?: boolean; className?: string }) {
  return <span className={cx("cr-statusbar-cell", grow && "is-grow", className)}>{children}</span>;
}

/** Waiting (copies Progress): four sunken cells with one ember cell walking. Replaces the spinner. */
export function Busy({ label = "Working", className }: { label?: string; className?: string }) {
  return (
    <span className={cx("cr-busy", className)} role="status" aria-label={label}>
      <i /><i /><i /><i />
    </span>
  );
}

/** A beveled keycap for shortcuts: ⌘K, /, Esc. */
export function Key({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cx("cr-key", className)}>{children}</kbd>;
}
