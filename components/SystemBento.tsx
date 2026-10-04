"use client";
// What the bento says before its tiles: how the project talks (its criterio, its voice, what it never says) in
// one band, and beside it the latest changes, so the system reads as a team's: who decided, who said what.
// The seven tiles under them are how it looks. Each tile also carries the faces of who is talking about it.
import { useEffect, useState, type ReactNode } from "react";
import type { SystemArea, SystemAreaState } from "@/types/system";
import type { SystemActivity } from "@/lib/area-comments";
import { loadSystemActivity } from "@/app/actions/area-comments";
import { timeAgo } from "@/lib/i18n/format";
import { Avatar } from "./CommentsPanel";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { areaIcon } from "./area-icons";
import "./SystemBento.css";

/** The project's latest changes and who talks where; read again whenever `stamp` changes (the system moved) */
export function useSystemActivity(projectId: string, stamp: string): SystemActivity | null {
  const [activity, setActivity] = useState<SystemActivity | null>(null);
  useEffect(() => {
    let alive = true;
    loadSystemActivity(projectId).then((r) => { if (alive && r.ok) setActivity(r.data); });
    return () => { alive = false; };
  }, [projectId, stamp]);
  return activity;
}

/** How the project talks: the criterio, the voice in full and what it never says. It is the Voice area: it opens it,
 *  and takes a reference dropped on it like any tile (data-area). */
export function VoiceBand({ summary, voice, onOpen, className = "", children }: {
  summary: string; voice: SystemAreaState | undefined; onOpen: () => void; className?: string;
  /** What a tile shows while a reference is carried over it */
  children?: ReactNode;
}) {
  const { t } = useT();
  const s = t.bento;
  const nevers = (voice?.never ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  return (
    <article role="button" tabIndex={0} aria-label={s.says} data-area="voice"
      className={`sysb-tile sysb-says${voice?.source === "team" ? " is-team" : ""}${className}`}
      style={{ viewTransitionName: "sysa-voice" }}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
      {children}
      <header className="sysb-tile__head">
        <span className="sysb-tile__label">{areaIcon("voice", 14)}{s.says}</span>
        <span className="sysb-tile__state">{voice?.source === "team" ? Icons.check : !voice?.decision ? t.system.open : null}</span>
      </header>
      <div className="sysb-says__cols">
        {summary && (
          <div className="sysb-says__col">
            <span className="sysb-says__k">{t.system.criterio}</span>
            <p className="sysb-says__lead">{summary}</p>
          </div>
        )}
        <div className="sysb-says__col">
          <span className="sysb-says__k">{s.voice}</span>
          <p className={voice?.decision ? "" : "is-quiet"}>{voice?.decision || s.voiceEmpty}</p>
        </div>
        <div className="sysb-says__col sysb-says__col--never">
          <span className="sysb-says__k">{s.never}</span>
          {nevers.length ? <ul>{nevers.slice(0, 3).map((n) => <li key={n}>{n}</li>)}</ul> : <p className="is-quiet">{s.neverEmpty}</p>}
        </div>
      </div>
    </article>
  );
}

/** The latest changes, newest first: a decision, a reading of the board by the agent, a line of a conversation */
export function RecentChanges({ activity, labels, onOpen }: {
  activity: SystemActivity | null; labels: Record<SystemArea, string>; onOpen: (area: SystemArea) => void;
}) {
  const { t, locale } = useT();
  const s = t.bento;
  return (
    <section className="sysb-changes" aria-label={s.changes}>
      <header className="sysb-tile__head"><span className="sysb-tile__label">{s.changes}</span></header>
      {!activity ? <p className="sysb-changes__empty"><span className="spinner spinner--sm" /></p>
        : activity.lines.length === 0 ? <p className="sysb-changes__empty">{s.changesEmpty}</p>
        : (
          <ol className="sysb-changes__list">
            {activity.lines.map((l) => {
              const who = l.kind === "reading" ? s.agent : l.authorName;
              return (
                <li key={l.id}>
                  <button type="button" className="sysb-change" onClick={() => onOpen(l.area)} title={l.text || undefined}>
                    {l.kind === "reading" ? <span className="sysb-change__agent" aria-hidden>{Icons.spark}</span> : <Avatar name={l.authorName} image={l.authorImage} size={18} />}
                    <span className="sysb-change__text">
                      <b>{who}</b>{" "}
                      {l.kind === "reading" ? s.read(l.areas ?? 1) : <><i>{l.kind === "decision" ? s.decided(labels[l.area]) : labels[l.area]}</i> {l.text}</>}
                    </span>
                    <time dateTime={l.at}>{timeAgo(l.at, locale, t)}</time>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
    </section>
  );
}

/** On a tile: who is talking about the area and how much */
export function AreaFaces({ talk }: { talk: SystemActivity["talk"][string] | undefined }) {
  const { t } = useT();
  if (!talk?.count) return null;
  return (
    <span className="sysb-faces" title={t.bento.talk(talk.count)}>
      {talk.people.map((p) => <Avatar key={p.name} name={p.name} image={p.image} size={18} />)}
      <b>{talk.count}</b>
    </span>
  );
}
