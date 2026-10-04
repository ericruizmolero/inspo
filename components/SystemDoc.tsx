"use client";
// The system's result: criterio.md. First as the file itself, the Markdown an agent gets (SystemMarkdown); one
// press away, the same thing set as a document for reading, with the pictures. Either way it holds what the
// project is, each of the eight areas with its decision, its why, what it never does, the references behind it
// and what the team said of them, and every reference once.
//
// It is where the team works on it, in both views. An area's text is pressed to change it, or to propose the
// change instead: a proposal waits under the area for anyone's yes or no. A decision the agent proposed is
// confirmed in one press. Each area carries its conversation.
import { useMemo, useState } from "react";
import type { InspoItem } from "@/types/inspo";
import { DECISION_MAX, NEVER_MAX, type ProjectSystem, type SystemArea } from "@/types/system";
import type { CriterioBlock, RefInfo } from "@/lib/criterio-md";
import type { SystemActivity } from "@/lib/area-comments";
import { answerAreaProposal, postAreaComment, removeAreaComment } from "@/app/actions/area-comments";
import { decideSystemArea } from "@/app/actions/system";
import { timeAgo } from "@/lib/i18n/format";
import SystemMarkdown, { parseAreaText, rawAreaText, WHY_MAX } from "./SystemMarkdown";
import AreaThread from "./AreaThread";
import { Avatar } from "./CommentsPanel";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { areaIcon } from "./area-icons";
import "./SystemDoc.css";

type AreaBlock = Extract<CriterioBlock, { kind: "area" }>;
type Note = SystemActivity["notes"][string][number];

interface Props {
  blocks: CriterioBlock[];
  system: ProjectSystem;
  labels: Record<SystemArea, string>;
  /** The project's references, oldest first: the order of their codes (R1, R2…) */
  boardIds: string[];
  itemOf: (id: string) => InspoItem | undefined;
  imageOf: (item: InspoItem) => string | null;
  refInfo?: (item: InspoItem) => RefInfo;
  activity: SystemActivity | null;
  busy: Set<SystemArea>;
  /** Writes the block as the area's decision, the team's (an empty decision opens the area again) */
  onSave: (area: SystemArea, next: { decision: string; why: string; never: string }) => Promise<void>;
  /** The system changed here (a proposal accepted, a decision confirmed) */
  onSystem: (system: ProjectSystem) => void;
  /** The conversation moved (a proposal made or answered): read it again */
  onTalk: () => void;
  onOpen: (area: SystemArea) => void;
  onOpenItem?: (item: InspoItem) => void;
  onCopy: () => void; onDownload: () => void; copied: boolean;
  projectId: string; projectName: string; hasRecipe: boolean;
}

