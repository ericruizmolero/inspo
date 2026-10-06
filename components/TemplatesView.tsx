"use client";
// The library's templates: whole systems to start a project from. Each one says what it turned into what (a
// client's site and its redesign), shows its eight areas with what they decided and what they never do, and
// carries the recipe of the work. Using one starts a project with that system as proposals and the recipe.
// The library shows them as cards, each with what the work ended as; a card opens its criterio.md.
import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/types/inspo";
import { type SystemArea, type TemplateCard } from "@/types/system";
import { removeTemplate, startFromTemplate } from "@/app/actions/templates";
import { criterioBlocks, blocksToMd } from "@/lib/criterio-md";
import SystemMarkdown from "./SystemMarkdown";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import LoopVideo from "./LoopVideo";
import { mediaKindOf, postOf, readableDomain, videoEmbedOf } from "@/lib/url";
import { posterOf, preloadTemplates, remember, remembered, seen } from "./templates-cache";
import "./SystemMarkdown.css";
import "./Templates.css";

const NONE = new Set<SystemArea>();
// A post is named by whose it is, not by its long address
const host = (u: string) => { const post = postOf(u); return post ? `x.com/${post.user}` : readableDomain(u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")); };
function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

type Page = { topUrl: string; shotUrl: string; shotH: number; color?: string };

/** What the work ended as, as its thumbnail alone: an image or a video as they are (a video loops), a site as
 *  its first screen, and on hover the whole page scrolling, eased at each end (captured with Chromium the
 *  first time it is asked for) */
/** A recording of the result laid over its thumbnail: it plays, looping, while the pointer is on the thumbnail */
function HoverVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current, host = v?.closest(".tplc, .tpl-page");
    if (!v || !host) return;
    v.muted = true;
    const on = () => { v.currentTime = 0; void v.play().catch(() => {}); };
    const off = () => v.pause();
    host.addEventListener("pointerenter", on); host.addEventListener("pointerleave", off);
    return () => { host.removeEventListener("pointerenter", on); host.removeEventListener("pointerleave", off); };
  }, []);
  return <video ref={ref} className="tpl-page__video" src={src} muted loop playsInline preload="metadata" aria-hidden />;
}

/** A built-in template ships the first screen of its result with the app (public/templates/<folder>.jpg): it is
 *  there at once, and it stays as the thumbnail (chosen by hand) once the capture of the page arrives */

function Result({ id, url, video, poster, still = false }: { id: string; url: string; video?: string; poster?: string; still?: boolean }) {
  const kind = mediaKindOf(url);
  const hover = video ? videoEmbedOf(video) : null;
  const hoverSrc = hover && (hover.loops || hover.provider === "file") ? hover.src : null;
  // A post is not a page to capture: its picture is the one the template brings
  if (kind !== "image" && kind !== "video" && kind !== "post") return <ResultPage id={id} url={url} still={still} hoverSrc={hoverSrc} poster={poster} />;
  const v = kind === "video" ? videoEmbedOf(url) : null;
  const view = (
    <div className="tpl-page__view">
      {kind === "image" ? <img className="tpl-page__top" src={url} alt="" /> : kind === "post" ? poster && <img className="tpl-page__top" src={poster} alt="" /> : v?.poster && <img className="tpl-page__top" src={v.poster} alt="" />}
      {v && (v.loops || v.provider === "file") && <LoopVideo src={v.src} />}
    </div>
  );
  // On a card the whole card opens the template: the thumbnail is only a picture there
  return still ? <div className="tpl-page">{view}</div> : <a className="tpl-page" href={url} target="_blank" rel="noreferrer">{view}</a>;
}

