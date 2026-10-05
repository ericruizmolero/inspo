"use client";
// The Inbox with nothing in it. Emptying it is the work done, not a blank page: the screen says so, shows where
// everything went (each project as its board in small, the ones that took the most first) and keeps the same
// prompt box as an empty project, so what turns up next and has no home yet starts here.
import { useMemo, useRef, useState } from "react";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { normalizeWebUrl } from "@/lib/url";
import { MEDIA_ACCEPT, isMediaFile, mediaFileFrom } from "@/lib/media-client";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import { Cover } from "./ProjectChooser";
import s from "./EmptyStart.module.css";
import p from "./ProjectStart.module.css";

const SHOWN = 6;

const IconImage = (
  <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="1.75" y="2.25" width="10.5" height="9.5" rx="1.5" /><circle cx="5" cy="5.5" r="1" /><path d="M12 9.5L9 6.5l-4 4-1.5-1.5L1.75 11" /></svg>
);

export default function InboxZero({ projects, items, links, ratioOf, imageOf, isDuplicate, onAddUrl, onUpload, onPick }: {
  projects: Project[];
  /** The whole library, newest first */
  items: InspoItem[];
  links: ProjectLinks;
  ratioOf: (item: InspoItem) => number;
  imageOf: (item: InspoItem) => string | null;
  isDuplicate: (web: string) => boolean;
  /** Saves the URL with no project (it lands in the Inbox) */
  onAddUrl: (web: string) => Promise<void>;
  onUpload: (files: File[]) => Promise<void>;
  onPick: (projectId: string) => void;
}) {
  const { t } = useT();
  const z = t.projects.inboxZero;
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Where the references went: every project with something in it, the fullest first
  const homes = useMemo(() => {
    const by = new Map<string, InspoItem[]>();
    for (const i of items) for (const pid of (i.id && links[i.id]) || []) by.set(pid, [...(by.get(pid) ?? []), i]);
    return projects.filter((pr) => by.has(pr.id)).map((pr) => ({ project: pr, items: by.get(pr.id)! }))
      .sort((a, b) => b.items.length - a.items.length).slice(0, SHOWN);
  }, [projects, items, links]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const web = normalizeWebUrl(raw);
    if (!web) { setError(t.start.notUrl); return; }
    if (isDuplicate(web)) { setError(t.start.alreadySaved); return; }
    setBusy(true);
    try { await onAddUrl(web); setRaw(""); } finally { setBusy(false); }
  };
  const upload = async (files: File[]) => {
    if (busy || !files.length) return;
    const media = files.filter(isMediaFile);
    if (!media.length) { setError(t.errors.imagesOnly); return; }
    setError(""); setBusy(true);
    try { await onUpload(media); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const f = mediaFileFrom(e.clipboardData);
    if (f) { e.preventDefault(); void upload([f]); }
  };
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  return (
    <>
    <div className={s.scroll} onPaste={onPaste}
      onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); setDragging(false); void upload(Array.from(e.dataTransfer.files)); }}>
    <section className={s.wrap}>
      <div className={s.head}>
        <span aria-hidden style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: "50%", background: "var(--surface)", color: "var(--text-2)" }}>{Icons.check}</span>
        <h1 className={s.title}>{z.title}</h1>
        <p className={s.lead}>{z.lead}</p>
        <form className={s.prompt} onSubmit={submit}>
          <button type="button" className={p.attach} disabled={busy} onClick={() => fileRef.current?.click()} aria-label={t.projects.startUpload} title={t.projects.startUpload}>{IconImage}</button>
          <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} multiple hidden onChange={(e) => void upload(Array.from(e.target.files ?? []))} />
          <input
            className={`${s.promptInput} ${p.promptInput}`}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(""); }}
            placeholder={z.paste}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-label={z.urlLabel}
            aria-invalid={!!error}
            aria-describedby={error ? "inbox-url-error" : undefined}
          />
          <button type="submit" className={s.send} disabled={busy} aria-label={busy ? t.start.saving : t.start.save}>
            {busy ? <span className="spinner spinner--sm" /> : Icons.arrowUp}
          </button>
        </form>
        {error && <p id="inbox-url-error" className={s.error} role="alert">{error}</p>}
      </div>

      {homes.length > 0 && (
        <div className={s.section}>
          <p className={p.label}>{z.where}</p>
          <div className="chooser__grid" style={{ marginTop: 0 }}>
            {homes.map(({ project, items: filed }) => (
              <button key={project.id} type="button" className="chooser__card" onClick={() => onPick(project.id)}>
                <Cover name={project.name} items={filed} ratioOf={ratioOf} imageOf={imageOf} />
                <span className="chooser__card-head"><span className="chooser__card-name">{project.name}</span></span>
                <span className="chooser__card-meta">{z.refs(filed.length)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
    </div>
    {dragging && <div className={p.drop} aria-hidden><span className="display">{t.add.dropHere}</span></div>}
    </>
  );
}
