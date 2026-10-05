"use client";
// The system's result: criterio.md, with the team working on it. The file is shown as the Markdown it is or, one
// press away, set as a document: the same text either way (components/SystemMarkdown.tsx), typed in place and
// saved as it is typed, with the pins the team leaves on it. Here: the parts to jump between, the proposals
// waiting under each area (anyone says yes or no).
import { useEffect, useMemo, useState } from "react";
import type { InspoItem } from "@/types/inspo";
import type { ProjectSystem, SystemArea } from "@/types/system";
import type { CriterioBlock, RefInfo } from "@/lib/criterio-md";
import type { SystemActivity } from "@/lib/area-comments";
import { answerAreaProposal, postAreaComment, removeAreaComment } from "@/app/actions/area-comments";
import { decideSystemArea, releaseSystemArea, saveDocPart, setSystemEvidence, saveSystemSummary } from "@/app/actions/system";
import { readAreaMeta } from "@/lib/criterio-md";
import { timeAgo } from "@/lib/i18n/format";
import SystemMarkdown from "./SystemMarkdown";
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
  /** Writes what the project is (the brief), typed in the file */
  onAbout?: (text: string) => Promise<void>;
  /** Writes the words of a text reference, typed in the file's Content */
  onText?: (itemId: string, text: string) => Promise<void>;
  /** Gives a text reference another title, typed over its heading */
  onTextTitle?: (itemId: string, title: string) => Promise<void>;
  onOpenItem?: (item: InspoItem) => void;
  onCopy: () => void; onDownload: () => void; copied: boolean;
  /** The file as it is copied, to open it in an AI chat */
  markdown?: string;
  projectId: string; projectName: string; hasRecipe: boolean;
  /** More controls over the file, in its bar before Copy */
  fileTools?: React.ReactNode;
}

