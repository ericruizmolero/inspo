"use client";
// criterio.md's versions where the version is named: the head's "System v3 · 8 of 8 decided" opens every version, and
// picking one shows that file in place of the page, with what it brought in and took out against the one before.
// Arrows (and ← →) walk from the first to the latest; "Back to now" returns to the live file. Replaces VersionsModal
// (Eric, 04-11: "un desplegable o algo que puedas ver todas las versiones, clickar en ellas y verlas cambiadas").
import { useEffect, useMemo, useState } from "react";
import { criterioVersionFile, criterioVersions } from "@/app/actions/system";
import { timeAgo } from "@/lib/i18n/format";
import { lineDiff } from "@/lib/line-diff";
import type { CriterioVersionRow } from "@/lib/criterio-versions";
import { SYSTEM_AREAS, type SystemArea } from "@/types/system";
import { Avatar, Busy, Button, Icon, IconButton, toneFor } from "@/components/criterio";
import { areaIcon } from "./area-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import { Line } from "./SystemMarkdown";
import "./SystemDoc.css";
import "./VersionPicker.css";

/** The project's versions, newest first, read again whenever the head's number moves */
export function useVersions(projectId: string, current: number | null): CriterioVersionRow[] | null {
  const [rows, setRows] = useState<CriterioVersionRow[] | null>(null);
  useEffect(() => { void criterioVersions(projectId).then((r) => setRows(r.ok ? r.data : [])); }, [projectId, current]);
  return rows;
}

function useRowText() {
  const { t, locale } = useT();
  const s = t.system.mdView.versions;
  const how = (via: string) => via === "copy" ? s.via.copy : via === "download" ? s.via.download : via === "result" ? s.via.result : via === "edit" ? s.via.edit
    : via.startsWith("mcp-write") ? s.via.mcpWrite(via.replace(/^mcp-write:?/, "") || "MCP") : s.via.mcp(via.replace(/^mcp:?/, "") || "MCP");
  const areas = (keys: string[]) => keys.map((k) => t.system.areas[k as SystemArea] ?? k).join(", ");
  const areaName = (k: string) => t.system.areas[k as SystemArea] ?? k;
  return {
    s,
    how: (r: CriterioVersionRow) => how(r.via),
    areaName,
    /** What changed, short: the names up to two, then how many (the icons beside say which) */
    areasShort: (r: CriterioVersionRow) => r.n === 1 ? s.first : !r.changed.length ? s.same
      : r.changed.length >= SYSTEM_AREAS.length ? s.allAreas : r.changed.length <= 2 ? areas(r.changed) : s.someAreas(r.changed.length),
    when: (r: CriterioVersionRow) => timeAgo(r.at, locale, t),
    who: (r: CriterioVersionRow) => r.byName ? s.by(r.byName, how(r.via)) : how(r.via),
    what: (r: CriterioVersionRow) => r.n === 1 ? s.first : r.changed.length ? s.changed(areas(r.changed)) : s.same,
  };
}

/** Who made a version: their photo or initial; an agent with no person behind is a square with its client's initial */
export function VersionFace({ row, size = 24 }: { row: CriterioVersionRow; size?: number }) {
  const agent = row.via.replace(/^mcp(-write)?:?/, "") || "MCP";
  if (!row.byName) return <Avatar square tone="chrome" size={size} name={agent} initials={agent.slice(0, 1).toUpperCase()} className="vpk-face" />;
  const initials = row.byName.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <Avatar src={row.byImage} tone={toneFor(row.byName)} size={size} name={row.byName} initials={initials} className="vpk-face" />;
}

