"use client";

import { hueFor, Avatar } from "./CommentsPanel";

import { Fragment, useState, useEffect, useRef } from "react";
import { InspoItem, InspoTags, Project, TagStatus, type InspoComment } from "@/types/inspo";
import { TAGS, TAG_THRESHOLD, viewOf } from "@/lib/taxonomy";
import { useT } from "./I18nProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProjectPicker, { IconFolder } from "./ProjectPicker";
import AreaPicker from "./AreaPicker";
import { areaIcon } from "./area-icons";
import { Icons } from "./Sidebar";
const IconCompass = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><circle cx="8" cy="8" r="6.2" /><path d="M10.6 5.4 9.2 9.2 5.4 10.6 6.8 6.8z" /></svg>
);
import type { SystemArea } from "@/types/system";
import { mediaKindOf, videoEmbedOf, isGif, postThumbKind, readableDomain } from "@/lib/url";
import LoopVideo from "./LoopVideo";
import "./TextRef.css";
import "./InspoCard.css";
import { useDecodedSrc } from "@/hooks/use-decoded-src";
import { markShown, wasShown } from "@/lib/shown-images";
import { useImageReady } from "@/hooks/use-image-ready";

const BLOCKED = ["x.com", "twitter.com", "linkedin.com", "primevideo.com", "instagram.com", "youtube.com"];

function getDomain(url: string) {
  try { return readableDomain(new URL(url).hostname.replace("www.", "")); } catch { return ""; }
}
function isBlocked(url: string) {
  const d = getDomain(url);
  return BLOCKED.some((b) => d.includes(b));
}
/** Our private blobs go through the proxy; anything else (local files, a video's frame, blob:) loads as is */

type ImgSource = "idle" | "og" | "shot" | "error";

// Images already resolved per URL: moving cards between columns makes React
// remount them, and without this everything would download (and flicker) again.
const imgCache = new Map<string, { src: string | null; source: ImgSource }>();

// Captures take seconds each and the server runs one Chrome at a time: a request waiting for its turn
// still holds one of the browser's six connections to the app. At most two wait at once, so the
// covers, avatars and pages that are ready never queue behind them.
const CAPTURE_SLOTS = 2;
let capturesOut = 0;
const captureQueue: (() => void)[] = [];
function captureSlot(signal: AbortSignal): Promise<() => void> {
  const release = () => { capturesOut--; captureQueue.shift()?.(); };
  if (capturesOut < CAPTURE_SLOTS) { capturesOut++; return Promise.resolve(release); }
  return new Promise((resolve, reject) => {
    const go = () => { capturesOut++; resolve(release); };
    captureQueue.push(go);
    signal.addEventListener("abort", () => {
      const i = captureQueue.indexOf(go);
      if (i >= 0) captureQueue.splice(i, 1);
      reject(new DOMException("aborted", "AbortError"));
    }, { once: true });
  });
}

/** The image a card already resolved for this URL, if any (the project start screen reuses it). */
export function cachedCardImage(web: string): string | null {
  return imgCache.get(web)?.src ?? null;
}

