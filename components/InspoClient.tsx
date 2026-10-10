"use client";

import { addInspo, addImage, removeInspo, removeInspos, postComment as postCommentAction, removeComment, editNote as editNoteAction, workspaceOfItem, newProject, editProject, removeProject, markProjectStarted, setFiled, votePolish, closeProjectPolish, restoreToBoard, readBoardAction, importBatch, boardProject } from "@/app/actions/library";
import { boardOf, PLATFORM_NAME } from "@/lib/boards/match";
import { batchesOf } from "@/lib/boards/entries";
import { noneImported, type BoardStep, type ImportBoard } from "./BoardImport";
import { importSummary } from "@/lib/boards/summary";
import { votesByItem, finishedOf, forgottenBy, openVotes } from "@/lib/polish-tally";
import { setActiveWorkspace } from "./workspace-switch";
import { setProjectClient, saveProjectBrief } from "@/app/actions/brief";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback, useDeferredValue, memo, type RefObject, type SetStateAction } from "react";
import { InspoItem, TagMap, TagStatus, InspoTags, CommentMap, CommentAttachment, InspoComment, Project, ProjectLinks, DesignIndexEntry, PageShot, PolishVote, PolishChoice, type ItemsPage, type Pulse } from "@/types/inspo";
import { applyPage, applyPulse, type Mirror } from "@/lib/library-mirror";
import type { ThumbnailMap } from "@/lib/thumbnails";
import { COLORS, viewOf, FACETS } from "@/lib/taxonomy";
import { filtersFromParams, filterKey, LEGACY_PARAMS, filterTest, localScores, queryWords, rankText, isDescriptive, textIndex, vocabulary, norm, newestFirst, type Filter } from "@/lib/search-query";
import Sidebar, { Icons, type QuotaView } from "./Sidebar";
import Connectors from "./Connectors";
import ThemeToggle from "./ThemeToggle";
import Island from "./Island";
import { Button as CrButton, EmptyState, IconButton, PillBar, PillBarSep, SegmentedControl } from "@/components/criterio";
import SearchBar from "./SearchBar";
import { Busy, Icon, StatusBar, StatusCell } from "@/components/criterio";
import InspoCard, { captionFor } from "./InspoCard";
import type { NewInspoInput } from "./AddInspoModal";
import GatherBar from "./GatherBar";
import InboxZero from "./InboxZero";
import SelectBar from "./SelectBar";
import { refInfoOf } from "@/lib/ref-info";
import { restoreTextHeadings } from "@/lib/text-headings";
import { keepSame } from "@/lib/keep-same";
import { webKeyOf, nameFromHost, typeFromUrl, mediaKindOf, nameFromFile, hasOwnPage, normalizeWebUrl } from "@/lib/url";
import { uploadMedia, mediaFileFrom } from "@/lib/media-client";
import PageView from "./PageView";
import type { SystemSpot } from "./RefCriterio";
import TextPage from "./TextPage";
import { addText, saveText, renameText } from "@/app/actions/text";
import { useTextBodies } from "@/hooks/use-text-bodies";
import Grid, { DEFAULT_ZOOM, type GridHandle, type ShotLevel } from "./Grid";
import { leaveBoard, leavePolish } from "./view-morph";
import SoundControl from "./SoundControl";
import ZoomPill from "./ZoomPill";
import { cue } from "@/lib/ui-sounds";
import { keyOf, DEFAULT_RATIO, BOARD_MAX_RATIO } from "@/lib/board";
import EmptyStart from "./EmptyStart";
import ProjectStart from "./ProjectStart";
import { SYSTEM_AREAS, staleness, type ProjectSystem, type SystemArea } from "@/types/system";
import type { AgentAction, AgentDone, AgentPatch, AgentReply, AgentTurn } from "@/lib/agent";
import ProjectChooser from "./ProjectChooser";
import { assignSystemArea, loadSystem } from "@/app/actions/system";
import WorkspaceMenu from "./WorkspaceMenu";
import { preloadTemplates } from "./templates-cache";
import { useActivity } from "./useActivity";
import { useT, messageOf } from "./I18nProvider";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import PersonAvatar from "./PersonAvatar";
import { afterPaint } from "@/components/ui/liquid";
import { useConfirm } from "./useConfirm";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { sectionIcon } from "./section-icons";
import Link from "next/link";
import Logo from "@/components/Logo";
import dynamic from "next/dynamic";

// Opened by a click or a shortcut, never on the first paint: each loads on its own, and the panel (the
// most used) is fetched once the page is idle, so the first click doesn't wait for it
const loadItemPanel = () => import("./ItemPanel");
const loadCommentsPanel = () => import("./CommentsPanel");
const ItemPanel = dynamic(loadItemPanel, { ssr: false });
const CommentsPanel = dynamic(loadCommentsPanel, { ssr: false });
// A video's or a post's own view, in the reference sheet's page card; only loaded when one opens
const VideoPlayer = dynamic(() => import("./VideoPlayer"), { ssr: false });
const PostView = dynamic(() => import("./PostView"), { ssr: false });
const SystemView = dynamic(() => import("./SystemView"), { ssr: false });
const PolishView = dynamic(() => import("./PolishView"), { ssr: false });
const RefCriterio = dynamic(() => import("./RefCriterio"), { ssr: false });
const CommandPalette = dynamic(() => import("./CommandPalette"), { ssr: false });
// Discover and its templates only show in their own space (still server-rendered when a link lands there),
// the add dialog only once opened
const Discover = dynamic(() => import("./Discover"));
const TemplatesView = dynamic(() => import("./TemplatesView"));
const AddInspoModal = dynamic(() => import("./AddInspoModal"), { ssr: false });

// Compress + resize image client-side before upload (avoids 413 on Vercel)
async function compressImage(file: File, maxPx = 1400, quality = 0.85, type: "image/jpeg" | "image/webp" = "image/jpeg"): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, type === "image/webp" ? ".webp" : ".jpg"), { type }) : file),
        type, quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}


/** A new item's job is asked about every 4 s, for up to 5 minutes (a whole-page capture can take one);
 *  past that it keeps "gathering" until the page is opened again */
const TAG_POLL_MS = 4000;
const TAG_WATCH_MS = 5 * 60 * 1000;
/** While the board is seen, it asks every 15 s whether its workspace changed somewhere else */
const PULSE_MS = 15_000;

const DESKTOP_MIN = 801;
/** Measured height/width of media whose page height the index doesn't give (images, og:images, video frames) */
const RATIOS_KEY = "inspo:ratios";
/** The zoom (columns away from the usual number, see components/Grid.tsx), kept for the next visit */
// ":3": everyone opens again at the default (one step out, 83% on a usual screen); a zoom kept before is dropped
const ZOOM_KEY = "inspo:board-zoom:3";
/** What floats over the board: the bars on top, the search dock at the bottom */
const TOP_DESKTOP = 64;
const TOP_MOBILE = 64;
/** The search dock at the bottom, with the results line over it */
const BOTTOM = 112;
/** The same edge where there is no dock (the library, the inbox) */
const BOTTOM_BARE = 24;
const NO_FILTERS: Filter[] = [];

function useWindowWidth() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return w;
}


/** Waits before asking for meaning (layer 2) and for Jev (layer 3): the first answers every few keys, the second once the typing settles */
const SEMANTIC_WAIT_MS = 180;
const JEV_WAIT_MS = 700;
/** Jev reads only the nearest few */
const JEV_TOP = 20;

