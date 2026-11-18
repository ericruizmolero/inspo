"use client";
// Discover › Vault: the pieces we curate ourselves (types/vault.ts), as cards with their picture, sorted by what they
// are: a kind of section or a detail. The categories wait in a menu on the right of Discover's row, as the kinds of resource do, with how many each holds; a card
// opens the entry in the same place (?entry=<slug>), with its picture, what it is and its tags. There the piece itself runs in
// the picture's place, in a sandboxed frame (app/api/vault/[entry]/preview), or its loop where it has one, and "Live preview" opens the piece alone in a tab. The documentation
// (the code, block by block) is shown to partners only: everyone else's agent reads it through the connector, which
// is where it is used. Entries are written from an agent (add_to_vault), not here.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Clouds from "@/components/Clouds";
import { Avatar, Button, Chip, Icon, IconButton, MenuItem, toneFor } from "@/components/criterio";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fmtDate } from "@/lib/i18n/format";
import { plain } from "@/lib/resources";
import { tokenLines } from "@/lib/code-tokens";
import type { VaultCard, VaultEntry } from "@/types/vault";
import { useT } from "./I18nProvider";
import "./Vault.css";

interface Listing { entries: VaultCard[]; partner: boolean; picks: Record<string, string[]> }
// Read once per visit: coming back from an entry, or from another section, shows the cards at once
let cache: Listing | null = null;

const entryInUrl = () => new URLSearchParams(window.location.search).get("entry");
function setEntryInUrl(slug: string | null) {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set("entry", slug); else url.searchParams.delete("entry");
  window.history.pushState(null, "", url);
}

export default function Vault({ query, head, projects }: { projects: readonly { id: string; name: string }[]; query: string; head: (lead: string, picker?: React.ReactNode) => React.ReactNode }) {
  const { t } = useT();
  const [data, setData] = useState<Listing | null>(cache);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/vault").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((d: Listing) => { cache = d; if (alive) setData(d); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  // The open entry lives in the address, so Back closes it and a link opens it
  useEffect(() => {
    const read = () => setOpen(entryInUrl());
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  // The projects each entry is chosen for, as the team changes them from a card or a sheet: kept with the listing
  const setPicks = useCallback((id: string, projects: string[]) => setData((d) => { if (!d) return d; const next = { ...d, picks: { ...d.picks, [id]: projects } }; cache = next; return next; }), []);
  const show = useCallback((slug: string | null) => { setEntryInUrl(slug); setOpen(slug); scroller.current?.scrollTo({ top: 0 }); }, []);

  const labelOf = useCallback((key: string) => (t.taxonomy.section as Record<string, string>)[key] ?? (t.vault.details as Record<string, string>)[key] ?? key, [t]);
  const entries = useMemo(() => data?.entries ?? [], [data]);
  // Only the categories that hold something, sections first and then details, each in the list's own order
  const rail = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    // One list by name: no split between sections and details
    return [...counts].map(([key, n]) => ({ key, n, label: labelOf(key) })).sort((x, y) => x.label.localeCompare(y.label));
  }, [entries, labelOf]);
  const shown = useMemo(() => {
    const words = plain(query).split(/\s+/).filter(Boolean);
    return entries.filter((e) => (!category || e.category === category) && words.every((w) => plain([e.title, labelOf(e.category), e.summary, e.tags.join(" ")].join(" ")).includes(w)));
  }, [entries, category, query, labelOf]);

  const opened = open ? entries.find((e) => e.slug === open) ?? null : null;
  if (open && data) {
    return (
      <>
        <div className="disc-list" ref={scroller}>
          <VaultSheet key={open} slug={open} card={opened} partner={data.partner} projects={projects} used={opened ? data.picks?.[opened.id] ?? [] : []} onPicks={(v) => { if (opened) setPicks(opened.id, v); }} labelOf={labelOf} onBack={() => show(null)}
            onCategory={(c) => { setCategory(c); show(null); }} />
        </div>
        <Clouds />
      </>
    );
  }
  return (
    <>
      <div className="disc-list" ref={scroller}>
        {head(t.vault.lead, rail.length > 0 && (
          // The categories wait in a menu on the right of the row, as the kinds of resource do: all of them, or one,
          // each with how many it holds. Only the ones that hold something
          <Popover open={menu} onOpenChange={setMenu}>
            <PopoverTrigger className={`cr-btn cr-btn-secondary cr-btn-s disc__group${category ? " is-pressed" : ""}`}>
              {category ? labelOf(category) : t.vault.categories} <Icon name="chevron-down" size={16} />
            </PopoverTrigger>
            <PopoverContent align="end" className="cr-menu disc__menu">
              <MenuItem checked={category === null} onClick={() => { setCategory(null); setMenu(false); }}>{t.vault.all}<span className="vault-menu__n">{entries.length}</span></MenuItem>
              {rail.map((c) => (
                <MenuItem key={c.key} checked={category === c.key} onClick={() => { setCategory(c.key); setMenu(false); }}>{c.label}<span className="vault-menu__n">{c.n}</span></MenuItem>
              ))}
            </PopoverContent>
          </Popover>
        ))}
        {!data ? (
          <p className="disc-list__none">{failed ? t.vault.failed : ""}</p>
        ) : !entries.length ? (
          <div className="vault-empty">
            <p className="t-title-m">{t.vault.emptyTitle}</p>
            <p>{data.partner ? t.vault.emptyPartner : t.vault.empty}</p>
          </div>
        ) : shown.length ? (
          <ul className="vault-grid">
            {shown.map((e) => <li key={e.id}><VaultTile entry={e} kind={category ? null : labelOf(e.category)} blank={labelOf(e.category)} projects={projects} used={data.picks?.[e.id] ?? []} onPicks={(v) => setPicks(e.id, v)} onOpen={() => show(e.slug)} /></li>)}
          </ul>
        ) : <p className="disc-list__none">{t.vault.none}</p>}
      </div>
      <Clouds />
    </>
  );
}

