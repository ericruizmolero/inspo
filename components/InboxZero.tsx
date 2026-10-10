"use client";
// The Inbox with nothing in it. Emptying it is the work done, not a blank page: the screen says so, shows where
// everything went (each project as its board in small, the ones that took the most first) and keeps the same
// prompt box as an empty project, so what turns up next and has no home yet starts here.
import { useMemo, useRef, useState } from "react";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import type { SystemSummary } from "@/types/system";
import { normalizeWebUrl } from "@/lib/url";
import { MEDIA_ACCEPT, isMediaFile, mediaFileFrom } from "@/lib/media-client";
import { useT } from "./I18nProvider";
import { boardColumns, useBoardStatus } from "./ProjectChooser";
import { BoardCard, Icon, IconButton, PromptInput } from "@/components/criterio";
import s from "./EmptyStart.module.css";
import p from "./ProjectStart.module.css";

const SHOWN = 6;

export default function InboxZero({ projects, systems, items, links, ratioOf, imageOf, onMeasure, isDuplicate, onAddUrl, onUpload, onPick }: {
  projects: Project[];
  /** Each project's system, for the status ring on its card (left out: the ring waits, muted) */
  systems?: Record<string, SystemSummary>;
  /** The whole library, newest first */
  items: InspoItem[];
  links: ProjectLinks;
  /** Height/width of each card on the board: the mini masonry keeps the same shapes */
  ratioOf?: (item: InspoItem) => number;
  imageOf: (item: InspoItem) => string | null;
  /** The board's measure: a picture's shape, once the mini has loaded it */
  onMeasure?: (web: string, ratio: number) => void;
  isDuplicate: (web: string) => boolean;
  /** Saves the URL with no project (it lands in the Inbox) */
  onAddUrl: (web: string) => Promise<void>;
  onUpload: (files: File[]) => Promise<void>;
  onPick: (projectId: string) => void;
}) {
  const { t } = useT();
  const statusOf = useBoardStatus();
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

  const submit = async () => {
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
        <span className={s.done} aria-hidden><Icon name="check" size={20} /></span>
        <h1 className={s.title}>{z.title}</h1>
        <p className={s.lead}>{z.lead}</p>
        <PromptInput className={`cr-on-chrome ${s.prompt} ${p.promptAttach}`} id="inbox-url" value={raw}
          placeholder={z.paste} label={z.urlLabel} sendLabel={busy ? t.start.saving : t.start.save}
          disabled={busy} busy={busy} onChange={(v) => { setRaw(v); setError(""); }} onSubmit={() => void submit()}
          inputProps={{ inputMode: "url", spellCheck: false, "aria-invalid": !!error, "aria-describedby": error ? "inbox-url-error" : undefined }}
          leading={<>
            <IconButton icon="image" variant="quiet" size="m" disabled={busy} onClick={() => fileRef.current?.click()} label={t.projects.startUpload} />
            <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} multiple hidden onChange={(e) => void upload(Array.from(e.target.files ?? []))} />
          </>} />
        {error && <p id="inbox-url-error" className={s.error} role="alert">{error}</p>}
      </div>

      {homes.length > 0 && (
        <div className={s.section}>
          <p className={p.label}>{z.where}</p>
          <div className={`chooser__grid ${p.homes}`}>
            {homes.map(({ project, items: filed }) => {
              const status = statusOf(systems?.[project.id], filed);
              return (
                <BoardCard key={project.id} name={project.name} count={filed.length} countLabel={z.refs(filed.length)}
                  columns={boardColumns(filed, imageOf, ratioOf, onMeasure)} status={status.tone} progress={status.progress} statusLabel={status.label} onClick={() => onPick(project.id)} />
              );
            })}
          </div>
        </div>
      )}
    </section>
    </div>
    {dragging && <div className={p.drop} aria-hidden><span className="t-title-l">{t.add.dropHere}</span></div>}
    </>
  );
}
