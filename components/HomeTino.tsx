"use client";
// Tino on the home: the plush peeks out of the bottom-right corner and says, in a balloon, the few things worth doing
// next (the first step still to do, the inbox piling up, a board that moved while you were away, a board still
// empty, a milestone), in the voice of the copy sheet (docs/design-system/componentes.md, Tino en el Inicio). One unprompted balloon per visit:
// "Later" and the cross put it away until the next one, and a click on Tino brings it back with the rest. What the
// person starts (typing a project's name) he answers every time. Muted, he sinks and sleeps: no balloons, and a
// click wakes him. The switch in the corner pill (TinoSwitch) mutes him too, and both are remembered.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Tino from "./Tino";
import type { TinoApi, TinoState } from "./tino/engine";
import { Balloon, Button, Icon } from "@/components/criterio";
import { useT } from "./I18nProvider";
import "./HomeTino.css";

/** One thing Tino can bring up. `title` is a pool of lines: one is picked at random, never the one said last time.
 *  `who` names where it comes from over the title (the first steps and how far along they are); without it, Tino.
 *  Without `act` there is no button (a milestone is only said). `once`: said once ever (a milestone per board and
 *  level). `away`: said only on the first visit after some days away */
export type TinoNudge = {
  key: string; who?: string; title: string | readonly string[]; text: ReactNode; gesture: TinoState;
  act?: string; go?: () => void; once?: boolean; away?: boolean;
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
const readOn = () => { try { return localStorage.getItem(ON_KEY) !== "off"; } catch { return true; } };
function setOn(on: boolean) {
  try { if (on) localStorage.removeItem(ON_KEY); else localStorage.setItem(ON_KEY, "off"); } catch { /* no storage: it holds for this page */ }
  for (const f of subs) f();
}
function useTinoOn() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, readOn, () => true);
}

const read = (store: () => Storage, key: string) => { try { return store().getItem(key); } catch { return null; } };
const write = (store: () => Storage, key: string, value: string) => { try { store().setItem(key, value); } catch { /* no storage */ } };
const session = () => sessionStorage, local = () => localStorage;

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
 *  kind is the key before its first ":"). Until the pick, the pool's first line */
export function useLine(key: string | undefined, pool: string | readonly string[] | undefined): string | undefined {
  const list = pool == null ? [] : typeof pool === "string" ? [pool] : pool;
  const [picked, setPicked] = useState<{ key: string; at: number } | null>(null);
  const size = list.length;
  useLayoutEffect(() => {
    if (key == null || !size || picked?.key === key) return;
    const kind = LINE_KEY + key.split(":")[0];
    const last = Number(read(local, kind));
    let at = Math.floor(Math.random() * size);
    if (size > 1 && at === last) at = (at + 1) % size;
    write(local, kind, String(at));
    setPicked({ key, at });
  }, [key, size, picked]);
  return size ? list[picked && picked.key === key ? picked.at % size : 0] : undefined;
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

/** What the visit already knows, read once in the browser: put away, closed, seen, and whether it comes after days away */
type Visit = { later: string[]; closed: boolean; seen: string[]; away: boolean };

export default function HomeTino({ nudges, say }: {
  nudges: TinoNudge[];
  /** What the person started (typing on the home): said over any nudge, every time */
  say?: TinoNudge;
}) {
  const { t } = useT();
  const on = useTinoOn();
  const dark = useDark();
  const tino = useRef<TinoApi>(null);
  // Nothing is said until the visit is read, so a balloon closed a moment ago never flashes back in
  const [visit, setVisit] = useState<Visit | null>(null);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const last = Number(read(local, VISIT_KEY)) || 0;
    write(local, VISIT_KEY, String(Date.now()));
    setVisit({
      later: JSON.parse(read(session, LATER_KEY) ?? "[]") as string[],
      closed: read(session, CLOSED_KEY) === "1",
      seen: JSON.parse(read(local, SEEN_KEY) ?? "[]") as string[],
      away: last > 0 && Date.now() - last > AWAY_MS,
    });
  }, []);

  const left = visit ? nudges.filter((n) => !visit.later.includes(n.key) && !(n.once && visit.seen.includes(n.key)) && !(n.away && !visit.away)).slice(0, MAX_NUDGES) : [];
  const shown = on ? say ?? (visit && !visit.closed && left.length ? left[at % left.length] : undefined) : undefined;

  const title = useLine(shown?.key, shown?.title);
  // A once-only nudge is spent the moment it is said
  const spent = shown?.once ? shown.key : undefined;
  useEffect(() => {
    if (!spent) return;
    const seen = JSON.parse(read(local, SEEN_KEY) ?? "[]") as string[];
    if (!seen.includes(spent)) write(local, SEEN_KEY, JSON.stringify([...seen, spent]));
  }, [spent]);

  const close = () => {
    setVisit((v) => v && { ...v, closed: true });
    write(session, CLOSED_KEY, "1");
  };
  const putOff = (key: string) => {
    const later = [...(visit?.later ?? []), key];
    setVisit((v) => v && { ...v, later, closed: true });
    write(session, LATER_KEY, JSON.stringify(later));
    write(session, CLOSED_KEY, "1");
    tino.current?.set("descarta");
  };
  const wake = () => {
    tino.current?.jump(1);
    if (!on) { setOn(true); return; }
    setVisit((v) => v && { ...v, closed: false });
    write(session, CLOSED_KEY, "0");
  };

  const state: TinoState = !on ? "dormida" : shown ? shown.gesture : left.length ? "reposo" : "dormida";
  const paged = shown && !say && left.length > 1;
  return (
    <div className={`home-tino${on ? "" : " is-muted"}`}>
      {shown && (
        <Balloon key={shown.key} className="home-tino__say" tail="right"
          title={<><span className="home-tino__who">{shown.who ?? "Tino"}</span><span>{title}</span></>}
          actions={shown === say ? null : <>
            {shown.act && <Button size="s" onClick={() => { tino.current?.set("aprueba"); shown.go?.(); }}>{shown.act}</Button>}
            <Button size="s" variant="quiet" onClick={() => putOff(shown.key)}>{t.tino.later}</Button>
            {paged && (
              <button type="button" className="home-tino__next" aria-label={t.tino.next} onClick={() => setAt((i) => (i % left.length) + 1)}>
                {(at % left.length) + 1} / {left.length}<Icon name="chevron-right" size={14} />
              </button>
            )}
          </>}>
          {shown.text}
          {shown !== say && (
            <button type="button" className="cr-window-close home-tino__close" aria-label={t.tino.close} onClick={close}>
              <Icon name="close" size={10} weight="bold" />
            </button>
          )}
        </Balloon>
      )}
      <button type="button" className="home-tino__body" aria-label={on ? t.tino.talk : t.tino.wake} onClick={wake}>
        <Tino ref={tino} state={state} dark={dark} look={[110, 0]} />
      </button>
    </div>
  );
}