/** The head's label as the trigger: the version and how many areas are decided, opening the list */
export function VersionPicker({ label, rows, current, viewing, onPick }: {
  label: string; rows: CriterioVersionRow[] | null; current: number; viewing: number | null; onPick: (n: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { s, when, how, areaName, areasShort } = useRowText();
  // The live file is a version of its own until it leaves: shown on top when it is ahead of the last one kept
  const live = !rows?.length || rows[0].n !== current;
  const pick = (n: number | null) => { setOpen(false); onPick(n); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="vpk-trigger spage-muted spage-label" data-tip={s.pick}>
        {label}<Icon name="chevron-down" size={14} />
      </PopoverTrigger>
      {/* The team's history: a face per version on a thread that runs down the left, who and how in one line, the
          areas they touched as their icons (Eric, 06-11: "a Alberto le puedes acompañar con su fotito") */}
      <PopoverContent align="end" className="cr-menu vpk-menu">
        <ol className="vpk-list">
          {live && (
            <li className="vpk-item"><button type="button" className={`vpk-row${viewing === null ? " is-on" : ""}`} aria-pressed={viewing === null} onClick={() => pick(null)}>
              <span className="vpk-rail vpk-rail--file"><Icon name="file-md" size={18} /></span>
              <span className="vpk-row__main">
                <span className="vpk-row__who"><b>{s.nowWhat}</b></span>
              </span>
              <span className="vpk-row__meta"><b>v{current}</b><span>{s.now}</span></span>
            </button></li>
          )}
          {rows?.map((r, i) => {
            const isNow = !live && i === 0;
            const on = isNow ? viewing === null : viewing === r.n;
            const all = r.changed.length >= SYSTEM_AREAS.length;
            return (
              <li key={r.n} className="vpk-item"><button type="button" className={`vpk-row${on ? " is-on" : ""}`} aria-pressed={on} onClick={() => pick(isNow ? null : r.n)}>
                <span className="vpk-rail"><VersionFace row={r} /></span>
                <span className="vpk-row__main">
                  <span className="vpk-row__who">{r.byName ? <><b>{r.byName}</b> {how(r)}</> : <b>{how(r)}</b>}</span>
                  <span className="vpk-row__areas">
                    {r.n > 1 && !all && r.changed.map((k) => <span key={k} className="vpk-area" data-tip={areaName(k)}>{areaIcon(k as SystemArea, 14)}</span>)}
                    <span className="vpk-row__areas-text">{areasShort(r)}</span>
                  </span>
                </span>
                <span className="vpk-row__meta"><b>v{r.n}</b><span>{isNow ? s.now : when(r)}</span></span>
              </button></li>
            );
          })}
        </ol>
      </PopoverContent>
    </Popover>
  );
}

/** One version in place of the page: its file with the lines it brought in and took out against the one before */
export function VersionView({ projectId, projectName, n, rows, onPick }: {
  projectId: string; projectName: string; n: number; rows: CriterioVersionRow[]; onPick: (n: number | null) => void;
}) {
  const { s, when, who, what } = useRowText();
  const ns = useMemo(() => rows.map((r) => r.n).sort((a, b) => a - b), [rows]);
  const at = ns.indexOf(n);
  const prev = at > 0 ? ns[at - 1] : null;
  const next = at >= 0 && at < ns.length - 1 ? ns[at + 1] : null;
  const row = rows.find((r) => r.n === n);
  const [files, setFiles] = useState<{ n: number; file: string; before: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    void Promise.all([criterioVersionFile(projectId, n), prev === null ? null : criterioVersionFile(projectId, prev)]).then(([a, b]) => {
      if (!live) return;
      setFiles({ n, file: a.ok ? a.data ?? "" : "", before: b && b.ok ? b.data : null });
    });
    return () => { live = false; };
  }, [projectId, n, prev]);

  // ← → walk the versions; Escape goes back to now. Not while typing anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.key === "ArrowLeft" && prev !== null) onPick(prev);
      else if (e.key === "ArrowRight") onPick(next);
      else if (e.key === "Escape") onPick(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onPick]);

  const ready = files?.n === n ? files : null;
  const lines = useMemo(() => !ready ? [] : ready.before === null ? ready.file.split("\n").map((text) => ({ kind: "same" as const, text })) : lineDiff(ready.before, ready.file), [ready]);
  const added = lines.filter((l) => l.kind === "add").length;
  const removed = lines.filter((l) => l.kind === "del").length;
  // That version's own parts, from its "## " headings: the index the live file has, in the same sticky column
  const parts = useMemo(() => lines.flatMap((l, i) => (l.kind !== "del" && /^## /.test(l.text) ? [{ i, label: l.text.slice(3).trim() }] : [])), [lines]);
  const go = (i: number) => document.getElementById(`vpk-l${i}`)?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  const copy = async () => { if (!ready) return; try { await navigator.clipboard.writeText(ready.file); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* download still works */ } };
  const download = () => {
    if (!ready) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ready.file], { type: "text/markdown" }));
    a.download = `${projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-criterio-v${n}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    // The live file's frame (.sdoc: the same width, the index sticky on the left), so a version reads in its place
    // (Eric, 04-11: "de ancho igual que el anterior y los sticky también")
    <section className="sdoc vpk-view" aria-label={s.viewing(n)}>
      <nav className="sdoc-toc" aria-label={s.viewing(n)}>
        {parts.map((p) => <button key={p.i} type="button" onClick={() => go(p.i)} title={p.label}><span className="sdoc-toc__name">{p.label}</span></button>)}
      </nav>
      <div className="sdoc-page sdoc-page--md">
      <div className="vpk-bar">
        <IconButton icon="chevron-left" variant="quiet" size="s" label={s.prev} disabled={prev === null} onClick={() => prev !== null && onPick(prev)} />
        {row && <VersionFace row={row} size={28} />}
        <div className="vpk-bar__text">
          <p className="vpk-bar__title">{s.viewing(n)}{row && <span className="vpk-bar__when"> {when(row)}</span>}</p>
          {row && <p className="vpk-bar__what">{who(row)}. {what(row)}{ready && ready.before !== null ? `. ${s.diff(added, removed)}` : ""}</p>}
        </div>
        <IconButton icon="chevron-right" variant="quiet" size="s" label={s.next} onClick={() => onPick(next)} />
        <div className="vpk-bar__actions">
          <Button variant="quiet" size="s" onClick={download} disabled={!ready}>{s.download}</Button>
          <Button variant="quiet" size="s" onClick={() => void copy()} disabled={!ready}>{copied ? s.copied : s.copy}</Button>
          <Button variant="secondary" size="s" onClick={() => onPick(null)}>{s.back}</Button>
        </div>
      </div>
      {!ready ? <p className="vpk-loading" role="status"><Busy label={s.loading} /> {s.loading}</p> : (
        // The file as the Agent view draws it (SystemMarkdown's Line), in a frame of its own: a dashed edge says it is
        // a past version, not the file being written (Eric, 04-11: "el mismo diseño que el MD, quizás con algún borde diferente")
        <div className="mdv vpk-mdv" tabIndex={0}>
          <div className="mdv-doc">
            {lines.map((l, i) => <div key={i} id={`vpk-l${i}`} className={`vpk-line is-${l.kind}`}><Line text={l.text} /></div>)}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
