"use client";
// A project with nothing in it yet: a setup wizard in one window (the system's .cr-window, moss bar with the
// project's name). Step 1, what the project is about: optional, saved on leaving the field or on Next; it is the
// brief's intention (what the system reads the board against). Step 2, the references: a pasted link (a site, a
// video, a post) is saved and filed here at once, an image is chosen, dropped anywhere or pasted with ⌘V, and the
// references already in the library are picked in a well and brought in from the footer. The Inbox comes first:
// filling a project is how the Inbox gets emptied. As soon as the project has something, the grid replaces this.
import { useMemo, useRef, useEffect, useState } from "react";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { normalizeWebUrl, readableDomain, mediaKindOf, isGif, type MediaKind } from "@/lib/url";
import { MEDIA_ACCEPT, isMediaFile, mediaFileFrom } from "@/lib/media-client";
import { useT } from "./I18nProvider";
import { Busy, Button, Icon, IconButton, PromptInput, SegmentedControl, Separator, StatusBar, StatusCell, TextArea } from "@/components/criterio";
import { cachedCardImage } from "./InspoCard";
import p from "./ProjectStart.module.css";

const PAGE = 12;

function Thumb({ item, image }: { item: InspoItem; image: string | null }) {
  // A text has no picture: it is a page of its first lines (its title is already under it)
  if (mediaKindOf(item.web) === "text") return (
    <span className={`${p.thumb} ${p.page} t-title-m`} aria-hidden>
      {item.note ? <span className={`${p.pageBody} t-label`}>{item.note}</span> : item.name.slice(0, 1).toUpperCase()}
    </span>
  );
  return <Picture item={item} image={image} />;
}

