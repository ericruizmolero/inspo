"use client";

import { useState, useEffect, useRef } from "react";
import { InspoItem, InspoTags, Project, TagStatus, type InspoComment } from "@/types/inspo";
import { TAGS, TAG_THRESHOLD, viewOf } from "@/lib/taxonomy";
import { useT } from "./I18nProvider";
import { flyToInbox } from "./fly-to-inbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProjectPicker from "./ProjectPicker";
import AreaPicker from "./AreaPicker";
import type { SystemArea } from "@/types/system";
import { mediaKindOf, videoEmbedOf, isGif, postThumbKind, postOf, readableDomain } from "@/lib/url";
import { usePost } from "./post-cache";
import LoopVideo from "./LoopVideo";
import { Avatar, AvatarStack, Busy, Button, Chip, Icon, IconButton, MenuItem, toneFor } from "@/components/criterio";
import "./TextRef.css";
import { useDecodedSrc } from "@/hooks/use-decoded-src";
import { markShown, wasShown } from "@/lib/shown-images";
import { useImageReady } from "@/hooks/use-image-ready";
import { cue } from "@/lib/ui-sounds";

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

/** What a post without a picture says, for its card: who wrote it and its words. Read once per session
 *  (components/post-cache.ts, the copy lib/posts.ts keeps); until it comes, what its name already says */
type PostWords = { author: string; handle: string; avatar: string | null; text: string };
/** The words without their links, with X's own line breaks and no run of blank lines */
const wordsOf = (text: string) => text.replace(/https?:\/\/\S+/g, "").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{2,}/g, "\n").trim();
/** "Wilson · Ferndesk has been live…" (lib/posts.ts postName) read back as author and words */
function wordsFromName(name: string, handle: string): PostWords {
  const at = name.indexOf(" · ");
  return at > 0 ? { author: name.slice(0, at), handle, avatar: null, text: name.slice(at + 3) } : { author: name, handle, avatar: null, text: "" };
}
/** The tagger's summary of a post, "Javi (@jconsu) on X · what it says" (lib/tagger.ts postAsSite), read back */
function wordsFromSummary(summary: string | undefined): PostWords | null {
  const m = summary?.match(/^(.+?) \(@(\w+)\) on X · ([\s\S]+)$/);
  return m ? { author: m[1], handle: m[2], avatar: null, text: wordsOf(m[3]) } : null;
}
function usePostWords(web: string | null, name: string, summary?: string): PostWords | null {
  const read = usePost(web);
  if (!web) return null;
  const post = read?.post;
  return (post ? { author: post.author, handle: post.handle, avatar: post.avatar, text: wordsOf(post.text) } : null) ?? wordsFromSummary(summary) ?? wordsFromName(name, postOf(web)?.user ?? "");
}

/** Whether a block of words is cut by its box (true only when it needs more height than it has) */
function useCut(): [React.RefObject<HTMLParagraphElement | null>, boolean] {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [cut, setCut] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setCut(el.scrollHeight > el.clientHeight + 1);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  });
  return [ref, cut];
}

/** The author's face as X serves it (asked for without a referrer, as the post's sheet does); the initial if it fails */
function PostFace({ name, src }: { name: string; src: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  const pic = src && failed !== src ? src : null;
  if (!pic) return <Avatar initials={name.trim().slice(0, 1).toUpperCase()} name={name} tone={toneFor(name)} size={28} />;
  return <span className="cr-avatar" style={{ width: 28, height: 28 }} role="img" aria-label={name}><img src={pic} alt="" width={28} height={28} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(pic)} /></span>;
}

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
  /** On a project's board: takes the card out of that project. It stays in the workspace and, in no other
   *  project, goes back to the Inbox, so the bin does this in one click and deleting is left to the Inbox */
  onTakeOut?: () => void | Promise<void>;
  /** The open workspace by name: off a project, what the bin says the card leaves (on one it says "the project":
   *  a project's name does not fit over a card) */
  spaceName: string;
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

const IconUpload = <Icon name="upload" size={14} />;
const IconMore = <Icon name="dots" size={14} />;
const IconExternal = <Icon name="arrow-up-right" size={13} />;
const IconInfo = <Icon name="info" size={12} />;

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