export default function InspoClient({
  first,
  stamp,
  since,
  bell,
  initialProjects = [],
  initialProjectLinks = {},
  initialSystems = {},
  aiEnabled = false,
  user,
  workspace,
  workspaces,
  members = [],
  isAdmin = false,
  initialQuota = null,
  initialPolishVotes = [],
}: {
  /** The library's newest page; the rest is asked for as soon as the board is up (lib/library.ts loadPage) */
  first: ItemsPage;
  /** What the library looked like when the server read it, and when (lib/library.ts readStamp): the pulse's cursor */
  stamp: string;
  since: string;
  /** The bell's newest news when the library was read (lib/notify.ts latestTeamEvent) */
  bell: string;
  initialQuota?: QuotaView | null;
  /** Every polish vote of the workspace's projects (lib/polish-votes.ts) */
  initialPolishVotes?: PolishVote[];
  initialProjects?: Project[];
  initialProjectLinks?: ProjectLinks;
  /** Each project's system, by project id (lib/system.ts) */
  initialSystems?: Record<string, ProjectSystem>;
  aiEnabled?: boolean;
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
  members?: { id: string; name: string; image: string | null }[];
  /** Can see the activity panel (/admin) */
  isAdmin?: boolean;
}) {
  const { t, locale } = useT();
  // The library's references and what the board draws for each, in one state: a page or the pulse's changes fold in
  // all at once (lib/library-mirror.ts). Each part keeps its own name and setter
  const [mirror, setMirror] = useState<Mirror>(() => ({
    items: first.items, thumbnailMap: first.thumbnailMap, tagMap: first.tagMap, tagJobs: first.tagJobs,
    pageShots: first.pageShots, designMdIndex: first.designMdIndex, comments: first.comments,
  }));
  const { items, thumbnailMap: thumbMap, tagMap, tagJobs, pageShots, designMdIndex, comments: commentMap } = mirror;
  const setters = useMemo(() => {
    const part = <K extends keyof Mirror>(k: K) => (up: SetStateAction<Mirror[K]>) => setMirror((m) => {
      const v = typeof up === "function" ? (up as (prev: Mirror[K]) => Mirror[K])(m[k]) : up;
      return Object.is(v, m[k]) ? m : { ...m, [k]: v };
    });
    return { items: part("items"), thumbMap: part("thumbnailMap"), tagMap: part("tagMap"), tagJobs: part("tagJobs"), pageShots: part("pageShots"), commentMap: part("comments") };
  }, []);
  const { items: setItems, thumbMap: setThumbMap, tagMap: setTagMap, tagJobs: setTagJobs, pageShots: setPageShots, commentMap: setCommentMap } = setters;
  // The search lives in the URL (?f=person:Eric&f=tag:c:blue&q=serif): a search can be shared and Back
  // undoes a chip. Older links (?type= ?author= ?tags=…) are read as chips. history.pushState/replaceState
  // sync with useSearchParams without a navigation.
  const sp = useSearchParams();
  // The chips are read from every param but ?q=, so typing (which rewrites ?q=) never rebuilds them
  const chipKey = (() => { const p = new URLSearchParams(sp.toString()); p.delete("q"); return p.toString(); })();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(chipKey)), [chipKey]);
  // The search box keeps its own state (a controlled input can't wait for the router) and copies itself into ?q=
  const [query, setQueryState] = useState(() => sp.get("q") ?? "");
  // "all" and "" drop the key. Typing replaces the entry; every other change adds one, so Back undoes it.
  const setParams = useCallback((patch: Record<string, string>, replace = false) => {
    const p = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) { if (v && v !== "all") p.set(k, v); else p.delete(k); }
    const url = window.location.pathname + (p.size ? `?${p}` : "");
    if (replace) window.history.replaceState(null, "", url); else window.history.pushState(null, "", url);
  }, []);
  // ?q= is written once typing pauses: each write is a second render through useSearchParams, and Safari
  // refuses more than 100 history calls in 10 s. Anything else that writes the URL takes the pending words first.
  const qPending = useRef<{ timer: ReturnType<typeof setTimeout>; v: string } | null>(null);
  const flushQuery = useCallback(() => {
    const pending = qPending.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    qPending.current = null;
    setParams({ q: pending.v }, true);
  }, [setParams]);
  const setQuery = useCallback((v: string) => {
    setQueryState(v);
    if (qPending.current) clearTimeout(qPending.current.timer);
    qPending.current = { v, timer: setTimeout(flushQuery, 300) };
  }, [flushQuery]);
  useEffect(() => () => { if (qPending.current) clearTimeout(qPending.current.timer); }, []);
  // Each chip change is a history entry; the old filter params go once they are chips
  const setFilters = useCallback((next: Filter[]) => {
    flushQuery();
    const p = new URLSearchParams(window.location.search);
    p.delete("f");
    for (const k of LEGACY_PARAMS) p.delete(k);
    for (const f of next) p.append("f", filterKey(f));
    window.history.pushState(null, "", window.location.pathname + (p.size ? `?${p}` : ""));
  }, [flushQuery]);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  /** Adds a chip, or takes it away when it is already there (a tag clicked in the panel, a person in the sidebar) */
  const toggleFilter = useCallback((f: Filter) => {
    const cur = filtersRef.current;
    setFilters(cur.some((x) => filterKey(x) === filterKey(f)) ? cur.filter((x) => filterKey(x) !== filterKey(f)) : [...cur, f]);
  }, [setFilters]);

  // ─── Projects ──────────────────────────────────────────────────────────────
  // ?in=inbox (not filed anywhere) or ?in=<project id>; no param = everything. Filters apply inside the space.
  const [projects, setProjects] = useState(initialProjects);
  const [links, setLinks] = useState<ProjectLinks>(initialProjectLinks);
  const [votes, setVotes] = useState<PolishVote[]>(initialPolishVotes);
  /** This tab's own votes on their way or just saved, by "project:item": a look at the server taken meanwhile must not undo them */
  const voteWrites = useRef(new Map<string, { projectId: string; itemId: string; vote: PolishChoice | null; closedAt: string | null; saved: number | null }>());
  const withVoteWrites = useRef((list: PolishVote[]): PolishVote[] => {
    const w = voteWrites.current, now = Date.now();
    for (const [k, x] of w) if (x.saved && now - x.saved > 20_000) w.delete(k);
    if (!w.size) return list;
    const out = list.filter((v) => !(v.userId === user.id && w.has(`${v.projectId}:${v.itemId}`)));
    for (const x of w.values()) if (x.vote) out.push({ projectId: x.projectId, itemId: x.itemId, userId: user.id, vote: x.vote, closedAt: x.closedAt, closedBy: x.closedAt ? user.id : null });
    return out;
  });
  // The systems, alive: filing a reference into a project that has started its system re-reads the
  // board a moment later (one cheap model call), so the system never lags behind the board
  const [systems, setSystems] = useState(initialSystems);
  const systemsRef = useRef(systems);
  systemsRef.current = systems;
  const systemTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const refreshSystem = useCallback((projectId: string) => {
    if (!systemsRef.current[projectId]?.run) return;  // the team has not read the board yet: nothing to keep alive
    clearTimeout(systemTimers.current[projectId]);
    systemTimers.current[projectId] = setTimeout(async () => {
      try {
        const res = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, auto: true }) });
        const json = await res.json().catch(() => ({})) as ProjectSystem & { error?: string };
        if (res.ok && !json.error) setSystems((prev) => ({ ...prev, [projectId]: json }));
      } catch { /* the modal shows the board as unread; the next read catches up */ }
    }, 2500);
  }, []);
  const setSystem = useCallback((projectId: string, system: ProjectSystem) => setSystems((prev) => ({ ...prev, [projectId]: system })), []);
  const inParam = sp.get("in");
  // Bare "/" asks what you are making (the chooser); ?in=library is the whole board; ?in=inbox; ?in=<project>
  // ?in=home is the chooser asked for (the island's house); the bare address lands on the last project (below)
  const space = inParam === "inbox" || inParam === "templates" || inParam === "discover" || inParam === "skills" || (inParam && projects.some((p) => p.id === inParam)) ? inParam : inParam === "library" || items.length === 0 ? "all" : "home";
  const currentProject = projects.find((p) => p.id === space) ?? null;
  const currentSystem = currentProject ? systems[currentProject.id] ?? null : null;
  // Inside a project the board comes first; polishing it (?view=polish) and the system (?view=system) are modes
  const defaultView = "board" as const;
  const viewParam = sp.get("view");
  const projectView: "system" | "polish" | "board" = !currentProject ? "board" : viewParam === "board" || viewParam === "polish" || viewParam === "system" ? viewParam : defaultView;
  // Back from Polish, the board takes the tornado's cards (components/view-morph.ts); its chunk is warm before it is asked for
  const lastView = useRef(projectView);
  useLayoutEffect(() => {
    if (lastView.current === "polish" && projectView === "board") gridRef.current?.receive();
    lastView.current = projectView;
  }, [projectView]);
  useEffect(() => { if (currentProject) void import("./PolishView"); }, [currentProject]);
  /** Between the board and Polish the cards go from one to the other: the view leaving sets off at the click, before
   *  anything is rendered, and the view arriving takes them from where they have got to (components/view-morph.ts) */
  const leaveView = useCallback((v: "system" | "polish" | "board") => {
    if (projectView === "board" && v === "polish") leaveBoard();
    else if (projectView === "polish" && v === "board") leavePolish();
  }, [projectView]);
  const setProjectView = useCallback((v: "system" | "polish" | "board") => {
    leaveView(v);
    setParams({ view: v === defaultView ? "" : v });
  }, [setParams, defaultView, leaveView]);
  // The search lives on a project's board and in the Inbox, nowhere else: off them there is no box, and what was
  // typed or chipped there waits in the URL without narrowing anything
  const searchHere = (!!currentProject && projectView === "board") || space === "inbox";
  const searchHereRef = useRef(searchHere);
  searchHereRef.current = searchHere;
  // Which areas of the current project's system each reference backs (for the card's "to the system")
  const backsByItem = useMemo(() => {
    const m = new Map<string, SystemArea[]>();
    for (const a of currentSystem?.areas ?? []) for (const e of a.evidence) m.set(e.itemId, [...(m.get(e.itemId) ?? []), a.area]);
    return m;
  }, [currentSystem]);
  const backsOf = useCallback((id: string) => backsByItem.get(id) ?? EMPTY_AREAS, [backsByItem]);
  // The same in every project: which areas each reference backs, project by project (the folder button's areas)
  const areasByItem = useMemo(() => {
    const m = new Map<string, Record<string, SystemArea[]>>();
    for (const [pid, sys] of Object.entries(systems)) for (const a of sys?.areas ?? []) for (const e of a.evidence) {
      const rec = m.get(e.itemId) ?? {};
      rec[pid] = [...(rec[pid] ?? []), a.area];
      m.set(e.itemId, rec);
    }
    return m;
  }, [systems]);
  const systemFilled = currentSystem ? currentSystem.areas.filter((a) => a.decision).length : 0;
  const systemStale = useMemo(() => {
    if (!currentProject || !currentSystem?.run) return 0;
    const boardIds = items.filter((i) => i.id && links[i.id]?.includes(currentProject.id)).map((i) => i.id!);
    return staleness(currentSystem, boardIds).unread;
  }, [currentProject, currentSystem, items, links]);
  // An asked-for system view stays with the project it was asked in: the next one opens on its own default
  const setSpace = useCallback((v: string) => setParams({
    in: v === "all" ? "library" : v,
    ...(new URLSearchParams(window.location.search).get("view") === "system" ? { view: "" } : {}),
  }), [setParams]);
  // Adding from inside a project files it there: read at save time, whatever the callback closed over
  const projectRef = useRef<string | null>(null);
  projectRef.current = currentProject?.id ?? null;
  // Where a new reference lands: nothing lives outside a project. The project open in the tabs; from the library or
  // Discover, the last one opened (kept on this machine, per workspace); failing that, the first project
  const lastProjectKey = `criterio:last-project:${workspace.id}`;
  useEffect(() => { if (currentProject) try { localStorage.setItem(lastProjectKey, currentProject.id); } catch { /* it lasts the visit */ } }, [currentProject, lastProjectKey]);
  const saveTarget = () => {
    if (currentProject) return currentProject.id;
    // Added from the Inbox, it stays there: no project yet is what the Inbox is for
    if (space === "inbox") return undefined;
    let last: string | null = null;
    try { last = localStorage.getItem(lastProjectKey); } catch { /* private mode */ }
    return projects.find((p) => p.id === last)?.id ?? projects[0]?.id;
  };
  const saveTargetRef = useRef(saveTarget);
  saveTargetRef.current = saveTarget;
  // There is no library to land on: the bare address (or an old ?in=library) opens the last project worked in.
  // With no project yet, the first screen stays (the chooser, or the empty start)
  useEffect(() => {
    if (inParam !== "home" && (space === "home" || space === "all") && projects.length) setParams({ in: saveTarget() ?? "" }, true);
  }, [space, inParam, projects.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirm, confirmDialog] = useConfirm();

  // What no project has taken (nor archived): the library's second view
  // What no project holds: the system's inbox, kept as one array so the system view's memos hold across renders
  const unfiled = useMemo(() => items.filter((i) => !(i.id && links[i.id]?.length)), [items, links]);
  const unfiledCount = unfiled.length;
  // The items in the current space (inbox, a project or everything), before any other filter
  const spaceItems = useMemo(() => space === "all" || space === "home" ? items
    : space === "inbox" ? items.filter((i) => !(i.id && links[i.id]?.length))
    : items.filter((i) => !!i.id && !!links[i.id]?.includes(space)),
  [items, links, space]);

  // ─── Tags ───────────────────────────────────────────────────────────────────

  // ─── Tags: one job per item, on the server ──────────────────────────────────
  // Every add starts its item's job (lib/tag-jobs.ts), whatever the tab does next. Here: which items are
  // still gathering, and asking how they go for the ones added or retried in this tab.
  const [watching, setWatching] = useState<Record<string, number>>({}); // web → when it started
  const watch = useCallback((web: string) => {
    setTagJobs((prev) => ({ ...prev, [web]: "pending" }));
    setWatching((prev) => ({ ...prev, [web]: Date.now() }));
  }, []);
  useEffect(() => {
    const webs = Object.keys(watching);
    if (!webs.length) return;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tags?${webs.map((w) => `web=${encodeURIComponent(w)}`).join("&")}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { jobs: Record<string, TagStatus>; tags: TagMap };
        setTagMap((prev) => keepSame(prev, { ...prev, ...data.tags }));
        setTagJobs((prev) => {
          const next = { ...prev };
          for (const w of webs) { if (data.jobs[w]) next[w] = data.jobs[w]; else delete next[w]; }
          return keepSame(prev, next);
        });
        setWatching((prev) => {
          const next = { ...prev };
          for (const w of webs) if (!data.jobs[w] || data.jobs[w] === "failed" || Date.now() - prev[w] > TAG_WATCH_MS) delete next[w];
          return next;
        });
      } catch { setWatching((prev) => ({ ...prev })); } // asks again next round
    }, TAG_POLL_MS);
    return () => clearTimeout(id);
  }, [watching]);
  const gathering = useMemo(() => items.filter((i) => tagJobs[i.web] === "pending" || tagJobs[i.web] === "running").length, [items, tagJobs]);

  // ─── Changed somewhere else ─────────────────────────────────────────────────
  // The extension, another tab or a teammate: what they add, delete, edit or file shows up here without a
  // reload. The board asks (/api/pulse) when it comes back into view and every 15 s while it is seen; a hidden tab
  // asks nothing. Nothing changed: a few bytes. Something did: those rows only, folded in where they stand.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const lookRef = useRef({ stamp, since, bell });
  /** What this tab learned was deleted: a page read before the delete must not bring it back */
  const goneRef = useRef({ items: new Set<string>(), comments: new Set<string>() });
  useEffect(() => {
    let busy = false;
    const look = async () => {
      if (busy || document.visibilityState !== "visible") return;
      // A save of this tab is on its way: its card swaps in on its own, so the next look waits for it
      if (itemsRef.current.some((i) => !i.id)) return;
      busy = true;
      try {
        const res = await fetch("/api/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ws: workspace.id, ...lookRef.current }) });
        if (!res.ok) return;
        const d = (await res.json()) as Pulse;
        // Away longer than deletions are remembered (lib/pulse.ts TOMBSTONE_DAYS): only a fresh library is sure
        if (d.reload) { window.location.reload(); return; }
        // A save of this tab started while the answer was on its way: the next look asks again from the same point
        if (itemsRef.current.some((i) => !i.id)) return;
        lookRef.current = { stamp: d.stamp, since: d.since, bell: d.bell ?? lookRef.current.bell };
        for (const id of d.gone?.items ?? []) goneRef.current.items.add(id);
        for (const id of d.gone?.comments ?? []) goneRef.current.comments.add(id);
        const known = new Set(itemsRef.current.map((i) => i.id));
        setMirror((m) => applyPulse(m, d));
        if (d.projects) { const next = d.projects; setProjects((prev) => keepSame(prev, next)); }
        if (d.links) { const next = d.links; setLinks((prev) => keepSame(prev, next)); }
        if (d.votes) { const next = d.votes; setVotes((prev) => keepSame(prev, withVoteWrites.current(next))); }
        // A new card whose tags are still on their way fills in as soon as they arrive, not on the next look
        for (const i of d.changed?.items ?? []) {
          const job = d.changed?.tagJobs[i.web];
          if (!known.has(i.id) && (job === "pending" || job === "running")) watch(i.web);
        }
      } catch { /* the next look catches up */ }
      finally { busy = false; }
    };
    const id = setInterval(look, PULSE_MS);
    document.addEventListener("visibilitychange", look);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", look);
    };
  }, [workspace.id, watch]);

  // The rest of the library, a page after another as soon as the board is up. Search, chips, the Inbox and the
  // boards filter what is here in memory, so they need every reference: the pages are not waiting for a scroll
  const [filling, setFilling] = useState(!!first.cursor);
  useEffect(() => {
    let cursor = first.cursor, alive = true, tries = 0;
    if (!cursor) return;
    void (async () => {
      while (cursor && alive) {
        try {
          const res = await fetch(`/api/library/page?ws=${encodeURIComponent(workspace.id)}&cursor=${encodeURIComponent(cursor)}`);
          if (!res.ok) throw new Error(String(res.status));
          const page = (await res.json()) as ItemsPage;
          if (!alive) return;
          setMirror((m) => applyPage(m, page, goneRef.current));
          cursor = page.cursor; tries = 0;
        } catch {
          // A page that keeps failing leaves the library where it got to; a reload starts over
          if (++tries >= 3) break;
          await new Promise((r) => setTimeout(r, 2000 * tries));
        }
      }
      if (alive) setFilling(false);
    })();
    return () => { alive = false; };
  }, [first.cursor, workspace.id]);

  const [showAdd, setShowAdd] = useState(false);
  // What was pasted or dropped on the board: the add dialog opens with it in place
  const [addInitial, setAddInitial] = useState<{ file?: File; web?: string; text?: string } | undefined>();
  const [boardDrag, setBoardDrag] = useState(false);
  const gridRef = useRef<GridHandle | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector(".modal-backdrop, .cp")) return; // something open on top
      e.preventDefault();
      setShowAdd(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  // ⌘V or a file dropped anywhere on the board: no need to open the dialog first.
  // It opens with the image, the link or the text already in it, waiting for what caught your eye.
  // Whatever handled the paste or the drop on its own (a field, the comments, the project start) has prevented it.
  useEffect(() => {
    const free = (e: Event) => {
      if (e.defaultPrevented) return false;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return false;
      return !document.querySelector(".modal-backdrop, .cp");
    };
    const open = (initial: { file?: File; web?: string; text?: string }) => { setAddInitial(initial); setShowAdd(true); };
    const onPaste = (e: ClipboardEvent) => {
      if (!free(e)) return;
      const file = mediaFileFrom(e.clipboardData);
      if (file) { e.preventDefault(); open({ file }); return; }
      const pasted = (e.clipboardData?.getData("text/plain") ?? "").trim();
      // A link, or several lines (a text to keep); a stray word stays out
      if (!/\s/.test(pasted) && normalizeWebUrl(pasted)) { e.preventDefault(); open({ web: pasted }); }
      else if (/\n/.test(pasted)) { e.preventDefault(); open({ text: pasted }); }
    };
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e) || !free(e)) { setBoardDrag(false); return; }
      e.preventDefault(); setBoardDrag(true);
    };
    const onDragLeave = (e: DragEvent) => { if (!e.relatedTarget) setBoardDrag(false); };
    const onDrop = (e: DragEvent) => {
      setBoardDrag(false);
      if (!hasFiles(e) || !free(e)) return;
      e.preventDefault();
      const file = mediaFileFrom(e.dataTransfer);
      if (file) open({ file });
      else setToast({ title: t.errors.imagesOnly, detail: "" });
    };
    document.addEventListener("paste", onPaste);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [t]);
  // The directory is Discover's resources: every "open the directory" lands there
  const openDirectory = useCallback(() => setSpace("discover"), [setSpace]);

  // ─── Add by URL only ─────────────────────────────────────────────────────────
  // The card appears instantly with the domain; the server gets the real name
  // from the site itself and replaces it. If it fails, it's removed with a notice up top.
  // A notice up top: what failed, or (ok) what an import brought
  const [toast, setToast] = useState<{ title: string; detail: string; ok?: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    cue(toast.ok ? "success" : "error");
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const isDuplicate = useCallback((web: string) => {
    const key = webKeyOf(web);
    return items.some((i) => webKeyOf(i.web) === key);
  }, [items]);
  // Reads a post on X and saves a copy of its photos, frame and video; its picture becomes the card's
  const importPost = useCallback(async (web: string) => {
    try {
      const res = await fetch("/api/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ web }) });
      const data = res.ok ? await res.json() : null;
      if (data?.thumb) setThumbMap((prev) => (prev[web] ? prev : { ...prev, [web]: data.thumb }));
    } catch { /* stays a typographic card */ }
  }, []);
  // Saved from the dialog under some areas of the project's system: each one counts it at once
  const fileUnderAreas = async (projectId: string, item: InspoItem, areas: SystemArea[] | undefined) => {
    if (!item.id || !areas?.length) return;
    for (const area of areas) {
      const r = await assignSystemArea(projectId, area, item.id, true).catch((e) => ({ ok: false as const, error: String(e) }));
      if (!r.ok) { projectFailed(new Error(r.error)); return; }
      setSystem(projectId, r.data);
    }
  };
  const addByUrl = useCallback(async (input: NewInspoInput): Promise<InspoItem | null> => {
    const d = new Date();
    const temp: InspoItem = {
      name: nameFromHost(input.web), web: input.web, type: input.type, note: input.note,
      date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      addedBy: user.name || user.email,
    };
    setItems((prev) => [temp, ...prev]);
    try {
      const projectId = saveTargetRef.current() ?? undefined;
      const r = await addInspo({ web: input.web, type: input.type, note: input.note, projectId });
      if (!r.ok) throw new Error(r.error);
      const item = r.data;
      if (projectId && item.id) setLinks((prev) => ({ ...prev, [item.id!]: [projectId] }));
      if (projectId) refreshSystem(projectId);
      if (projectId) void fileUnderAreas(projectId, item, input.areas);
      setItems((prev) => prev.map((i) => (i === temp ? item : i)));
      // Full experience from the start: tags and DESIGN.md without asking.
      // A post on X is imported first (its picture is what the tags look at).
      // Its tags are already being gathered on the server: the card shows it until they arrive
      if (mediaKindOf(item.web) === "post") importPost(item.web);
      watch(item.web);
      cue("success", { emphasis: "subtle" });
      return item;
    } catch (e) {
      setItems((prev) => prev.filter((i) => i !== temp));
      setToast({ title: t.app.saveFailed, detail: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }, [user, watch, importPost]);

  // ─── Add an image ────────────────────────────────────────────────────────────
  // Same optimistic card, showing the local file while it uploads; the uploaded
  // file's URL becomes the item's address and its thumbnail.
  const addByUpload = useCallback(async (input: NewInspoInput & { file: File }): Promise<InspoItem | null> => {
    const d = new Date();
    const local = URL.createObjectURL(input.file);
    const temp: InspoItem = {
      name: nameFromFile(input.file.name) || t.card.image, web: local, type: input.type, note: input.note,
      date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      addedBy: user.name || user.email,
    };
    setItems((prev) => [temp, ...prev]);
    try {
      const url = await uploadMedia(input.file);
      const projectId = saveTargetRef.current() ?? undefined;
      const r = await addImage({ url, fileName: input.file.name, type: input.type, note: input.note, projectId });
      if (!r.ok) throw new Error(r.error);
      const item = r.data;
      if (projectId && item.id) setLinks((prev) => ({ ...prev, [item.id!]: [projectId] }));
      if (projectId) refreshSystem(projectId);
      if (projectId) void fileUnderAreas(projectId, item, input.areas);
      setThumbMap((prev) => ({ ...prev, [item.web]: item.web }));
      setItems((prev) => prev.map((i) => (i === temp ? item : i)));
      watch(item.web);
      void cardCopy(item.web, input.file);
      cue("success", { emphasis: "subtle" });
      return item;
    } catch (e) {
      setItems((prev) => prev.filter((i) => i !== temp));
      setToast({ title: t.app.saveFailed, detail: messageOf(e, t, String(e)) });
      return null;
    } finally {
      // The card already swapped to the uploaded file; give it a moment before dropping the local copy
      setTimeout(() => URL.revokeObjectURL(local), 30_000);
    }
  }, [user, watch, workspace.id, t]);

  // ─── Add a text ──────────────────────────────────────────────────────────────
  // The project's content, pasted: the same optimistic card, a poster with its title until it is saved
  const addByText = useCallback(async (input: NewInspoInput & { text: { title: string; body: string } }): Promise<InspoItem | null> => {
    const d = new Date();
    const temp: InspoItem = {
      name: input.text.title, web: `text:${d.getTime()}`, type: input.type, note: input.note,
      date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      addedBy: user.name || user.email,
    };
    setItems((prev) => [temp, ...prev]);
    try {
      const projectId = saveTargetRef.current() ?? undefined;
      const r = await addText({ title: input.text.title, text: input.text.body, note: input.note, projectId });
      if (!r.ok) throw new Error(r.error);
      const item = r.data;
      if (projectId && item.id) setLinks((prev) => ({ ...prev, [item.id!]: [projectId] }));
      if (projectId) refreshSystem(projectId);
      setItems((prev) => prev.map((i) => (i === temp ? item : i)));
      // Its "tags" (its first lines) are already written: one look brings them to the card
      watch(item.web);
      cue("success", { emphasis: "subtle" });
      return item;
    } catch (e) {
      setItems((prev) => prev.filter((i) => i !== temp));
      setToast({ title: t.app.saveFailed, detail: messageOf(e, t, String(e)) });
      return null;
    }
  }, [user, watch, refreshSystem, t]);

  // A guest who pasted a URL on the start canvas comes back from login with ?add=<url>:
  // it saves itself and its DESIGN.md opens, as if pasted from inside.
  // The param is removed with the Next router, not history.replaceState: the router
  // keeps its own URL and, on a workspace switch (router.refresh + remount), it
  // restored it with ?add= and the site got added to the second workspace too.
  // Just in case, the handled URL is noted in sessionStorage and not repeated in the tab.
  // And if it comes back with ?directory=1 (pressed "sign in" from the guest directory), Discover opens on its resources.
  const router = useRouter();
  const autoAdded = useRef(false);
  // A board that came back from login: the first-run canvas shows its progress
  const [arrivingBoard, setArrivingBoard] = useState<BoardStep | null>(null);
  useEffect(() => {
    if (autoAdded.current) return;
    const params = new URLSearchParams(window.location.search);
    const web = params.get("add");
    const wantsDirectory = params.has("directory");
    if (!web && !wantsDirectory) return;
    autoAdded.current = true;
    params.delete("add");
    params.delete("directory");
    if (wantsDirectory) params.set("in", "discover");
    router.replace(window.location.pathname + (params.size ? `?${params}` : ""), { scroll: false });
    if (!web) return;
    const DONE_KEY = "inspo:auto-added";
    let done = "";
    try { done = sessionStorage.getItem(DONE_KEY) ?? ""; } catch { /* no storage */ }
    if (done === web || !/^https?:\/\//.test(web) || isDuplicate(web)) return;
    try { sessionStorage.setItem(DONE_KEY, web); } catch { /* no storage */ }
    // A board pasted before signing in is imported; what goes wrong is said in the notice up top
    if (boardOf(web)) {
      void importBoard(web, setArrivingBoard).then((failed) => {
        setArrivingBoard(null);
        if (failed) setToast({ title: t.app.saveFailed, detail: failed });
      });
    }
    else void addByUrl({ web, type: typeFromUrl(web), note: "" });
    // mount only: the address bar URL doesn't change later
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Remove card ─────────────────────────────────────────────────────────────
  // Removed instantly; if the server fails, it goes back in place with a notice.
  const deleteItem = useCallback(async (item: InspoItem) => {
    if (!item.id) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      const r = await removeInspo(item.id);
      if (!r.ok) throw new Error(r.error);
      setThumbMap((prev) => { if (!(item.web in prev)) return prev; const next = { ...prev }; delete next[item.web]; return next; });
    } catch (e) {
      setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [item, ...prev]));
      setToast({ title: t.app.removeFailed, detail: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  // Projects change on screen first; if the server says no, they go back with a notice
  const projectFailed = (e: unknown) => setToast({ title: t.projects.saveFailed, detail: e instanceof Error ? e.message : String(e) });
  const createProject = useCallback(async (name: string): Promise<Project | null> => {
    const r = await newProject(name).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { projectFailed(new Error(r.error)); return null; }
    setProjects((prev) => [...prev, r.data]);
    return r.data;
  }, []);

  // ─── Import a board ──────────────────────────────────────────────────────────
  // A board pasted from Are.na, Pinterest or Cosmos: everything on it Criterio can save (websites, images, videos,
  // posts, texts) comes in batches into the project named after it, made the first time, and the user lands there. Nothing is created if
  // the board cannot be read or has nothing to save.
  const importBoard = useCallback<ImportBoard>(async (input, onStep) => {
    const ref = boardOf(input);
    if (!ref) return t.add.notUrl;
    const platform = PLATFORM_NAME[ref.platform];
    onStep({ phase: "reading", platform: ref.platform });
    const read = await readBoardAction(input).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!read.ok) return read.error;
    const board = read.data;
    if (!board.ok) return board.reason === "private" ? t.board.private : board.reason === "not-found" ? t.board.notFound : t.board.unavailable(platform);
    if (!board.entries.length) return t.board.none;
    // The board's project: the same one each time this board is imported, here or from the extension
    const made = await boardProject(board.name).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!made.ok) return made.error;
    const project = made.data;
    setProjects((prev) => (prev.some((p) => p.id === project.id) ? prev : [...prev, project]));
    const total = board.entries.length;
    const imported = noneImported();
    const added: InspoItem[] = [];
    const ids: string[] = [];
    let done = 0, failed = 0, existed = 0, invalid = 0;
    onStep({ phase: "saving", done, total });
    for (const batch of batchesOf(board.entries)) {
      const r = await importBatch(project.id, batch).catch((e) => ({ ok: false as const, error: String(e) }));
      if (r.ok) {
        r.data.results.forEach((x, i) => {
          if (x.id && x.status === "added") { ids.push(x.id); imported[batch[i].kind]++; }
          else if (x.id && x.status === "existed") { ids.push(x.id); existed++; }
          else if (x.status === "invalid") invalid++;
          else failed++;
        });
        added.push(...r.data.added);
      } else {
        console.warn("board batch not saved", r.error);
        failed += batch.length;
      }
      done += batch.length;
      onStep({ phase: "saving", done, total });
    }
    // All at once at the end: the first item on screen would take the first run's canvas, and its progress, away
    setItems((prev) => { const known = new Set(prev.map((x) => x.id)); return [...added.filter((a) => !known.has(a.id)), ...prev]; });
    setLinks((prev) => { const next = { ...prev }; for (const id of ids) next[id] = [...new Set([...(next[id] ?? []), project.id])]; return next; });
    for (const a of added) watch(a.web);
    setSpace(project.id);
    setToast({ ok: true, ...importSummary(t, { imported, existed, skipped: { ...board.skipped, invalid }, failed, capped: board.capped }) });
    return null;
  }, [t, watch, setSpace]);
  const renameProject = useCallback(async (id: string, name: string) => {
    const before = projects.find((p) => p.id === id);
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    const r = await editProject(id, name).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { if (before) setProjects((prev) => prev.map((p) => (p.id === id ? before : p))); projectFailed(new Error(r.error)); }
  }, [projects]);
  const deleteProject = useCallback(async (project: Project) => {
    if (!(await confirm({ title: t.projects.confirmRemove(project.name), description: t.projects.confirmRemoveHint, action: t.common.delete, danger: true }))) return;
    const prevProjects = projects, prevLinks = links;
    if (space === project.id) setParams({ in: "" }, true);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setLinks((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.filter((x) => x !== project.id)])));
    const r = await removeProject(project.id).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { setProjects(prevProjects); setLinks(prevLinks); projectFailed(new Error(r.error)); }
  }, [projects, links, space, confirm, setParams]);
  const toggleFiled = useCallback(async (item: InspoItem, projectId: string, on: boolean) => {
    const id = item.id;
    if (!id) return;
    const flip = (want: boolean) => setLinks((prev) => {
      const cur = (prev[id] ?? []).filter((x) => x !== projectId);
      return { ...prev, [id]: want ? [...cur, projectId] : cur };
    });
    flip(on);
    const r = await setFiled(projectId, [id], on).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { flip(!on); projectFailed(new Error(r.error)); return; }
    // Taken off the board by hand: what was voted about it there goes too, as on the server
    if (!on) { voteWrites.current.delete(`${projectId}:${id}`); setVotes((prev) => prev.filter((v) => !(v.projectId === projectId && v.itemId === id))); }
    refreshSystem(projectId);
  }, [refreshSystem]);

  // ─── Polish votes ────────────────────────────────────────────────────────────
  // In a team nothing leaves the board on a vote: closing the polish does it. Alone, a vote is settled as it is cast
  const solo = members.length <= 1;
  const votesRef = useRef(votes);
  votesRef.current = votes;
  /** Saved optimistically; in a workspace of one, a forgotten reference leaves the board with its vote */
  const castVote = useCallback(async (projectId: string, voted: InspoItem[], vote: PolishChoice | null) => {
    const ids = voted.map((i) => i.id).filter((x): x is string => !!x);
    if (!ids.length) return;
    const closedAt = solo && vote ? new Date().toISOString() : null;
    const set = new Set(ids), mine = (v: PolishVote) => v.userId === user.id && v.projectId === projectId && set.has(v.itemId);
    const before = votesRef.current.filter(mine);
    for (const itemId of ids) voteWrites.current.set(`${projectId}:${itemId}`, { projectId, itemId, vote, closedAt, saved: null });
    setVotes((prev) => [...prev.filter((v) => !mine(v)), ...(vote ? ids.map((itemId) => ({ projectId, itemId, userId: user.id, vote, closedAt, closedBy: closedAt ? user.id : null })) : [])]);
    const leaves = solo && vote === "forget";
    const file = (on: boolean) => setLinks((prev) => {
      const next = { ...prev };
      for (const id of ids) { const cur = (prev[id] ?? []).filter((x) => x !== projectId); next[id] = on ? [...cur, projectId] : cur; }
      return next;
    });
    if (leaves) file(false);
    const r = await votePolish(projectId, ids, vote).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) {
      for (const itemId of ids) voteWrites.current.delete(`${projectId}:${itemId}`);
      setVotes((prev) => [...prev.filter((v) => !mine(v)), ...before]);
      if (leaves) file(true);
      projectFailed(new Error(r.error));
      return;
    }
    const now = Date.now();
    for (const itemId of ids) { const w = voteWrites.current.get(`${projectId}:${itemId}`); if (w && w.vote === vote) w.saved = now; }
    if (leaves) refreshSystem(projectId);
  }, [solo, user.id, refreshSystem]);
  /** Whoever manages the workspace settles what was voted. Returns how many references left the board, or null if it failed */
  const closePolishOf = useCallback(async (projectId: string, resolve: Record<string, PolishChoice>): Promise<number | null> => {
    const r = await closeProjectPolish(projectId, resolve).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { projectFailed(new Error(r.error)); return null; }
    const { removed, settled, closedAt } = r.data;
    const done = new Set(settled), gone = new Set(removed);
    setVotes((prev) => prev.map((v) => (v.projectId === projectId && !v.closedAt && done.has(v.itemId) ? { ...v, closedAt, closedBy: user.id } : v)));
    if (gone.size) {
      setLinks((prev) => Object.fromEntries(Object.entries(prev).map(([id, ps]) => [id, gone.has(id) ? ps.filter((x) => x !== projectId) : ps])));
      refreshSystem(projectId);
    }
    return removed.length;
  }, [user.id, refreshSystem]);
  /** A reference the polish forgot, back on its board, to be voted again */
  const restoreToProject = useCallback(async (item: InspoItem, projectId: string) => {
    const id = item.id;
    if (!id) return;
    const flip = (on: boolean) => setLinks((prev) => {
      const cur = (prev[id] ?? []).filter((x) => x !== projectId);
      return { ...prev, [id]: on ? [...cur, projectId] : cur };
    });
    flip(true);
    voteWrites.current.delete(`${projectId}:${id}`);
    setVotes((prev) => prev.filter((v) => !(v.projectId === projectId && v.itemId === id)));
    const r = await restoreToBoard(projectId, id).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { flip(false); projectFailed(new Error(r.error)); return; }
    refreshSystem(projectId);
  }, [refreshSystem]);
  // The step into the system, from the board's bar or at the end of polishing: the first time it also marks the project as started
  const startSystem = useCallback(async () => {
    if (!currentProject) return;
    const id = currentProject.id;
    if (!currentProject.started) {
      const r = await markProjectStarted(id).catch((e) => ({ ok: false as const, error: String(e) }));
      if (!r.ok) { projectFailed(new Error(r.error)); return; }
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, started: true } : p)));
    }
    setParams({ view: "system" });
  }, [currentProject, setParams]);
  /** Several references into one project at once (the empty project's picker) */
  const fileMany = useCallback(async (picked: InspoItem[], projectId: string) => {
    const ids = picked.map((i) => i.id).filter((id): id is string => !!id);
    if (!ids.length) return;
    const prevLinks = links;
    setLinks((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = [...(next[id] ?? []).filter((x) => x !== projectId), projectId];
      return next;
    });
    const r = await setFiled(projectId, ids, true).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { setLinks(prevLinks); projectFailed(new Error(r.error)); return; }
    refreshSystem(projectId);
  }, [links, refreshSystem]);
  const createAndFile = useCallback(async (item: InspoItem, name: string) => {
    const p = await createProject(name);
    if (p) await toggleFiled(item, p.id, true);
  }, [createProject, toggleFiled]);

  // ─── Plan and quotas ───────────────────────────────────────────────────────
  // Arrives from the server with the page; re-read after a search that spent quota and whenever the island's menu opens
  const [quota, setQuota] = useState<QuotaView | null>(initialQuota);
  const loadQuota = useCallback(() => {
    fetch("/api/plan").then((r) => (r.ok ? r.json() : null)).then((q) => { if (q) setQuota(q); }).catch(() => {});
  }, []);

  // ─── Comments ──────────────────────────────────────────────────────────────
  const loadComments = useCallback(async () => {
    try {
      const res = await fetch("/api/comments");
      // keepSame: a thread nobody wrote in keeps its array, so its card and the system view stay put
      if (res.ok) { const next = (await res.json()) as CommentMap; setCommentMap((prev) => keepSame(prev, next)); }
    } catch { /* offline: retried on the next cycle */ }
  }, []);
  // The panel: one reference open on the right, the board still live on the left
  const [panelItem, setPanelItem] = useState<InspoItem | null>(null);
  // With the thread in view, refresh every 20 s to see what others write
  useEffect(() => {
    if (!panelItem) return;
    const t = setInterval(loadComments, 20000);
    return () => clearInterval(t);
  }, [panelItem, loadComments]);
  const postComment = async (itemId: string, body: string, attachments: CommentAttachment[], parentId?: string) => {
    const r = await postCommentAction(itemId, body, attachments, parentId);
    if (!r.ok) throw new Error(r.error);
    setCommentMap((prev) => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), r.data] }));
  };
  const editNote = async (itemId: string, field: "note" | "subNote", text: string) => {
    const r = await editNoteAction(itemId, field, text);
    if (!r.ok) throw new Error(r.error);
    const patch = { note: r.data.note, subNote: r.data.subNote };
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    // The panel keeps its own copy of the item, so its thread needs the new text too
    setPanelItem((cur) => (cur?.id === itemId ? { ...cur, ...patch } : cur));
  };
  // A comment goes with its replies: when others answered it, ask first
  const deleteComment = async (itemId: string, id: string) => {
    const replies = (commentMap[itemId] ?? []).filter((c) => c.parentId === id).length;
    if (replies && !(await confirm({ title: t.comments.deleteThread, description: t.comments.deleteThreadHint(replies), action: t.common.delete, danger: true }))) return;
    const r = await removeComment(id).catch(() => null);
    if (r?.ok) setCommentMap((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? []).filter((c) => c.id !== id && c.parentId !== id) }));
  };

  // Any workspace member can change thumbnails; the server checks the session.
  const handleThumbnailUpload = async (webUrl: string, file: File) => {
    const compressed = await compressImage(file);
    const fd = new FormData();
    fd.append("file", compressed);
    fd.append("webUrl", webUrl);
    const res = await fetch("/api/thumbnail", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setThumbMap((prev) => ({ ...prev, [webUrl]: url }));
    }
  };

  // An uploaded image is kept whole for the panel, but a card is at most a few hundred px wide: a 20 MB photo
  // was downloaded and decoded at full size for it. The card gets a 1400 px WebP copy (WebP keeps transparency),
  // when that is clearly lighter. A gif stays as it is, so it still moves.
  const cardCopy = async (webUrl: string, file: File) => {
    if (!file.type.startsWith("image/") || file.type === "image/gif") return;
    const copy = await compressImage(file, 1400, 0.85, "image/webp");
    if (copy === file || copy.size > file.size * 0.7) return;
    const fd = new FormData();
    fd.append("file", copy);
    fd.append("webUrl", webUrl);
    const res = await fetch("/api/thumbnail", { method: "POST", body: fd }).catch(() => null);
    if (res?.ok) { const { url } = await res.json(); setThumbMap((prev) => ({ ...prev, [webUrl]: url })); }
  };

  const handleThumbnailRemove = async (webUrl: string) => {
    const res = await fetch(`/api/thumbnail?webUrl=${encodeURIComponent(webUrl)}`, { method: "DELETE" });
    if (res.ok) setThumbMap((prev) => { const next = { ...prev }; delete next[webUrl]; return next; });
  };


  // ─── The panel ──────────────────────────────────────────────────────────────
  // The panel opens at once for any reference: the page with its post-its, and its thread.

  // Each open reference has its own URL (/i/<id>): it can be shared, and Back closes it.
  // The URL changes with history.pushState, which Next syncs with usePathname without a navigation.
  const pushedRef = useRef(false);
  const showPanel = (item: InspoItem) => {
    setPanelItem(item);
    if (item.id && window.location.pathname !== `/i/${item.id}`) {
      // From one open reference to another: replace, so Back goes to the library and not through each one
      if (window.location.pathname.startsWith("/i/")) window.history.replaceState(null, "", `/i/${item.id}${window.location.search}`);
      else { window.history.pushState(null, "", `/i/${item.id}${window.location.search}`); pushedRef.current = true; }
    }
  };
  const closePanel = () => {
    if (!window.location.pathname.startsWith("/i/")) { setPanelItem(null); return; }
    // Opened here: step back, so Back and close do the same. Opened from a shared link: go to the library.
    if (pushedRef.current) { window.history.back(); return; }
    window.history.replaceState(null, "", `/${window.location.search}`);
    setPanelItem(null);
  };
  const panelItemRef = useRef<InspoItem | null>(null);

  /** Opens a reference in the panel */
  const openItem = (item: InspoItem) => showPanel(item);
  panelItemRef.current = panelItem;

  // Cmd+K (Ctrl+K) opens the command palette from anywhere in the library
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Mounted on its first ⌘K, then kept so it can animate closed
  const [paletteUsed, setPaletteUsed] = useState(false);
  if (paletteOpen && !paletteUsed) setPaletteUsed(true);
  useEffect(() => {
    // The templates too: Discover opens with its cards already read, not waiting for the server
    const preload = () => { void loadItemPanel(); void loadCommentsPanel(); void preloadTemplates(workspace.id); };
    if (typeof window.requestIdleCallback !== "function") { const id = setTimeout(preload, 2000); return () => clearTimeout(id); }
    const id = window.requestIdleCallback(preload, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }, [workspace.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The path decides what is open: Back or Forward move between the library and a reference,
  // and a shared /i/<id> link opens that reference when the library loads
  const pathname = usePathname();
  const awaitedRef = useRef<string | null>(null);
  useEffect(() => {
    const id = pathname.match(/^\/i\/([^/]+)/)?.[1];
    if (!id) {
      if (panelItemRef.current) { pushedRef.current = false; setPanelItem(null); }
      return;
    }
    if (panelItemRef.current?.id === id) return;
    const item = items.find((i) => i.id === id);
    if (item) { openItem(item); return; }
    // Its page may still be on its way: it opens when it arrives (below)
    if (filling) { awaitedRef.current = id; return; }
    lookElsewhere(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on path changes only
  }, [pathname]);
  useEffect(() => {
    const id = awaitedRef.current;
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (!item && filling) return;
    awaitedRef.current = null;
    if (window.location.pathname !== `/i/${id}`) return;
    if (item) openItem(item); else lookElsewhere(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs as the pages arrive
  }, [items, filling]);
  /** Not in this workspace: if it is in another one of mine, switch to it; the library remounts and opens it */
  function lookElsewhere(id: string) {
    workspaceOfItem(id).then(async (r) => {
      if (!r.ok || !r.data || r.data === workspace.id) return;
      await setActiveWorkspace(r.data);
      router.refresh();
    }).catch(() => {});
  }

  // "Who": only workspace members who added something. Legacy sheet labels
  // ("Both" = no known author) aren't offered as a filter; those sites stay under "all".
  const memberNames = useMemo(() => members.map((m) => m.name), [members]);
  const authorImages = useMemo(() => Object.fromEntries(members.filter((m) => m.image).map((m) => [m.name, m.image!])), [members]);

  // Back to everything: the whole library, no chips, no words
  const resetFilters = useCallback(() => {
    setQueryState("");
    if (qPending.current) { clearTimeout(qPending.current.timer); qPending.current = null; }
    const p = new URLSearchParams(window.location.search);
    for (const k of ["f", "q", "in", ...LEGACY_PARAMS]) p.delete(k);
    window.history.pushState(null, "", window.location.pathname + (p.size ? `?${p}` : ""));
  }, []);

  // Desktop has no sidebar: the island in the top bar holds the projects and the workspace menu. A phone keeps
  // the sidebar as a sheet behind the menu button.
  const isMobile = useIsMobile();

  // ─── Search ─────────────────────────────────────────────────────────────────
  // Three layers, each shown as soon as it is there (lib/search-query.ts):
  // 1. here, every keystroke: chips filter, words match each item's text (tags in both languages, notes, thread);
  // 2. /api/search/semantic, a fraction of a second later: nearness in meaning, any language;
  // 3. /api/search, for descriptive queries: Jev reads the nearest 20 and reorders them.
  // The box answers every key at once; the ranking and the new layout follow when the browser has room
  const searched = useDeferredValue(searchHere ? query : "");
  const words = useMemo(() => queryWords(searched), [searched]);
  const text = searched.trim();
  const index = useMemo(() => textIndex(items, tagMap, commentMap), [items, tagMap, commentMap]);
  const vocab = useMemo(() => vocabulary(items, tagMap, memberNames), [items, tagMap, memberNames]);
  // The space, through the chips
  const chips = searchHere ? filters : NO_FILTERS;
  const base = useMemo(() => {
    if (!chips.length) return spaceItems;
    const test = filterTest(chips);
    return spaceItems.filter((i) => test(i, tagMap[i.web]));
  }, [spaceItems, tagMap, chips]);
  const local = useMemo(() => localScores(base.map((i) => i.web), index, words), [base, index, words]);

  const [semantic, setSemantic] = useState<{ q: string; scores: Record<string, number> } | null>(null);
  const [semanticBusy, setSemanticBusy] = useState(false);
  useEffect(() => {
    if (text.length < 3) { setSemantic(null); setSemanticBusy(false); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setSemanticBusy(true);
      try {
        const res = await fetch("/api/search/semantic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text }), signal: ctrl.signal });
        const data = res.ok ? await res.json() : null;
        if (data?.scores) setSemantic({ q: text, scores: data.scores });
      } catch { /* the words layer stands alone */ }
      finally { if (!ctrl.signal.aborted) setSemanticBusy(false); }
    }, SEMANTIC_WAIT_MS);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [text]);
  // Only this query's answer counts: an older one would reorder the wrong results
  const near = semantic?.q === text ? semantic.scores : null;

  const [jev, setJev] = useState<{ q: string; scores: Record<string, number> } | null>(null);
  const [jevBusy, setJevBusy] = useState(false);
  const jevFor = useMemo(() => {
    if (!aiEnabled || !near || !isDescriptive(words, local.size)) return null;
    return rankText(base.map((i) => i.web), local, near, null).order.slice(0, JEV_TOP);
  }, [near, words, local, base, aiEnabled]);
  const jevKey = jevFor ? `${text}|${jevFor.join(",")}` : "";
  useEffect(() => {
    if (!jevFor?.length) { setJevBusy(false); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setJevBusy(true);
      try {
        const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text, webs: jevFor }), signal: ctrl.signal });
        const data = res.ok ? await res.json() : null;
        if (data?.scores) { setJev({ q: text, scores: data.scores }); if (!data.cached) loadQuota(); }
      } catch { /* the first two layers stand */ }
      finally { if (!ctrl.signal.aborted) setJevBusy(false); }
    }, JEV_WAIT_MS);
    return () => { clearTimeout(id); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jevKey]);
  const jevScores = jev?.q === text ? jev.scores : null;

  const ranked = useMemo(() => (words.length || near ? rankText(base.map((i) => i.web), local, near, jevScores) : null), [words, near, base, local, jevScores]);
  const filtered = useMemo(() => {
    if (!ranked) return [...base].sort(newestFirst);
    const byWeb = new Map(base.map((i) => [i.web, i]));
    return ranked.order.map((w) => byWeb.get(w)!).filter(Boolean);
  }, [ranked, base]);
  const searchBusy = semanticBusy || jevBusy;

  // Why each result is there: the tags the words found, else "close in meaning". Free, and instant.
  const reasons = useMemo(() => {
    if (!words.length) return null;
    const out: Record<string, string> = {};
    const labelMaps: Record<string, Record<string, string>> = { palette: t.taxonomy.color, sections: t.taxonomy.section, elements: t.taxonomy.element, type: t.taxonomy.type, layout: t.taxonomy.layout };
    for (const it of filtered.slice(0, 200)) {
      const v = viewOf(tagMap[it.web]);
      const labels = v ? [
        ...FACETS.flatMap((f) => v[f.field].map((k) => labelMaps[f.field][k] ?? k)),
        ...v.traits.map((k) => t.taxonomy.tag[k as keyof typeof t.taxonomy.tag] ?? k),
        ...v.keywords, ...v.credits,
      ] : [];
      const hit = labels.filter((l) => words.some((w) => norm(l).split(/\s+/).some((p) => p.startsWith(w)))).slice(0, 3);
      out[it.web] = hit.length ? hit.join(", ") : t.search.nearInMeaning;
    }
    return out;
  }, [filtered, words, tagMap, t]);

  const swatches = useMemo(() => Object.fromEntries(COLORS.map((c) => [c.key, c.description])), []);

  // Everything under the workspace, for the sidebar (the docked column and the phone sheet)
  const filtering = chips.length > 0 || words.length > 0;
  const navProps = {
    quota, items,
    isAll: space === "all" && !filtering,
    onReset: resetFilters, onAdd: () => setShowAdd(true), onDirectory: openDirectory,
    space, onSpace: setSpace, projects, links, systems,
    onCreateProject: createProject, onRenameProject: renameProject, onDeleteProject: deleteProject,
    onImportBoard: importBoard,
  };

  // ─── Board ──────────────────────────────────────────────────────────────────
  // At rest, the whole space, newest first. While searching, only the results, laid out again in the
  // order they rank: the best one top left. What doesn't match isn't there.
  const boardItems = useMemo(
    () => (filtering ? filtered : [...spaceItems].sort(newestFirst)),
    [filtering, filtered, spaceItems],
  );
  // The references either side of the open one, in the board's order (a search walks its results).
  // Opened from Polish it is that one alone: the tornado is the slider there
  const panelAt = panelItem && projectView !== "polish" ? boardItems.findIndex((i) => keyOf(i) === keyOf(panelItem)) : -1;
  const panelPrev = panelAt > 0 ? boardItems[panelAt - 1] : null;
  const panelNext = panelAt >= 0 && panelAt < boardItems.length - 1 ? boardItems[panelAt + 1] : null;

  // The open project's polish, for its tab: how many references this person has still to vote, and who in the
  // team has gone through the whole board. The faces show in Polish, or from anywhere while votes wait to be closed
  const polishVotes = useMemo(() => (currentProject ? votesByItem(votes, currentProject.id) : new Map<string, PolishVote[]>()), [votes, currentProject]);
  const polishTab = useMemo(() => {
    if (!currentProject) return null;
    const ids = spaceItems.map((i) => i.id).filter((x): x is string => !!x);
    const left = ids.filter((id) => !polishVotes.get(id)?.some((v) => v.userId === user.id)).length;
    const under = ids.some((id) => openVotes(polishVotes.get(id)).length > 0);
    return { left, under, done: finishedOf(ids, polishVotes, members.map((m) => m.id)) };
  }, [currentProject, spaceItems, polishVotes, members, user.id]);
  // The open reference, where a closed polish forgot it: in which project and who, to say so on its sheet
  const panelForgotten = useMemo(() => {
    const id = panelItem?.id;
    if (!id) return [];
    const here = links[id] ?? [];
    const list = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
    return projects.filter((p) => !here.includes(p.id)).flatMap((p) => {
      const who = forgottenBy(votes.filter((v) => v.projectId === p.id && v.itemId === id));
      if (!who.length) return [];
      const names = who.map((u) => members.find((m) => m.id === u)?.name).filter((x): x is string => !!x);
      return [{ project: p, names: names.length ? list.format(names) : "" }];
    });
  }, [panelItem, links, projects, votes, members, locale]);

  // Height/width of what each card shows: the page height from the index, else measured once and kept
  const [ratios, setRatios] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RATIOS_KEY) || "{}");
      if (saved && typeof saved === "object") setRatios(saved);
    } catch { /* no storage */ }
  }, []);
  // Cards that load together measure together: their ratios are applied once per frame (one new layout,
  // not one per image) and saved a moment after the last one
  const pendingRatios = useRef<Record<string, number> | null>(null);
  const saveRatios = useRef<number | undefined>(undefined);
  const measure = useCallback((web: string, r: number) => {
    const first = !pendingRatios.current;
    pendingRatios.current = { ...pendingRatios.current, [web]: r };
    if (!first) return;
    requestAnimationFrame(() => {
      const batch = pendingRatios.current!;
      pendingRatios.current = null;
      setRatios((prev) => {
        const changed = Object.entries(batch).filter(([w, v]) => prev[w] === undefined || Math.abs(prev[w] - v) >= 0.01);
        if (!changed.length) return prev;
        const next = { ...prev, ...Object.fromEntries(changed) };
        window.clearTimeout(saveRatios.current);
        saveRatios.current = window.setTimeout(() => {
          try { localStorage.setItem(RATIOS_KEY, JSON.stringify(next)); } catch { /* no storage */ }
        }, 500);
        return next;
      });
    });
  }, []);
  const ratioOf = useCallback((item: InspoItem) => {
    const shot = pageShots[item.web];
    // A site is its first screen, the height of its cover (16:10), unless someone chose a thumbnail for it:
    // the stored copy of the page is cut there, and only a page shorter than a screen makes a shorter card
    if (shot && !thumbMap[item.web]) return Math.min(shot.shotH / 1440, DEFAULT_RATIO);
    // Anything else keeps its own shape, cut at the board's maximum height; unmeasured, it arrives as a cover
    return Math.min(ratios[item.web] ?? DEFAULT_RATIO, BOARD_MAX_RATIO);
  }, [pageShots, thumbMap, ratios]);

  // A card with nothing written under it takes no room for a line: the next card sits right below
  const hasNote = useCallback(
    // A text's card is its own page and draws no line under it, whatever its thread says
    (item: InspoItem) => mediaKindOf(item.web) !== "text" && (!!item.note.trim() || !!(item.id && commentMap[item.id]?.some((c) => c.body.trim()))),
    [commentMap],
  );

  // A reference as criterio.md tells it: what the AI read of it, who saved it and what the team said
  // The words of the text references, read once: the document carries them whole, and the panel shows them
  const [textBodies, setTextBody] = useTextBodies(items);
  // A text written again, from its panel or from the document: its words, and the first lines its card shows
  const saveTextBody = useCallback(async (item: InspoItem, text: string) => {
    if (!item.id) return;
    const r = await saveText(item.id, text);
    if (!r.ok) throw new Error(r.error);
    setTextBody(item.id, r.data.text);
    setTagMap((prev) => ({ ...prev, [item.web]: r.data.tags }));
  }, [setTextBody]);
  const renameTextItem = useCallback(async (item: InspoItem, title: string) => {
    if (!item.id) return;
    const r = await renameText(item.id, title);
    if (!r.ok) throw new Error(r.error);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, name: r.data.name } : i)));
    setPanelItem((cur) => (cur && cur.id === item.id ? { ...cur, name: r.data.name } : cur));
  }, []);
  const refInfo = useCallback((i: InspoItem) => {
    const text = i.id ? textBodies[i.id] : undefined;
    return { ...refInfoOf(i, tagMap[i.web], i.id ? commentMap[i.id] : undefined, t), ...(text ? { text } : {}) };
  }, [tagMap, commentMap, t, textBodies]);
  // A small picture of any reference, wherever one is shown outside the board: the thumbnail someone gave it, the
  // DESIGN.md cover, or the stored copy of its page (so a reference without a DESIGN.md is not a blank)
  const smallImageOf = useCallback((i: InspoItem) => thumbMap[i.web] ?? designMdIndex[i.web]?.coverUrl ?? pageShots[i.web]?.tileUrl ?? null, [thumbMap, designMdIndex, pageShots]);
  // The same choice a card makes on the board, at the smallest stored size: a project's cover is its board from afar
  const miniImageOf = useCallback((i: InspoItem) => thumbMap[i.web] ?? pageShots[i.web]?.thumbUrl ?? designMdIndex[i.web]?.coverUrl ?? null, [thumbMap, designMdIndex, pageShots]);
  // The zoom: one step out of 100% unless the person left it elsewhere. Read before the first paint (a layout effect),
  // so the server's markup matches and the board, which draws nothing until measured, opens at the kept zoom.
  const [zoom, setZoomState] = useState(DEFAULT_ZOOM);
  useLayoutEffect(() => {
    try {
      const kept = localStorage.getItem(ZOOM_KEY);
      const z = kept === null ? NaN : Number(kept);
      if (Number.isInteger(z) && Math.abs(z) < 8) setZoomState(z);
    } catch { /* no storage */ }
  }, []);
  const setZoom = useCallback((z: number) => {
    setZoomState(z);
    try { localStorage.setItem(ZOOM_KEY, String(z)); } catch { /* no storage */ }
  }, []);

  // What floats over the board, so the cards keep clear of it
  const winW = useWindowWidth();
  const desktop = winW >= DESKTOP_MIN;
  const insets = useMemo(() => ({
    top: desktop ? TOP_DESKTOP : TOP_MOBILE,
    left: 0,
    right: 0,
    bottom: searchHere ? BOTTOM : BOTTOM_BARE,
  }), [desktop, searchHere]);
  // The board starts from the top again when the space or the search changes, not when a slower layer reorders
  const fitKey = `${space}|${chips.map(filterKey).join(",")}|${filtering ? text : ""}`;

  // Presence: which place of the interface the person is in right now, named as the interface names it
  // (read by the /admin panel, "Where they spend the time"; the words are t.labels.area)
  const area = currentProject && projectView === "polish" ? "polish"
    : panelItem ? "sheet"
    : showAdd ? "add"
    : space === "discover" ? "directory" : space === "templates" ? "examples" : space === "skills" ? "skills"
    : filtering ? "search"
    : currentProject ? projectView
    : space === "inbox" ? "inbox"
    : space === "home" ? "home"
    : "board";
  useActivity(area, workspace.id);

  // The cards' handlers, behind one stable ref: a card only re-renders when its own data changes
  const gridActions = useRef<GridActions>(null!);
  // From a card inside a project: this piece belongs to an area of the system. The node counts it at once
  const toggleArea = useCallback(async (item: InspoItem, area: SystemArea, on: boolean) => {
    const projectId = projectRef.current;
    if (!projectId || !item.id) return;
    const r = await assignSystemArea(projectId, area, item.id, on).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { projectFailed(new Error(r.error)); return; }
    setSystem(projectId, r.data);
  }, [setSystem]);
  // ─── Selection: several references at once (SelectBar) ──────────────────────
  // ⌘/⇧-click or the circle on a card picks it; while anything is picked, a click picks. ⇧ picks the run from
  // the last pick, in the board's order. Esc or Done lets go; changing space does too.
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const lastPick = useRef<string | null>(null);
  const selectItem = useCallback((item: InspoItem, range: boolean) => {
    const id = item.id;
    if (!id) return;
    setSelected((prev) => {
      const next = new Set(prev);
      const from = range && lastPick.current ? boardItems.findIndex((i) => i.id === lastPick.current) : -1;
      const to = boardItems.findIndex((i) => i.id === id);
      if (from >= 0 && to >= 0) {
        for (const i of boardItems.slice(Math.min(from, to), Math.max(from, to) + 1)) if (i.id) next.add(i.id);
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    lastPick.current = id;
  }, [boardItems]);
  // The bar stays a moment after the selection empties, to leave the way it came, with the last count on it
  const [bar, setBar] = useState<{ count: number } | null>(null);
  if (selected.size > 0 && bar?.count !== selected.size) setBar({ count: selected.size });
  const clearSelection = useCallback(() => { setSelected(new Set()); lastPick.current = null; }, []);
  useEffect(() => { clearSelection(); }, [space, projectView, clearSelection]);
  const selectAll = useCallback(() => setSelected(new Set(boardItems.map((i) => i.id).filter((x): x is string => !!x))), [boardItems]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (document.querySelector(".modal-backdrop, .cp, [data-slot='popover-content']")) return; // something open on top
      if (e.key === "Escape" && selected.size) { e.preventDefault(); clearSelection(); }
      // ⌘A: the whole board, once something is picked (before that the page keeps its own ⌘A)
      if (e.key.toLowerCase() === "a" && (e.metaKey || e.ctrlKey) && selected.size) { e.preventDefault(); selectAll(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, selectAll, clearSelection]);
  // Which projects all of the selection is in, and which only part of it
  const selectionIn = useMemo(() => {
    const count = new Map<string, number>();
    for (const id of selected) for (const p of links[id] ?? []) count.set(p, (count.get(p) ?? 0) + 1);
    const all: string[] = [], some: string[] = [];
    for (const [p, n] of count) (n === selected.size ? all : some).push(p);
    return { all, some };
  }, [selected, links]);
  /** The selection in or out of a project, in one request; back as it was if the server says no */
  const fileSelection = useCallback(async (projectId: string, on: boolean) => {
    const ids = [...selected];
    if (!ids.length) return;
    const prevLinks = links;
    setLinks((prev) => {
      const next = { ...prev };
      for (const id of ids) { const cur = (next[id] ?? []).filter((x) => x !== projectId); next[id] = on ? [...cur, projectId] : cur; }
      return next;
    });
    const r = await setFiled(projectId, ids, on).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { setLinks(prevLinks); projectFailed(new Error(r.error)); return false; }
    refreshSystem(projectId);
    return true;
  }, [selected, links, refreshSystem]);
  // Moving: into the other project and out of this one, on screen at once; the board here lets go of them
  const moveSelection = useCallback(async (projectId: string) => {
    const from = currentProject?.id;
    if (!from) return void fileSelection(projectId, true);
    const ids = [...selected];
    if (!ids.length) return;
    const prevLinks = links;
    setLinks((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = [...(next[id] ?? []).filter((x) => x !== projectId && x !== from), projectId];
      return next;
    });
    clearSelection();
    const fail = (e: unknown) => ({ ok: false as const, error: String(e) });
    const into = await setFiled(projectId, ids, true).catch(fail);
    const out = into.ok ? await setFiled(from, ids, false).catch(fail) : into;
    if (!into.ok) setLinks(prevLinks);
    // In the new one but still here: the screen says so
    else if (!out.ok) setLinks((prev) => { const next = { ...prev }; for (const id of ids) next[id] = [...(next[id] ?? []).filter((x) => x !== from), from]; return next; });
    if (!out.ok) projectFailed(new Error(out.error));
    refreshSystem(projectId); refreshSystem(from);
  }, [currentProject, selected, links, fileSelection, clearSelection, refreshSystem]);
  const removeSelection = useCallback(async () => {
    if (!currentProject) return;
    if (await fileSelection(currentProject.id, false)) clearSelection();
  }, [currentProject, fileSelection, clearSelection]);
  // Deleting for good: asked first, gone from the screen at once, back in place if the server says no
  const deleteSelection = useCallback(async () => {
    const ids = new Set(selected);
    if (!ids.size) return;
    if (!(await confirm({ title: t.select.confirmDelete(ids.size), description: t.select.confirmDeleteHint(ids.size), action: t.common.delete, danger: true }))) return;
    const gone = items.filter((i) => !!i.id && ids.has(i.id));
    const touched = new Set(gone.flatMap((i) => links[i.id!] ?? []));
    setItems((prev) => prev.filter((i) => !i.id || !ids.has(i.id)));
    clearSelection();
    const r = await removeInspos([...ids]).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) {
      setItems((prev) => [...gone.filter((g) => !prev.some((i) => i.id === g.id)), ...prev]);
      setToast({ title: t.app.removeFailed, detail: r.error });
      return;
    }
    const webs = new Set(gone.map((i) => i.web));
    setThumbMap((prev) => Object.fromEntries(Object.entries(prev).filter(([web]) => !webs.has(web))));
    for (const p of touched) refreshSystem(p);
  }, [selected, items, links, confirm, clearSelection, refreshSystem, t]);
  const createForSelection = useCallback(async (name: string) => {
    const p = await createProject(name);
    if (!p) return;
    if (currentProject) await moveSelection(p.id);
    else await fileSelection(p.id, true);
  }, [createProject, currentProject, moveSelection, fileSelection]);

  gridActions.current = { select: selectItem, openItem, deleteItem, handleThumbnailUpload, handleThumbnailRemove, toggleFiled, createAndFile, toggleArea, measure };

  // ─── The agent: every action, asked for in words from the search box ──────────
  // The request goes with where the person is (project, view, open reference, what is on screen); the
  // server plans and runs what is safe, and what it changed comes back as a patch the state applies.
  // Deleting comes back pending and waits for a yes here.
  const [agent, setAgent] = useState<{ text: string; busy: boolean; say?: string; done: AgentDone[]; pending: AgentAction[]; error?: string } | null>(null);
  const agentSpeaks = !!agent && (agent.busy || !!agent.say || !!agent.error || agent.done.length > 0);
  // The thread: the last exchanges go with each request, so "and put it in color too" means something
  const agentLog = useRef<AgentTurn[]>([]);
  const recentIds = useRef<string[]>([]);
  // "This reference": the card the pointer was on last counts for a few seconds (clicking into the box
  // moves the pointer away from it), read from the DOM so no card re-renders for it
  const hovered = useRef<{ id: string; at: number } | null>(null);
  useEffect(() => {
    const over = (e: MouseEvent) => { const el = (e.target as HTMLElement | null)?.closest?.("[data-id].tile, [data-id].sysf-ref") as HTMLElement | null; if (el?.dataset.id) hovered.current = { id: el.dataset.id, at: Date.now() }; };
    document.addEventListener("mouseover", over);
    return () => document.removeEventListener("mouseover", over);
  }, []);
  // "/" with the pointer on a card hands that card to the agent: it stays as "this" until it is taken away or used
  const [agentTarget, setAgentTarget] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      const h = hovered.current;
      const under = document.querySelectorAll(":hover");
      const still = h && [...under].some((n) => (n as HTMLElement).dataset?.id === h.id);
      if (h && still && searchHereRef.current) setAgentTarget(h.id);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  // The reference handed to the agent, and what can be done with it in one click: hang it from an area of the
  // project you are in (or the last one there is), file it in a project
  const agentTargetItem = useMemo(() => (agentTarget ? items.find((i) => i.id === agentTarget) ?? null : null), [agentTarget, items]);
  const agentQuick = useMemo(() => {
    if (!agentTargetItem?.id) return [];
    const q = t.agent.quick;
    const areaLabels = t.system.areas as Record<SystemArea, string>;
    const here = currentProject ?? projects[projects.length - 1] ?? null;
    const out: { label: string; order: string }[] = [];
    if (here) {
      for (const k of SYSTEM_AREAS) out.push({ label: q.toArea(areaLabels[k]), order: q.toAreaOrder(areaLabels[k], here.name) });
      if (!links[agentTargetItem.id]?.includes(here.id)) out.push({ label: q.file(here.name), order: q.fileOrder(here.name) });
    }
    for (const p of projects) if (p.id !== here?.id && !links[agentTargetItem.id]?.includes(p.id)) out.push({ label: q.file(p.name), order: q.fileOrder(p.name) });
    return out.slice(0, 12);
  }, [agentTargetItem, currentProject, projects, links, t]);
  const [openArea, setOpenArea] = useState<SystemArea | null>(null);
  const [focusArea, setFocusArea] = useState<{ area: SystemArea; n: number } | null>(null);
  const [focusRef, setFocusRef] = useState<{ code: string; n: number } | null>(null);
  const applyAgentPatch = useCallback((patch: AgentPatch) => {
    if (patch.projects) setProjects(patch.projects);
    if (patch.links) setLinks(patch.links);
    if (patch.systems) setSystems((prev) => ({ ...prev, ...patch.systems }));
    if (patch.added?.length) setItems((prev) => [...patch.added!.filter((a) => !prev.some((i) => i.id === a.id)), ...prev]);
    if (patch.removed?.length) { const gone = new Set(patch.removed); setItems((prev) => prev.filter((i) => !i.id || !gone.has(i.id))); }
  }, []);
  const followAgent = useCallback((done: AgentDone[]) => {
    for (const d of done) {
      if (!d.ok) continue;
      if (d.kind === "search" && d.text) setQuery(d.text);
      if (d.kind === "go" && d.go) {
        if (d.go.space) setSpace(d.go.space === "library" ? (saveTarget() ?? "home") : d.go.space);
        if (d.go.view) setProjectView(d.go.view);
        if (d.go.area) { setProjectView("system"); setFocusArea((f) => ({ area: d.go!.area!, n: (f?.n ?? 0) + 1 })); }
      }
    }
  }, [setQuery, setSpace, setProjectView]);
  const askAgent = useCallback(async (text: string) => {
    setAgent({ text, busy: true, done: [], pending: [] });
    const picked = [...document.querySelectorAll<HTMLElement>(".sysf-ref.is-picked[data-id]")].map((el) => el.dataset.id!).filter(Boolean);
    const scope = {
      projectId: currentProject?.id ?? null, space, view: currentProject ? projectView : null, area: currentProject && projectView === "system" ? openArea : null,
      openItemId: panelItem?.id ?? null, hoverItemId: agentTarget ?? (hovered.current && Date.now() - hovered.current.at < 12000 ? hovered.current.id : null), pickedIds: picked, recentIds: recentIds.current,
      visibleIds: filtered.slice(0, 200).map((i) => i.id).filter((x): x is string => !!x),
      history: agentLog.current.slice(-6),
    };
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, scope }) });
      const json = await res.json().catch(() => ({})) as AgentReply & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error || res.statusText);
      applyAgentPatch(json.patch);
      followAgent(json.done);
      // A command leaves the box empty; a search keeps its words in it
      if (!json.done.some((d) => d.kind === "search")) setQuery("");
      setAgent({ text, busy: false, say: json.say, done: json.done, pending: json.pending });
      // Used: the next order speaks of what was touched ("y de color también"), not of a card held for good
      if (json.done.some((d) => d.ok && d.kind !== "ask")) setAgentTarget(null);
      const touched = json.done.flatMap((d) => d.items ?? []);
      if (touched.length) recentIds.current = [...new Set(touched)].slice(0, 40);
      agentLog.current = [...agentLog.current, { text, say: json.say, did: json.done.filter((d) => d.ok).map((d) => [d.kind, d.project, d.area, d.name, d.n].filter((x) => x !== undefined).join(" ")) }].slice(-6);
    } catch (e) {
      setAgent({ text, busy: false, done: [], pending: [], error: e instanceof Error ? e.message : String(e) });
    }
  }, [currentProject, space, projectView, openArea, panelItem, filtered, applyAgentPatch, followAgent, setQuery, agentTarget]);
  // One line back: its undo actions run as a confirmed batch, and the line says so
  const undoAgent = useCallback(async (i: number) => {
    const line = agent?.done[i];
    if (!agent || !line?.undo?.length || agent.busy) return;
    setAgent({ ...agent, busy: true });
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: line.undo }) });
      const json = await res.json().catch(() => ({})) as { done: AgentDone[]; patch: AgentPatch; error?: string };
      if (!res.ok || json.error) throw new Error(json.error || res.statusText);
      applyAgentPatch(json.patch);
      setAgent({ ...agent, busy: false, done: agent.done.map((d, j) => (j === i ? { ...d, undo: undefined, undone: true } : d)) });
    } catch (e) {
      setAgent({ ...agent, busy: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, [agent, applyAgentPatch]);
  const confirmAgent = useCallback(async () => {
    if (!agent?.pending.length) return;
    setAgent({ ...agent, busy: true });
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: agent.pending }) });
      const json = await res.json().catch(() => ({})) as { done: AgentDone[]; patch: AgentPatch; error?: string };
      if (!res.ok || json.error) throw new Error(json.error || res.statusText);
      applyAgentPatch(json.patch);
      setAgent({ ...agent, busy: false, done: [...agent.done, ...json.done], pending: [] });
    } catch (e) {
      setAgent({ ...agent, busy: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, [agent, applyAgentPatch]);

  // The open reference: its thread, every comment with its replies (the post-its once pinned on the page among them)
  const panelComments = (panelItem?.id ? commentMap[panelItem.id] : undefined) ?? [];
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const panelPage = (() => {
    if (!panelItem) return null;
    const kind = mediaKindOf(panelItem.web);
    // A video or a post is its own page: it fills the page card
    if (kind === "video") return <div className="ip-media"><VideoPlayer web={panelItem.web} title={panelItem.name} /></div>;
    if (kind === "text") return <TextPage key={panelItem.id} title={panelItem.name} body={panelItem.id ? textBodies[panelItem.id] : undefined} onSave={(text) => saveTextBody(panelItem, text)} onRename={(title) => renameTextItem(panelItem, title)} />;
    if (kind === "post") return <div className="ip-media"><PostView web={panelItem.web} onThumb={(thumb: string) => setThumbMap((prev) => (prev[panelItem.web] ? prev : { ...prev, [panelItem.web]: thumb }))} /></div>;
    // An image shows whole in the panel: its card copy (cardCopy) is for the board
    const src = kind === "image"
      ? panelItem.web
      : pageShots[panelItem.web]?.shotUrl ?? thumbMap[panelItem.web] ?? `/api/shot?url=${encodeURIComponent(panelItem.web)}&v=2`;
    return (
      <PageView key={panelItem.web} src={src} alt={panelItem.name} fit={kind === "image"} />
    );
  })();

  // What the open reference writes in criterio.md: in the project open, or else the first one it is in. A text is
  // the file's Content, typed in its own page; one in no project is in no file yet
  const panelProject = panelItem?.id && mediaKindOf(panelItem.web) !== "text"
    ? (currentProject && links[panelItem.id]?.includes(currentProject.id) ? currentProject : projects.find((p) => links[panelItem.id!]?.includes(p.id))) ?? null
    : null;
  const panelBoardIds = useMemo(() => panelProject ? items.filter((i) => i.id && links[i.id]?.includes(panelProject.id)).map((i) => i.id!).reverse() : [],
    [panelProject, items, links]);
  // To a part of the system from the panel: the panel's own entry in the history becomes the system's, so Back
  // goes to where the panel was opened from
  const goToSystem = (projectId: string, spot: SystemSpot) => {
    const p = new URLSearchParams(window.location.search);
    p.set("in", projectId); p.set("view", "system");
    window.history.replaceState(null, "", `/?${p}`);
    pushedRef.current = false;
    setPanelItem(null);
    if ("area" in spot) setFocusArea((f) => ({ area: spot.area, n: (f?.n ?? 0) + 1 }));
    else setFocusRef((f) => ({ code: spot.code, n: (f?.n ?? 0) + 1 }));
  };
  // Stable while nothing a card shows changes, so Grid (memo) skips the renders a keystroke or a panel causes
  const renderCard = useCallback((item: InspoItem, level: ShotLevel) => (
    <Card
      item={item}
      level={level}
      ratio={ratioOf(item)}
      tags={tagMap[item.web]}
      tagJob={tagJobs[item.web]}
      score={jevScores?.[item.web]}
      reason={reasons?.[item.web]}
      comments={item.id ? commentMap[item.id] : undefined}
      authorImage={authorImages[item.addedBy]}
      manualThumbnail={thumbMap[item.web]}
      designMd={designMdIndex[item.web]}
      shot={pageShots[item.web]}
      projects={projects}
      projectIds={item.id ? links[item.id] : undefined}
      backs={currentProject && item.id ? backsOf(item.id) : undefined}
      areasIn={item.id ? areasByItem.get(item.id) : undefined}
      selected={!!item.id && selected.has(item.id)}
      selecting={selected.size > 0}
      // A member deletes what they saved; the server (removeInspo) has the last word
      deletable={canManage || item.addedBy === (user.name || user.email)}
      // On a project's board the bin takes the card out of the project (back to the Inbox); off it, it deletes
      spaceName={workspace.name}
      takeOutOf={currentProject?.id}
      actions={gridActions}
    />
  ), [workspace.name, ratioOf, tagMap, tagJobs, jevScores, reasons, commentMap, authorImages, thumbMap, designMdIndex, pageShots, projects, links, currentProject, backsOf, areasByItem, selected, canManage, user]);

  return (
    <SidebarProvider defaultOpen={false} className="shell">
      {confirmDialog}
      {panelItem && (
        <ItemPanel
          item={panelItem}
          isSite={hasOwnPage(panelItem.web)}
          page={panelItem.id ? panelPage : null}
          criterio={panelItem.id && panelProject && systems[panelProject.id] ? (
            <RefCriterio item={panelItem} project={panelProject} system={systems[panelProject.id]} library={items} boardIds={panelBoardIds}
              refInfo={refInfo} onSystem={setSystem} onGo={goToSystem} />
          ) : undefined}
          thread={panelItem.id ? (
            <CommentsPanel
              item={panelItem}
              comments={panelComments}
              user={user}
              canManage={canManage}
              memberImages={authorImages}
              memberNames={memberNames}
              image={null}
              showMedia={false}
              onPost={(body, attachments) => postComment(panelItem.id!, body, attachments)}
              onDelete={(id) => deleteComment(panelItem.id!, id)}
              onPostThumb={(thumb) => setThumbMap((prev) => (prev[panelItem.web] ? prev : { ...prev, [panelItem.web]: thumb }))}
              onEditNote={(field, text) => editNote(panelItem.id!, field, text)}
              onReply={(parentId, body) => postComment(panelItem.id!, body, [], parentId)}
              notice={panelForgotten.length > 0 && panelForgotten.map(({ project, names }) => (
                <p key={project.id} className="cm-notice">
                  <span>{t.polish.forgottenIn(project.name, names)}</span>
                  <CrButton size="s" onClick={() => void restoreToProject(panelItem, project.id)}>{t.polish.restore}</CrButton>
                </p>
              ))}
            />
          ) : null}
          onClose={closePanel}
          onPrev={panelPrev ? () => showPanel(panelPrev) : undefined}
          onNext={panelNext ? () => showPanel(panelNext) : undefined}
          libraryName={workspace.name}
        />
      )}
      {toast && (
        <div className="toasts toasts--top" role="alert">
          {/* A small paper window (the TipWindow's ground, ink border and bevel): the red dot, what failed, and close */}
          <div className={`cr-window toast${toast.ok ? "" : " toast--error"}`} onClick={() => setToast(null)}>
            <span className="toast__dot" aria-hidden />
            <span className="toast__text"><span className="toast__title">{toast.title}</span><span className="toast__sub">{toast.detail}</span></span>
            <IconButton icon="close" variant="strong" size="xs" label={t.toast.dismiss} onClick={(e) => { e.stopPropagation(); setToast(null); }} />
          </div>
        </div>
      )}
      {paletteUsed && <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={items}
        workspace={workspace}
        workspaces={workspaces}
        isAdmin={isAdmin}
        onOpenItem={(item) => openItem(item)}
        onBrief={currentProject ? () => setParams({ view: "system", brief: "1" }) : undefined}
        onAddUrl={(web) => {
          // Already saved: show it instead of saving it twice (found on the board; opened where there is no search)
          if (isDuplicate(web)) {
            const saved = items.find((i) => webKeyOf(i.web) === webKeyOf(web));
            if (searchHere || !saved) setQuery(nameFromHost(web)); else openItem(saved);
            return;
          }
          addByUrl({ web, type: typeFromUrl(web), note: "" });
        }}
        onAdd={() => setShowAdd(true)}
        onDirectory={openDirectory}
      />}
      {boardDrag && <div className="board-drop" aria-hidden><span className="t-title-l">{t.add.dropHere}</span></div>}
      <ThemeToggle />
      {showAdd && (
        <AddInspoModal
          onClose={() => { setShowAdd(false); setAddInitial(undefined); }}
          initial={addInitial}
          onSubmit={(input) => { if (input.file) addByUpload({ ...input, file: input.file }); else if (input.text) addByText({ ...input, text: input.text }); else addByUrl(input); }}
          isDuplicate={isDuplicate}
          project={currentProject?.name}
          onImportBoard={importBoard}
        />
      )}

      {isMobile && <Sidebar brand={<WorkspaceMenu user={user} workspace={workspace} workspaces={workspaces} isAdmin={isAdmin} />} {...navProps} />}

      <SidebarInset className="content">
        <header className="topbar">
          <span className="topbar__trigger">
            <SidebarTrigger aria-label={t.app.menu} />
          </span>
          <Island user={user} workspace={workspace} workspaces={workspaces} isAdmin={isAdmin}
            items={items} links={links} projects={projects} systems={systems} space={space} onSpace={setSpace}
            onCreateProject={createProject} onRenameProject={renameProject} onDeleteProject={deleteProject}
            members={members} onPerson={(name) => {
              // What someone saved is looked at inside a project: the open one, or the one being worked in
              if (!currentProject) { const to = saveTarget(); if (to) setParams({ in: to, view: "board" }); }
              else if (projectView !== "board") setProjectView("board");
              toggleFilter({ kind: "person", value: name });
            }}
            onDirectory={openDirectory} quota={quota} onMenuOpen={loadQuota} />
          <Logo size={28} className="topbar__logo" />
          {/* The system's ViewSwitcher, the island's twin on the right: Board and System, then the ways in and add.
              On a phone the labels go and the icons stay */}
          <div className="topbar__actions">
            <PillBar className="topbar__switch">
              {currentProject && (
                <>
                  {/* Board, Polish, System: the system's SegmentedControl. The view is set a frame after the click
                      (afterPaint): a view of the project is a heavy render, and the tab answers first */}
                  <SegmentedControl className="topbar__modes" label={t.system.button} active={PROJECT_VIEWS.indexOf(projectView)}
                    onChange={(i) => { leaveView(PROJECT_VIEWS[i]); afterPaint(() => setProjectView(PROJECT_VIEWS[i])); }}
                    items={[
                      { icon: "grid", label: <span className="topbar__mode-label">{t.system.modeBoard}</span> },
                      { icon: "sparkle", label: <>
                          <span className="topbar__mode-label">{t.polish.mode}</span>
                          {/* Who in the team has gone through the whole board: in Polish, or anywhere while votes wait */}
                          {!solo && polishTab && (projectView === "polish" || polishTab.under) && (
                            <span className="topbar__faces">
                              {members.slice(0, 5).map((m) => (
                                <span key={m.id} className={`topbar__face${polishTab.done.has(m.id) ? " is-done" : ""}`}
                                  data-tip={polishTab.done.has(m.id) ? t.polish.memberDone(m.name) : t.polish.memberVoting(m.name)}>
                                  <PersonAvatar name={m.name} image={m.image} size={14} />
                                </span>
                              ))}
                            </span>
                          )}
                        </>,
                        count: polishTab && polishTab.left > 0 ? polishTab.left : undefined,
                        title: polishTab && polishTab.left > 0 ? t.polish.left(polishTab.left) : undefined },
                      { icon: "gauge", label: <span className="topbar__mode-label">{t.system.modeSystem}</span>,
                        count: t.system.fill(systemFilled, SYSTEM_AREAS.length), dot: systemStale > 0,
                        title: systemStale ? t.system.stale(systemStale) : undefined },
                    ]} />
                  <PillBarSep />
                </>
              )}
              {/* The ways in from outside (the extension, an AI client over MCP, Import), beside the other way of adding */}
              <Connectors onImportBoard={importBoard} />
              <PillBarSep />
              <IconButton icon="plus" label={t.app.add} variant="quiet" className="topbar__add" onClick={() => setShowAdd(true)} />
            </PillBar>
          </div>
        </header>

        {space === "discover" || space === "templates" || space === "skills" ? (
          // Discover: the templates (whole systems to start a project from), the directory of places to look, and the skills for agents
          <Discover section={space === "templates" ? "templates" : space === "skills" ? "skills" : "sites"} onSection={(s) => setSpace(s === "sites" ? "discover" : s)}
            templates={(head) => <TemplatesView key={workspace.id} workspaceId={workspace.id} head={head} onStarted={(p) => {
              // The template's references are not in this page's library until a project holds them, so the page is
              // read again on the new project: its board comes with them, their pictures and their tags
              window.location.assign(`/?in=${encodeURIComponent(p.id)}`); }} />} />
        ) : space === "home" ? (
          <ProjectChooser
            projects={projects}
            systems={systems}
            items={items}
            links={links}
            ratioOf={ratioOf}
            imageOf={miniImageOf}
            onMeasure={measure}
            onPick={(id) => setSpace(id)}
            onCreate={createProject}
          />
        ) : items.length === 0 ? (
          <EmptyStart
            onAddUrl={async (web) => { await addByUrl({ web, type: typeFromUrl(web), note: "" }); }}
            isDuplicate={isDuplicate}
            onDirectory={openDirectory}
            onImportBoard={importBoard}
            arriving={arrivingBoard}
          />
        ) : currentProject && projectView === "system" ? (
          <SystemView
            key={currentProject.id}
            project={currentProject}
            system={systems[currentProject.id] ?? null}
            onSystem={(sys) => setSystem(currentProject.id, sys)}
            board={spaceItems}
            library={items}
            inbox={unfiled}
            onFile={(item) => toggleFiled(item, currentProject.id, true)}
            imageOf={smallImageOf}
            onOpenBoard={() => setProjectView("board")}
            focusArea={focusArea}
            focusRef={focusRef}
            onOpenChange={setOpenArea}
            onOpenItem={(item) => openItem(item)}
            noteOf={(item) => captionFor(item, item.id ? commentMap[item.id] : undefined, authorImages[item.addedBy])}
            refInfo={refInfo}
            // The file shows a text's headings one step down: saved, they go back to the level they had
            onText={(id, text) => { const item = items.find((i) => i.id === id); return item ? saveTextBody(item, restoreTextHeadings(text, textBodies[id] ?? "")) : Promise.resolve(); }}
            onTextTitle={(id, title) => { const item = items.find((i) => i.id === id); return item ? renameTextItem(item, title) : Promise.resolve(); }}
            onClient={async (itemId) => {
              const id = currentProject.id;
              const r = await setProjectClient(id, itemId).catch((e) => ({ ok: false as const, error: String(e) }));
              if (!r.ok) { projectFailed(new Error(r.error)); return; }
              setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, clientItemId: itemId } : p)));
            }}
            // criterio.md is built from project.brief and project.intent: both follow the save, no reload
            onBrief={async (patch) => {
              const id = currentProject.id;
              const r = await saveProjectBrief(id, patch).catch((e) => ({ ok: false as const, error: String(e) }));
              if (!r.ok) { projectFailed(new Error(r.error)); return null; }
              const { brief } = r.data;
              setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, brief, intent: brief.about || null } : p)));
              return brief;
            }}
            onAddSite={async (web) => {
              // Already in the library: filed here instead of saved twice
              const key = webKeyOf(web);
              const saved = items.find((i) => webKeyOf(i.web) === key);
              if (saved) { await toggleFiled(saved, currentProject.id, true); return saved; }
              return addByUrl({ web, type: typeFromUrl(web), note: "" });
            }}
          />
        ) : spaceItems.length === 0 && currentProject && projectView !== "polish" ? (
          // An empty project is a starting point: paste a site, or bring references from the library
          <ProjectStart
            key={currentProject.id}
            project={currentProject}
            items={items}
            links={links}
            imageOf={smallImageOf}
            onAddUrl={async (web) => {
              // Already in the library: filed here instead of "already saved"
              const key = webKeyOf(web);
              const saved = items.find((i) => webKeyOf(i.web) === key);
              if (saved) await toggleFiled(saved, currentProject.id, true);
              else await addByUrl({ web, type: typeFromUrl(web), note: "" });
            }}
            onDescribe={async (about) => {
              const id = currentProject.id;
              const r = await saveProjectBrief(id, { about }).catch((e) => ({ ok: false as const, error: String(e) }));
              if (!r.ok) throw new Error(r.error);
              const saved = r.data.brief?.about ?? "";
              setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, intent: saved || null } : p)));
            }}
            onUpload={async (files) => { await Promise.all(files.map((file) => addByUpload({ web: "", file, type: "inspiration", note: "" }))); }}
            onFile={(picked) => fileMany(picked, currentProject.id)}
            onBringBrand={() => setParams({ view: "system", bring: "site" })}
          />
        ) : spaceItems.length === 0 && space === "inbox" ? (
          <InboxZero
            projects={projects}
            systems={systems}
            items={items}
            links={links}
            ratioOf={ratioOf}
            imageOf={miniImageOf}
            onMeasure={measure}
            isDuplicate={isDuplicate}
            onAddUrl={async (web) => { await addByUrl({ web, type: typeFromUrl(web), note: "" }); }}
            onUpload={async (files) => { await Promise.all(files.map((file) => addByUpload({ web: "", file, type: "inspiration", note: "" }))); }}
            onPick={setSpace}
          />
        ) : (
          <>
            {/* The board stays mounted under Polish, inert: coming back is instant, and the cards fly from the
                tornado onto a board already laid out (components/view-morph.ts) */}
            <Grid
              under={!!currentProject && projectView === "polish"}
              items={boardItems}
              ratioOf={ratioOf}
              hasNote={hasNote}
              insets={insets}
              zoom={zoom}
              onZoom={setZoom}
              fitKey={fitKey}
              focusKey={panelItem ? keyOf(panelItem) : null}
              handleRef={gridRef}
              renderCard={renderCard}
            />
            {filtered.length === 0 && projectView !== "polish" && (
              <EmptyState className="empty empty--over" title={t.app.nothingHere}>
                <span>{searchBusy ? t.app.searchingShort : t.app.tryAnother}</span>
                <CrButton className="empty__reset" onClick={resetFilters}>{t.app.seeEverything}</CrButton>
              </EmptyState>
            )}
            {currentProject && projectView === "polish" && (
            // Between the board and the system: the board goes by card by card, and each one stays or goes back to the Inbox
            <PolishView
              key={currentProject.id}
              project={currentProject}
              items={boardItems}
              imageOf={smallImageOf}
              largeImageOf={(item) => thumbMap[item.web] ?? pageShots[item.web]?.topUrl ?? smallImageOf(item)}
              ratioOf={ratioOf}
              textOf={(item) => (item.id ? textBodies[item.id] : "") || item.note}
              noteOf={(item) => captionFor(item, item.id ? commentMap[item.id] : undefined, authorImages[item.addedBy])}
              active={!panelItem && !showAdd}
              votes={polishVotes}
              me={user.id}
              members={members}
              canClose={canManage}
              onVote={(voted, vote) => castVote(currentProject.id, voted, vote)}
              onClose={(resolve) => closePolishOf(currentProject.id, resolve)}
              onRestore={(item) => restoreToProject(item, currentProject.id)}
              onOpenItem={(item) => openItem(item)}
              onBoard={() => setProjectView("board")}
              onSystem={startSystem}
            />
            )}
          </>
        )}
        {/* The music is in the corner of every view. The boards and Polish have it in their zoom's pill; the others
            have nothing to zoom, and the pill is the music alone */}
        {!(space !== "discover" && space !== "templates" && space !== "skills" && space !== "home" && items.length > 0
          && !(currentProject && projectView === "system")
          && ((currentProject && projectView === "polish") || !(spaceItems.length === 0 && (currentProject || space === "inbox"))))
          && <ZoomPill className="board-zoom" zoom={null}><SoundControl /></ZoomPill>}
        {/* The way to find anything on a project's board, at the bottom like a conversation: people, dates, kinds,
            every tag, and what it means. Solid and bright in both themes, so it is the first thing the eye finds.
            Off the board only what the agent is still saying stays. */}
        {bar && (
          <SelectBar count={bar.count} total={boardItems.length} closing={selected.size === 0} onClosed={() => setBar(null)} projects={projects} filed={selectionIn.all} partly={selectionIn.some} current={currentProject}
            onAll={selectAll} onFile={(id, on) => void fileSelection(id, on)} onMove={(id) => void moveSelection(id)} onCreate={createForSelection}
            onRemove={() => void removeSelection()} onDelete={() => void deleteSelection()} onDone={clearSelection} />
        )}
        {items.length > 0 && ((searchHere && spaceItems.length > 0) || agentSpeaks) && selected.size === 0 && (
          <div className="dock">
            {/* What the search counts, over the bar: the system's StatusBar, a cell per fact */}
            {filtering && (
              <StatusBar className="dock__status">
                <StatusCell>{t.search.results(filtered.length)}</StatusCell>
                {jevBusy && <StatusCell><Busy label={t.search.reading} />{t.search.reading}</StatusCell>}
              </StatusBar>
            )}
            {/* The card handed to the agent wears a ring wherever it is shown */}
            {agentTargetItem && <style>{`[data-id="${agentTargetItem.id}"].tile, [data-id="${agentTargetItem.id}"].sysf-ref { outline: 2px solid var(--text) !important; outline-offset: 3px; }`}</style>}
            {/* What the agent said and did: a small paper window over the bar (the system's TipWindow) */}
            {agent && agentSpeaks && (
              <AgentCard agent={agent} projects={projects} onConfirm={() => void confirmAgent()} onCancel={() => setAgent((a) => (a ? { ...a, pending: [] } : a))} onClose={() => setAgent(null)} onAsk={(order) => void askAgent(order)} onUndo={(i) => void undoAgent(i)} />
            )}
            {/* The command bar: one chrome panel, what the board is for over the search */}
            {((space === "inbox" && spaceItems.length > 0 && !filtering && !agent) || (searchHere && spaceItems.length > 0)) && (
            <div className="dock__bar">
            {/* On a project's board, always: what the board is for, and the step to the system (the first time it also
                marks the project as started). Polishing the board is its own tab, never a stop on the way (Eric, 06-10) */}
            {space === "inbox" && spaceItems.length > 0 && !filtering && !agent && (
              <GatherBar count={spaceItems.length} thumbs={boardItems.slice(0, 3).map(smallImageOf)} onAdd={() => setShowAdd(true)}
                title={t.projects.inbox} lead={t.gather.inboxLead} />
            )}
            {searchHere && currentProject && spaceItems.length > 0 && !filtering && !agent && (
              <GatherBar count={spaceItems.length} thumbs={boardItems.slice(0, 3).map(smallImageOf)} onAdd={() => setShowAdd(true)}
                onStart={startSystem} />
            )}
            {/* Only over a board with something on it: an empty project starts from its own box (ProjectStart), and a
                search with nothing to look through reads as broken (Andoni, 06-10) */}
            {searchHere && spaceItems.length > 0 && (
              <SearchBar className="sb--dock" filters={filters} text={query} onFilters={setFilters} onText={setQuery}
                vocab={vocab} busy={searchBusy} gathering={gathering} swatches={swatches} faces={authorImages} onAsk={(v) => void askAgent(v)} asking={!!agent?.busy}
                target={agentTargetItem ? { name: agentTargetItem.name, image: smallImageOf(agentTargetItem) } : null} onClearTarget={() => setAgentTarget(null)} quick={agentQuick} />
            )}
            </div>
            )}
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

const EMPTY_AREAS: SystemArea[] = [];
/** The view switcher's order: Board, Polish, System */
const PROJECT_VIEWS = ["board", "polish", "system"] as const;

/** What the agent said and did, above the box; the pending steps wait here for a yes */
function AgentCard({ agent, projects, onConfirm, onCancel, onClose, onUndo, onAsk }: {
  agent: { text: string; busy: boolean; say?: string; done: (AgentDone & { undone?: boolean })[]; pending: AgentAction[]; error?: string };
  projects: Project[];
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
  onUndo: (i: number) => void;
  /** An answer to the agent's question: its order, asked as a new request */
  onAsk: (order: string) => void;
}) {
  const { t } = useT();
  const areas = t.system.areas as Record<string, string>;
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? id;
  const line = (d: AgentDone): string => {
    const did = t.agent.did;
    const area = d.area ? areas[d.area] ?? d.area : "";
    switch (d.kind) {
      case "search": return did.search(d.text ?? "");
      case "go": return did.go(d.go?.area ? `${areas[d.go.area] ?? d.go.area}${d.project ? ` (${d.project})` : ""}` : d.project ?? (d.go?.space === "inbox" ? "Inbox" : d.go?.space === "library" ? t.sidebar.all : ""));
      case "file": return did.file(d.n ?? 0, d.project ?? "", d.on !== false);
      case "assign": return did.assign(d.n ?? 0, area, d.on !== false);
      case "decide": return did.decide(area);
      case "never": return d.on ? did.neverAdd(area, d.text ?? "") : did.neverRemove(area, d.text ?? "");
      case "clear": return did.clear(area);
      case "release": return did.release(area);
      case "undo": return did.undo(area);
      case "read_board": return did.read_board(d.project ?? "");
      case "curate": return did.curate(area);
      case "organize": return did.organize(d.n ?? 0);
      case "create_project": return did.create_project(d.project ?? "");
      case "rename_project": return did.rename_project(d.project ?? "");
      case "delete_project": return did.delete_project(d.project ?? "");
      case "brief": return did.brief(d.project ?? "");
      case "client": return d.on ? did.client(d.project ?? "") : did.clientOff(d.project ?? "");
      case "add_url": return did.add_url(d.name ?? "");
      case "note": return did.note(d.name ?? "");
      case "comment": return did.comment(d.name ?? "");
      case "tag": return did.tag(d.name ?? "");
      case "delete_items": return did.delete_items(d.n ?? 0);
      case "guide": return did.guide;
      case "ask": return d.text ?? "";
    }
  };
  const will = (a: AgentAction): string => {
    if (a.kind === "delete_items") return t.agent.will.delete_items(a.items.length);
    if (a.kind === "delete_project") return t.agent.will.delete_project(projectName(a.project));
    if (a.kind === "clear") return t.agent.will.clear(areas[a.area] ?? a.area);
    return a.kind;
  };
  const guides = agent.done.filter((d) => d.kind === "guide" && d.ok);
  const asks = agent.done.filter((d) => d.kind === "ask" && d.ok && d.options?.length);
  return (
    // The system's TipWindow: a paper window with the moss bar ("Agent") and the strong close; the request, what it
    // said, what it did and the steps that wait for a yes in its body
    <section className="cr-window dock__agent" aria-label={t.agent.title}>
      <header className="cr-window-bar">
        <span className="cr-window-title"><Icon name="sparkle" size={16} />{t.agent.title}</span>
        <IconButton icon="close" variant="strong" size="xs" className="dock__agent-x" label={t.agent.dismiss} onClick={onClose} />
      </header>
      <div className="cr-window-body dock__agent-body" role="status" aria-live="polite">
      <p className="dock__agent-q">{agent.text}</p>
      {agent.busy && !agent.say ? <p className="dock__agent-say"><Busy label={t.agent.thinking} /> {t.agent.thinking}</p> : null}
      {agent.error && <p className="dock__agent-say dock__agent-say--error">{t.agent.failed}: {agent.error}</p>}
      {agent.say && <p className="dock__agent-say">{agent.say}</p>}
      {agent.done.filter((d) => d.kind !== "guide" && d.kind !== "ask").length > 0 && (
        <ul className="dock__agent-did">
          {agent.done.map((d, i) => d.kind === "guide" || d.kind === "ask" ? null : (
            <li key={i} className={`${d.ok ? "" : "is-failed"}${d.undone ? " is-undone" : ""}`}>{d.ok ? Icons.check : Icons.x}
              <span>{d.ok ? line(d) : d.error}{d.ok && (d.kind === "decide" || d.kind === "organize") && d.text ? <small className="dock__agent-sub">{d.text}</small> : null}</span>
              {d.undone ? <small className="dock__agent-undone">{t.agent.undone}</small> : d.undo?.length ? <CrButton variant="quiet" size="s" className="dock__agent-undo" disabled={agent.busy} onClick={() => onUndo(i)}>{t.agent.undo}</CrButton> : null}
            </li>
          ))}
        </ul>
      )}
      {asks.map((q, i) => (
        <div key={`q${i}`} className="dock__agent-ask">
          <p>{q.text}</p>
          <div className="dock__agent-options">
            {q.options!.map((o) => <CrButton key={o.label} size="s" disabled={agent.busy} data-tip={o.order} onClick={() => onAsk(o.order)}>{o.label}</CrButton>)}
          </div>
        </div>
      ))}
      {guides.map((g, i) => (
        <div key={`g${i}`} className="dock__agent-guide">
          <p>{g.text}</p>
          {g.topic && g.topic !== "other" && g.topic !== "export_md" && <a className="cr-btn cr-btn-primary cr-btn-s" href="/extension/connect" target="_blank" rel="noreferrer">{t.agent.guides[g.topic]} <Icon name="arrow-right" size={16} /></a>}
        </div>
      ))}
      {agent.pending.length > 0 && (
        <div className="dock__agent-pending">
          <span className="dock__agent-pending-title">{t.agent.pendingTitle(agent.pending.length)}</span>
          <ul>{agent.pending.map((a, i) => <li key={i}>{will(a)}</li>)}</ul>
          <div className="dock__agent-actions">
            <CrButton variant="primary" size="s" disabled={agent.busy} onClick={onConfirm}>{agent.busy ? <Busy label={t.agent.thinking} /> : <Icon name="check" size={16} />} {t.agent.confirm}</CrButton>
            <CrButton size="s" disabled={agent.busy} onClick={onCancel}>{t.agent.cancel}</CrButton>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}

interface GridActions {
  select: (item: InspoItem, range: boolean) => void;
  openItem: (item: InspoItem) => void;
  deleteItem: (item: InspoItem) => Promise<void>;
  handleThumbnailUpload: (web: string, file: File) => void;
  handleThumbnailRemove: (web: string) => void;
  toggleFiled: (item: InspoItem, projectId: string, on: boolean) => void;
  createAndFile: (item: InspoItem, name: string) => Promise<void>;
  toggleArea: (item: InspoItem, area: SystemArea, on: boolean) => void;
  measure: (web: string, ratio: number) => void;
}

/** One card with its handlers bound. Memoised on its own data: moving the camera or another card leaves it alone. */
const Card = memo(function Card({ item, level, ratio, tags, tagJob, score, reason, comments, authorImage, manualThumbnail, designMd, shot, projects, projectIds, backs, areasIn, selected, selecting, deletable, spaceName, takeOutOf, actions }: {
  item: InspoItem; level: ShotLevel; ratio: number; tags: InspoTags | undefined; tagJob: TagStatus | undefined; score: number | undefined; reason: string | undefined;
  /** Inside a project: the areas of its system this reference backs */
  backs?: SystemArea[];
  /** In every project: the areas it backs there */
  areasIn?: Record<string, SystemArea[]>;
  comments: InspoComment[] | undefined; authorImage: string | undefined;
  manualThumbnail: string | undefined; designMd: DesignIndexEntry | undefined; shot: PageShot | undefined;
  projects: Project[]; projectIds: string[] | undefined;
  selected: boolean; selecting: boolean;
  /** Whether this person may delete the card: theirs, or they manage the workspace */
  deletable: boolean;
  spaceName: string;
  /** The project whose board this is: the bin takes the card out of it instead of deleting */
  takeOutOf: string | undefined;
  actions: RefObject<GridActions>;
}) {
  // The handlers are read when used, never kept from this render: the card re-renders only with its own data
  const act = () => actions.current;
  const onMeasure = useCallback((r: number) => actions.current.measure(item.web, r), [actions, item.web]);
  const caption = useMemo(() => captionFor(item, comments, authorImage), [item, authorImage, comments]);
  // The page's top, at the size it is seen: a site someone gave a thumbnail keeps that thumbnail
  const showsPage = !manualThumbnail && !!shot;
  const key = level === "thumb" ? "thumbUrl" : level === "tile" ? "tileUrl" : "topUrl";
  const page = showsPage ? shot![key] : designMd?.coverUrl;
  // The same page at the other sizes: whichever is already decoded stands in while this one loads
  const alternates = useMemo(() => (shot ? [shot.tileUrl, shot.thumbUrl, shot.topUrl] : undefined), [shot]);
  const open = () => act().openItem(item);
  // Always the whole card, at every zoom: its note and its thread are always there. Only the copy of the
  // page changes with the zoom (288, 720 or 1440px), swapped without a blank frame.
  return (
    <InspoCard
      item={item}
      tags={tags}
      tagJob={tagJob}
      score={score}
      reason={reason}
      commentCount={comments?.length ?? 0}
      caption={caption}
      onComments={item.id ? open : undefined}
      onDelete={item.id && deletable ? () => act().deleteItem(item) : undefined}
      onTakeOut={item.id && takeOutOf ? () => act().toggleFiled(item, takeOutOf, false) : undefined}
      spaceName={spaceName}
      manualThumbnail={manualThumbnail}
      onUpload={(file) => { act().handleThumbnailUpload(item.web, file); return Promise.resolve(); }}
      onRemoveThumbnail={() => { act().handleThumbnailRemove(item.web); return Promise.resolve(); }}
      onOpen={open}
      designCover={page}
      designCoverFallback={showsPage ? shot!.paths?.[key] : undefined}
      designScroll={designMd?.scrollUrl}
      projects={item.id ? projects : undefined}
      projectIds={projectIds}
      onToggleProject={(projectId, on) => act().toggleFiled(item, projectId, on)}
      onCreateProject={(name) => act().createAndFile(item, name)}
      backs={backs}
      onToggleArea={backs && item.id ? (area, on) => act().toggleArea(item, area, on) : undefined}
      areasIn={areasIn}
      selected={selected}
      selecting={selecting}
      onSelect={item.id ? (range) => act().select(item, range) : undefined}
      board={{ ratio, color: showsPage ? shot!.color : undefined, alternates: showsPage ? alternates : undefined, onMeasure: showsPage ? undefined : onMeasure }}
    />
  );
});
