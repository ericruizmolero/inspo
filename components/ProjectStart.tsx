"use client";
// A project with nothing in it yet: the same prompt box as the first-run screen (a pasted URL is saved
// and filed here), and under it the references already in the library, to pick and bring in at once.
// The Inbox comes first: filling a project is how the Inbox gets emptied.
import { useMemo, useRef, useEffect, useState } from "react";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { normalizeWebUrl } from "@/lib/url";
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

function hostOf(web: string): string {
  try { return new URL(web).hostname.replace(/^www\./, ""); } catch { return web; }
}

export default function ProjectStart({ project, items, links, imageOf, onAddUrl, onFile }: {
  project: Project;
  /** The whole library, newest first */
  items: InspoItem[];
  links: ProjectLinks;
  /** The picture the card would show when there is one of its own (uploaded thumbnail, DESIGN.md cover) */
  imageOf: (item: InspoItem) => string | null;
  /** Saves (or, already saved, files) the URL in this project. Resolves when done. */
  onAddUrl: (web: string) => Promise<void>;
  onFile: (items: InspoItem[]) => Promise<void>;
}) {
  const { t } = useT();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [shown, setShown] = useState(PAGE);
  const inputRef = useRef<HTMLInputElement>(null);
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
    <section className={s.wrap}>
      <div className={s.head}>
        <h1 className={s.title}>{project.name}</h1>
        <p className={s.lead}>{t.projects.startLead}</p>
        <form className={s.prompt} onSubmit={submit}>
          <input
            ref={inputRef}
            className={s.promptInput}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(""); }}
            placeholder={t.start.pasteUrl}
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
  );
}