function Picture({ item, image }: { item: InspoItem; image: string | null }) {
  // What the grid already downloaded; otherwise the og:image (a 204 without one falls back to the initial)
  const [src, setSrc] = useState(() => image ?? cachedCardImage(item.web) ?? `/api/og?url=${encodeURIComponent(item.web)}`);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (image) { setSrc(image); setFailed(false); } }, [image]);
  return (
    <span className={`${p.thumb} t-title-m`} aria-hidden>
      {failed ? item.name.slice(0, 1).toUpperCase() : (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

/** Under the name: the site's domain, or what it is when it is a file of ours (never its /api/files path) */
function sourceOf(web: string, kinds: Record<MediaKind, string>, gif: string): string {
  const kind = mediaKindOf(web);
  if (kind === "text") return kinds.text;
  if (kind === "image") return isGif(web) ? gif : kinds.image;
  try { return readableDomain(new URL(web).hostname.replace(/^www\./, "")); } catch { return kinds[kind]; }
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
  const w = t.projects;
  // A project that already says what it is starts on its references
  const [step, setStep] = useState<1 | 2>(() => (project.intent?.trim() ? 2 : 1));
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bringing, setBringing] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [shown, setShown] = useState(PAGE);
  const [dragging, setDragging] = useState(false);
  const [about, setAbout] = useState(project.intent ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const aboutRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Each step starts in its field
  useEffect(() => { (step === 1 ? aboutRef.current : inputRef.current)?.focus(); }, [step]);

  const inbox = useMemo(() => items.filter((i) => i.id && !links[i.id]?.length), [items, links]);
  const library = useMemo(() => items.filter((i) => i.id), [items]);
  const [tab, setTab] = useState<"inbox" | "all">(() => (inbox.length ? "inbox" : "all"));
  const list = tab === "inbox" ? inbox : library;
  const saved = !!about.trim() && about.trim() === (project.intent ?? "").trim();

  const go = (next: 1 | 2) => { setError(""); setStep(next); };
  const submit = async () => {
    const web = normalizeWebUrl(raw);
    if (!web) { setError(t.start.notUrl); return; }
    setBusy(true);
    try { await onAddUrl(web); setRaw(""); } finally { setBusy(false); }
  };
  // Saved on leaving the field and on Next: nothing else to press. False when it could not be saved.
  // Next right after the field's blur waits for the same save instead of sending it twice
  const savedRef = useRef((project.intent ?? "").trim());
  const pendingRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const describe = (): Promise<boolean> => {
    const next = about.trim();
    if (next === savedRef.current) return pendingRef.current;
    const before = savedRef.current;
    savedRef.current = next;
    pendingRef.current = onDescribe(next).then(
      () => { setError(""); return true; },
      (e) => { savedRef.current = before; setError(e instanceof Error ? e.message : String(e)); return false; },
    );
    return pendingRef.current;
  };
  const next = async () => { if (await describe()) go(2); };
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
    setBusy(true); setBringing(true);
    try { await onFile(chosen); } finally { setBusy(false); setBringing(false); }
  };

  const steps = [w.startStepAbout, w.startStepRefs];
  const errorLine = error && <p id="project-start-error" className="cr-field-hint is-error t-small" role="alert">{error}</p>;

  return (
    <>
    <div className={p.scroll} onPaste={onPaste} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
    <div className={p.stage}>
      <section className={`cr-window ${p.window}`} aria-labelledby="project-start-title">
        <header className="cr-window-bar">
          <h1 id="project-start-title" className={`cr-window-title t-title-s ${p.barTitle}`}>{project.name}</h1>
        </header>

        {/* Where the wizard is: the current step is the raised key, a done one carries the tick */}
        <ol className={p.steps} aria-label={w.startSteps}>
          {steps.map((label, i) => {
            const n = (i + 1) as 1 | 2;
            const done = n < step;
            return (
              <li key={n} className={`${p.step} t-ui${n === step ? ` ${p.stepOn}` : ""}`} aria-current={n === step ? "step" : undefined}>
                <span className={p.stepMark} aria-hidden>{done ? <Icon name="check" size={14} /> : n}</span>
                {label}
              </li>
            );
          })}
        </ol>

        {step === 1 ? (
          <div className={`cr-window-body ${p.body}`}>
            <div className={p.intro}>
              <h2 className="t-title-m">{w.startAboutTitle}</h2>
              <p className={`t-small ${p.muted}`}>{w.startAboutLead}</p>
            </div>
            <TextArea
              ref={aboutRef}
              className={p.about}
              rows={4}
              value={about}
              placeholder={w.startDescribe}
              aria-label={w.startDescribeLabel(project.name)}
              aria-invalid={!!error}
              aria-describedby={error ? "project-start-error" : undefined}
              onChange={(e) => { setAbout(e.target.value); setError(""); }}
              onBlur={() => void describe()}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void next(); } }}
            />
            {errorLine}
          </div>
        ) : (
          <div className={`cr-window-body ${p.body}`}>
            <h2 className="t-title-m">{w.startRefsTitle}</h2>
            <div className={p.add}>
              <PromptInput className={p.prompt} id="project-url" inputRef={inputRef} value={raw}
                placeholder={w.startPaste} label={w.startUrlLabel(project.name)} sendLabel={busy ? t.start.saving : t.start.save}
                disabled={busy} busy={busy && !bringing} onChange={(v) => { setRaw(v); setError(""); }} onSubmit={() => void submit()}
                inputProps={{ inputMode: "url", spellCheck: false, "aria-invalid": !!error, "aria-describedby": error ? "project-start-error" : "project-start-hint" }}
                leading={<>
                  <IconButton icon="image" variant="quiet" size="s" disabled={busy} onClick={() => fileRef.current?.click()} label={w.startUpload} />
                  <input ref={fileRef} type="file" accept={MEDIA_ACCEPT} multiple hidden onChange={(e) => void upload(Array.from(e.target.files ?? []))} />
                </>} />
              {errorLine || <p id="project-start-hint" className={`t-small ${p.muted}`}>{w.startLead}</p>}
            </div>

            {library.length > 0 && (
              <div className={p.library}>
                <div className={p.libraryHead}>
                  <h3 className="t-title-s">{w.startFromLibrary}</h3>
                  {/* Two tabs only when they differ: with nothing filed yet the Inbox is the whole library */}
                  {inbox.length !== library.length && (
                    <SegmentedControl tone="paper" label={w.startFromLibrary} active={tab === "inbox" ? 0 : 1}
                      onChange={(i) => { setTab(i === 0 ? "inbox" : "all"); setShown(PAGE); }}
                      items={[{ label: w.inbox, count: inbox.length }, { label: t.sidebar.all, count: library.length }]} />
                  )}
                </div>
                <div className={`cr-listbox ${p.well}`}>
                  {list.length === 0 ? (
                    <p className={`t-small ${p.muted} ${p.none}`}>{w.inboxEmptyHint}</p>
                  ) : (
                    <div className={p.grid}>
                      {list.slice(0, shown).map((item) => {
                        const on = picked.has(item.id!);
                        return (
                          <button key={item.id} type="button" className={`${p.pick}${on ? ` ${p.pickOn}` : ""}`} aria-pressed={on} onClick={() => toggle(item.id!)}>
                            <Thumb item={item} image={imageOf(item)} />
                            {/* The system's Checkbox box (the whole item is the button that ticks it) */}
                            <span className={`cr-check-box ${p.check}`} aria-hidden>
                              <svg width={10} height={8} viewBox="0 0 10 8"><path d="M1 4L4 7L9 1" stroke="currentColor" strokeWidth={2} fill="none" /></svg>
                            </span>
                            <span className={`t-ui ${p.name}`}>{item.name}</span>
                            <span className={`t-small ${p.muted} ${p.host}`}>{sourceOf(item.web, t.system.md.kinds, t.card.gif)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {list.length > shown && (
                    <Button variant="quiet" size="s" className={p.more} onClick={() => setShown((n) => n + PAGE)}>{w.startMore(list.length - shown)}</Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <Separator className={p.sep} />
        <div className={`cr-window-footer ${p.footer}`}>
          <div className={p.footStart}>
            <StatusBar>
              <StatusCell>{step === 1
                ? (saved ? w.startDescribed : w.startOptional)
                : (picked.size ? w.startPicked(picked.size) : w.startNothingPicked)}</StatusCell>
            </StatusBar>
            {step === 2 && onBringBrand && (
              <Button variant="quiet" size="s" icon="folder" data-tip={w.startBrand} onClick={onBringBrand}>{w.startBrandShort}</Button>
            )}
          </div>
          <div className={p.footEnd}>
            {step === 1 ? <>
              <Button onClick={() => go(2)}>{w.startSkip}</Button>
              <Button variant="primary" iconEnd="arrow-right" onClick={() => void next()}>{w.startNext}</Button>
            </> : <>
              <Button onClick={() => go(1)} disabled={bringing}>{w.startBack}</Button>
              <Button variant="primary" icon={bringing ? undefined : "plus"} onClick={() => void bring()} disabled={!picked.size || busy}>
                {bringing && <Busy label={w.startAdd(picked.size)} />}{w.startAdd(picked.size)}
              </Button>
            </>}
          </div>
        </div>
      </section>
    </div>
    </div>
    {dragging && <div className={p.drop} aria-hidden><span className="t-title-l">{w.startDrop}</span></div>}
    </>
  );
}
