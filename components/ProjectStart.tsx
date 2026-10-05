"use client";
// A project with nothing in it yet: the same prompt box as the first-run screen (a pasted link, be it a
// site, a video or a post, is saved and filed here; an image is chosen, dropped anywhere or pasted with ⌘V),
// and under it the references already in the library, to pick and bring in at once. Under the name, the
// project in a sentence: written here, it is the brief's intention (what the system reads the board against).
// The Inbox comes first: filling a project is how the Inbox gets emptied.
import { useMemo, useRef, useEffect, useState } from "react";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { normalizeWebUrl, readableDomain } from "@/lib/url";
import { MEDIA_ACCEPT, isMediaFile, mediaFileFrom } from "@/lib/media-client";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import { cachedCardImage } from "./InspoCard";
import { Button } from "@/components/ui/button";
import s from "./EmptyStart.module.css";
import p from "./ProjectStart.module.css";

const PAGE = 12;

function Thumb({ item, image }: { item: InspoItem; image: string | null }) {
  // What the grid already downloaded; otherwise the og:image (a 204 without one falls back to the initial)
  const [src, setSrc] = useState(() => image ?? cachedCardImage(item.web) ?? `/api/og?url=${encodeURIComponent(item.web)}`);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (image) { setSrc(image); setFailed(false); } }, [image]);
  return (
    <span className={`${s.thumb} ${p.thumb}`} aria-hidden>
      {failed ? item.name.slice(0, 1).toUpperCase() : (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

const IconImage = (
  <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1.75" y="2.25" width="10.5" height="9.5" rx="1.5" /><circle cx="5" cy="5.5" r="1" /><path d="M12 9.5L9 6.5l-4 4-1.5-1.5L1.75 11" /></svg>
);

function hostOf(web: string): string {
  try { return readableDomain(new URL(web).hostname.replace(/^www\./, "")); } catch { return web; }
}

export default function ProjectStart({ project, items, links, imageOf, onAddUrl, onUpload, onDescribe, onFile, onBringBrand }: {
  project: Project;
  /** The whole library, newest first */
  items: InspoItem[];
  links: ProjectLinks;
  /** The picture the card would show when there is one of its own (uploaded thumbnail, DESIGN.md cover) */
  imageOf: (item: InspoItem) => string | null;
  /** Saves (or, already saved, files) the URL in this project. Resolves when done. */
  onAddUrl: (web: string) => Promise<void>;
  /** Uploads the images and files them in this project. Resolves when done. */
  onUpload: (files: File[]) => Promise<void>;
  /** Saves what the project is (the brief's sentence). Throws when it could not be saved. */
  onDescribe: (about: string) => Promise<void>;
  onFile: (items: InspoItem[]) => Promise<void>;
  /** The project has a brand already (a site, files, a guide): opens the system to bring it in */
  onBringBrand?: () => void;
}) {
  const { t } = useT();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [shown, setShown] = useState(PAGE);
  const [dragging, setDragging] = useState(false);
  const [about, setAbout] = useState(project.intent ?? "");
  const [described, setDescribed] = useState(false);
  const [writing, setWriting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const inbox = useMemo(() => items.filter((i) => i.id && !links[i.id]?.length), [items, links]);
  const library = useMemo(() => items.filter((i) => i.id), [items]);
  const [tab, setTab] = useState<"inbox" | "all">(() => (inbox.length ? "inbox" : "all"));
  const list = tab === "inbox" ? inbox : library;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const web = normalizeWebUrl(raw);
    if (!web) { setError(t.start.notUrl); return; }
    setBusy(true);
    try { await onAddUrl(web); setRaw(""); } finally { setBusy(false); }
  };
  // Saved on leaving the field (Enter leaves it): nothing to press
  const describe = async () => {
    const next = about.trim();
    if (next === (project.intent ?? "")) return;
    try { await onDescribe(next); setError(""); setDescribed(true); setTimeout(() => setDescribed(false), 2000); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const upload = async (files: File[]) => {
    if (busy || !files.length) return;
    const images = files.filter(isMediaFile);
    if (!images.length) { setError(t.errors.imagesOnly); return; }
    setError(""); setBusy(true);
    try { await onUpload(images); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  // ⌘V with an image on the clipboard uploads it (a pasted link still goes to the field)
  const onPaste = (e: React.ClipboardEvent) => {
    const f = mediaFileFrom(e.clipboardData);
    if (f) { e.preventDefault(); void upload([f]); }
  };
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const onDragOver = (e: React.DragEvent) => { if (hasFiles(e)) { e.preventDefault(); setDragging(true); } };
  const onDragLeave = (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); };
  const onDrop = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); setDragging(false);
    void upload(Array.from(e.dataTransfer.files));
  };
  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const bring = async () => {
    const chosen = library.filter((i) => picked.has(i.id!));
    if (!chosen.length || busy) return;
    setBusy(true);
    try { await onFile(chosen); } finally { setBusy(false); }
  };

  return (
    <>
    <div className={s.scroll} onPaste={onPaste} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
    <section className={`${s.wrap} ${p.wrap}`}>
      <div className={s.head}>
        <h1 className={s.title}>{project.name}</h1>
        {/* Optional, and it says so: the box is somewhere to write, not a step to get past */}
        <label className={p.describeBox}>
          <textarea
            className={p.describe}
            rows={2}
            value={about}
            placeholder={t.projects.startDescribe}
            aria-label={t.projects.startDescribeLabel(project.name)}
            onChange={(e) => setAbout(e.target.value)}
            onFocus={() => setWriting(true)}
            onBlur={() => { setWriting(false); void describe(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
          />
          <span className={p.describeFoot}>
            <span role="status">{described ? t.projects.startDescribed : writing ? t.projects.startDescribeEnter : t.projects.startOptional}</span>
          </span>
        </label>
        <form className={s.prompt} onSubmit={submit}>
          <button type="button" className={p.attach} disabled={busy} onClick={() => fileRef.current?.click()} aria-label={t.projects.startUpload} title={t.projects.startUpload}>{IconImage}</button>
          <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} multiple hidden onChange={(e) => void upload(Array.from(e.target.files ?? []))} />
          <input
            ref={inputRef}
            className={`${s.promptInput} ${p.promptInput}`}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(""); }}
            placeholder={t.projects.startPaste}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-label={t.projects.startUrlLabel(project.name)}
            aria-invalid={!!error}
            aria-describedby={error ? "project-url-error" : undefined}
          />
          <button type="submit" className={s.send} disabled={busy} aria-label={busy ? t.start.saving : t.start.save}>
            {busy ? <span className="spinner spinner--sm" /> : Icons.arrowUp}
          </button>
        </form>
        {error && <p id="project-url-error" className={s.error} role="alert">{error}</p>}
        <p className={p.hint}>{t.projects.startLead}</p>
        {onBringBrand && <p className={p.hint}><button type="button" className={p.bring} onClick={onBringBrand}>{t.projects.startBrand}</button></p>}
      </div>

      {library.length > 0 && (
        <div className={s.section}>
          <p className={p.label}>{t.projects.startFromLibrary}</p>
          {/* Two tabs only when they differ: with nothing filed yet the Inbox is the whole library */}
          {inbox.length !== library.length && <div className={s.tabs} role="group" aria-label={t.projects.startFromLibrary}>
            {([["inbox", t.projects.inbox, inbox.length], ["all", t.sidebar.all, library.length]] as const).map(([key, title, n]) => (
              <button key={key} type="button" aria-pressed={tab === key}
                className={`${s.tab}${tab === key ? ` ${s.tabOn}` : ""}`} onClick={() => { setTab(key); setShown(PAGE); }}>
                {title}<span className={s.tabCount}>{n}</span>
              </button>
            ))}
          </div>}

          {list.length === 0 ? (
            <p className={p.none}>{t.projects.inboxEmptyHint}</p>
          ) : (
            <div className={p.grid}>
              {list.slice(0, shown).map((item) => {
                const on = picked.has(item.id!);
                return (
                  <button key={item.id} type="button" className={`${p.pick}${on ? ` ${p.pickOn}` : ""}`} aria-pressed={on} onClick={() => toggle(item.id!)}>
                    <Thumb item={item} image={imageOf(item)} />
                    <span className={p.check} aria-hidden>{on && Icons.check}</span>
                    <span className={p.name}>{item.name}</span>
                    <span className={p.host}>{hostOf(item.web)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {list.length > shown && (
            <button type="button" className={s.more} onClick={() => setShown((n) => n + PAGE)}>
              <span>{t.projects.startMore(list.length - shown)}</span>
            </button>
          )}
        </div>
      )}

      {/* The choice is confirmed in one go: the grid replaces this screen as soon as the project has something */}
      {picked.size > 0 && (
        <div className={p.bar} role="status">
          <span className={p.barText}>{t.projects.startPicked(picked.size)}</span>
          <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())} disabled={busy}>{t.common.cancel}</Button>
          <Button variant="primary" size="sm" onClick={bring} disabled={busy}>
            {busy ? <span className="spinner spinner--sm" /> : Icons.plus} <span className={p.barAction}>{t.sidebar.addTo(project.name)}</span>
          </Button>
        </div>
      )}
    </section>
    </div>
    {dragging && <div className={p.drop} aria-hidden><span className="display">{t.add.dropHere}</span></div>}
    </>
  );
}