function ResultPage({ id, url, still, hoverSrc, poster }: { id: string; url: string; still: boolean; hoverSrc: string | null; poster?: string }) {
  const [page, setPage] = useState<Page | null | "failed">(null);
  const [dist, setDist] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/api/templates/${id}/page`).then((r) => (r.ok ? r.json() : null)).then((p: Page | null) => { if (alive) setPage(p ?? "failed"); }, () => { if (alive) setPage("failed"); });
    return () => { alive = false; };
  }, [id]);
  // Without a capture the picture that came with the app stays; with neither, there is nothing to show
  if (page === "failed" && !poster) return null;
  const shot = page === "failed" ? null : page;
  const onFull = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget, box = boxRef.current;
    if (box) setDist(Math.max(0, (img.naturalHeight / img.naturalWidth) * box.clientWidth - box.clientHeight));
  };
  const Box = still ? "div" : "a";
  return (
    <Box className={`tpl-page${hoverSrc ? " has-video" : ""}`} {...(still ? {} : { href: url, target: "_blank", rel: "noreferrer" })}>
      <div ref={boxRef} className="tpl-page__view" style={shot?.color ? { background: shot.color } : undefined}>
        {!shot && !poster && <div className="shimmer" />}
        {(shot || poster) && <img className="tpl-page__top" src={poster ?? shot?.topUrl} alt={host(url)} />}
        {shot && (
          <img className="tpl-page__full" src={shot.shotUrl} alt="" aria-hidden fetchPriority="low" onLoad={onFull}
            style={{ "--dm-scroll": `-${dist}px`, animationDuration: `${Math.max(4, Math.round(dist / 170))}s` } as React.CSSProperties} />
        )}
        {/* With a recording of the result, the hover plays it instead of scrolling the page */}
        {hoverSrc && <HoverVideo src={hoverSrc} />}
      </div>
    </Box>
  );
}

/** A template in the library: what it ended as, its name, what it turned into what, and what it was. The card
 *  opens it; over its picture, on hover, the two things done with a template, as on the board's cards */
function TemplateCardView({ tpl, onOpen, onUse }: { tpl: TemplateCard; onOpen: () => void; onUse: (tpl: TemplateCard, name: string) => Promise<void> }) {
  const { t } = useT();
  const s = t.templates;
  const [busy, setBusy] = useState(false);
  const use = async () => { if (busy) return; setBusy(true); try { await onUse(tpl, tpl.name); } finally { setBusy(false); } };
  return (
    <div className="tplc">
      <button type="button" className="tplc__open" onClick={onOpen}>
        {tpl.template.to ? <Result id={tpl.id} url={tpl.template.to} video={tpl.template.video} poster={posterOf(tpl)} still /> : <div className="tpl-page"><div className="tpl-page__view tplc__blank">{tpl.name.slice(0, 1)}</div></div>}
        <span className="tplc__name">{tpl.name}</span>
        {(tpl.template.from || tpl.template.to) && (
          <span className="tplc__path">
            {tpl.template.reverse && <b className="tplc__kind" title={s.reverseHint}>{s.reverse}</b>}
            {tpl.template.from && host(tpl.template.from)}
            {tpl.template.from && tpl.template.to && <span aria-hidden>{Icons.arrow}</span>}
            {tpl.template.to && host(tpl.template.to)}
          </span>
        )}
        {tpl.template.about && <span className="tplc__about">{tpl.template.about}</span>}
      </button>
      <div className={`tplc__go${busy ? " is-visible" : ""}`}>
        <button type="button" className="tile__go-btn tile__go-btn--file" disabled={busy} title={s.useHint} onClick={() => void use()}>{busy ? <span className="spinner spinner--sm" /> : Icons.plus}{s.clone}</button>
        <button type="button" className="tile__go-btn tplc__see" onClick={onOpen}>{s.view}</button>
      </div>
    </div>
  );
}

/** A card while the list loads: the same shape as the real one, so nothing jumps when it arrives */
function TemplateCardSkeleton() {
  return (
    <div className="tplc tplc--loading" aria-hidden>
      <div className="tpl-page"><div className="tpl-page__view"><div className="shimmer" /></div></div>
      <span className="sk" style={{ width: "62%", height: 16, marginTop: 2 }} />
      <span className="sk" style={{ width: "44%", height: 12 }} />
      <span className="sk" style={{ width: "88%", height: 12 }} />
    </div>
  );
}


function Template({ tpl, onUse, onDelete }: { tpl: TemplateCard; onUse: (tpl: TemplateCard, name: string) => Promise<void>; onDelete: (tpl: TemplateCard) => Promise<void> }) {
  const { t } = useT();
  const s = t.templates;
  const labels = t.system.areas as Record<SystemArea, string>;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // The template is read as a project's system is: its criterio.md as a document, only here nothing is written
  const blocks = useMemo(() => criterioBlocks({ project: tpl.name, system: tpl.system, items: {}, labels, strings: t.system.md, client: tpl.template.from ? { name: host(tpl.template.from), web: tpl.template.from } : null }), [tpl, labels, t]);
  const md = useMemo(() => blocksToMd(blocks), [blocks]);
  const copy = async () => { try { await navigator.clipboard.writeText(md); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* the download still works */ } };
  // It clones at once under the template's own name: the project can be renamed afterwards
  const use = async () => { if (busy) return; setBusy(true); try { await onUse(tpl, tpl.name); } finally { setBusy(false); } };

  return (
    <article className="tpl">
      <header className="tpl-head">
        <div className="tpl-head__text">
          <h2 className="tpl-name">{tpl.name}</h2>
          {(tpl.template.from || tpl.template.to) && (
            <p className="tpl-path">
              {tpl.template.reverse && <b className="tplc__kind" title={s.reverseHint}>{s.reverse}</b>}
              {tpl.template.from && <a href={tpl.template.from} target="_blank" rel="noreferrer">{host(tpl.template.from)}</a>}
              {tpl.template.from && tpl.template.to && <span aria-hidden>{Icons.arrow}</span>}
              {tpl.template.to && <a href={tpl.template.to} target="_blank" rel="noreferrer">{host(tpl.template.to)}</a>}
            </p>
          )}
          {tpl.template.about && <p className="tpl-about">{tpl.template.about}</p>}
        </div>
        <div className="tpl-head__actions">
          <button type="button" className="tpl-btn tpl-btn--primary" disabled={busy} onClick={() => void use()} title={s.useHint}>{busy ? <span className="spinner spinner--sm" /> : Icons.plus} {s.use}</button>
        </div>
      </header>

      <SystemMarkdown readOnly blocks={blocks} busy={NONE} onCopy={() => void copy()} copied={copied} markdown={md}
        onDownload={() => download(`${tpl.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-criterio.md`, md)}
        projectId={tpl.id} projectName={tpl.name} hasRecipe={tpl.recipeSize > 0} />

      {/* What it ended as, below the file: the thumbnail alone */}
      {tpl.template.to && <Result id={tpl.id} url={tpl.template.to} video={tpl.template.video} poster={posterOf(tpl)} />}

      <div className="tpl-files">
        {!tpl.template.builtin && <button type="button" className="tpl-btn tpl-btn--quiet" onClick={() => { if (window.confirm(s.deleteAsk(tpl.name))) void onDelete(tpl); }}>{s.delete}</button>}
      </div>
    </article>
  );
}

export default function TemplatesView({ workspaceId, head, onStarted }: {
  workspaceId: string;
  /** The head of the page over the cards (Discover's, with its sections); an open template has its own way back */
  head: React.ReactNode;
  onStarted: (project: Project & { boardIds?: string[] }) => void;
}) {
  const { t } = useT();
  const s = t.templates;
  const [list, setList] = useState<TemplateCard[] | null>(() => seen.get(workspaceId) ?? null);
  const [error, setError] = useState("");
  // The template open, or the library
  const [openId, setOpenId] = useState<string | null>(null);
  const open = list?.find((x) => x.id === openId) ?? null;
  const scroller = useRef<HTMLDivElement>(null);
  const go = (id: string | null) => { setOpenId(id); scroller.current?.scrollTo({ top: 0 }); };
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape" && !(e.target as HTMLElement).closest("input, textarea")) go(null); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  useEffect(() => {
    let alive = true;
    // What this browser kept shows at once (after hydration: the server never has it), then the fresh list
    const kept = remembered(workspaceId);
    if (kept) setList(kept);
    preloadTemplates(workspaceId).then((r) => { if (!alive) return; if (r.ok) setList(r.data); else if (!seen.has(workspaceId)) setError(r.error); });
    return () => { alive = false; };
  }, [workspaceId]);
  const use = async (tpl: TemplateCard, name: string) => {
    const r = await startFromTemplate(tpl.id, name);
    if (!r.ok) { setError(r.error); return; }
    onStarted(r.data);
  };
  const del = async (tpl: TemplateCard) => {
    const r = await removeTemplate(tpl.id);
    if (r.ok) { setList((l) => { const next = (l ?? []).filter((x) => x.id !== tpl.id); remember(workspaceId, next); return next; }); go(null); } else setError(r.error);
  };
  return (
    <div className="tpls" ref={scroller}>
      <div className="tpls-inner">
        {open ? (
          <>
            <button type="button" className="tpls-back" onClick={() => go(null)}><span aria-hidden>{Icons.arrow}</span>{s.title}</button>
            {error && <p className="sysv-error" role="alert">{error}</p>}
            <Template tpl={open} onUse={use} onDelete={del} />
          </>
        ) : (
          <>
            {head}
            {error && <p className="sysv-error" role="alert">{error}</p>}
            {list === null && !error && <div className="tplc-grid" aria-busy="true"><TemplateCardSkeleton /><TemplateCardSkeleton /></div>}
            {list?.length === 0 && <p className="tpls-empty">{s.empty}</p>}
            {!!list?.length && <div className="tplc-grid">{list.map((tpl) => <TemplateCardView key={tpl.id} tpl={tpl} onOpen={() => go(tpl.id)} onUse={use} />)}</div>}
          </>
        )}
      </div>
    </div>
  );
}
