"use client";
// References already in the library, brought into a project: a dialog with the picker in a sunken well (the Inbox
// first: filling a project is how the Inbox gets emptied) and the answer in its footer. Opened from the dock of a
// project's empty board (components/BoardStart.tsx).
import { useMemo, useEffect, useState } from "react";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { readableDomain, mediaKindOf, isGif, type MediaKind } from "@/lib/url";
import { useT } from "./I18nProvider";
import { Busy, Button, Icon, IconButton, SegmentedControl } from "@/components/criterio";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cachedCardImage } from "./InspoCard";
import p from "./LibraryPick.module.css";

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

export default function LibraryPick({ project, items, links, imageOf, onFile, onClose }: {
  project: Project;
  /** The whole library, newest first */
  items: InspoItem[];
  links: ProjectLinks;
  /** The picture the card would show when there is one of its own (uploaded thumbnail, DESIGN.md cover) */
  imageOf: (item: InspoItem) => string | null;
  /** Files the picked ones in the project. Resolves when done. */
  onFile: (items: InspoItem[]) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useT();
  const w = t.projects;
  // Closing plays the dialog out first; whoever opened it unmounts it once it is gone
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [shown, setShown] = useState(PAGE);

  const inbox = useMemo(() => items.filter((i) => i.id && !links[i.id]?.length), [items, links]);
  const library = useMemo(() => items.filter((i) => i.id), [items]);
  const [tab, setTab] = useState<"inbox" | "all">(() => (inbox.length ? "inbox" : "all"));
  const list = tab === "inbox" ? inbox : library;

  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const bring = async () => {
    const chosen = library.filter((i) => picked.has(i.id!));
    if (!chosen.length || busy) return;
    setBusy(true);
    try { await onFile(chosen); setOpen(false); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} onOpenChangeComplete={(o) => { if (!o) onClose(); }}>
      <DialogContent size="lg">
        <div className="modal__header">
          <DialogTitle className="t-title-s">{w.pickTitle(project.name)}</DialogTitle>
          <DialogClose render={<IconButton icon="close" variant="default" size="s" label={t.common.close} />} />
        </div>
        <div className="modal__body">
          {/* Two tabs only when they differ: with nothing filed yet the Inbox is the whole library */}
          {inbox.length !== library.length && (
            <SegmentedControl className={p.tabs} tone="paper" label={w.startFromLibrary} active={tab === "inbox" ? 0 : 1}
              onChange={(i) => { setTab(i === 0 ? "inbox" : "all"); setShown(PAGE); }}
              items={[{ label: w.inbox, count: inbox.length }, { label: t.sidebar.all, count: library.length }]} />
          )}
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
                        <Icon name="check" size={10} weight="bold" />
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
          <div className={p.footer}>
            <p className={`t-small ${p.muted}`} role="status">{picked.size ? w.startPicked(picked.size) : w.startNothingPicked}</p>
            <Button variant="primary" icon={busy ? undefined : "plus"} onClick={() => void bring()} disabled={!picked.size || busy}>
              {busy && <Busy label={w.startAdd(picked.size)} />}{w.startAdd(picked.size)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