export default function InspoCard({ item, tags, tagJob, score, reason, manualThumbnail: uploadedThumb, onUpload, onRemoveThumbnail, onOpen, designCover: coverSrc, designCoverFallback, designScroll, commentCount = 0, caption, onComments, onDelete, onTakeOut, spaceName, projects, projectIds = [], onToggleProject, onCreateProject, backs = [], onToggleArea, areasIn, board, selected = false, selecting = false, onSelect }: InspoCardProps) {
  const { t } = useT();
  // An uploaded image is its own thumbnail; a video shows its frame when the provider gives one away
  const kind = mediaKindOf(item.web);
  const video = kind === "video" ? videoEmbedOf(item.web) : null;
  const manualThumbnail = uploadedThumb ?? (kind === "image" ? item.web : video?.poster);
  const videoFile = video?.provider === "file" && !manualThumbnail;
  // A post from X plays in the thread too: its picture's name says whether it is a video or a gif
  const postKind = kind === "post" ? postThumbKind(uploadedThumb) : null;
  // Every recording of ours loops on its card, muted, while the card is on screen: a stored file, a screen
  // recording, a post's video or gif (its copy sits next to its frame, lib/posts.ts: poster-video.jpg → video.mp4).
  // YouTube and Vimeo keep their frame and play in the thread. A chosen thumbnail stays the picture, and the
  // recording plays under the pointer only (Eric, 08-10: no button, it plays on its own)
  const ownSrc = video?.provider === "file" || video?.loops ? video.src
    : postKind ? uploadedThumb!.replace(/poster-(video|gif)\.\w+$/, "$1.mp4")
    : null;
  const chosen = !!uploadedThumb && kind !== "post";
  const loopSrc = ownSrc && !chosen ? ownSrc : null;
  const hoverSrc = ownSrc && chosen ? ownSrc : null;
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
  // Delete in two clicks on the same spot: the first turns the bin into the red word, the second deletes.
  // A double click or a double tap on the bin is those two clicks.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The project menu keeps the action bar on screen while it is open (the pointer leaves the tile for it)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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

  // A copied picture or video says where it was found, when it knows
  const domain = kind === "text" ? t.card.text : item.source ? getDomain(item.source) : kind === "image" ? (isGif(item.web) ? t.card.gif : t.card.image) : getDomain(item.web);
  // A text is its own poster: its title, and its first lines where a site's note would go
  const posterNote = kind === "text" ? tags?.summary || item.note : item.note;
  const isError = !useManual && !useDesign && !useFrame && source === "error";
  // A post with no picture is read for its card (author, face, words); the rest of the time nothing is asked
  const post = usePostWords(isError && kind === "post" ? item.web : null, item.name, tags?.summary);
  // A post longer than its card fades at the bottom; one that fits reads whole to its last line
  const [postBodyRef, postCut] = useCut();
  // A site with no picture says what it is: the team's note, else what the page says about itself
  // (tags.summary is "title · description", lib/tagger.ts)
  const siteWords = (() => {
    if (item.note) return item.note;
    const s = tags?.summary ?? "";
    const at = s.indexOf(" · ");
    return at > 0 ? s.slice(at + 3) : s && s !== item.name ? s : "";
  })();
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

  // No picture at all: a text's page and a post's are square (.tile__text), a site's is 4:3
  // (.tile__text--site), and the layout hears it
  const posterRatio = kind === "text" || kind === "post" ? 1 : 0.75;
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

  // The confirmation cancels with Esc, when the pointer leaves the card, or on its own after 6 s
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 6000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setConfirmDelete(false); };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [confirmDelete]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Out of a project nothing is lost: no second click. The card is seen flying to the Inbox tab, as in Polish,
    // and leaves the project when it lands; refused by the server, it is back in its place
    if (onTakeOut) {
      const tile = e.currentTarget.closest<HTMLElement>(".tile");
      const wait = tile ? flyToInbox(tile) : 0;
      cue("select", { direction: "back" });
      if (tile && wait) tile.style.visibility = "hidden";
      window.setTimeout(() => { void Promise.resolve(onTakeOut()).finally(() => { if (tile) tile.style.visibility = ""; }); }, wait);
      return;
    }
    if (!onDelete) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
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

  const openHref = item.source ?? item.web;
  const openLabel = item.source ? t.card.openOriginal : kind === "image" ? t.card.openImage : kind === "video" ? t.card.openVideo : kind === "post" ? t.card.openPost : t.card.openSite;

  const meta = (
    <div className="tile__meta">
      <span>{t.labels.type[item.type]}</span>
      {/* "Both" is the legacy sheet author: not a person, so it isn't shown */}
      {item.addedBy !== "Both" && (<><span className="tile__meta-sep" aria-hidden /><span>{item.addedBy}{item.via ? ` ${t.mcp.via(item.via)}` : ""}</span></>)}
      {domain && (<><span className="tile__meta-sep" aria-hidden /><span>{domain}</span></>)}
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
      <span className="cr-chip cr-chip-paper tile__tag tile__tag--gathering">{t.card.gatheringTags}</span>
    </div>
  ) : tags && kind !== "text" && (
    <div className="tile__tags">
      <span className="cr-chip cr-chip-paper tile__tag tile__tag--style">{t.taxonomy.style[tags.style as keyof typeof t.taxonomy.style] ?? tags.style}</span>
      {activeTags.map((x) => <span key={x.key} className="cr-chip cr-chip-paper tile__tag">{t.taxonomy.tag[x.key as keyof typeof t.taxonomy.tag] ?? x.key}</span>)}
    </div>
  );

  const filedCount = projectIds.length;
  const areaPicker = (className: string, onOpenChange?: (o: boolean) => void, iconSize = 16) => onToggleArea && (
    <AreaPicker backs={backs} onToggle={onToggleArea} onOpenChange={onOpenChange}
      className={`${className}${backs.length ? " is-active" : ""}`} label={backs.length ? t.system.inSystem(backs.length) : t.system.toSystem}>
      <Icon name="compass" size={iconSize} />
    </AreaPicker>
  );
  // The picker as a Button s with its words (the caption), or as an IconButton s, folder only, ember once filed (the hover row)
  const picker = (className: string, onOpenChange?: (o: boolean) => void, iconOnly = false) => projects && onToggleProject && onCreateProject && (
    <ProjectPicker
      projects={projects} filed={projectIds} onToggle={onToggleProject} onCreate={onCreateProject} onOpenChange={onOpenChange}
      areasIn={areasIn}
      className={iconOnly
        ? `${className} cr-iconbtn cr-iconbtn-strong${filedCount ? " is-filed" : ""} cr-iconbtn-s`
        : `${className} cr-btn ${filedCount ? "cr-btn-primary" : "cr-btn-secondary"} cr-btn-s`}
      label={filedCount ? t.projects.filedIn(filedCount) : t.projects.fileIn}
    >
      <Icon name="folder" size={16} />{!iconOnly && <span className="tile__go-label">{filedCount ? t.card.filed(filedCount) : t.card.file}</span>}
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
        onMouseLeave={() => { setHovering(false); setConfirmDelete(false); }}
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
              {/* The system's Checkbox box: a sunken field, ink border, an ink tick once picked */}
              <span className="cr-check-box" aria-hidden>
                <Icon name="check" size={10} weight="bold" />
              </span>
            </button>
          )}
          {plays && !loopSrc && isLoaded && <span className="tile__play" aria-hidden><Icon name="play" size={18} /></span>}
          {gifChip && isLoaded && score === undefined && <Chip tone="chrome" className="tile__badge">{t.card.gif}</Chip>}

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
                <Icon name="text" size={14} />
                {t.card.text}
              </span>
              <span className="t-title-m tile__text-title">{item.name}</span>
              {posterNote && <p className="tile__text-body">{posterNote}</p>}
            </div>
          )}
          {isError && kind === "post" && post && (
            // A post from X with nothing to show: the post itself, as its author wrote it (CSS .tile__text--post)
            <div className={`tile__text tile__text--post${postCut ? " is-cut" : ""}`}>
              <span className="tile__post-head">
                <PostFace name={post.author} src={post.avatar} />
                <span className="tile__post-who"><b>{post.author}</b>{post.handle && <span>@{post.handle}</span>}</span>
              </span>
              {post.text && <p ref={postBodyRef} className="tile__text-body tile__post-body">{post.text}</p>}
            </div>
          )}
          {isError && kind !== "text" && kind !== "post" && (
            // A site with neither og:image nor screenshot: where it is, its name and what it says (CSS .tile__text--site)
            <div className="tile__text tile__text--site">
              <span className="tile__text-kind">{domain}</span>
              <span className="t-title-m tile__text-title">{item.name}</span>
              {siteWords && <p className="tile__text-body">{siteWords}</p>}
            </div>
          )}

          {/* Found by search without Jev's reading: why it is here, in the tags the words found */}
          {score === undefined && reason && (
            <div className="tile__score"><span className="cr-chip cr-chip-chrome tile__score-pct tile__why">{reason}</span></div>
          )}
          {score !== undefined && (
            <div
              className={`tile__score has-why${whyOpen ? " is-open" : ""}`}
              onClick={(e) => { e.stopPropagation(); setWhyOpen((v) => !v); }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseLeave={() => setWhyOpen(false)}
            >
              <span className="cr-chip cr-chip-chrome tile__score-pct">
                {Math.round(score * 100)}%
                <span className="tile__score-i" aria-hidden>{IconInfo}</span>
              </span>
              {/* Why it matched: the system's Balloon (butter, ink border, bevel), its tail pointing up at the chip */}
              <span className="cr-balloon tile__score-why" role="tooltip">
                <span className="cr-balloon-body">
                  <span className="cr-balloon-title">{t.card.matchLabel}</span>
                  <span className="cr-balloon-text">{reason ?? t.card.matchFallback}</span>
                </span>
                <span className="cr-balloon-tail" aria-hidden />
              </span>
            </div>
          )}

          <div
            className={`tile__actions cr-on-chrome${uploading || confirmDelete || deleting || pickerOpen ? " is-visible" : ""}`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Up here, the quieter ones: the site, the thumbnail behind ···, and the bin. Each is its own default
                IconButton, size s: filled with the hairline, so it reads over any screenshot */}
            {/* A text has no page of its own to open: it is read in its panel */}
            {kind !== "text" && <a className="cr-iconbtn cr-iconbtn-default cr-iconbtn-s" href={openHref} target="_blank" rel="noopener noreferrer"
              aria-label={openLabel} data-tip={openLabel} onClick={(e) => e.stopPropagation()}>
              {IconExternal}
            </a>}
            {kind !== "image" && kind !== "text" && (
              <Popover open={moreOpen} onOpenChange={(o) => { setMoreOpen(o); setPickerOpen(o); }}>
                <PopoverTrigger className="cr-iconbtn cr-iconbtn-default cr-iconbtn-s tile__more" aria-label={t.card.more} data-tip={moreOpen ? undefined : t.card.more} onClick={(e) => e.stopPropagation()}>
                  {uploading ? <Busy label={t.card.more} /> : IconMore}
                </PopoverTrigger>
                {/* The system's Menu: a paper window, its rows MenuItems */}
                <PopoverContent align="end" className="cr-menu" onClick={(e) => e.stopPropagation()}>
                  <MenuItem icon={IconUpload} onClick={(e) => { setMoreOpen(false); setPickerOpen(false); triggerUpload(e); }}>
                    {uploadedThumb ? t.card.replaceThumb : t.card.uploadThumb}
                  </MenuItem>
                  {uploadedThumb && (
                    <MenuItem icon="close" onClick={async (e) => { e.stopPropagation(); setMoreOpen(false); setPickerOpen(false); await onRemoveThumbnail(); }}>
                      {t.card.removeThumb}
                    </MenuItem>
                  )}
                </PopoverContent>
              </Popover>
            )}
            {/* The bin is last so that the red word grows leftwards and stays under the pointer.
                A held Enter doesn't count as the second click. */}
            {(onDelete || onTakeOut) && (confirmDelete || deleting ? (
              // Armed: the confirm step's look, the system's danger Button s, the word Delete under the pointer
              <Button key="confirm" variant="danger" size="s" className="tile__action--confirm" aria-label={t.card.confirmDelete}
                onClick={handleDelete} onKeyDown={(e) => { if (e.repeat) e.preventDefault(); }} disabled={deleting}>
                {deleting ? <Busy label={t.common.delete} /> : t.common.delete}
              </Button>
            ) : (
              <IconButton key="bin" icon="trash" variant="default" size="s"
                label={onTakeOut ? t.card.removeFromProject : t.card.removeFrom(spaceName)}
                onClick={handleDelete} onKeyDown={(e) => { if (e.repeat) e.preventDefault(); }} />
            ))}
          </div>

          {/* Down here, what is done most with a reference: file it (projects and areas) and talk about it */}
          {(onToggleProject || onComments) && (
            <div className={`tile__go${pickerOpen ? " is-visible" : ""}`} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              {/* Three strong IconButtons s (the retro one: paper, ink border, bevel), square, the size of the three up on
                  the right (Eric, 07-10: "el resto homogeneizamos", "ese tamaño está bien", "con el botón tipo retro que
                  tenía una especie de sombreado"), icon only: the folder (ember once filed, the one colour on the card),
                  the areas of the system and comments. The words (filed where, in how many) live in the caption's row
                  and in each label */}
              {picker("tile__go-pick", setPickerOpen, true)}
              {areaPicker("cr-iconbtn cr-iconbtn-strong cr-iconbtn-s", setPickerOpen)}
              {onComments && (
                <IconButton icon="comment" variant="strong" size="s"
                  label={commentCount > 0 ? `${t.card.comments} (${commentCount})` : t.card.comments}
                  onClick={(e) => { e.stopPropagation(); onComments(); }} />
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
        <button type="button" className="tile__note cr-comment" onClick={onComments} data-tip={t.card.seeComments}>
          {caption.people.length > 1 ? (
            // Several people in the thread: the system's AvatarStack, whoever saved it first
            <AvatarStack className="tile__note-stack" size={20}
              people={caption.people.map((p) => ({ initials: p.name.slice(0, 1).toUpperCase(), name: p.name, tone: toneFor(p.name), src: p.image }))} />
          ) : (
            <Avatar initials={caption.name.slice(0, 1).toUpperCase()} name={caption.name} tone={toneFor(caption.name)} src={caption.image} size={20} />
          )}
          <span className="tile__note-text cr-comment-text"><b className="tile__note-who">{caption.name}</b> {caption.body}</span>
          {caption.more > 0 && <span className="tile__note-count" aria-label={t.card.replies(caption.more)}><Icon name="comment" size={12} />{caption.more}</span>}
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
          <span className="tile__title">{item.name}</span>
          {meta}
          {aiChips}
        </div>
        {/* Comments with their count: the system's Button, quiet s; the folder: the picker Button, s */}
        {onComments && (
          <Button variant="quiet" size="s" icon="comment" className="tile__caption-pj" onClick={onComments} aria-label={t.card.comments}>
            {commentCount > 0 && commentCount}
          </Button>
        )}
        {picker("tile__caption-pj")}
        {/* The icon-only ones are the system's default IconButton, size xs */}
        {areaPicker("cr-iconbtn cr-iconbtn-default cr-iconbtn-xs tile__caption-ib", undefined, 14)}
        <a className="cr-iconbtn cr-iconbtn-default cr-iconbtn-xs tile__caption-ib" href={openHref} target="_blank" rel="noopener noreferrer" aria-label={openLabel} data-tip={openLabel}>{IconExternal}</a>
        {/* The bin in two clicks: the first turns it into the confirm step's danger Button, the second deletes */}
        {(onDelete || onTakeOut) && (confirmDelete || deleting ? (
          <Button key="confirm" variant="danger" size="s" className="tile__caption-del" onClick={handleDelete} disabled={deleting} aria-label={t.card.confirmDelete}>
            {deleting ? <Busy label={t.common.delete} /> : t.common.delete}
          </Button>
        ) : (
          <IconButton key="trash" icon="trash" variant="default" size="xs" className="tile__caption-ib" onClick={handleDelete}
            label={onTakeOut ? t.card.removeFromProject : t.card.removeFrom(spaceName)} />
        ))}
      </div>
    </div>
  );
}
