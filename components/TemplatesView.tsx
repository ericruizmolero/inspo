"use client";
// The library's templates: whole systems to start a project from. Each one says what it turned into what (a
// client's site and its redesign), shows its eight areas with what they decided and what they never do, and
// carries the recipe of the work. Using one starts a project with that system as proposals and the recipe.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/types/inspo";
import { SYSTEM_AREAS, type SystemArea, type TemplateCard } from "@/types/system";
import { loadRecipe, loadTemplates, removeTemplate, startFromTemplate } from "@/app/actions/templates";
import { criterioBlocks, blocksToMd } from "@/lib/criterio-md";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { areaIcon } from "./area-icons";
import "./SystemStage.css";

const host = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

type Page = { topUrl: string; shotUrl: string; shotH: number; color?: string };

/** The published result in a browser window, as the DESIGN.md sheet shows a site: its first screen, and on
 *  hover the whole page scrolling, eased at each end. Captured with Chromium the first time it is asked for. */
function ResultPage({ id, url }: { id: string; url: string }) {
  const [page, setPage] = useState<Page | null | "failed">(null);
  const [dist, setDist] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/templates/${id}/page`).then((r) => (r.ok ? r.json() : null)).then((p: Page | null) => { if (alive) setPage(p ?? "failed"); }, () => { if (alive) setPage("failed"); });
    return () => { alive = false; };
  }, [id]);
  if (page === "failed") return null;
  const onFull = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget, box = boxRef.current;
    if (box) setDist(Math.max(0, (img.naturalHeight / img.naturalWidth) * box.clientWidth - box.clientHeight));
  };
  return (
    <a className="tpl-page" href={url} target="_blank" rel="noreferrer">
      <span className="pn-bar is-dark tpl-page__bar">
        <span className="dm-frame__lights" aria-hidden><i /><i /><i /></span>
        <span className="pn-bar__url"><span>{host(url)}</span></span>
        <span />
      </span>
      <div ref={boxRef} className="tpl-page__view" style={page?.color ? { background: page.color } : undefined}>
        {!page && <div className="shimmer" />}
        {page && <img className="tpl-page__top" src={page.topUrl} alt={host(url)} />}
        {page && (
          <img className="tpl-page__full" src={page.shotUrl} alt="" aria-hidden fetchPriority="low" onLoad={onFull}
            style={{ "--dm-scroll": `-${dist}px`, animationDuration: `${Math.max(4, Math.round(dist / 170))}s` } as React.CSSProperties} />
        )}
      </div>
    </a>
  );
}

function Template({ tpl, onUse, onDelete }: { tpl: TemplateCard; onUse: (tpl: TemplateCard, name: string) => Promise<void>; onDelete: (tpl: TemplateCard) => Promise<void> }) {
  const { t } = useT();
  const s = t.templates;
  const labels = t.system.areas as Record<SystemArea, string>;
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<"criterio" | "recipe" | null>(null);
  const [recipe, setRecipe] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const md = useMemo(() => blocksToMd(criterioBlocks({ project: tpl.name, system: tpl.system, items: {}, labels, strings: t.system.md, client: tpl.template.from ? { name: host(tpl.template.from), web: tpl.template.from } : null })), [tpl, labels, t]);
  const showRecipe = async () => {
    setFile(file === "recipe" ? null : "recipe");
    if (recipe === null) { const r = await loadRecipe(tpl.id); if (r.ok) setRecipe(r.data); }
  };
  const text = file === "recipe" ? recipe ?? "" : md;
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the download still works */ } };
  const decided = tpl.system.areas.filter((a) => a.decision).length;
  const nevers = tpl.system.areas.reduce((n, a) => n + (a.never ? a.never.split("\n").filter(Boolean).length : 0), 0);
  const use = async () => { if (!name.trim() || busy) return; setBusy(true); try { await onUse(tpl, name.trim()); } finally { setBusy(false); } };

  return (
    <article className="tpl">
      <header className="tpl-head">
        <div className="tpl-head__text">
          <h2 className="tpl-name">{tpl.name}</h2>
          {(tpl.template.from || tpl.template.to) && (
            <p className="tpl-path">
              {tpl.template.from && <a href={tpl.template.from} target="_blank" rel="noreferrer">{host(tpl.template.from)}</a>}
              {tpl.template.from && tpl.template.to && <span aria-hidden>{Icons.arrow}</span>}
              {tpl.template.to && <a href={tpl.template.to} target="_blank" rel="noreferrer">{host(tpl.template.to)}</a>}
            </p>
          )}
          {tpl.template.about && <p className="tpl-about">{tpl.template.about}</p>}
        </div>
        <div className="tpl-head__actions">
          {naming ? (
            <form className="tpl-use" onSubmit={(e) => { e.preventDefault(); void use(); }}>
              <input autoFocus value={name} maxLength={60} placeholder={s.namePlaceholder} aria-label={s.namePlaceholder} disabled={busy} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setNaming(false); } }} />
              <button type="submit" className="tpl-btn tpl-btn--primary" disabled={busy || !name.trim()}>{busy ? <span className="spinner spinner--sm" /> : Icons.check} {s.start}</button>
            </form>
          ) : (
            <button type="button" className="tpl-btn tpl-btn--primary" onClick={() => setNaming(true)}>{Icons.plus} {s.use}</button>
          )}
        </div>
      </header>

      {tpl.template.to && <ResultPage id={tpl.id} url={tpl.template.to} />}

      <p className="tpl-meta">{s.meta(decided, SYSTEM_AREAS.length, nevers)}{tpl.recipeSize > 0 && ` · ${s.withRecipe}`}</p>
      <ul className="tpl-areas">
        {tpl.system.areas.map((a) => (
          <li key={a.area} className={a.decision ? "" : "is-open"}>
            <span className="tpl-areas__label">{areaIcon(a.area, 13)}{labels[a.area]}</span>
            <span className="tpl-areas__line">{a.decision ? a.decision.split(/(?<=[.:;])\s/)[0] : t.system.open}</span>
          </li>
        ))}
      </ul>

      <div className="tpl-files">
        <button type="button" className={`tpl-btn${file === "criterio" ? " is-on" : ""}`} aria-pressed={file === "criterio"} onClick={() => setFile(file === "criterio" ? null : "criterio")}>criterio.md</button>
        {tpl.recipeSize > 0 && <button type="button" className={`tpl-btn${file === "recipe" ? " is-on" : ""}`} aria-pressed={file === "recipe"} onClick={() => void showRecipe()}>receta.md</button>}
        <button type="button" className="tpl-btn tpl-btn--quiet" onClick={() => { if (window.confirm(s.deleteAsk(tpl.name))) void onDelete(tpl); }}>{s.delete}</button>
      </div>
      {file && (
        <section className="mdv tpl-file" aria-label={file === "recipe" ? "receta.md" : "criterio.md"}>
          <header className="mdv-bar">
            <span className="mdv-bar__name">{file === "recipe" ? "receta.md" : "criterio.md"}</span>
            <span className="mdv-bar__hint">{file === "recipe" ? s.recipeHint : s.criterioHint}</span>
            <span className="mdv-bar__tools">
              <button type="button" className="mdv-btn" onClick={() => void copy()}>{copied ? Icons.check : Icons.all} {copied ? t.system.copied : t.system.mdView.copy}</button>
              <button type="button" className="mdv-btn" onClick={() => download(`${tpl.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${file === "recipe" ? "receta" : "criterio"}.md`, text)}><i className="mdv-btn__down">{Icons.arrow}</i> .md</button>
            </span>
          </header>
          {file === "recipe" && recipe === null ? <p className="mdv-doc"><span className="spinner spinner--sm" /></p> : <pre className="mdv-doc tpl-pre">{text}</pre>}
        </section>
      )}
    </article>
  );
}

export default function TemplatesView({ onStarted }: { onStarted: (project: Project) => void }) {
  const { t } = useT();
  const s = t.templates;
  const [list, setList] = useState<TemplateCard[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    loadTemplates().then((r) => { if (!alive) return; if (r.ok) setList(r.data); else setError(r.error); });
    return () => { alive = false; };
  }, []);
  const use = async (tpl: TemplateCard, name: string) => {
    const r = await startFromTemplate(tpl.id, name);
    if (!r.ok) { setError(r.error); return; }
    onStarted(r.data);
  };
  const del = async (tpl: TemplateCard) => {
    const r = await removeTemplate(tpl.id);
    if (r.ok) setList((l) => (l ?? []).filter((x) => x.id !== tpl.id)); else setError(r.error);
  };
  return (
    <div className="tpls">
      <div className="tpls-inner">
        <header className="tpls-head">
          <h1 className="tpls-title">{s.title}</h1>
          <p className="tpls-lead">{s.lead}</p>
        </header>
        {error && <p className="sysv-error" role="alert">{error}</p>}
        {list === null && !error && <p className="sysv-muted"><span className="spinner spinner--sm" /></p>}
        {list?.length === 0 && <p className="tpls-empty">{s.empty}</p>}
        {list?.map((tpl) => <Template key={tpl.id} tpl={tpl} onUse={use} onDelete={del} />)}
      </div>
    </div>
  );
}