interface InspoCardProps {
  item: InspoItem;
  tags?: InspoTags;
  /** Its tagging job while it isn't done: the card says it is gathering them */
  tagJob?: TagStatus;
  score?: number;
  reason?: string;
  manualThumbnail?: string;
  onUpload: (file: File) => Promise<void>;
  onRemoveThumbnail: () => Promise<void>;
  /** Opens the reference in its panel (the page with its post-its, and its thread) */
  onOpen: () => void;
  designCover?: string;   // 720x450 cover generated with the DESIGN.md (on the board: the page)
  /** The same picture through the app, tried once if designCover fails (a signed link that expired) */
  designCoverFallback?: string;
  designScroll?: string;  // long strip that scrolls on hover
  commentCount?: number;  // replies in the thread (not counting the original note)
  /** What whoever saved it highlighted (the note), or failing that the first reply: shown under the tile */
  caption?: NoteCaption | null;
  onComments?: () => void;
  onDelete?: () => Promise<void>; // remove the card from the workspace
  /** The workspace's projects and the ones this card is filed in (the folder button); none = no button */
  projects?: Project[];
  projectIds?: string[];
  onToggleProject?: (projectId: string, on: boolean) => void;
  onCreateProject?: (name: string) => Promise<void>;
  /** Inside a project: the areas of its system this piece backs, and the toggle to file it under one */
  backs?: SystemArea[];
  /** The areas it backs in each project's system, shown on the folder button's rows */
  areasIn?: Record<string, SystemArea[]>;
  onToggleArea?: (area: SystemArea, on: boolean) => void;
  /** Picked for a bulk action (SelectBar). While anything is picked, a click picks instead of opening */
  selected?: boolean;
  selecting?: boolean;
  /** Pick or unpick it; range: ⇧ was held, so everything from the last pick to here */
  onSelect?: (range: boolean) => void;
  /** On the board: the page's top as the cover, sized before it loads */
  board?: {
    /** Height/width of the media, when known (the layout already reserved it) */
    ratio?: number;
    /** The media loaded and its height/width was unknown or changed */
    onMeasure?: (ratio: number) => void;
    /** The page's own colour, painted until its image arrives */
    color?: string;
    /** The same page at other sizes: one already decoded stands in while the cover loads */
    alternates?: (string | undefined)[];
  };
}

const IconUpload = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10V2M7 2L4 5M7 2l3 3" /><path d="M2 12h10" />
  </svg>
);
const IconComment = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M2 3.5A1.5 1.5 0 013.5 2h7A1.5 1.5 0 0112 3.5v5a1.5 1.5 0 01-1.5 1.5H6l-3 2.5V10h-.5A1.5 1.5 0 012 8.5z" />
  </svg>
);
const IconTrash = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 4h9M5.5 4V2.5h3V4M4 4l.6 8h4.8L10 4" />
  </svg>
);
const IconX = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 2l8 8M10 2l-8 8" />
  </svg>
);
const IconMore = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden><circle cx="3.5" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.5" cy="8" r="1.3" /></svg>
);
const IconExternal = (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10l6-6M5 4h5v5" />
  </svg>
);
const IconPlay = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M4 2.5v9a.5.5 0 00.77.42l7-4.5a.5.5 0 000-.84l-7-4.5A.5.5 0 004 2.5z" /></svg>
);
const IconInfo = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="6" cy="6" r="5" /><path d="M6 5.5V8.5M6 3.6v.1" />
  </svg>
);

export interface NoteCaption { name: string; image: string | null; body: string; people: { name: string; image: string | null }[]; more: number }

/** Under the tile: the note of whoever saved it; with no note, the first reply with text.
 *  `people` are everyone in the thread (saver first, then each new voice), at most three circles;
 *  `more` counts every comment in the thread, as the card's comment button does, so the two never disagree. */
export function captionFor(item: InspoItem, comments: InspoComment[] | undefined, authorImage: string | undefined): NoteCaption | null {
  const firstComment = comments?.find((c) => c.body.trim());
  const root = item.note.trim()
    ? { name: item.addedBy, image: authorImage ?? null, body: item.note.trim() }
    : firstComment ? { name: firstComment.authorName, image: firstComment.authorImage, body: firstComment.body.trim() } : null;
  if (!root) return null;
  const people = [{ name: root.name, image: root.image }];
  for (const c of comments ?? []) {
    if (people.length >= 3) break;
    if (!people.some((p) => p.name === c.authorName)) people.push({ name: c.authorName, image: c.authorImage });
  }
  // The whole thread, the same number the card's comment button shows
  return { ...root, people, more: comments?.length ?? 0 };
}