export default function SystemDoc({ blocks, system, labels, boardIds, itemOf, imageOf, refInfo, activity, busy, onSave, onSystem, onTalk, onOpen, onAbout, onText, onTextTitle, onOpenItem, onCopy, onDownload, copied, markdown, projectId, projectName, hasRecipe, fileTools }: Props) {
  const { t, locale } = useT();
  const s = t.doc;
  const md = t.system.md;
  const [mode, setMode] = useState<"doc" | "md">("md");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const areaBlocks = blocks.filter((b): b is AreaBlock => b.kind === "area");
  const project = blocks.find((b) => b.kind === "section" && b.id === "project");
  const summary = blocks.find((b) => b.kind === "summary");
  // A skill's short name, as its menu says it (the section's own heading is a whole sentence)
  const skillName = (id: string) => (t.system as unknown as { skillsList?: Record<string, { name?: string }> }).skillsList?.[id]?.name ?? id.toUpperCase();
  // The sections the skills add (lib/md-skills.ts), in the order the file has them
  const skillBlocks = blocks.filter((b): b is Extract<CriterioBlock, { kind: "section" }> => b.kind === "section" && b.id.startsWith("skill:"));
  // To a part of the file. What is above it can still grow while the page travels (pictures arriving in the
  // document look), so once it has had time to arrive it lands again, on where the part really is
  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const want = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    for (const ms of [700, 1500]) setTimeout(() => { if (Math.abs(el.getBoundingClientRect().top - want) > 6) el.scrollIntoView({ behavior: "auto", block: "start" }); }, ms);
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
  const answer = async (note: Note, accept: boolean) => {
    if (working) return;
    setWorking(true); setError("");
    const r = await answerAreaProposal(note.id, accept);
    setWorking(false);
    if (!r.ok) { setError(r.error); return; }
    onSystem(r.data); onTalk();
  };
  // Each reference's picture, by its code: the document shows it where the reference is named. A site with no
  // stored picture shows the one it declares (og:image) or, without one, its first screen, once it is known to
  // load; one with neither stays as text
  const [declared, setDeclared] = useState<Record<string, string>>({});
  const stored = useMemo(() => Object.fromEntries(boardIds.flatMap((id, i) => {
    const it = itemOf(id);
    const pic = it ? imageOf(it) ?? (refInfo?.(it).kind === "image" ? it.web : null) : null;
    return pic ? [[`R${i + 1}`, pic]] : [];
  })), [boardIds, itemOf, imageOf, refInfo]);
  useEffect(() => {
    let alive = true;
    // One capture at a time: each one is a browser on the server
    let captures: Promise<void> = Promise.resolve();
    const load = (src: string) => new Promise<boolean>((done) => { const img = new Image(); img.onload = () => done(img.naturalWidth > 1); img.onerror = () => done(false); img.src = src; });
    const found = (code: string, src: string) => { if (alive) setDeclared((d) => (d[code] ? d : { ...d, [code]: src })); };
    boardIds.forEach((id, i) => {
      const code = `R${i + 1}`;
      const it = itemOf(id);
      if (!it || stored[code] || declared[code] || /^(blob:|\/)/.test(it.web)) return;
      const og = `/api/og?url=${encodeURIComponent(it.web)}`;
      const shot = `/api/shot?url=${encodeURIComponent(it.web)}&v=2`;
      void load(og).then((ok) => {
        if (ok) { found(code, og); return; }
        // No picture of its own: its first screen, captured once and kept (as the board's card does)
        captures = captures.then(async () => { if (alive && await load(shot)) found(code, shot); });
      });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- asked once per reference; `declared` only grows
  }, [boardIds, stored]);
  const pictures = useMemo(() => ({ ...declared, ...stored }), [declared, stored]);
  // The pins the team left on the file's lines, by the part they sit on
  const pins = useMemo(() => Object.fromEntries(Object.entries(activity?.notes ?? {}).map(([part, notes]) => [part, notes.filter((n) => n.pin).map((n) => ({ id: n.id, who: n.who, image: n.image, at: n.at, mine: n.mine, text: n.text, quote: n.pin!.quote, x: n.pin!.x, to: n.pin!.to }))])), [activity]);
  const pin = async (part: string, quote: string, body: string, at: { x: number; to?: string }): Promise<boolean> => {
    setError("");
    const r = await postAreaComment(projectId, part, body, { pin: { quote, x: at.x, to: at.to } });
    if (!r.ok) { setError(r.error); return false; }
    onTalk();
    return true;
  };
  const unpin = async (id: string) => { const r = await removeAreaComment(id); if (r.ok) onTalk(); else setError(r.error); };
  const tools = (
    <header className="sdoc-tools">
      <div className="tt-modes" role="tablist" aria-label="criterio.md">
        <button type="button" role="tab" aria-selected={mode === "md"} className={`tt-mode${mode === "md" ? " is-on" : ""}`} onClick={() => setMode("md")}>{s.markdown}</button>
        <button type="button" role="tab" aria-selected={mode === "doc"} className={`tt-mode${mode === "doc" ? " is-on" : ""}`} onClick={() => setMode("doc")}>{s.document}</button>
      </div>
    </header>
  );

  // The file's parts, to jump between: each area says where it stands. One reference under it is enough for
  // the green dot, however many there are
  const toc = (
    <nav className="sdoc-toc" aria-label="criterio.md">
      {project && <button type="button" onClick={() => go("sdoc-project")}>{md.project}</button>}
      {summary && <button type="button" onClick={() => go("sdoc-summary")}>{md.summary}</button>}
      <span className="sdoc-toc__gap" aria-hidden />
      {areaBlocks.map((b) => {
        const a = system.areas.find((x) => x.area === b.area);
        const open = (activity?.notes[b.area] ?? []).filter((n) => n.proposal?.state === "open").length;
        return (
          <button key={b.area} type="button" onClick={() => go(`sdoc-${b.area}`)} className={a?.evidence.length ? "is-backed" : !b.decision ? "is-open" : a?.source === "team" ? "is-team" : ""}>
            <i aria-hidden />{b.heading}{open > 0 && <b title={s.pending(open)}>{open}</b>}
          </button>
        );
      })}
      {/* A skill switched on is a part of the file too: it shows here the moment it is on */}
      {skillBlocks.length > 0 && <span className="sdoc-toc__gap" aria-hidden />}
      {skillBlocks.map((b) => (
        <button key={b.id} type="button" className="is-skill" onClick={() => go(`sdoc-${b.id}`)} title={b.heading}>
          <span className="sdoc-toc__spark" aria-hidden>{Icons.spark}</span><span className="sdoc-toc__name">{skillName(b.id.slice(6))}</span>
        </button>
      ))}
      <span className="sdoc-toc__gap" aria-hidden />
      {boardIds.length > 0 && <button type="button" onClick={() => go("sdoc-refs")}>{md.refs}<em>{boardIds.length}</em></button>}
    </nav>
  );
  const notesOf = (area: SystemArea) => activity?.notes[area] ?? [];
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
  // An area's status and references typed over in the file go back to the board: the references it cites (by code)
  // are the area's, with their takes, and "decided" or "proposed" confirms or hands it back. What the app writes there
  // is written again from that, so the part never stays frozen by hand
  const saveMeta = async (area: string, text: string) => {
    const read = readAreaMeta(text, t.system.md);
    const refs = read.refs.map((r) => ({ itemId: boardIds[Number(r.code.slice(1)) - 1], take: r.take })).filter((r) => r.itemId);
    let r = await setSystemEvidence(projectId, area, refs);
    const now = r.ok ? r.data.areas.find((a) => a.area === area) : undefined;
    if (r.ok && now?.decision && read.status === "decided" && now.source === "model") r = await decideSystemArea(projectId, area, { decision: now.decision });
    else if (r.ok && read.status === "proposed" && now?.source === "team") r = await releaseSystemArea(projectId, area);
    if (r.ok && r.data.doc?.[`meta:${area}`]) r = await saveDocPart(projectId, `meta:${area}`, null);
    return r;
  };
  // The file, with the team's tools on each area: as the Markdown it is, or set as a document. The same text, the
  // same writing in place and the same pins either way
  return (
    <div className="sdoc">
      {toc}
      <div className="sdoc-page sdoc-page--md">
        {tools}
        {error && <p className="sysv-error" role="alert">{error}</p>}
        <SystemMarkdown fileTools={fileTools} look={mode} pictures={pictures} blocks={blocks} busy={busy} onSave={onSave} onCopy={onCopy} onDownload={onDownload} copied={copied} markdown={markdown} projectId={projectId} projectName={projectName} hasRecipe={hasRecipe}
          onPropose={proposeArea} after={(b) => <>{proposalsOf(b)}</>} onAbout={onAbout}
          onText={onText && (async (id, text) => { try { await onText(id, text); setError(""); } catch (e) { setError(e instanceof Error ? e.message : String(e)); throw e; } })}
          onTextTitle={onTextTitle && (async (id, title) => { try { await onTextTitle(id, title); setError(""); } catch (e) { setError(e instanceof Error ? e.message : String(e)); throw e; } })}
          onSummary={async (text) => { const r = await saveSystemSummary(projectId, text); if (r.ok) onSystem(r.data); else setError(r.error); }}
          onPart={async (part, text) => { const r = part.startsWith("meta:") && text !== null ? await saveMeta(part.slice(5), text) : await saveDocPart(projectId, part, text); if (r.ok) onSystem(r.data); else setError(r.error); }}
          pins={pins} onPin={pin} onUnpin={unpin} />
      </div>
    </div>
  );
}