// The size a piece is shown at inside a card: the one its picture was taken at, scaled down to the card
const STAGE_W = 800;
const STAGE_H = 600;
/** How long the pointer rests on a card before its piece starts: passing over the grid starts nothing */
const PLAY_AFTER_MS = 140;

/** A card: a raised tile with the picture inside and the name under it. Resting on it with a mouse plays the piece
 *  itself over the picture (the sandboxed preview, scaled to the card): what moves by itself moves, and what answers
 *  to the pointer answers. An entry with a loop plays that instead. A click anywhere, the piece included, opens the entry */
function VaultTile({ entry: e, kind, blank, projects, used, onPicks, onOpen }: { entry: VaultCard; kind: string | null; blank: string; projects: readonly { id: string; name: string }[]; used: readonly string[]; onPicks: (projects: string[]) => void; onOpen: () => void }) {
  const { t } = useT();
  const shot = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const loop = useRef<HTMLVideoElement>(null);
  const timer = useRef<number>(undefined);
  const [play, setPlay] = useState<{ scale: number } | null>(null);
  const [ready, setReady] = useState(false);
  const opened = useRef(onOpen);
  opened.current = onOpen;
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // The piece says when it was clicked (lib/vault-preview.ts cardDoc): only this card's own frame is listened to
  useEffect(() => {
    if (!play) return;
    const heard = (m: MessageEvent) => { if (m.source === frame.current?.contentWindow && (m.data as { vault?: string } | null)?.vault === "open") opened.current(); };
    window.addEventListener("message", heard);
    return () => window.removeEventListener("message", heard);
  }, [play]);
  const enter = (ev: React.PointerEvent) => {
    if (ev.pointerType !== "mouse") return;
    if (e.video) { void loop.current?.play().catch(() => {}); return; }
    if (!e.preview) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPlay({ scale: (shot.current?.clientWidth ?? STAGE_W) / STAGE_W }), PLAY_AFTER_MS);
  };
  const leave = () => {
    window.clearTimeout(timer.current); setPlay(null); setReady(false);
    // Back to the first frame, which is the card's still
    if (loop.current) { loop.current.pause(); loop.current.currentTime = 0.001; }
  };
  return (
    <a className="vault-card" href={`/?in=vault&entry=${encodeURIComponent(e.slug)}`} onPointerEnter={enter} onPointerLeave={leave}
      onClick={(ev) => {
        // A press in the folder's menu reaches here through React, though the menu is drawn elsewhere: not the card's
        if (!ev.currentTarget.contains(ev.target as Node)) return;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
        ev.preventDefault(); onOpen();
      }}>
      <span className="vault-card__shot" ref={shot}>
        {e.image ? <img src={e.image} alt="" loading="lazy" decoding="async" /> : <span className="vault-card__blank">{blank}</span>}
        {/* A loop, where the entry brings one (a piece that moves on scroll, or is heavy to start), in place of the piece.
            It is its own still: it waits on its first frame, so the card shows exactly what will move, and plays on hover */}
        {e.video && <video ref={loop} className="vault-card__loop" src={`${e.video}#t=0.001`} muted loop playsInline preload="metadata" aria-hidden />}
        {play && !e.video && (
          <iframe ref={frame} className={`vault-card__live${ready ? " is-ready" : ""}`} src={`/api/vault/${encodeURIComponent(e.slug)}/preview?card=1${e.category === "buttons" ? "&hover=1" : ""}`} title="" aria-hidden tabIndex={-1}
            sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={() => setReady(true)}
            style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${play.scale})` }} />
        )}
        {/* A button at rest says nothing of what it does: the system's own arrow, drawn with its tip on the piece, says "put yours here". It leaves when the real one arrives */}
        {e.category === "buttons" && !e.video && <svg className="vault-card__hand" width="22" height="22" viewBox="0 0 24 24" aria-hidden focusable="false"><path d="M5 3v16.5l4.2-3.9 2.7 6.2 2.5-1.1-2.7-6.1h5.8z" /></svg>}
        {/* Over the picture on hover, bottom left: the action row a board card has, with its keys. The folder chooses the piece for a
            project, as a card is filed (ember once it is in one); the eye opens it alone in a tab. A press here is never the card's */}
        <span className="vault-card__tools" onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); }}>
          <UseInProject slug={e.slug} projects={projects} used={used} onChange={onPicks} compact />
          {e.preview && <IconButton icon="eye" variant="strong" size="s" label={t.vault.live} onClick={() => window.open(`/api/vault/${encodeURIComponent(e.slug)}/preview`, "_blank", "noopener,noreferrer")} />}
        </span>
        {!e.published && <Chip tone="butter" className="vault-card__draft">{t.vault.draft}</Chip>}
      </span>
      <span className="vault-card__foot">
        <span className="vault-card__text">
          <span className="vault-card__name">{e.title}</span>
          {kind && <span className="vault-card__kind">{kind}</span>}
        </span>
        <span className="vault-card__go" aria-hidden><Icon name="chevron-right" size={14} /></span>
      </span>
    </a>
  );
}

/** One entry, open: its picture, what it is, where it sits in the Vault and, for partners, its documentation */
function VaultSheet({ slug, card, partner, projects, used, onPicks, labelOf, onBack, onCategory }: {
  slug: string; card: VaultCard | null; partner: boolean; projects: readonly { id: string; name: string }[]; used: readonly string[]; onPicks: (projects: string[]) => void; labelOf: (key: string) => string; onBack: () => void; onCategory: (c: string) => void;
}) {
  const { t, locale } = useT();
  const [entry, setEntry] = useState<VaultEntry | null>(null);
  const [missing, setMissing] = useState(false);
  // The piece runs in the picture's place from the start; the picture holds it until the frame has loaded
  const [running, setRunning] = useState(false);
  // The card's loop, as the team just set it from here (the entry's own until then)
  const [video, setVideo] = useState<string | null>(card?.video ?? null);
  useEffect(() => { if (entry) setVideo(entry.video); }, [entry]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/vault/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((e: VaultEntry) => { if (alive) setEntry(e); }).catch(() => { if (alive) setMissing(true); });
    return () => { alive = false; };
  }, [slug]);
  // The card's own fields paint at once; the rest arrives with the entry
  const e = entry ?? card;
  const back = (
    <button type="button" className="back vault-back" onClick={onBack}>
      <span className="back__icon" aria-hidden><Icon name="chevron-left" size={12} /></span>
      <span className="back__label">{t.vault.name}</span>
    </button>
  );
  const previewUrl = `/api/vault/${encodeURIComponent(slug)}/preview`;
  if (!e) return <div className="vault-sheet">{back}{missing && <p className="disc-list__none">{t.vault.gone}</p>}</div>;
  return (
    <article className="vault-sheet">
      {back}
      <header className="vault-sheet__head">
        <h1 className="disc-title">{e.title}</h1>
        {e.summary && <p className="t-body disc-lead">{e.summary}</p>}
      </header>
      <div className="vault-sheet__top">
        <div className="vault-sheet__shot">
          {e.image ? <img src={e.image} alt="" decoding="async" /> : <span className="vault-card__blank">{labelOf(e.category)}</span>}
          {/* With a loop, the box plays the loop, as its card does; the piece itself is one press away ("Live preview") */}
          {video && <video key={video} className="vault-sheet__loop" src={video} autoPlay muted loop playsInline aria-hidden />}
          {/* What the box holds, said in its corner: a loop (a film mark), or the piece itself, which asks to be tried.
              The invitation leaves once the pointer is inside */}
          {video ? <span className="vault-sheet__mark" aria-label={t.vault.isVideo} data-tip={t.vault.isVideo}><Icon name="film" size={16} /></span>
            : e.preview ? <span className="vault-sheet__try" aria-hidden><i />{t.vault.tryIt}</span> : null}
          {!video && e.preview && <iframe className={`vault-sheet__live-frame${running ? " is-ready" : ""}`} src={previewUrl} title={`${e.title}: ${t.vault.live}`} sandbox="allow-scripts" referrerPolicy="no-referrer" onLoad={() => setRunning(true)} />}
        </div>
        {/* Beside the piece, one raised panel: who made it and when, the way to see it alone, where it sits and its tags */}
        <aside className="vault-sheet__side">
          {entry?.by && (
            <div className="vault-by">
              <Avatar initials={entry.by.slice(0, 1).toUpperCase()} name={entry.by} tone={toneFor(entry.by)} src={entry.byImage ?? undefined} size={36} />
              <div className="vault-by__text">
                <span className="vault-by__name">{entry.by}</span>
                <span className="vault-by__when">{e.published ? fmtDate(e.createdAt, locale, { day: "numeric", month: "long", year: "numeric" }) : t.vault.draft}</span>
              </div>
            </div>
          )}
          {(e.preview || e.liveUrl) && (
            <div className="vault-sheet__actions">
              {/* The piece by itself, in a tab of its own: the same sandboxed page the box beside shows. A quiet paper key: the ember is only in its eye, the same one a card shows */}
              {e.preview && <a className="cr-btn cr-btn-secondary cr-btn-s vault-sheet__go" href={previewUrl} target="_blank" rel="noopener noreferrer"><Icon name="eye" size={16} className="vault-sheet__eye" />{t.vault.live}<Icon name="arrow-up-right" size={16} /></a>}
              {e.liveUrl && <a className="cr-btn cr-btn-quiet cr-btn-s vault-sheet__go" href={e.liveUrl} target="_blank" rel="noopener noreferrer">{t.vault.site}<Icon name="arrow-up-right" size={18} /></a>}
            </div>
          )}
          {/* For everyone: ask for this piece without ever holding its code. Choose it for a project (the project's
              criterio.md then names it to the agent), or copy a line that names it for an agent with Criterio connected */}
          <div className="vault-sheet__actions">
            <UseInProject slug={slug} projects={projects} used={used} onChange={onPicks} />
            <CopyForAgent text={t.vault.prompt(e.title, e.slug, labelOf(e.category))} />
          </div>
          <dl className="vault-facts">
            <div><dt>{t.vault.category}</dt><dd><button type="button" className="vault-facts__link" onClick={() => onCategory(e.category)}>{labelOf(e.category)}</button></dd></div>
            {!entry?.by && <div><dt>{e.published ? t.vault.published : t.vault.state}</dt><dd>{e.published ? fmtDate(e.createdAt, locale, { day: "numeric", month: "long", year: "numeric" }) : t.vault.draft}</dd></div>}
            {entry?.sourceUrl && partner && <div><dt>{t.vault.source}</dt><dd><a className="vault-facts__link" href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">{hostOf(entry.sourceUrl)}</a></dd></div>}
          </dl>
          {e.tags.length > 0 && <ul className="vault-tags">{e.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>}
          {partner && entry && <VideoControl slug={slug} video={video} onChange={(v) => { setVideo(v); if (cache) cache = { ...cache, entries: cache.entries.map((x) => (x.slug === slug ? { ...x, video: v } : x)) }; }} />}
        </aside>
      </div>
      {entry?.use && (
        // What an agent reads to choose it, set apart from the rest as a note: a moss rule on its left
        <section className="vault-sheet__part vault-use">
          <h2 className="t-title-s">{t.vault.use}</h2>
          <p className="t-body">{entry.use}</p>
        </section>
      )}
      <section className="vault-sheet__part">
        <header className="vault-docs__head">
          <h2 className="t-title-m">{t.vault.docs}</h2>
          {!!entry?.blocks?.length && <span className="vault-docs__count">{t.vault.steps(entry.blocks.length)}</span>}
        </header>
        {entry?.blocks ? (
          entry.blocks.length
            ? <ol className="vault-steps">{entry.blocks.map((b, i) => <CodeBlock key={i} n={i + 1} title={b.title} lang={b.lang} code={b.code} note={b.note} />)}</ol>
            : <p className="vault-sheet__note">{t.vault.noDocs}</p>
        ) : entry ? <p className="vault-sheet__note">{t.vault.docsViaAgent}</p> : null}
      </section>
    </article>
  );
}

/** "Use in a project": the system's project picker (the board's: a folder, the name and a checkbox per project), opened
 *  by the same key a board card files with. On a card it is the round folder alone, ember once the piece is in a project */
function UseInProject({ slug, projects, used, onChange, compact = false }: {
  slug: string; projects: readonly { id: string; name: string }[]; used: readonly string[]; onChange: (projects: string[]) => void; compact?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const toggle = async (projectId: string) => {
    const on = !used.includes(projectId);
    const before = [...used];
    // On screen first; the server's answer is what stays
    onChange(on ? [...before, projectId] : before.filter((x) => x !== projectId));
    const r = await fetch(`/api/vault/${encodeURIComponent(slug)}/projects`, { method: on ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) }).catch(() => null);
    const d = r?.ok ? ((await r.json().catch(() => null)) as { projects?: string[] } | null) : null;
    onChange(d?.projects ?? before);
  };
  const mine = used.filter((id) => projects.some((p) => p.id === id)).length;
  const label = mine ? t.projects.filedIn(mine) : t.vault.useIn;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      {compact ? (
        <PopoverTrigger className={`cr-iconbtn cr-iconbtn-strong cr-iconbtn-s${mine ? " is-filed" : ""}${open ? " is-open" : ""}`} disabled={!projects.length} aria-label={label} data-tip={open ? undefined : projects.length ? label : t.vault.noProjects}>
          <Icon name="folder" size={16} />
        </PopoverTrigger>
      ) : (
        <PopoverTrigger className={`cr-btn ${mine ? "cr-btn-primary" : "cr-btn-secondary"} cr-btn-s vault-sheet__go`} disabled={!projects.length} data-tip={projects.length ? undefined : t.vault.noProjects}>
          <Icon name="folder" size={16} />{mine ? t.vault.inProjects(mine) : t.vault.useIn}
        </PopoverTrigger>
      )}
      <PopoverContent align={compact ? "start" : "end"} className="pp pp--pick cr-picker">
        <ul className="cr-picker-list cr-scroll-fade" role="group" aria-label={t.vault.useIn}>
          {projects.map((p) => {
            const on = used.includes(p.id);
            return (
              <li key={p.id}>
                <button type="button" className={`cr-picker-item${on ? " is-checked" : ""}`} aria-pressed={on} onClick={() => void toggle(p.id)}>
                  <Icon name="folder" size={16} />
                  <span className="cr-picker-name" title={p.name}>{p.name}</span>
                  <span className="cr-check-box" aria-hidden>{on ? <Icon name="check" size={14} weight="bold" /> : null}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** "Copy for the AI": a line that names the piece, never its code. An agent with Criterio connected reads the rest */
function CopyForAgent({ text }: { text: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return <Button variant="quiet" size="s" className="vault-sheet__go" icon={copied ? "check" : "copy"} data-tip={t.vault.copyForAgentHint} onClick={() => void copy()}>{copied ? t.vault.copied : t.vault.copyForAgent}</Button>;
}

/** How much a file sent from here may weigh: more than this does not reach the server, and goes by link */
const VIDEO_FILE_MAX = 4 * 1024 * 1024;

/** For the team only: the loop the card plays in place of the piece. A link (the file, or a Screen Studio share) or
 *  an MP4 from disk puts one; "Remove" goes back to the piece itself */
function VideoControl({ slug, video, onChange }: { slug: string; video: string | null; onChange: (v: string | null) => void }) {
  const { t } = useT();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const send = async (init: RequestInit) => {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/vault/${encodeURIComponent(slug)}/video`, init);
      const out = (await r.json().catch(() => ({}))) as { video?: string | null; error?: string };
      if (!r.ok) { setError(out.error ?? t.vault.video.failed); return; }
      onChange(out.video ?? null); setLink("");
    } catch { setError(t.vault.video.failed); } finally { setBusy(false); }
  };
  const pick = (f: File | undefined) => {
    if (!f) return;
    if (f.size > VIDEO_FILE_MAX) { setError(t.vault.video.tooBig); return; }
    void send({ method: "POST", headers: { "Content-Type": f.type || "video/mp4" }, body: f });
  };
  return (
    <div className="vault-video">
      <p className="vault-video__title">{t.vault.video.title}<span>{t.vault.video.team}</span></p>
      <p className="vault-video__hint">{video ? t.vault.video.has : t.vault.video.none}</p>
      <form className="vault-video__row" onSubmit={(ev) => { ev.preventDefault(); if (link.trim()) void send({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: link.trim() }) }); }}>
        <input className="cr-input cr-input-s" type="url" value={link} onChange={(ev) => setLink(ev.target.value)} placeholder={t.vault.video.link} aria-label={t.vault.video.link} disabled={busy} />
        <Button size="s" type="submit" disabled={busy || !link.trim()}>{t.vault.video.use}</Button>
      </form>
      <div className="vault-video__row">
        <input ref={file} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(ev) => { pick(ev.target.files?.[0]); ev.target.value = ""; }} />
        <Button size="s" icon="upload" disabled={busy} onClick={() => file.current?.click()}>{busy ? t.vault.video.busy : t.vault.video.upload}</Button>
        {video && <Button size="s" variant="quiet" icon="trash" disabled={busy} onClick={() => void send({ method: "DELETE" })}>{t.vault.video.remove}</Button>}
      </div>
      {error && <p className="vault-video__error" role="alert">{error}</p>}
    </div>
  );
}

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/** A step of the documentation: its number on a rail that runs down the steps, its name and note, then the code in a
 *  sunken well with its language, how long it is and Copy. The code is coloured by kind and numbered by line */
function CodeBlock({ n, title, lang, code, note }: { n: number; title: string; lang: string; code: string; note?: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const lines = useMemo(() => tokenLines(lang, code), [lang, code]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { return; }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <li className="vault-step">
      <span className="vault-step__n" aria-hidden>{n}</span>
      <div className="vault-step__body">
        <h3 className="t-title-s">{title}</h3>
        {note && <p className="vault-sheet__note">{note}</p>}
        <div className="vault-code">
          <div className="vault-code__bar">
            <span className="vault-code__lang">{lang.toUpperCase()}</span>
            <span className="vault-code__len">{t.vault.lines(lines.length)}</span>
            <Button variant="quiet" size="s" icon={copied ? "check" : "copy"} onClick={() => void copy()}>{copied ? t.vault.copied : t.vault.copy}</Button>
          </div>
          <pre tabIndex={0}><code>{lines.map((line, i) => (
            <span key={i} className="vault-code__line">{line.map((tk, j) => (tk.kind ? <span key={j} className={`vault-tk-${tk.kind}`}>{tk.text}</span> : tk.text))}{"\n"}</span>
          ))}</code></pre>
        </div>
      </div>
    </li>
  );
}