export default function InspoCard({ item, tags, tagJob, score, reason, manualThumbnail: uploadedThumb, onUpload, onRemoveThumbnail, onOpen, designCover: coverSrc, designCoverFallback, designScroll, commentCount = 0, caption, onComments, onDelete, projects, projectIds = [], onToggleProject, onCreateProject, backs = [], onToggleArea, areasIn, board, selected = false, selecting = false, onSelect }: InspoCardProps) {
  const { t } = useT();
  // An uploaded image is its own thumbnail; a video shows its frame when the provider gives one away
  const kind = mediaKindOf(item.web);
  const video = kind === "video" ? videoEmbedOf(item.web) : null;
  const manualThumbnail = uploadedThumb ?? (kind === "image" ? item.web : video?.poster);
  const videoFile = video?.provider === "file" && !manualThumbnail;
  // A screen recording loops on its card, over its frame, while the card is on screen
  const loopSrc = video?.loops && !uploadedThumb ? video.src : null;
  // A post from X plays in the thread too: its picture's name says whether it is a video or a gif
  const postKind = kind === "post" ? postThumbKind(uploadedThumb) : null;
  // Any other recording of ours plays under the pointer, muted, over its frame or thumbnail.
  // A post's copy of its video or gif sits next to its frame (lib/posts.ts): poster-video.jpg → video.mp4
  const hoverSrc = loopSrc ? null
    : video?.provider === "file" || video?.loops ? video.src
    : postKind ? uploadedThumb!.replace(/poster-(video|gif)\.\w+$/, "$1.mp4")
    : null;
  const plays = kind === "video" || postKind === "video";
  const gifChip = (kind === "image" && isGif(item.web)) || postKind === "gif";
  const [source, setSource] = useState<ImgSource>(() => kind === "text" || isBlocked(item.web) ? "error" : imgCache.get(item.web)?.source ?? "idle");
  const [imgSrc, setImgSrc] = useState<string | null>(() => imgCache.get(item.web)?.src ?? null); // blob URL
  const [uploading, setUploading] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false); // mobile: the % bubble opens on tap
  // A cover or thumbnail that fails to load falls through to og:image / screenshot instead of shimmering forever
  const [manualFailed, setManualFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [coverRetry, setCoverRetry] = useState(false);
  // On the board the cover is never blank: another copy already decoded stands in while the one it
  // wants loads, and a copy shown before is drawn at once (hooks/use-decoded-src.ts, lib/shown-images.ts)
  const decodedCover = useDecodedSrc(coverSrc, board?.alternates);
  const designCover = coverRetry && designCoverFallback ? designCoverFallback : board ? decodedCover : coverSrc;
  // Each picture is ready at once when it was shown before in this tab, else once it loads (hooks/use-image-ready.ts)
  const cover = useImageReady(designCover);
  const manual = useImageReady(manualThumbnail);
  const [hovering, setHovering] = useState(false);
  const [scrollDist, setScrollDist] = useState(0);
  // Delete in two taps: the first asks for confirmation on the button itself, the second deletes
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The project menu keeps the action bar on screen while it is open (the pointer leaves the tile for it)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // When the confirmation opened: a near-instant second click/tap/key doesn't count,
  // so deleting is always two deliberate actions (double click, double tap or Space don't delete).
  const confirmAt = useRef(0);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suppressClick = useRef(false);

  const useManual = !!manualThumbnail && !manualFailed;
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [frameFailed, setFrameFailed] = useState(false);
  const useFrame = videoFile && !frameFailed;
  const useDesign = !useManual && !!designCover && !coverFailed;

  // The strip that scrolls on hover is fetched once the cover has been up a moment, behind everything else:
  // when the pointer arrives it comes from the cache and the scroll starts at once
  useEffect(() => {
    if (!designScroll || !useDesign || !cover.ready) return;
    const timer = setTimeout(() => { const img = new Image(); img.fetchPriority = "low"; img.src = designScroll; }, 400);
    return () => clearTimeout(timer);
  }, [designScroll, useDesign, cover.ready]);

  // A new thumbnail or cover gets its own chance to load
  useEffect(() => { setManualFailed(false); }, [manualThumbnail]);
  useEffect(() => { setCoverFailed(false); }, [designCover]);


  // Start loading when the tile enters the viewport
  useEffect(() => {
    if (useManual || useDesign || useFrame || source !== "idle") return;
    // On the board only the cards near the screen are mounted at all: being here is being in view
    if (board) { setSource("og"); return; }
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setSource("og"); observer.disconnect(); } },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- board mode never changes for a card
  }, [source, useManual, useDesign, useFrame]);

  // Fetch as blob so failed sources don't spam the console
  useEffect(() => {
    if (source === "idle" || source === "error" || imgSrc) return;
    const ctrl = new AbortController();
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let release: (() => void) | null = null;
    // og:image first (cheap); if the site has none, capture its hero server-side.
    // The "v" changes the screenshot URL when the server gets fixed: old 502s
    // stay in the browser cache and without this would keep showing for a while.
    const apiUrl = source === "og"
      ? `/api/og?url=${encodeURIComponent(item.web)}`
      : `/api/shot?url=${encodeURIComponent(item.web)}&v=2`;
    const capture = source === "shot";

    // A capture waits for a slot; its time limit only starts once it is actually asked for
    (capture ? captureSlot(ctrl.signal).then((r) => { release = r; }) : Promise.resolve())
      .then(() => {
        timeout = setTimeout(() => ctrl.abort(), capture ? 90000 : 15000);
        return fetch(apiUrl, { signal: ctrl.signal });
      })
      .then((res) => {
        // 204 = the site has no og:image or the screenshot failed: move to the next method
        if (!res.ok || res.status === 204 || !res.headers.get("content-type")?.startsWith("image/")) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const src = URL.createObjectURL(blob);
        imgCache.set(item.web, { src, source });
        if (!cancelled) setImgSrc(src);
      })
      .catch(() => {
        if (cancelled) return; // the card went away: nothing failed
        if (source === "og") { setSource("shot"); setImgSrc(null); }
        else { imgCache.set(item.web, { src: null, source: "error" }); setSource("error"); }
      })
      .finally(() => { clearTimeout(timeout); release?.(); });

    return () => { cancelled = true; ctrl.abort(); clearTimeout(timeout); };
    // imgSrc only avoids a repeat download when it already comes from the cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, item.web]);

  const domain = kind === "text" ? t.card.text : kind === "image" ? (isGif(item.web) ? t.card.gif : t.card.image) : getDomain(item.web);
  // A text is its own poster: its title, and its first lines where a site's note would go
  const posterNote = kind === "text" ? tags?.summary || item.note : item.note;
  const isError = !useManual && !useDesign && !useFrame && source === "error";
  const isLoaded = useManual ? manual.ready : useDesign ? cover.ready : useFrame ? frameLoaded : !!imgSrc;

  // On the board the media's real shape matters: the layout sizes the slot from it.
  // Load events don't bubble, but they do pass through the capture phase on their way down.
  const onMeasure = board?.onMeasure;
  const knownRatio = board?.ratio;
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onMeasure) return;
    const read = (m: EventTarget | null) => {
      // Only the thumbnail gives the tile its shape: the strip that scrolls over it on hover is the whole page
      if (m instanceof Element && m.closest(".tile__scroll")) return;
      const w = m instanceof HTMLImageElement ? m.naturalWidth : m instanceof HTMLVideoElement ? m.videoWidth : 0;
      const h = m instanceof HTMLImageElement ? m.naturalHeight : m instanceof HTMLVideoElement ? m.videoHeight : 0;
      if (!w || !h) return;
      const r = h / w;
      if (knownRatio === undefined || Math.abs(knownRatio - r) > 0.01) onMeasure(r);
    };
    const onLoad = (e: Event) => read(e.target);
    // A thumbnail already there (loaded before this listens, or kept with a shape the strip once gave it)
    read(el.querySelector(":scope > img.tile__img"));
    el.addEventListener("load", onLoad, true);
    el.addEventListener("loadeddata", onLoad, true);
    return () => { el.removeEventListener("load", onLoad, true); el.removeEventListener("loadeddata", onLoad, true); };
  }, [onMeasure, knownRatio]);

  // No picture at all: the typographic poster is 4:3 (CSS .tile__fallback), a text's page is square
  // (.tile__text), and the layout hears it
  const posterRatio = kind === "text" ? 1 : 0.75;
  useEffect(() => {
    if (isError && onMeasure && (knownRatio === undefined || Math.abs(knownRatio - posterRatio) > 0.01)) onMeasure(posterRatio);
  }, [isError, onMeasure, knownRatio, posterRatio]);

  const onScrollLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget, box = scrollBoxRef.current;
    if (!box) return;
    const rendered = (img.naturalHeight / img.naturalWidth) * box.clientWidth;
    setScrollDist(Math.max(0, rendered - box.clientHeight));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try { await onUpload(file); } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // The confirmation cancels with Esc or on its own after 6 s
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 6000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setConfirmDelete(false); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [confirmDelete]);
  const cancelDelete = (e: React.MouseEvent) => { e.stopPropagation(); setConfirmDelete(false); };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    if (!confirmDelete) { confirmAt.current = Date.now(); setConfirmDelete(true); return; }
    if (Date.now() - confirmAt.current < 400) return; // too quick: not a decision
    setConfirmDelete(false);
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  };

  const triggerUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    suppressClick.current = true;
    fileInputRef.current?.click();
    setTimeout(() => { suppressClick.current = false; }, 500);
  };

  // The external site only opens from its icon: a click on the card leads to our own views.

  const openHref = kind === "image" ? item.web : item.web;
  const openLabel = kind === "image" ? t.card.openImage : kind === "video" ? t.card.openVideo : kind === "post" ? t.card.openPost : t.card.openSite;

  const meta = (
    <div className="tile__meta">
      <span>{t.labels.type[item.type]}</span>
      {/* "Both" is the legacy sheet author: not a person, so it isn't shown */}
      {item.addedBy !== "Both" && (<><span className="tile__meta-sep">·</span><span>{item.addedBy}</span></>)}
      {domain && (<><span className="tile__meta-sep">·</span><span>{domain}</span></>)}
    </div>
  );

  // Traits as everyone sees them: one somebody removed doesn't come back on the card
  const kept = new Set(viewOf(tags)?.traits ?? []);
  const activeTags = tags
    ? TAGS.filter((t) => kept.has(t.key) && (tags.tags[t.key] ?? 0) >= TAG_THRESHOLD)
        .sort((a, b) => tags.tags[b.key] - tags.tags[a.key]).slice(0, 3)
    : [];
  const gathering = tagJob === "pending" || tagJob === "running";
  const aiChips = gathering ? (
    <div className="tile__tags" role="status">
      <span className="tile__tag tile__tag--gathering">{t.card.gatheringTags}</span>
    </div>
  ) : tags && kind !== "text" && (
    <div className="tile__tags">
      <span className="tile__tag tile__tag--style">{t.taxonomy.style[tags.style as keyof typeof t.taxonomy.style] ?? tags.style}</span>
      {activeTags.map((x) => <span key={x.key} className="tile__tag">{t.taxonomy.tag[x.key as keyof typeof t.taxonomy.tag] ?? x.key}</span>)}
    </div>
  );

  const filedCount = projectIds.length;
  const areaPicker = (className: string, onOpenChange?: (o: boolean) => void) => onToggleArea && (
    <AreaPicker backs={backs} onToggle={onToggleArea} onOpenChange={onOpenChange}
      className={`${className}${backs.length ? " is-filed" : ""}`} label={backs.length ? t.system.inSystem(backs.length) : t.system.toSystem}>
      {IconCompass}{backs.length > 0 && <span className="tile__action-count">{backs.length}</span>}
    </AreaPicker>
  );
  const picker = (className: string, onOpenChange?: (o: boolean) => void) => projects && onToggleProject && onCreateProject && (
    <ProjectPicker
      projects={projects} filed={projectIds} onToggle={onToggleProject} onCreate={onCreateProject} onOpenChange={onOpenChange}
      areasIn={areasIn}
      className={`${className}${filedCount ? " is-filed" : ""}`}
      label={filedCount ? t.projects.filedIn(filedCount) : t.projects.fileIn}
    >
      {IconFolder}<span className="tile__go-label">{filedCount ? t.card.filed(filedCount) : t.card.file}</span>
    </ProjectPicker>
  );

  return (
    <div>
      <article
        className={`tile${board ? " tile--board" : ""}${selecting ? " is-selecting" : ""}${selected ? " is-selected" : ""}`}
        data-id={item.id}
        onClick={(e) => {
          if (suppressClick.current) return;
          if (onSelect && (selecting || e.metaKey || e.ctrlKey || e.shiftKey)) { onSelect(e.shiftKey); return; }
          onOpen();
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div ref={containerRef} className={`tile__media${!isLoaded && !isError ? " is-loading" : ""}`}
          style={board?.ratio ? { aspectRatio: `1 / ${board.ratio}`, background: board.color } : undefined}>
          {!isLoaded && !isError && !board?.color && <div className="shimmer" />}

          {useManual && (
            <img
              ref={manual.ref}
              className={`tile__img${manual.ready ? "" : " is-hidden"}${manual.instant ? " is-instant" : ""}${video?.poster && !uploadedThumb ? " tile__img--frame" : ""}`}
              decoding={manual.decoding}
              src={manualThumbnail}
              alt={item.name}
              onLoad={manual.onLoad}
              onError={() => setManualFailed(true)}
            />
          )}

          {useDesign && (
            <>
              <img
                ref={cover.ref}
                className={`tile__img${cover.ready ? "" : " is-hidden"}${cover.instant ? " is-instant" : ""}`}
                decoding={cover.decoding}
                src={designCover!}
                alt={item.name}
                loading={board ? undefined : "lazy"}
                onLoad={cover.onLoad}
                onError={() => { if (designCoverFallback && !coverRetry) setCoverRetry(true); else setCoverFailed(true); }}
              />
              {designScroll && cover.ready && hovering && (
                <div ref={scrollBoxRef} className="tile__scroll">
                  <img
                    src={designScroll}
                    alt=""
                    onLoad={onScrollLoad}
                    className={scrollDist > 0 ? "is-ready" : ""}
                    style={{ "--dm-scroll": `-${scrollDist}px`, animationDuration: `${Math.max(4, Math.round(scrollDist / 170))}s` } as React.CSSProperties}
                  />
                </div>
              )}
            </>
          )}

          {loopSrc && <LoopVideo src={loopSrc} className="tile__img tile__loop" />}

          {useFrame && (
            // A video file: its first frame, still. It plays in the thread.
            <video
              className={`tile__img${frameLoaded ? "" : " is-hidden"}`}
              src={`${item.web}#t=0.1`}
              muted playsInline preload="metadata"
              onLoadedData={() => setFrameLoaded(true)}
              onError={() => setFrameFailed(true)}
            />
          )}
          {hoverSrc && hovering && <LoopVideo src={hoverSrc} className="tile__img tile__loop" />}

          {onSelect && (
            <button type="button" className="tile__select" aria-pressed={selected} aria-label={t.select.select}
              onClick={(e) => { e.stopPropagation(); onSelect(e.shiftKey); }} onMouseDown={(e) => e.stopPropagation()}>
              {Icons.check}
            </button>
          )}
          {plays && !loopSrc && isLoaded && <span className="tile__play" aria-hidden>{IconPlay}</span>}
          {gifChip && isLoaded && score === undefined && <span className="tile__badge">{t.card.gif}</span>}

          {!useManual && !useDesign && !useFrame && imgSrc && (
            <img
              className={`tile__img${wasShown(imgSrc) ? " is-instant" : ""}`}
              decoding={wasShown(imgSrc) ? "sync" : "async"}
              onLoad={() => markShown(imgSrc)}
              src={imgSrc}
              alt={item.name}
              onError={() => {
                // Blob fetched but not a renderable image (bad og:image): try next source
                imgCache.delete(item.web);
                setImgSrc(null);
                setSource(source === "og" ? "shot" : "error");
              }}
            />
          )}

          {isError && kind === "text" && (
            // A text is a page of words: its title and its first lines, running on under the card's edge (TextRef.css)
            <div className="tile__text">
              <span className="tile__text-kind">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden><path d="M2.5 3.5h9M2.5 7h9M2.5 10.5h5.5" /></svg>
                {t.card.text}
              </span>
              <span className="display tile__text-title">{item.name}</span>
              {posterNote && <p className="tile__text-body">{posterNote}</p>}
            </div>
          )}
          {isError && kind !== "text" && (
            // No screenshot: a typographic poster. Subtle stable tint per domain and the initial as a watermark.
            <div className="tile__fallback" style={{ "--fb-hue": hueFor(domain || item.name) } as React.CSSProperties}>
              <span className="display tile__fallback-mark" aria-hidden>{item.name.trim().slice(0, 1).toUpperCase()}</span>
              <div className="tile__fallback-top">
                <span className="tile__fallback-domain">{domain}</span>
                <span className="tile__fallback-type">{t.labels.type[item.type]}</span>
              </div>
              <div className="tile__fallback-body">
                <i className="tile__fallback-rule" aria-hidden />
                <span className="display tile__fallback-name">{item.name}</span>
                {item.note && <span className="tile__fallback-note">{item.note}</span>}
              </div>
            </div>
          )}

          {/* Found by search without Jev's reading: why it is here, in the tags the words found */}
          {score === undefined && reason && (
            <div className="tile__score"><span className="tile__score-pct tile__why">{reason}</span></div>
          )}
          {score !== undefined && (
            <div
              className={`tile__score has-why${whyOpen ? " is-open" : ""}`}
              onClick={(e) => { e.stopPropagation(); setWhyOpen((v) => !v); }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseLeave={() => setWhyOpen(false)}
            >
              <span className="tile__score-pct">
                {Math.round(score * 100)}%
                <span className="tile__score-i" aria-hidden>{IconInfo}</span>
              </span>
              <span className="tile__score-why" role="tooltip">
                <span className="tile__score-why-label">{t.card.matchLabel}</span>
                <span className="tile__score-why-text">{reason ?? t.card.matchFallback}</span>
              </span>
            </div>
          )}

          <div
            className={`tile__actions${uploading || confirmDelete || deleting || pickerOpen ? " is-visible" : ""}${confirmDelete || deleting ? " is-confirm" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {confirmDelete || deleting ? (
              <Fragment key="confirm">
                <span className="tile__confirm-text">{deleting ? t.card.removing : t.card.confirmRemove}</span>
                <button className="tile__action tile__action--confirm" onClick={handleDelete} disabled={deleting} autoFocus>
                  {deleting ? <span className="spinner" /> : t.common.delete}
                </button>
                {!deleting && (
                  <button className="tile__action" data-tip={t.common.cancel} aria-label={t.common.cancel} onClick={cancelDelete}>{IconX}</button>
                )}
              </Fragment>
            ) : (
              <Fragment key="actions">
            {/* Up here, the quieter ones: the site, and the rest behind ··· */}
            {/* A text has no page of its own to open: it is read in its panel */}
            {kind !== "text" && <a className="tile__action tile__action--link" href={openHref} target="_blank" rel="noopener noreferrer"
              aria-label={openLabel} title={openLabel} onClick={(e) => e.stopPropagation()}>
              <span className="tile__action-reveal">{t.card.seeUrl}</span>{IconExternal}
            </a>}
            {(kind !== "image" || onDelete) && (
              <Popover open={moreOpen} onOpenChange={(o) => { setMoreOpen(o); setPickerOpen(o); }}>
                <PopoverTrigger className="tile__action" aria-label={t.card.more} data-tip={moreOpen ? undefined : t.card.more} onClick={(e) => e.stopPropagation()}>
                  {uploading ? <span className="spinner" /> : IconMore}
                </PopoverTrigger>
                <PopoverContent align="end" className="pp pp--menu" onClick={(e) => e.stopPropagation()}>
                  {kind !== "image" && kind !== "text" && (
                    <button type="button" className="ws__item" onClick={(e) => { setMoreOpen(false); setPickerOpen(false); triggerUpload(e); }}>
                      <span className="pp__icon" aria-hidden>{IconUpload}</span>
                      <span className="ws__item-name">{uploadedThumb ? t.card.replaceThumb : t.card.uploadThumb}</span>
                    </button>
                  )}
                  {uploadedThumb && kind !== "image" && (
                    <button type="button" className="ws__item" onClick={async (e) => { e.stopPropagation(); setMoreOpen(false); setPickerOpen(false); await onRemoveThumbnail(); }}>
                      <span className="pp__icon" aria-hidden>{IconX}</span>
                      <span className="ws__item-name">{t.card.removeThumb}</span>
                    </button>
                  )}
                  {onDelete && (
                    <button type="button" className="ws__item ws__item--danger" onClick={(e) => { setMoreOpen(false); setPickerOpen(false); handleDelete(e); }}>
                      <span className="pp__icon" aria-hidden>{IconTrash}</span>
                      <span className="ws__item-name">{t.card.removeFromInspo}</span>
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            )}
            </Fragment>
            )}
          </div>

          {/* Down here, what is done most with a reference: file it (projects and areas) and talk about it */}
          {!(confirmDelete || deleting) && (onToggleProject || onComments) && (
            <div className={`tile__go${pickerOpen ? " is-visible" : ""}`} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              {picker("tile__go-btn tile__go-btn--file", setPickerOpen)}
              {areaPicker("tile__go-btn tile__go-btn--icon", setPickerOpen)}
              {onComments && (
                <button type="button" className="tile__go-btn" aria-label={t.card.comments}
                  onClick={(e) => { e.stopPropagation(); onComments(); }}>
                  {IconComment}<span className={`tile__go-label${commentCount > 0 ? "" : " tile__go-label--word"}`}>{commentCount > 0 ? commentCount : t.card.comment}</span>
                </button>
              )}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
            onClick={(e) => e.stopPropagation()} onChange={handleFileChange} />
        </div>
      </article>

      {/* The root of the thread, under the tile: why this site is here, in the words of whoever saved it.
          The typographic poster already carries the note, so it gets nothing. */}
      {!isError && onComments && (caption ? (
        <button type="button" className="tile__note" onClick={onComments} title={t.card.seeComments}>
          {caption.people.length > 1 ? (
            // Several people in the thread: their circles overlap, whoever saved it first
            <span className="tile__note-stack" aria-hidden>
              {caption.people.map((p) => <Avatar key={p.name} name={p.name} image={p.image} size={16} />)}
            </span>
          ) : (
            <Avatar name={caption.name} image={caption.image} size={16} />
          )}
          <span className="tile__note-text"><b className="tile__note-who">{caption.name}</b> {caption.body}</span>
          {caption.more > 0 && <span className="tile__note-count" aria-label={t.card.replies(caption.more)}>{IconComment}{caption.more}</span>}
        </button>
      ) : (
        <button type="button" className="tile__note is-empty" onClick={onComments}>
          <span className="tile__note-ghost" aria-hidden />
          <span className="tile__note-text">{t.card.addFirstNote}</span>
        </button>
      ))}

      {/* Touch devices: caption under the tile since there is no hover */}
      <div className="tile__caption">
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="display tile__title">{item.name}</span>
          {meta}
          {aiChips}
        </div>
        {onComments && (
          <button className={`tile__caption-md${commentCount > 0 ? " is-ready" : ""}`} onClick={onComments} aria-label={t.card.comments}>
            {IconComment}{commentCount > 0 && commentCount}
          </button>
        )}
        {picker("tile__caption-md tile__caption-pj")}
        {areaPicker("tile__caption-md tile__caption-pj")}
        <a className="tile__caption-md tile__caption-link" href={openHref} target="_blank" rel="noopener noreferrer" aria-label={openLabel}>{IconExternal}</a>
        {onDelete && (confirmDelete || deleting ? (
          <Fragment key="confirm">
            <button className="tile__caption-md tile__caption-del is-confirm" onClick={handleDelete} disabled={deleting} aria-label={t.card.confirmDelete}>
              {deleting ? <span className="spinner" /> : t.common.delete}
            </button>
            {!deleting && <button className="tile__caption-md" onClick={cancelDelete} aria-label={t.common.cancel}>{IconX}</button>}
          </Fragment>
        ) : (
          <button key="trash" className="tile__caption-md tile__caption-del" onClick={handleDelete} aria-label={t.card.removeFromInspo}>{IconTrash}</button>
        ))}
      </div>
    </div>
  );
}
