"use client";
// The system's result: criterio.md, with the team working on it. The file is shown as the Markdown it is or set
// as a document (the page's tabs choose): the same text either way (components/SystemMarkdown.tsx), typed in place and
// saved as it is typed, with the pins the team leaves on it. Here: the parts to jump between, the proposals
// waiting under each area (anyone says yes or no).
import { useEffect, useMemo, useRef, useState } from "react";
import type { InspoItem } from "@/types/inspo";
import type { ProjectSystem, SystemArea } from "@/types/system";
import type { CriterioBlock, RefInfo } from "@/lib/criterio-md";
import type { SystemActivity } from "@/lib/area-comments";
import type { EditAsk } from "@/lib/system/edit";
import { answerAreaProposal, postAreaComment, removeAreaComment } from "@/app/actions/area-comments";
import { decideSystemArea, releaseSystemArea, saveDocPart, setSystemEvidence, saveSystemSummary } from "@/app/actions/system";
import { readAreaMeta } from "@/lib/criterio-md";
import SystemMarkdown, { type ProposedText } from "./SystemMarkdown";
import TinoDock, { type DockSay } from "./TinoDock";
import { systemIdle, systemNudges } from "./board-nudges";
import TinoNote from "./TinoNote";
import { useT } from "./I18nProvider";
import { Button, Chip, IconButton } from "@/components/criterio";
import { createPortal } from "react-dom";
import "./SystemDoc.css";

/** The proposals Tino writes carry his name as where they come from (AreaProposal.via) */
const TINO = "Tino";

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
  /** The file as the Markdown it is, or set as a document: chosen in the page's tabs (components/SystemView.tsx) */
  look: "md" | "doc";
  /** Where Tino's dock goes (SystemView's slot beside the page's scroll) */
  dock?: HTMLElement | null;
  /** The references the polish kept (closed with "keep"), for Tino */
  kept?: string[];
}

