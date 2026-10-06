"use client";
// The project's system: its criterio.md, the file an agent reads before designing, with the team's tools on each
// area (components/SystemDoc.tsx). The model reads the board into it ("Improve with AI"); the team writes over it.
// Beside it, the brand as a presentation (components/brand/BrandPresentation.tsx): the same values drawn.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InspoItem, Project } from "@/types/inspo";
import { emptySystem, type ProjectSystem, type SystemArea, type SystemFocus } from "@/types/system";
import { blocksToMd, criterioBlocks, type RefInfo } from "@/lib/criterio-md";
import { saveProjectBrief } from "@/app/actions/brief";
import SkillsMenu from "./SkillsMenu";
import ImproveModal from "./ImproveModal";
import { loadSystem, decideSystemArea, setSystemNever, saveDocPart } from "@/app/actions/system";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import SystemDoc from "./SystemDoc";
import { Thumb } from "./Thumb";
import { useSystemActivity } from "./useSystemActivity";
import type { NoteCaption } from "./InspoCard";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BrandPresentation from "./brand/BrandPresentation";
import { useBrandEditor } from "./brand/useBrandEditor";
import { useBrandFonts } from "./brand/useBrandFonts";
import type { BrandRef, FoundFace } from "./brand/context";
import { findBrandFace } from "@/app/actions/brand";
import { uploadBrandFile } from "./brand/upload";
import BrandImport from "./brand/BrandImport";
import ShareDialog from "./brand/ShareDialog";
import { fileUrl } from "@/lib/files-path";
import { mediaKindOf } from "@/lib/url";
import "./SystemView.css";

// Three ways to see the project, in one row of tabs: criterio.md as the Markdown it is, the same file set as a
// document, and the brand as a presentation. The document look is not remembered: the file opens as Markdown,
// the file an agent reads
type View = "markdown" | "doc" | "presentation";
// v2: criterio.md became the default, so an older remembered choice does not hide it
const VIEW_KEY = "criterio.system.view.v2";
function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>("markdown");
  useEffect(() => { try { const v = localStorage.getItem(VIEW_KEY); if (v === "markdown" || v === "presentation") setView(v); } catch { /* the default stands */ } }, []);
  return [view, (v) => { setView(v); try { localStorage.setItem(VIEW_KEY, v === "presentation" ? "presentation" : "markdown"); } catch { /* only this visit */ } }];
}

interface Props {
  project: Project;
  system: ProjectSystem | null;
  onSystem: (system: ProjectSystem) => void;
  /** The references in the project */
  board: InspoItem[];
  /** The whole library: evidence may point at a reference that left the project */
  library: InspoItem[];
  imageOf: (item: InspoItem) => string | null;
  /** The references not filed in any project */
  inbox: InspoItem[];
  /** Files a reference in this project */
  onFile: (item: InspoItem) => Promise<void>;
  /** Switch to the board */
  onOpenBoard: () => void;
  /** Open this area from outside (the agent's "go to motion"); `n` makes the same area open again */
  focusArea?: { area: SystemArea; n: number } | null;
  /** A reference's entry to bring into sight under References (its code, R3), asked for from its panel */
  focusRef?: { code: string; n: number } | null;
  onOpenChange?: (area: SystemArea | null) => void;
  /** A redesign: marks which reference is the client's current site (null clears it) */
  onClient?: (itemId: string | null) => Promise<void>;
  /** Opens a reference's card in the panel */
  onOpenItem?: (item: InspoItem) => void;
  /** The line under a reference: its note or first comment, and who is in its thread */
  noteOf?: (item: InspoItem) => NoteCaption | null;
  /** A reference as criterio.md tells it: what it is, who saved it, what the team said (lib/ref-info.ts) */
  refInfo?: (item: InspoItem) => RefInfo;
  /** Writes the words of a text reference, typed in the file's Content */
  onText?: (itemId: string, text: string) => Promise<void>;
  /** Gives a text reference another title, typed over its heading */
  onTextTitle?: (itemId: string, title: string) => Promise<void>;
  /** Saves a site in the project (or files it, when the library has it) and returns it */
  onAddSite?: (web: string) => Promise<InspoItem | null>;
}