export default function SystemDoc({ blocks, system, labels, boardIds, itemOf, imageOf, refInfo, activity, busy, onSave, onSystem, onTalk, onOpen, onOpenItem, onCopy, onDownload, copied, projectId, projectName, hasRecipe }: Props) {
  const { t, locale } = useT();
  const s = t.doc;
  const md = t.system.md;
  const [mode, setMode] = useState<"doc" | "md">("md");
  const [editing, setEditing] = useState<SystemArea | null>(null);
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [talking, setTalking] = useState<Set<SystemArea>>(() => new Set());

  const codes = useMemo(() => new Map(boardIds.map((id, i) => [id, `R${i + 1}`])), [boardIds]);
  const info = (it: InspoItem): RefInfo => (refInfo ? refInfo(it) : { name: it.name, web: it.web });
  const pictureOf = (it: InspoItem, kind?: string) => imageOf(it) ?? (kind === "image" ? it.web : null);
  const areaBlocks = blocks.filter((b): b is AreaBlock => b.kind === "area");
  const project = blocks.find((b) => b.kind === "section" && b.id === "project");
  const summary = blocks.find((b) => b.kind === "summary");
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const start = (b: AreaBlock) => {
    const raw = rawAreaText(b);
    setDraft(b.never ? raw : `${raw}${raw ? "\n\n" : ""}**${b.neverLabel}:**\n- `);
    setReason(""); setError(""); setEditing(b.area);
  };
  const parsed = (b: AreaBlock) => parseAreaText(draft, b.whyLabel, b.neverLabel);
  const tooLong = (b: AreaBlock) => { const p = parsed(b); return p.decision.length > DECISION_MAX || p.why.length > WHY_MAX || p.never.length > NEVER_MAX; };
  const changed = (b: AreaBlock) => { const p = parsed(b); return p.decision !== b.decision.trim() || p.why !== b.why.trim() || p.never !== b.never.trim(); };
  const save = async (b: AreaBlock) => {
    if (tooLong(b) || working) return;
    setWorking(true);
    try { if (changed(b)) await onSave(b.area, parsed(b)); setEditing(null); } finally { setWorking(false); }
  };
  const proposeArea = async (area: SystemArea, p: { decision: string; why: string; never: string }, why: string): Promise<boolean> => {
    if (working || !p.decision) return false;
    setWorking(true); setError("");
    const r = await postAreaComment(projectId, area, why.trim() || p.decision, { proposal: { ...p, state: "open" } });
    setWorking(false);
    if (!r.ok) { setError(r.error); return false; }
    onTalk();
    return true;
  };
  const propose = async (b: AreaBlock) => {
    if (tooLong(b) || !changed(b)) return;
    if (await proposeArea(b.area, parsed(b), reason)) setEditing(null);
  };
  const answer = async (note: Note, accept: boolean) => {
    if (working) return;
    setWorking(true); setError("");
    const r = await answerAreaProposal(note.id, accept);
    setWorking(false);
    if (!r.ok) { setError(r.error); return; }
    onSystem(r.data); onTalk();
  };
  const confirm = async (b: AreaBlock) => {
    if (working) return;
    setWorking(true); setError("");
    const r = await decideSystemArea(projectId, b.area, { decision: b.decision, why: b.why });
    setWorking(false);
    if (r.ok) onSystem(r.data); else setError(r.error);
  };
  // The pins the team left on the file's lines, by the part they sit on
  const pins = useMemo(() => Object.fromEntries(Object.entries(activity?.notes ?? {}).map(([part, notes]) => [part, notes.filter((n) => n.pin).map((n) => ({ id: n.id, who: n.who, image: n.image, at: n.at, mine: n.mine, text: n.text, quote: n.pin! }))])), [activity]);
  const pin = async (part: string, quote: string, body: string): Promise<boolean> => {
    setError("");
    const r = await postAreaComment(projectId, part, body, { pin: { quote } });
    if (!r.ok) { setError(r.error); return false; }
    onTalk();
    return true;
  };
  const unpin = async (id: string) => { const r = await removeAreaComment(id); if (r.ok) onTalk(); else setError(r.error); };
  const toggleTalk = (area: SystemArea) => setTalking((prev) => { const n = new Set(prev); if (n.has(area)) n.delete(area); else n.add(area); return n; });

  const tools = (
    <header className="sdoc-tools">
      <div className="tt-modes" role="tablist" aria-label="criterio.md">
        <button type="button" role="tab" aria-selected={mode === "md"} className={`tt-mode${mode === "md" ? " is-on" : ""}`} onClick={() => setMode("md")}>{s.markdown}</button>
        <button type="button" role="tab" aria-selected={mode === "doc"} className={`tt-mode${mode === "doc" ? " is-on" : ""}`} onClick={() => setMode("doc")}>{s.document}</button>
      </div>
    </header>
  );

  // The file's parts, to jump between: each area says where it stands
  const toc = (
    <nav className="sdoc-toc" aria-label="criterio.md">
      {project && <button type="button" onClick={() => go("sdoc-project")}>{md.project}</button>}
      {summary && <button type="button" onClick={() => go("sdoc-summary")}>{md.summary}</button>}
      <span className="sdoc-toc__gap" aria-hidden />
      {areaBlocks.map((b) => {
        const a = system.areas.find((x) => x.area === b.area);
        const open = (activity?.notes[b.area] ?? []).filter((n) => n.proposal?.state === "open").length;
        return (
          <button key={b.area} type="button" onClick={() => go(`sdoc-${b.area}`)} className={!b.decision ? "is-open" : a?.source === "team" ? "is-team" : ""}>
            <i aria-hidden />{b.heading}{open > 0 && <b title={s.pending(open)}>{open}</b>}
          </button>
        );
      })}
      <span className="sdoc-toc__gap" aria-hidden />
      {boardIds.length > 0 && <button type="button" onClick={() => go("sdoc-refs")}>{md.refs}<em>{boardIds.length}</em></button>}
    </nav>
  );
  const notesOf = (area: SystemArea) => activity?.notes[area] ?? [];
  const refsOf = (area: SystemArea) => (system.areas.find((x) => x.area === area)?.evidence ?? []).map((e) => ({ e, it: itemOf(e.itemId) })).filter((x): x is { e: typeof x.e; it: InspoItem } => !!x.it);
  /** What someone proposes instead of what is written: it waits under the area for a yes or a no */
  const proposalsOf = (b: AreaBlock) => notesOf(b.area).filter((n) => n.proposal?.state === "open").map((n) => (
    <div key={n.id} className="sdoc-proposal">
      <header>
        <Avatar name={n.who} image={n.image} size={20} />
        <span><b>{n.who}</b> {s.proposes}</span>
        <time dateTime={n.at}>{timeAgo(n.at, locale, t)}</time>
        <span className="sdoc-proposal__tools">
          <button type="button" className="sdoc-btn sdoc-btn--solid" disabled={working} onClick={() => void answer(n, true)}>{Icons.check} {s.accept}</button>
          <button type="button" className="sdoc-btn" disabled={working} onClick={() => void answer(n, false)}>{n.mine ? s.withdraw : s.reject}</button>
        </span>
      </header>
      <p className="sdoc-decision">{n.proposal!.decision}</p>
      {n.proposal!.why && n.proposal!.why !== b.why && <p className="sdoc-why"><b>{b.whyLabel}</b> {n.proposal!.why}</p>}
      {n.proposal!.never && n.proposal!.never !== b.never && (
        <div className="sdoc-never"><b>{b.neverLabel}</b><ul>{n.proposal!.never.split("\n").filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul></div>
      )}
      {n.text && n.text !== n.proposal!.decision && <p className="sdoc-proposal__reason">{n.text}</p>}
    </div>
  ));
  const talkOf = (b: AreaBlock) => {
    const notes = notesOf(b.area);
    return (
      <div className="sdoc-talk">
        <button type="button" className="sdoc-talk__toggle" aria-expanded={talking.has(b.area)} onClick={() => toggleTalk(b.area)}>
          {notes.length > 0 && <span className="sdoc-talk__faces" aria-hidden>{[...new Map(notes.map((n) => [n.who, n])).values()].slice(0, 3).map((n) => <Avatar key={n.who} name={n.who} image={n.image} size={18} />)}</span>}
          {notes.length > 0 ? s.talk(notes.length) : s.talkStart}
          <i aria-hidden>{Icons.chevron}</i>
        </button>
        {talking.has(b.area) && <AreaThread key={notes.length} projectId={projectId} area={b.area} refs={refsOf(b.area).map((x) => x.it)} />}
      </div>
    );
  };
  const confirmOf = (b: AreaBlock, className: string) => b.decision && system.areas.find((x) => x.area === b.area)?.source !== "team"
    ? <button type="button" className={className} disabled={working} onClick={() => void confirm(b)} title={s.confirmHint}>{Icons.check} {s.confirm}</button> : null;

  // The file itself comes first: the Markdown, with the team's tools on each area
  if (mode === "md") return (
    <div className="sdoc">
      {toc}
      <div className="sdoc-page sdoc-page--md">
        {tools}
        {error && <p className="sysv-error" role="alert">{error}</p>}
        <SystemMarkdown blocks={blocks} busy={busy} onSave={onSave} onCopy={onCopy} onDownload={onDownload} copied={copied} projectId={projectId} projectName={projectName} hasRecipe={hasRecipe}
          onPropose={proposeArea} after={(b) => <>{proposalsOf(b)}</>}
          actions={(b) => [
            ...(b.decision && system.areas.find((x) => x.area === b.area)?.source !== "team" ? [{ label: s.confirm, run: () => void confirm(b) }] : []),
            { label: t.system.mdView.openArea, run: () => onOpen(b.area) },
          ]}
          pins={pins} onPin={pin} onUnpin={unpin} />
      </div>
    </div>
  );

  return (
    <div className="sdoc">
      {toc}
      <article className="sdoc-page">
        {tools}
        {error && <p className="sysv-error" role="alert">{error}</p>}

        {project && project.kind === "section" && (
          <section id="sdoc-project" className="sdoc-part">
            <h2>{project.heading}</h2>
            {project.lines.map((line, i) => <p key={i} className="sdoc-lead">{line}</p>)}
          </section>
        )}
        {summary && summary.kind === "summary" && (
          <section id="sdoc-summary" className="sdoc-part">
            <h2>{summary.heading}</h2>
            <p>{summary.text}</p>
          </section>
        )}

        {areaBlocks.map((b) => {
          const a = system.areas.find((x) => x.area === b.area);
          const refs = refsOf(b.area);
          const on = editing === b.area;
          const p = on ? parsed(b) : null;
          const team = a?.source === "team";
          return (
            <section key={b.area} id={`sdoc-${b.area}`} className={`sdoc-part sdoc-area${busy.has(b.area) ? " is-busy" : ""}`} aria-busy={busy.has(b.area)}>
              <header className="sdoc-area__head">
                <h2>{areaIcon(b.area, 18)}{b.heading}</h2>
                <span className={`sdoc-state${team ? " is-team" : ""}`}>
                  {!b.decision ? md.open.split(":")[0] : team ? <>{Icons.check} {md.decided}</> : md.proposed}
                </span>
                {!on && confirmOf(b, "sdoc-btn sdoc-btn--solid")}
                <span className="sdoc-area__tools">
                  <button type="button" className="sdoc-btn" onClick={() => onOpen(b.area)}>{t.system.mdView.openArea}</button>
                </span>
              </header>

              {on ? (
                <div className="sdoc-edit">
                  <textarea className="sdoc-input" autoFocus spellCheck={false} rows={Math.min(18, Math.max(5, draft.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 84)), 0) + 1))} value={draft}
                    placeholder={`${t.system.placeholder}\n\n**${b.whyLabel}:** ${t.system.whyPlaceholder}\n\n**${b.neverLabel}:**\n- ${t.system.neverPlaceholder}`}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { e.stopPropagation(); setEditing(null); }
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void save(b); }
                    }} />
                  <input className="sdoc-reason" value={reason} maxLength={300} placeholder={s.reason} aria-label={s.reason} onChange={(e) => setReason(e.target.value)} />
                  <div className="sdoc-edit__row">
                    <button type="button" className="sdoc-btn sdoc-btn--solid" disabled={working || tooLong(b)} onClick={() => void save(b)} title={s.saveHint}>{t.system.save}</button>
                    <button type="button" className="sdoc-btn sdoc-btn--fill" disabled={working || tooLong(b) || !p!.decision || !changed(b)} onClick={() => void propose(b)} title={s.proposeHint}>{s.propose}</button>
                    <button type="button" className="sdoc-btn" onClick={() => setEditing(null)}>{t.system.cancel}</button>
                    <small className={tooLong(b) ? "is-over" : ""}>{p!.decision.length}/{DECISION_MAX}</small>
                  </div>
                </div>
              ) : (
                <div className="sdoc-text" role="button" tabIndex={0} title={b.decision ? t.system.edit : t.system.write} onClick={() => start(b)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(b); } }}>
                  {b.decision ? <p className="sdoc-decision">{b.decision}</p> : <p className="sdoc-open">{md.open}</p>}
                  {b.decision && b.why && <p className="sdoc-why"><b>{b.whyLabel}</b> {b.why}</p>}
                  {b.never && (
                    <div className="sdoc-never">
                      <b>{b.neverLabel}</b>
                      <ul>{b.never.split("\n").filter(Boolean).map((n) => <li key={n}>{n}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {proposalsOf(b)}

              {refs.length > 0 && (
                <div className="sdoc-refs">
                  <h3>{md.evidence}<em>{refs.length}</em></h3>
                  {refs.map(({ e, it }) => {
                    const r = info(it);
                    const pic = pictureOf(it, r.kind);
                    return (
                      <div key={it.id} className="sdoc-ref">
                        <button type="button" className="sdoc-ref__pic" onClick={() => onOpenItem?.(it)} aria-label={it.name}>
                          {pic ? <img src={pic} alt="" loading="lazy" /> : it.name.slice(0, 1).toUpperCase()}
                        </button>
                        <div className="sdoc-ref__body">
                          <p className="sdoc-ref__name">{codes.has(it.id!) && <b>{codes.get(it.id!)}</b>}<span>{it.name}</span>{r.kind && r.kind !== "web" && <em>{md.kinds[r.kind]}</em>}</p>
                          {e.take && <p className="sdoc-ref__take">{e.take}</p>}
                          {(r.said ?? []).slice(0, 2).map((w, i) => <p key={i} className="sdoc-ref__said"><b>{w.who}</b> {w.text}</p>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {talkOf(b)}
            </section>
          );
        })}

        {boardIds.length > 0 && (
          <section id="sdoc-refs" className="sdoc-part">
            <h2>{md.refs}<em>{boardIds.length}</em></h2>
            <p className="sdoc-muted">{md.refsIntro}</p>
            <div className="sdoc-entries">
              {boardIds.map((id) => {
                const it = itemOf(id);
                if (!it) return null;
                const r = info(it);
                const pic = pictureOf(it, r.kind);
                const brings = system.areas.flatMap((a) => a.evidence.filter((e) => e.itemId === id).map((e) => ({ area: a.area, take: e.take })));
                return (
                  <article key={id} className="sdoc-entry">
                    <button type="button" className="sdoc-entry__pic" onClick={() => onOpenItem?.(it)} aria-label={it.name}>
                      {pic ? <img src={pic} alt="" loading="lazy" /> : it.name.slice(0, 1).toUpperCase()}
                    </button>
                    <div className="sdoc-entry__body">
                      <p className="sdoc-ref__name"><b>{codes.get(id)}</b><span>{it.name}</span><em>{md.kinds[r.kind ?? "web"]}</em>
                        <a href={it.web} target="_blank" rel="noreferrer" aria-label={t.card.openSite}>{Icons.external}</a>
                      </p>
                      {(r.by || r.date) && <p className="sdoc-muted">{md.savedBy} {r.by}{r.date ? ` · ${r.date}` : ""}</p>}
                      {r.what && <p className="sdoc-entry__what">{r.what}</p>}
                      {(r.said ?? []).map((w, i) => <p key={i} className="sdoc-ref__said"><b>{w.who}</b> {w.text}</p>)}
                      {brings.length > 0 ? (
                        <ul className="sdoc-brings">
                          {brings.map((x, i) => <li key={i}><button type="button" onClick={() => go(`sdoc-${x.area}`)}>{areaIcon(x.area, 13)}{labels[x.area]}</button>{x.take}</li>)}
                        </ul>
                      ) : <p className="sdoc-muted">{md.noArea}</p>}
                      {!!r.tags?.length && <p className="sdoc-tags">{r.tags.join(" · ")}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
