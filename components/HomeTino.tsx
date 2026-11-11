"use client";
// Tino on the home: the plush peeks out of the bottom-right corner and says, in a balloon, the few things worth doing
// next (the first step still to do, the inbox piling up, a board that moved while you were away, a board still
// empty, a milestone), in the voice of the copy sheet (docs/design-system/componentes.md, Tino en el Inicio). One unprompted balloon per visit:
// "Later" and the cross put it away until the next one, and a click on Tino brings it back with the rest. What the
// person starts (typing a project's name) he answers every time. He starts muted: sunk and asleep, no balloons, and
// a click wakes him. The switch in the corner pill (TinoSwitch) wakes and mutes him too, and both are remembered.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode, type Ref, type RefObject } from "react";
import Tino from "./Tino";
import Typed, { typedMs } from "./Typed";
import type { TinoApi } from "./tino/engine";
import { moodProps, type TinoMood } from "./tino/moods";
import { Balloon, Button, Icon } from "@/components/criterio";
import { useT } from "./I18nProvider";
import { useTinoBreak } from "./tino-break";
import "./HomeTino.css";

/** One thing Tino can bring up. `title` is a pool of lines: one is picked at random, never the one said last time.
 *  `who` names where it comes from over the title (the first steps and how far along they are); without it, Tino.
 *  Without `act` there is no button (a milestone is only said). `once`: said once ever (a milestone per board and
 *  level). `happened` (ISO): something that happened while the person was away, said only on the first visit after
 *  some days away and only if it happened after the last one. Every nudge
 *  has a second button that settles it for good, so he never brings that one up again on this machine and goes on to
 *  the next ("I know"; `keep` names it where the nudge is about one reference: "It stays") */
export type TinoNudge = {
  key: string; who?: string; title: string | readonly string[]; text: ReactNode; mood: TinoMood;
  act?: string; go?: () => void; once?: boolean; keep?: string; happened?: string;
  /** The picture of the reference it talks about: drawn by the words, which then say "this one" instead of its title */
  thumb?: string;
};

const ON_KEY = "criterio:tino";
const LATER_KEY = "criterio:tino-later";
const CLOSED_KEY = "criterio:tino-closed";
const SEEN_KEY = "criterio:tino-seen";
const VISIT_KEY = "criterio:tino-visit";
const LINE_KEY = "criterio:tino-line:";
/** A visit this long after the last one is coming back after a while */
const AWAY_MS = 5 * 24 * 3600 * 1000;
/** More than this is a list, not a word in passing */
const MAX_NUDGES = 4;

const subs = new Set<() => void>();
// Asleep unless the person woke him (Eric, 11-11: "por defecto siempre Tino dormido"): only "on" keeps him awake.
// Without storage, what was chosen holds for this page
let held = false;
const readOn = () => { try { return localStorage.getItem(ON_KEY) === "on"; } catch { return held; } };
function setOn(on: boolean) {
  held = on;
  try { if (on) localStorage.setItem(ON_KEY, "on"); else localStorage.removeItem(ON_KEY); } catch { /* no storage: it holds for this page */ }
  for (const f of subs) f();
}
function useTinoOn() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, readOn, () => false);
}

const read = (store: () => Storage, key: string) => { try { return store().getItem(key); } catch { return null; } };
const write = (store: () => Storage, key: string, value: string) => { try { store().setItem(key, value); } catch { /* no storage */ } };
const session = () => sessionStorage, local = () => localStorage;
/** A nudge settled for good (said once, or answered "I know" or "It stays"): the nudge lists skip what it is about, so he asks
 *  about another one instead */
export const settled = (key: string) => (JSON.parse(read(local, SEEN_KEY) ?? "[]") as string[]).includes(key);

/** The visit before this page load (ms; 0 the first time), read once and stamped with now: a second mount (React's
 *  check in development, the home opened again) must not read the stamp the first one wrote */
let lastVisit: number | undefined;
function visitBefore(): number {
  if (lastVisit === undefined) {
    lastVisit = Number(read(local, VISIT_KEY)) || 0;
    write(local, VISIT_KEY, String(Date.now()));
  }
  return lastVisit;
}

/** The theme on <html data-theme>, followed as it changes: Tino's light and fur follow it */
export function useDark() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.dataset.theme !== "light");
    sync();
    const watch = new MutationObserver(sync);
    watch.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, []);
  return dark;
}

/** A line from a pool, picked in the browser at random and never the one this kind of nudge said last time (the
 *  kind is the key before its first ":"). Once picked, a key keeps its line for the page. Until the pick, the first */
export function useLine(key: string | undefined, pool: string | readonly string[] | undefined): string | undefined {
  const list = pool == null ? [] : typeof pool === "string" ? [pool] : pool;
  const [picked, setPicked] = useState<Record<string, number>>({});
  const size = list.length;
  useLayoutEffect(() => {
    if (key == null || !size || key in picked) return;
    const kind = LINE_KEY + key.split(":")[0];
    const last = Number(read(local, kind));
    let at = Math.floor(Math.random() * size);
    if (size > 1 && at === last) at = (at + 1) % size;
    write(local, kind, String(at));
    setPicked((p) => ({ ...p, [key]: at }));
  }, [key, size, picked]);
  return size ? list[key != null && key in picked ? picked[key] % size : 0] : undefined;
}