/** A redesign: the reference that is the client's current site, named under the project. Its copy, typefaces, logo and figures rule the system */
function ClientChip({ client, imageOf, onPick }: { client: InspoItem; imageOf: (item: InspoItem) => string | null; onPick: (itemId: string | null) => Promise<void> }) {
  const { t } = useT();
  const s = t.system.client;
  const [busy, setBusy] = useState(false);
  return (
    <span className="spage-client" title={s.hint}>
      <Thumb item={client} image={imageOf(client)} />
      <span>{s.redesignOf} <b>{client.name}</b></span>
      <button type="button" className="spage-client__x" disabled={busy} aria-label={s.clear} title={s.clear} onClick={() => { setBusy(true); void onPick(null).finally(() => setBusy(false)); }}>{Icons.x}</button>
    </span>
  );
}

export default function SystemView({ project, system, onSystem, board, library, imageOf, onOpenBoard, focusArea, focusRef, onOpenChange, onClient, onOpenItem, refInfo, onText, onTextTitle, onAddSite }: Props) {
  const { t, locale } = useT();
  const setSystem = onSystem;
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<Set<SystemArea>>(() => new Set());
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState<SystemArea | null>(null);
  useEffect(() => { if (focusArea) setOpen(focusArea.area); }, [focusArea]);
  // A reference's entry asked for from its panel: its heading line in sight, lit a moment. What is above it can
  // still grow while the file loads (the conversation, the pictures), so it lands again once that has had time
  useEffect(() => {
    if (!focusRef) return;
    const find = () => Array.from(document.querySelectorAll<HTMLElement>("#sdoc-refs .mdv-line, #sdoc-refs .mdv-eline"))
      .find((el) => el.textContent?.startsWith(`### ${focusRef.code} \u00b7`));
    const ids = [60, 700, 1500].map((ms, i) => setTimeout(() => {
      const el = find();
      if (!el) return;
      el.scrollIntoView({ behavior: i ? "auto" : "smooth", block: "center" });
      if (!i) { el.classList.remove("is-flash"); void el.offsetWidth; el.classList.add("is-flash"); }
    }, ms));
    return () => ids.forEach(clearTimeout);
  }, [focusRef]);
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  // An area asked for (by the agent, by a link) is its part of the file, scrolled to
  useEffect(() => { if (open) document.getElementById(`sdoc-${open}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [open]);
  // A pass asked for from "Improve with AI" carries what the team wants from it (ImproveModal); the plain one reads everything
  const [improving, setImproving] = useState(false);
  const [phase, setPhase] = useState<"brand" | null>(null);
  const post = async (path: string, body: object) => {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({})) as ProjectSystem & { error?: string };
    if (!res.ok || json.error) throw new Error(json.error || t.system.failed);
    setSystem(json);
  };
  // Both passes: the board read into the areas, then the brand's values from what the areas now say. Throws
  const runAll = async (focus?: SystemFocus) => {
    setRunning(true);
    try {
      await post("/api/system", { projectId: project.id, focus });
      setPhase("brand");
      await post("/api/system/brand", { projectId: project.id });
    } finally { setRunning(false); setPhase(null); }
  };
  const run = useCallback(async (focus?: SystemFocus) => {
    setError("");
    try { await runAll(focus); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [project.id, t, setSystem]); // eslint-disable-line react-hooks/exhaustive-deps
  const fillBrand = async () => {
    setRunning(true); setPhase("brand"); setError("");
    try { await post("/api/system/brand", { projectId: project.id }); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setRunning(false); setPhase(null); }
  };

  // Fresh on open. A project with references and no reading reads itself
  useEffect(() => {
    let alive = true;
    loadSystem(project.id).then((r) => {
      if (!alive) return;
      if (!r.ok) { setError(r.error); if (!system) setSystem(emptySystem(project.id)); return; }
      setSystem(r.data.system);
      if (!r.data.system.run && r.data.board.itemIds.length) void run();
    });
    return () => { alive = false; };
  }, [project.id, board.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemOf = useMemo(() => { const m = new Map(library.filter((i) => i.id).map((i) => [i.id!, i])); return (id: string) => m.get(id); }, [library]);
  const labels = t.system.areas as Record<SystemArea, string>;
  // A redesign: the client's current site, filed in the project
  const clientItem = project.clientItemId ? board.find((i) => i.id === project.clientItemId) ?? null : null;
  const sys = system ?? emptySystem(project.id);
  const filled = sys.areas.filter((a) => a.decision).length;

  const withBusy = async (area: SystemArea, fn: () => Promise<{ ok: true; data: ProjectSystem } | { ok: false; error: string }>) => {
    setBusy((s) => new Set([...s, area])); setError("");
    try {
      const r = await fn().catch((e) => ({ ok: false as const, error: String(e) }));
      if (!r.ok) throw new Error(r.error);
      setSystem(r.data);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy((s) => { const n = new Set(s); n.delete(area); return n; }); }
  };

  // Each area's conversation (the file carries it): read again whenever an area moves
  const [talkN, setTalkN] = useState(0);
  // What the project is, as it was last written in the file (the brief), until the page loads it again
  const [aboutNow, setAboutNow] = useState<string | null>(null);
  const activity = useSystemActivity(project.id, `${sys.areas.map((a) => a.updatedAt ?? "").join("|")}|${talkN}`);
  // Oldest first: a reference keeps its code (R1, R2…) when more arrive
  const boardIds = useMemo(() => board.map((i) => i.id!).filter(Boolean).reverse(), [board]);
  // The skills switched on for criterio.md, kept with the system so the whole team copies the same file
  const skillsOn = useMemo(() => (sys.doc?.skills ?? "").split(",").filter(Boolean), [sys.doc?.skills]);
  const toggleSkill = async (id: string) => {
    const next = skillsOn.includes(id) ? skillsOn.filter((s) => s !== id) : [...skillsOn, id];
    const r = await saveDocPart(project.id, "skills", next.length ? next.join(",") : null);
    if (r.ok) setSystem(r.data); else setError(r.error);
  };
  // criterio.md in blocks: the file to copy or download, and the Markdown view, where a block is edited in place.
  // It carries the whole project: what it is, each area with its references and what was said, and every reference once
  const blocks = useMemo(() => criterioBlocks({
    project: project.name, system: sys,
    items: Object.fromEntries(library.filter((i) => i.id).map((i) => [i.id!, refInfo ? refInfo(i) : { name: i.name, web: i.web }])),
    labels, strings: t.system.md,
    client: clientItem ? { name: clientItem.name, web: clientItem.web } : null,
    about: aboutNow ?? project.intent, board: boardIds, talk: activity?.notes,
    origin: typeof window === "undefined" ? "" : window.location.origin,
    skills: skillsOn, locale, brand: sys.brand,
  }), [sys, project.name, project.intent, aboutNow, library, boardIds, labels, t, clientItem, refInfo, activity, skillsOn, locale]);
  const markdown = useMemo(() => blocksToMd(blocks), [blocks]);
  // Bringing in a brand that exists: asked for here, or from the empty project's start (?bring=site)
  const [bringing, setBringing] = useState<"site" | "files" | "text" | null>(null);
  const [sharing, setSharing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const b = p.get("bring");
    if (b !== "site" && b !== "files" && b !== "text") return;
    setBringing(b);
    p.delete("bring");
    window.history.replaceState(null, "", window.location.pathname + (p.size ? `?${p}` : ""));
  }, []);
  const [view, setView] = useView();
  const [notice, setNotice] = useState("");
  useEffect(() => { if (!notice) return; const tm = setTimeout(() => setNotice(""), 6000); return () => clearTimeout(tm); }, [notice]);
  // The brand as a presentation: its values edited where they stand, saved section by section
  const editor = useBrandEditor(project.id, sys, setSystem, setNotice, t.brand.moved);
  const fonts = useBrandFonts(editor.brand.typography.faces, fileUrl, async () => {
    const res = await fetch(`/api/system/brand/fonts?projectId=${encodeURIComponent(project.id)}`);
    return res.ok ? ((await res.json()) as { faces: Record<string, { weight: string; style: string; src: string }[]> }).faces : {};
  });
  const refs = useMemo(() => Object.fromEntries(board.filter((i) => i.id).map((i): [string, BrandRef] => [i.id!, { id: i.id!, name: i.name, web: i.web, image: imageOf(i), kind: mediaKindOf(i.web) }])), [board, imageOf]);
  const findFace = useCallback(async (family: string): Promise<FoundFace | null> => { const r = await findBrandFace(project.id, family); return r.ok ? r.data : null; }, [project.id]);

  const copy = async () => { try { await navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the download still works */ } };
  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-criterio.md`; a.click(); URL.revokeObjectURL(a.href);
  };

  const views = (
    <div className="spage-views" role="tablist" aria-label={project.name}>
      {(["markdown", "doc", "presentation"] as const).map((v) => (
        <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "is-on" : ""} onClick={() => setView(v)}>{v === "markdown" ? t.doc.markdown : v === "doc" ? t.doc.document : t.brand.views.presentation}</button>
      ))}
    </div>
  );
  const actions = (
    <div className="spage-head__actions">
      {!filled && <p className="spage-muted">{board.length ? (running ? t.system.running : t.system.runHint(board.length)) : t.system.noBoard}</p>}
      {board.length > 0 ? (
        <Button variant="primary" size="sm" onClick={() => setImproving(true)} disabled={running} title={t.system.improveHint}>
          {running ? <><span className="spinner spinner--sm" /> {phase === "brand" ? t.brand.drawing : t.system.running}</> : <>{Icons.spark} {t.system.improve}</>}
        </Button>
      ) : <Button variant="primary" size="sm" onClick={onOpenBoard}>{Icons.plus} {t.system.addRefs}</Button>}
      {view === "presentation" && filled > 0 && !sys.brand?.run && !running && <Button size="sm" onClick={() => void fillBrand()} title={t.brand.fillHint}>{t.brand.fill}</Button>}
      {/* What is asked for now and then stays out of the row: bringing in a brand that exists, the share links */}
      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger className="btn btn--sm spage-more" aria-label={t.card.more} title={t.card.more}>{Icons.dots}</PopoverTrigger>
        <PopoverContent align="end" className="pp pp--menu spage-more__menu">
          <button type="button" className="ws__item" disabled={running} onClick={() => { setMoreOpen(false); setBringing("site"); }}><span className="ws__item-name">{t.brand.import.title}</span></button>
          <button type="button" className="ws__item" onClick={() => { setMoreOpen(false); setSharing(true); }}><span className="ws__item-name">{t.brand.share.title}</span></button>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className={`spage is-${view}`} aria-busy={!system}>
      <div className="spage-inner">
        <header className="spage-head">
          <div className="spage-head__text">
            <h1 className="spage-title">{project.name}</h1>
            {onClient && clientItem && <ClientChip client={clientItem} imageOf={imageOf} onPick={onClient} />}
          </div>
          <div className="spage-bar">{views}{actions}</div>
        </header>
        {error && <p className="sysv-error" role="alert">{error}</p>}
        {notice && <p className="spage-notice" role="status">{notice}</p>}
        {improving && <ImproveModal system={sys} onRun={(focus) => void run(focus)} onClose={() => setImproving(false)} />}
        {sharing && <ShareDialog projectId={project.id} onClose={() => setSharing(false)} />}
        {bringing && <BrandImport projectId={project.id} brand={editor.brand} initial={bringing} onClose={() => setBringing(null)} onAddSite={onAddSite} onClient={onClient}
          onSystem={setSystem} onRun={() => runAll()} save={editor.save} />}
        {view === "presentation" ? (
          <div className="spage-sheet">
            <BrandPresentation spec={editor.brand} name={project.name} summary={sys.summary} areas={sys.areas} mode="edit" fileSrc={fileUrl} refs={refs}
              stack={fonts.stack} display={fonts.display} text={fonts.text} markdown={markdown}
              save={editor.save} release={editor.release} saving={editor.saving} findFace={findFace}
              upload={(file, purpose) => uploadBrandFile(project.id, file, purpose)} zipHref={`/api/system/brand/assets?projectId=${encodeURIComponent(project.id)}`} />
          </div>
        ) : (
          <SystemDoc look={view === "doc" ? "doc" : "md"} blocks={blocks} system={sys} labels={labels} boardIds={boardIds} itemOf={itemOf} imageOf={imageOf} refInfo={refInfo} activity={activity}
            onSystem={setSystem} onTalk={() => setTalkN((n) => n + 1)}
            onAbout={async (text) => { const r = await saveProjectBrief(project.id, { about: text }); if (r.ok) setAboutNow(r.data.brief?.about ?? text); else setError(r.error); }} onOpenItem={onOpenItem} onText={onText} onTextTitle={onTextTitle}
            fileTools={<SkillsMenu on={skillsOn} onToggle={(id) => void toggleSkill(id)} />}
            busy={busy} onOpen={setOpen} onCopy={() => void copy()} onDownload={download} copied={copied} markdown={markdown} projectId={project.id} projectName={project.name} hasRecipe={!!project.hasRecipe}
            onSave={async (area, next) => {
              const cur = sys.areas.find((x) => x.area === area)!;
              if (next.decision !== cur.decision.trim() || next.why !== cur.why.trim()) await withBusy(area, () => decideSystemArea(project.id, area, { decision: next.decision, why: next.why }));
              if (next.never !== cur.never.trim()) await withBusy(area, () => setSystemNever(project.id, area, next.never));
            }} />
        )}
      </div>
    </div>
  );
}