export default function SystemDoc({ blocks, system, boardIds, itemOf, imageOf, refInfo, activity, busy, onSave, onSystem, onTalk, onAbout, onText, onTextTitle, onCopy, onDownload, copied, markdown, projectId, projectName, hasRecipe, fileTools, look, dock, kept = [] }: Props) {
  const { t } = useT();
  const s = t.doc;
  const md = t.system.md;
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const areaBlocks = blocks.filter((b): b is AreaBlock => b.kind === "area");
  const project = blocks.find((b) => b.kind === "section" && b.id === "project");
  const summary = blocks.find((b) => b.kind === "summary");
  // A skill's short name, as its menu says it (the section's own heading is a whole sentence)
  const skillName = (id: string) => (t.system as unknown as { skillsList?: Record<string, { name?: string }> }).skillsList?.[id]?.name ?? id.toUpperCase();
  // The sections the skills add (lib/md-skills.ts), in the order the file has them
  const skillBlocks = blocks.filter((b): b is Extract<CriterioBlock, { kind: "section" }> => b.kind === "section" && b.id.startsWith("skill:"));
  // To a part of the file, at one pace whatever the distance. Where it lands is read again on every frame, and for
  // a moment after landing: what is above the part can still grow while the page travels (pictures arriving in the
  // document look), and the browser's own smooth scroll stopped short when it did, or when a trackpad's fling was
  // still running. The wheel is held until that fling ends; a new scroll or a finger takes the page back
  const endTravel = useRef(() => {});
  useEffect(() => () => endTravel.current(), []);
  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    let page = el.parentElement;
    while (page && !(/auto|scroll/.test(getComputedStyle(page).overflowY) && page.scrollHeight > page.clientHeight + 1)) page = page.parentElement;
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.scrollIntoView({ block: "start" }); return; }
    endTravel.current();
    const box = page;
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const from = box.scrollTop, start = performance.now(), ms = 520, hold = 1500;
    let frame = 0, wheeled = start;
    const wheel = (e: WheelEvent) => {
      const now = performance.now(), fresh = now - wheeled > 120;
      wheeled = now;
      if (now - start > ms && fresh) stop(); else e.preventDefault();
    };
    const stop = () => { cancelAnimationFrame(frame); box.removeEventListener("wheel", wheel); box.removeEventListener("touchstart", stop); };
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      const to = Math.min(box.scrollHeight - box.clientHeight, box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - margin);
      box.scrollTop = from + (to - from) * (1 - Math.pow(1 - k, 4));
      if (now - start < hold) frame = requestAnimationFrame(step); else stop();
    };
    box.addEventListener("wheel", wheel, { passive: false }); box.addEventListener("touchstart", stop, { passive: true });
    endTravel.current = stop;
    frame = requestAnimationFrame(step);
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
  // Saying no opens a line under the proposal for why: optional, and it tells the next pass how far the no reaches
  // The area's never list written as rules (an id, a reason, a right and a wrong example): the model writes them and
  // they wait under the area as a proposal, like any other, until someone accepts them
  const [sharpening, setSharpening] = useState<SystemArea | null>(null);
  const sharpen = async (b: AreaBlock) => {
    if (working || sharpening || !b.decision) return;
    setSharpening(b.area); setError("");
    try {
      const res = await fetch("/api/system/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, area: b.area }) });
      const data = (await res.json().catch(() => ({}))) as { never?: string; error?: string };
      if (!res.ok || !data.never) { setError(data.error ?? s.sharpenFailed); return; }
      const r = await postAreaComment(projectId, b.area, s.sharpenNote, { proposal: { decision: b.decision, why: b.why, never: data.never, state: "open" } });
      if (!r.ok) { setError(r.error); return; }
      onTalk();
    } catch { setError(s.sharpenFailed); } finally { setSharpening(null); }
  };
  const [refusing, setRefusing] = useState<{ id: string; reason: string } | null>(null);
  const answer = async (note: Note, accept: boolean, reason?: string) => {
    if (working) return;
    setWorking(true); setError("");
    const r = await answerAreaProposal(note.id, accept, reason);
    setWorking(false);
    if (!r.ok) { setError(r.error); return; }
    setRefusing(null);
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

  // The file's parts, to jump between, as short as the file allows (Eric, 04-11: "hay que hacerlo más sintetizado"):
  // one line per part (where to start, the project, building it, the skills, the references) and only the eight
  // areas listed, since that is where the team works. Each line is there only when the file has that part. Each area
  // says where it stands; one reference under it is enough for the green dot, however many there are
  const sectionOf = (id: string) => blocks.find((b): b is Extract<CriterioBlock, { kind: "section" }> => b.kind === "section" && b.id === id);
  const jump = (id: string, label: string, extra?: React.ReactNode) => (
    <button key={id} type="button" onClick={() => go(`sdoc-${id}`)} title={label}><span className="sdoc-toc__name">{label}</span>{extra}</button>
  );
  const first = (ids: string[]) => ids.find((id) => sectionOf(id));
  const startAt = first(["guide", "questions", "learned", "landing", "use", "rejects"]);
  const projectAt = project ? "project" : first(["brief", "content"]) ?? (summary ? "summary" : first(["brand-intro"]));
  const buildAt = first(["pages", "brand-tokens", "area-tokens"]);
  // The skills switched on are one line, with how many: it shows the moment one is on
  const skillsAt = first(["skills-all"]) ?? skillBlocks[0]?.id;
  const toc = (
    <nav className="sdoc-toc" aria-label="criterio.md">
      {startAt && jump(startAt, s.tocStart)}
      {projectAt && jump(projectAt, s.tocProject)}
      <span className="sdoc-toc__gap" aria-hidden /><p className="sdoc-toc__label">{s.tocAreas}</p>
      {areaBlocks.map((b) => {
        const a = system.areas.find((x) => x.area === b.area);
        const open = (activity?.notes[b.area] ?? []).filter((n) => n.proposal?.state === "open").length;
        return (
          <button key={b.area} type="button" onClick={() => go(`sdoc-${b.area}`)} className={a?.evidence.length ? "is-backed" : !b.decision ? "is-open" : a?.source === "team" ? "is-team" : ""}>
            {b.heading}{open > 0 && <span className="sdoc-toc__count" data-tip={s.pending(open)}><Chip tone="ember">{open}</Chip></span>}<i aria-hidden />
          </button>
        );
      })}
      <span className="sdoc-toc__gap" aria-hidden />
      {buildAt && jump(buildAt, s.tocBuild)}
      {skillsAt && jump(skillsAt, s.tocSkills, skillBlocks.length > 0 ? <em>{skillBlocks.length}</em> : undefined)}
      {boardIds.length > 0 && jump("refs", md.refs, <em>{boardIds.length}</em>)}
    </nav>
  );
  const notesOf = (area: SystemArea) => activity?.notes[area] ?? [];
  /** What someone proposes instead of what is written: it waits in the area, the decision struck where it stands and
   *  the proposed one after it, with a note from Tino under them (TinoNote): his own reason, or who proposed it and
   *  theirs. Accept writes it; "Leave it" opens the line for why not (optional) */
  const proposedOf = (b: AreaBlock): ProposedText[] => notesOf(b.area).filter((n) => n.proposal?.state === "open").map((n) => {
    const p = n.proposal!;
    const who = p.via === TINO ? null : p.via ?? n.who;
    const reason = n.text && n.text !== p.decision ? n.text : "";
    const text = who === null ? reason : reason ? t.tino.by(who, reason) : t.tino.proposes(who);
    return {
      id: n.id, decision: p.decision, why: p.why !== b.why ? p.why : "", never: p.never !== b.never ? p.never : "",
      note: <>
        <TinoNote lineKey={`said:${n.id}`} title={t.tino.said} mood="smug" text={text}
          actions={<>
            <Button size="s" disabled={working} onClick={() => void answer(n, true)}>{s.accept}</Button>
            <button type="button" className="tino-corner__link" disabled={working} aria-expanded={refusing?.id === n.id} onClick={() => setRefusing(refusing?.id === n.id ? null : { id: n.id, reason: "" })}>{t.tino.leaveIt}</button>
          </>} />
        {refusing?.id === n.id && (
          <form className="sdoc-proposal__refuse" onSubmit={(e) => { e.preventDefault(); void answer(n, false, refusing.reason); }}>
            <input className="cr-input cr-input-s" autoFocus maxLength={200} value={refusing.reason} placeholder={s.whyNot} aria-label={s.whyNot} disabled={working}
              onChange={(e) => setRefusing({ id: n.id, reason: e.target.value })} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setRefusing(null); } }} />
            <button type="submit" className="cr-btn cr-btn-secondary cr-btn-s" disabled={working}>{t.tino.leaveIt}</button>
            <button type="button" className="cr-btn cr-btn-quiet cr-btn-s" disabled={working} onClick={() => setRefusing(null)}>{t.common.cancel}</button>
          </form>
        )}
      </>,
    };
  });
  const [ask, setAsk] = useState("");
  const [editing, setEditing] = useState(false);
  const [say, setSay] = useState<DockSay | null>(null);
  // "Tell Tino what to change", in words, for the whole file: one model call returns the areas it touches, each posted
  // as Tino's proposal under its area. Never written into an area. None: he says the file needs no change for that
  // An answer to his "which way?": posted as his proposal under that area, as any change in words
  const pick = async (area: SystemArea, o: EditAsk["options"][number]) => {
    if (editing) return;
    setEditing(true); setSay(null);
    try {
      const r = await postAreaComment(projectId, area, t.tino.whichPicked(o.label, t.system.areas[area].toLowerCase()), { proposal: { decision: o.decision, why: o.why, never: o.never, state: "open", via: TINO } });
      if (!r.ok) { setSay({ key: `failed:${Date.now()}`, title: [t.tino.editFailed], text: r.error, mood: "sad" }); return; }
      onTalk();
      go(`sdoc-${area}`);
    } finally { setEditing(false); }
  };
  const tell = async (instruction: string) => {
    if (editing) return;
    setEditing(true); setSay(null);
    const fail = (why?: string) => setSay({ key: `failed:${Date.now()}`, title: [t.tino.editFailed], text: why, mood: "sad" });
    try {
      const res = await fetch("/api/system/edit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, instruction }) });
      const data = (await res.json().catch(() => ({}))) as { edits?: { area: SystemArea; decision: string; why: string; never: string; reason: string }[]; ask?: EditAsk | null; error?: string };
      if (!res.ok || !data.edits) { fail(res.status < 500 ? data.error : undefined); return; }
      // It named an area but not which way: he asks, and the answer picked is the proposal
      if (!data.edits.length && data.ask) {
        const q = data.ask;
        setAsk("");
        setSay({ key: `which:${Date.now()}`, title: q.question, text: q.now, mood: "thinking",
          options: q.options.map((o, i) => ({ key: `${i}`, label: o.label, onPick: () => void pick(q.area, o) })) });
        return;
      }
      if (!data.edits.length) { setSay({ key: `nothing:${Date.now()}`, title: t.tino.nothingTitle, text: t.tino.nothingText, mood: "skeptic" }); setAsk(""); return; }
      for (const e of data.edits) {
        const r = await postAreaComment(projectId, e.area, e.reason, { proposal: { decision: e.decision, why: e.why, never: e.never, state: "open", via: TINO } });
        if (!r.ok) { fail(r.error); return; }
      }
      setAsk("");
      onTalk();
      go(`sdoc-${data.edits[0].area}`);
    } catch { fail(); } finally { setEditing(false); }
  };
  // What Tino brings up on his own here: how the file works (once each), then what is waiting in it
  const askRef = useRef<HTMLInputElement>(null);
  // When the page opened, and which of the non-urgent things Tino leads with this visit
  const [openedAt] = useState(() => Date.now());
  const [visitSeed] = useState(() => Math.floor(Math.random() * 1000));
  const fill = (text: string) => { setAsk(text); setSay(null); requestAnimationFrame(() => askRef.current?.focus()); };
  const openProposals = areaBlocks.filter((b) => notesOf(b.area).some((n) => n.proposal?.state === "open"));
  const read = new Set(system.run?.itemIds ?? []);
  const unread = system.run ? Math.max(0, boardIds.filter((id) => !read.has(id)).length - (system.run.omitted ?? 0)) : 0;
  const nudges = systemNudges({
    t, project: projectName,
    proposals: openProposals.reduce((n, b) => n + notesOf(b.area).filter((x) => x.proposal?.state === "open").length, 0),
    undecided: system.areas.filter((a) => !a.decision).map((a) => a.area),
    stale: unread,
    onTry: () => fill(t.tino.system.askExample),
    onAsk: (area) => fill(t.tino.system.undecidedAsk(t.system.areas[area].toLowerCase())),
    onCopy,
    onFirstProposal: () => { if (openProposals[0]) go(`sdoc-${openProposals[0].area}`); },
    areas: system.areas, boardIds, readIds: system.run?.itemIds ?? [], kept, seed: visitSeed, now: openedAt,
    onGo: (part) => go(`sdoc-${part}`),
  });
  const idle = systemIdle(t, system.areas, openedAt, (area) => go(`sdoc-${area}`));
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
        {error && <p className="sysv-error" role="alert">{error}</p>}
        <SystemMarkdown fileTools={fileTools} look={look} pictures={pictures} blocks={blocks} busy={busy} onSave={onSave} onCopy={onCopy} onDownload={onDownload} copied={copied} markdown={markdown} projectId={projectId} projectName={projectName} hasRecipe={hasRecipe}
          onPropose={proposeArea} tools={(b) => (b.decision ? <IconButton icon="sparkle" label={sharpening === b.area ? s.sharpening : s.sharpen} variant="quiet" size="xs" disabled={!!sharpening || working} onClick={() => void sharpen(b)} /> : null)} proposals={proposedOf} onAbout={onAbout}
          onText={onText && (async (id, text) => { try { await onText(id, text); setError(""); } catch (e) { setError(e instanceof Error ? e.message : String(e)); throw e; } })}
          onTextTitle={onTextTitle && (async (id, title) => { try { await onTextTitle(id, title); setError(""); } catch (e) { setError(e instanceof Error ? e.message : String(e)); throw e; } })}
          onSummary={async (text) => { const r = await saveSystemSummary(projectId, text); if (r.ok) onSystem(r.data); else setError(r.error); }}
          onPart={async (part, text) => { const r = part.startsWith("meta:") && text !== null ? await saveMeta(part.slice(5), text) : await saveDocPart(projectId, part, text); if (r.ok) onSystem(r.data); else setError(r.error); }}
          pins={pins} onPin={pin} onUnpin={unpin} />
      </div>
      {dock && createPortal(
        <TinoDock label={t.tino.dock.edit} placeholder={t.tino.dock.edit} value={ask} onChange={(v) => { setAsk(v); setSay(null); }} onSubmit={(v) => void tell(v)} busy={editing}
          say={say} onSayClose={() => setSay(null)} nudges={nudges} idle={idle} focusRef={askRef} />,
        dock,
      )}
    </div>
  );
}