/** The switch in the bottom-left pill, after the music: Tino awake on the home, or muted */
export function TinoSwitch() {
  const { t } = useT();
  const on = useTinoOn();
  return (
    <button type="button" className={`zoom-pill__tino${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => setOn(!on)}>
      {on ? t.tino.on : t.tino.off}
    </button>
  );
}

/** What the visit already knows, read once in the browser: put away, closed, seen, and the visit before it when it
 *  was days ago (ms; 0 otherwise) */
type Visit = { later: string[]; closed: boolean; seen: string[]; awaySince: number };

export default function HomeTino({ nudges, say, speak, face, quiet = false, scope = "", className = "", tinoRef, idle, max = MAX_NUDGES }: {
  nudges: TinoNudge[];
  /** How many he goes through in one visit (the Inbox has more to bring up) */
  max?: number;
  /** What the person started (typing on the home): said over any nudge, every time */
  say?: TinoNudge;
  /** An answer to what the person is doing on the page (a search, an edit): its own balloon, over any nudge and
   *  even with Tino muted, since it was asked for */
  speak?: CornerSay | null;
  /** His face while nothing else decides it (following the words, searching); `speak`'s face goes here too */
  face?: TinoMood;
  /** Nothing unprompted now (another of his windows is open on the page) */
  quiet?: boolean;
  /** Where "Later" and the cross hold: the home's, or a board's own, so closing one does not silence the other */
  scope?: string;
  className?: string;
  tinoRef?: RefObject<TinoApi | null>;
  /** What he says when clicked and there is nothing pending: a click on him always gets an answer */
  idle?: TinoNudge;
}) {
  const { t } = useT();
  const on = useTinoOn();
  const own = useRef<TinoApi>(null);
  const tino = tinoRef ?? own;
  const laterKey = LATER_KEY + scope, closedKey = CLOSED_KEY + scope;
  // Nothing is said until the visit is read, so a balloon closed a moment ago never flashes back in
  const [visit, setVisit] = useState<Visit | null>(null);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const last = visitBefore();
    setVisit({
      later: JSON.parse(read(session, laterKey) ?? "[]") as string[],
      closed: read(session, closedKey) === "1",
      seen: JSON.parse(read(local, SEEN_KEY) ?? "[]") as string[],
      awaySince: last > 0 && Date.now() - last > AWAY_MS ? last : 0,
    });
  }, [laterKey, closedKey]);

  const left = visit ? nudges.filter((n) => !visit.later.includes(n.key) && !visit.seen.includes(n.key) && !visit.seen.includes(scope + "|" + n.key) && !(n.happened && !(visit.awaySince && Date.parse(n.happened) > visit.awaySince))).slice(0, max) : [];
  // Asked (a click on him), he answers even while the page would keep him quiet, and with nothing pending says `idle`
  const [asked, setAsked] = useState(false);
  // He never opens his balloon on his own: in every view he starts silent, watching when he has something to say,
  // and says it when clicked (Eric, 06-11: "de primeras en la primera view Tino tiene que estar sin hablar"). What
  // the person started (`say`), answers (`speak`) and the break after a long while still come by themselves
  const pending = visit && asked;
  // After a good while of work, now and then a break (music, the theme, Resources, a stretch): over what was put
  // away, never over what the person is doing or another of his windows (components/tino-break.ts)
  const pause = useTinoBreak(t);
  const breather = !quiet ? pause.nudge ?? undefined : undefined;
  const shown = on && !speak ? say ?? breather ?? (pending && left.length ? left[at % left.length] : pending && asked ? idle : undefined) : undefined;

  const title = useLine(shown?.key, shown?.title);
  // A once-only nudge is spent the moment it is said
  const spent = shown?.once ? shown.key : undefined;
  useEffect(() => {
    if (!spent) return;
    const seen = JSON.parse(read(local, SEEN_KEY) ?? "[]") as string[];
    if (!seen.includes(spent)) write(local, SEEN_KEY, JSON.stringify([...seen, spent]));
  }, [spent]);

  const close = () => {
    if (shown === breather) { pause.done(); return; }
    setVisit((v) => v && { ...v, closed: true });
    write(session, closedKey, "1");
    setAsked(false);
  };
  const putOff = (key: string) => {
    if (shown === breather) { pause.done(); tino.current?.set("descarta"); return; }
    const later = [...(visit?.later ?? []), key];
    setVisit((v) => v && { ...v, later, closed: true });
    write(session, laterKey, JSON.stringify(later));
    write(session, closedKey, "1");
    setAsked(false);
    tino.current?.set("descarta");
  };
  // "I know" / "It stays": settled for good, and he goes on to the next thing
  // One about a reference holds wherever it comes up; the rest only in this view ("stale" in one project is not in another)
  const settle = (nudge: TinoNudge) => {
    const key = nudge.keep ? nudge.key : scope + "|" + nudge.key;
    const seen = JSON.parse(read(local, SEEN_KEY) ?? "[]") as string[];
    if (!seen.includes(key)) write(local, SEEN_KEY, JSON.stringify([...seen, key]));
    setVisit((v) => v && { ...v, seen: [...v.seen, key] });
    tino.current?.set("aprueba");
  };
  const wake = () => {
    tino.current?.jump(1);
    if (!on) { setOn(true); return; }
    // Already speaking: a click passes to the next thing. Otherwise he opens again with what was put off as well
    if (shown && shown !== say && left.length > 1) { setAt((i) => (i % left.length) + 1); return; }
    setAsked(true);
    setVisit((v) => v && { ...v, closed: false, later: [] });
    write(session, closedKey, "0");
    write(session, laterKey, "[]");
  };

  const mood: TinoMood = speak && face ? face : !on ? "asleep" : shown ? shown.mood : face ?? (left.length ? "watching" : "asleep");
  const paged = shown && shown !== idle && shown !== breather && !say && left.length > 1;
  return (
    <TinoCorner tinoRef={tino} mood={mood} muted={!on && !speak} bodyLabel={on ? t.tino.talk : t.tino.wake} onBody={wake} className={className}
      say={speak ?? (shown && {
        key: shown.key, who: shown.who, title, text: shown.text, thumb: shown.thumb, onThumb: shown.go,
        onClose: shown === say ? undefined : close,
        actions: shown === say ? null : <>
          {shown.act && <Button size="s" onClick={() => { tino.current?.set("aprueba"); shown.go?.(); }}>{shown.act}</Button>}
          {shown !== idle && shown !== breather && <Button size="s" variant="quiet" onClick={() => settle(shown)}>{shown.keep ?? t.tino.drop}</Button>}
          <Button size="s" variant="quiet" onClick={() => putOff(shown.key)}>{t.tino.later}</Button>
          {paged && (
            <button type="button" className="tino-corner__next" aria-label={t.tino.next} onClick={() => setAt((i) => (i % left.length) + 1)}>
              {t.tino.pageOf((at % left.length) + 1, left.length)}<Icon name="chevron-right" size={12} />
            </button>
          )}
        </>,
      })} />
  );
}

/** What Tino says in his corner: who speaks (Tino by default), a line, what goes under it, the buttons, and on the
 *  title's right a small figure (Polish's "3 / 7"). Without `onClose` there is no × */
export type CornerSay = { key: string; who?: string; title?: string; text?: ReactNode; top?: ReactNode; actions?: ReactNode; onClose?: () => void; thumb?: string; onThumb?: () => void };

/** Tino in the bottom-right corner with his balloon over him, tail down to him: the home's, and Polish's, where the
 *  balloon holds Forget and Keep */
export function TinoCorner({ say, tinoRef, mood, muted = false, look, bodyLabel, onBody, className = "" }: {
  say: CornerSay | null | undefined | false;
  tinoRef: Ref<TinoApi>;
  mood: TinoMood;
  muted?: boolean;
  /** Where he looks, [yaw, pitch] in degrees, over the face's own (Polish: towards the button under the pointer) */
  look?: [number, number];
  bodyLabel: string;
  onBody: () => void;
  className?: string;
}) {
  const { t } = useT();
  const dark = useDark();
  return (
    <div className={`tino-corner${muted ? " is-muted" : ""} ${className}`}>
      {say && (
        <Balloon key={say.key} className="tino-corner__say" tail="right"
          title={<><span className="tino-corner__who">{say.who ?? "Tino"}{say.top != null && <span className="tino-corner__top">{say.top}</span>}</span>{say.title && <span><Typed text={say.title} /></span>}</>}
          actions={say.actions}>
          {say.thumb ? (
            // The reference it is about, framed like the landing's cards; a click opens it, as the button does
            <span className="tino-corner__with">
              <button type="button" className="tino-corner__thumb" style={{ backgroundImage: `url("${say.thumb}")` }} onClick={say.onThumb} tabIndex={-1} aria-hidden />
              <span>{typeof say.text === "string" ? <Typed text={say.text} delay={say.title ? typedMs(say.title) : 0} /> : say.text}</span>
            </span>
          ) : typeof say.text === "string" ? <Typed text={say.text} delay={say.title ? typedMs(say.title) : 0} /> : say.text}
          {say.onClose && (
            <button type="button" className="cr-window-close tino-corner__close" aria-label={t.tino.close} onClick={say.onClose}>
              <Icon name="close" size={10} weight="bold" />
            </button>
          )}
        </Balloon>
      )}
      <button type="button" className="tino-corner__body" aria-label={bodyLabel} onClick={onBody}>
        <Tino ref={tinoRef} dark={dark} {...moodProps(mood, look)} />
      </button>
    </div>
  );
}
