"use client";

import { addInspo, addImage, removeInspo, postComment as postCommentAction, removeComment, editNote as editNoteAction, workspaceOfItem, newProject, editProject, removeProject, markProjectStarted, setFiled } from "@/app/actions/library";
import { authClient } from "@/lib/auth-client";
import { setProjectClient, savePolishBrief } from "@/app/actions/polish";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback, useDeferredValue, memo, type RefObject } from "react";
import { InspoItem, TagMap, TagStatus, InspoTags, CommentMap, CommentAttachment, CommentAnchor, InspoComment, Project, ProjectLinks, DesignIndex, DesignIndexEntry, PageShot } from "@/types/inspo";
import type { ThumbnailMap } from "@/lib/thumbnails";
import { COLORS, viewOf, FACETS } from "@/lib/taxonomy";
import { filtersFromParams, filterKey, LEGACY_PARAMS, filterTest, localScores, queryWords, rankText, isDescriptive, textIndex, vocabulary, norm, type Filter } from "@/lib/search-query";
import Sidebar, { Icons, type QuotaView } from "./Sidebar";
import Island from "./Island";
import SearchBar from "./SearchBar";
import InspoCard, { captionFor } from "./InspoCard";
import Discover from "./Discover";
import AddInspoModal, { type NewInspoInput } from "./AddInspoModal";
import GatherBar from "./GatherBar";
import { refInfoOf } from "@/lib/ref-info";
import { restoreTextHeadings } from "@/lib/criterio-md";
import { webKeyOf, nameFromHost, typeFromUrl, mediaKindOf, nameFromFile, hasOwnPage, normalizeWebUrl } from "@/lib/url";
import { uploadMedia, mediaFileFrom } from "@/lib/media-client";
import PageNotes from "./PageNotes";
import TextPage from "./TextPage";
import { addText, saveText, renameText } from "@/app/actions/text";
import { useTextBodies } from "@/hooks/use-text-bodies";
import Grid, { DEFAULT_ZOOM, type GridHandle, type ShotLevel } from "./Grid";
import { keyOf, DEFAULT_RATIO, BOARD_MAX_RATIO } from "@/lib/board";
import EmptyStart from "./EmptyStart";
import ProjectStart from "./ProjectStart";
import DesignMdToasts, { type DesignMdState } from "./DesignMdToasts";
import { SYSTEM_AREAS, staleness, type ProjectSystem, type SystemArea } from "@/types/system";
import type { AgentAction, AgentDone, AgentPatch, AgentReply, AgentTurn } from "@/lib/agent";
import ProjectChooser from "./ProjectChooser";
import type { TriageProposal } from "@/lib/system";
import { applySystemTriage } from "@/app/actions/system";
import { assignSystemArea, loadSystem } from "@/app/actions/system";
import WorkspaceMenu from "./WorkspaceMenu";
import TemplatesView from "./TemplatesView";
import { useActivity } from "./useActivity";
import { useT, messageOf } from "./I18nProvider";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { Button } from "@/components/ui/button";
import { useConfirm } from "./useConfirm";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useExtensionMissing } from "@/hooks/use-extension";
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
const CommandPalette = dynamic(() => import("./CommandPalette"), { ssr: false });

// Compress + resize image client-side before upload (avoids 413 on Vercel)
async function compressImage(file: File, maxPx = 1400, quality = 0.85): Promise<File> {
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
        (blob) => resolve(new File([blob!], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })),
        "image/jpeg", quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

function parseDate(s: string): number {
  if (!s) return 0;
  const parts = s.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const ts = Date.parse(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (!isNaN(ts)) return ts;
  }
  const ts = Date.parse(s);
  return isNaN(ts) ? 0 : ts;
}

// Saving a new site kicks off the full experience (screenshot, tags and
// DESIGN.md). Videos and social posts have no design system to extract.
interface RunDesignMdOpts {
  force?: boolean;         // regenerate even if it exists (costs money, admins only)
  quiet?: boolean;         // cache expected: the toast only shows if it takes a while
  openWhenReady?: boolean; // open the sheet on its own when done
}

// A DESIGN.md reads a site: an uploaded image, a video or a social post has none
const canAutoDesignMd = hasOwnPage;

/** A new item's job is asked about every 4 s, for up to 5 minutes (a whole-page capture can take one);
 *  past that it keeps "gathering" until the page is opened again */
const TAG_POLL_MS = 4000;
const TAG_WATCH_MS = 5 * 60 * 1000;

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
  items: initialItems,
  initialThumbnailMap = {},
  initialTagMap = {},
  initialTagJobs = {},
  initialProjects = [],
  initialProjectLinks = {},
  initialProjectShelf = {},
  initialSystems = {},
  aiEnabled = false,
  user,
  workspace,
  workspaces,
  members = [],
  isAdmin = false,
  initialQuota = null,
  initialComments = {},
  initialDesignMdIndex = {},
  initialPageShots = {},
}: {
  items: InspoItem[];
  initialQuota?: QuotaView | null;
  initialComments?: CommentMap;
  initialDesignMdIndex?: DesignIndex;
  initialThumbnailMap?: ThumbnailMap;
  initialTagMap?: TagMap;
  /** Items whose tagging job isn't done (lib/tag-jobs.ts) */
  initialTagJobs?: Record<string, TagStatus>;
  initialProjects?: Project[];
  initialProjectLinks?: ProjectLinks;
  /** Archived by Polish: off the project's board, still the project's (not in the Inbox either) */
  initialProjectShelf?: ProjectLinks;
  /** Each project's system, by project id (lib/system.ts) */
  initialSystems?: Record<string, ProjectSystem>;
  aiEnabled?: boolean;
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
  members?: { name: string; image: string | null }[];
  /** Can see the activity panel (/admin) */
  isAdmin?: boolean;
  /** Each site's stored full-page screenshot (lib/page-shots.ts): what the board draws */
  initialPageShots?: Record<string, PageShot>;
}) {
  const { t } = useT();
  const [items, setItems] = useState(initialItems);
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
  const setQuery = useCallback((v: string) => { setQueryState(v); setParams({ q: v }, true); }, [setParams]);
  // Each chip change is a history entry; the old filter params go once they are chips
  const setFilters = useCallback((next: Filter[]) => {
    const p = new URLSearchParams(window.location.search);
    p.delete("f");
    for (const k of LEGACY_PARAMS) p.delete(k);
    for (const f of next) p.append("f", filterKey(f));
    window.history.pushState(null, "", window.location.pathname + (p.size ? `?${p}` : ""));
  }, []);
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
  const [shelf, setShelf] = useState<ProjectLinks>(initialProjectShelf);
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
        const res = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) });
        const json = await res.json().catch(() => ({})) as ProjectSystem & { error?: string };
        if (res.ok && !json.error) setSystems((prev) => ({ ...prev, [projectId]: json }));
      } catch { /* the modal shows the board as unread; the next read catches up */ }
    }, 2500);
  }, []);
  const setSystem = useCallback((projectId: string, system: ProjectSystem) => setSystems((prev) => ({ ...prev, [projectId]: system })), []);
  const inParam = sp.get("in");
  // Bare "/" asks what you are making (the chooser); ?in=library is the whole board; ?in=inbox; ?in=<project>
  const space = inParam === "inbox" || inParam === "templates" || inParam === "discover" || (inParam && projects.some((p) => p.id === inParam)) ? inParam : inParam === "library" || items.length === 0 ? "all" : "home";
  const currentProject = projects.find((p) => p.id === space) ?? null;
  const currentSystem = currentProject ? systems[currentProject.id] ?? null : null;
  // Inside a project the system comes first and the board is a mode (?view=board). A project with nothing in
  // it and nothing decided opens on the board instead, which is then its starting point (ProjectStart)
  // ...and so does one still gathering: until the team says it has its references (GatherBar), the board is the
  // project's first screen; after that, the system
  const projectBlank = !!currentProject && !currentSystem?.areas.some((a) => a.decision) && !items.some((i) => i.id && links[i.id]?.includes(currentProject.id));
  const gatheringRefs = !!currentProject && !currentProject.started;
  const defaultView: "system" | "board" = projectBlank || gatheringRefs ? "board" : "system";
  const viewParam = sp.get("view");
  const projectView: "system" | "board" = !currentProject ? "board" : viewParam === "board" || viewParam === "system" ? viewParam : defaultView;
  const setProjectView = useCallback((v: "system" | "board") => setParams({ view: v === defaultView ? "" : v }), [setParams, defaultView]);
  // The search lives on a project's board and nowhere else: off it there is no box, and what was typed or
  // chipped there waits in the URL without narrowing anything
  const searchHere = !!currentProject && projectView === "board";
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
    in: v === "all" ? "library" : v === "home" ? "" : v,
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
    let last: string | null = null;
    try { last = localStorage.getItem(lastProjectKey); } catch { /* private mode */ }
    return projects.find((p) => p.id === last)?.id ?? projects[0]?.id;
  };
  const saveTargetRef = useRef(saveTarget);
  saveTargetRef.current = saveTarget;
  // There is no library to land on: the bare address (or an old ?in=library) opens the last project worked in.
  // With no project yet, the first screen stays (the chooser, or the empty start)
  useEffect(() => {
    if ((space === "home" || space === "all") && projects.length) setParams({ in: saveTarget() ?? "" }, true);
  }, [space, inParam, projects.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const [confirm, confirmDialog] = useConfirm();

  // What no project has taken (nor archived): the library's second view
  const unfiledCount = useMemo(() => items.filter((i) => !(i.id && (links[i.id]?.length || shelf[i.id]?.length))).length, [items, links, shelf]);
  // The items in the current space (inbox, a project or everything), before any other filter
  const spaceItems = useMemo(() => space === "all" || space === "home" ? items
    : space === "inbox" ? items.filter((i) => !(i.id && (links[i.id]?.length || shelf[i.id]?.length)))
    : items.filter((i) => !!i.id && !!links[i.id]?.includes(space)),
  [items, links, space]);
  const [thumbMap, setThumbMap] = useState<ThumbnailMap>(initialThumbnailMap);

  // ─── Tags ───────────────────────────────────────────────────────────────────
  const [tagMap, setTagMap] = useState<TagMap>(initialTagMap);

  // ─── Tags: one job per item, on the server ──────────────────────────────────
  // Every add starts its item's job (lib/tag-jobs.ts), whatever the tab does next. Here: which items are
  // still gathering, and asking how they go for the ones added or retried in this tab.
  const [tagJobs, setTagJobs] = useState<Record<string, TagStatus>>(initialTagJobs);
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
        setTagMap((prev) => ({ ...prev, ...data.tags }));
        setTagJobs((prev) => {
          const next = { ...prev };
          for (const w of webs) { if (data.jobs[w]) next[w] = data.jobs[w]; else delete next[w]; }
          return next;
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

  const [showAdd, setShowAdd] = useState(false);
  // What was pasted or dropped on the board: the add dialog opens with it in place
  const [addInitial, setAddInitial] = useState<{ file?: File; web?: string; text?: string } | undefined>();
  const [boardDrag, setBoardDrag] = useState(false);
  // Organising the Inbox: the model's proposal per reference sits on its card until the team accepts, changes or dismisses it
  const [triage, setTriage] = useState<Record<string, TriageProposal> | null>(null);
  const [triageRunning, setTriageRunning] = useState(false);
  const gridRef = useRef<GridHandle | null>(null);
  const runTriage = useCallback(async (ids: string[]) => {
    setTriageRunning(true);
    try {
      const res = await fetch("/api/system/triage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemIds: ids }) });
      const json = await res.json().catch(() => ({})) as { proposals?: TriageProposal[]; error?: string };
      if (!res.ok || json.error || !json.proposals) throw new Error(json.error || t.triage.failed);
      setTriage(Object.fromEntries(json.proposals.map((p) => [p.itemId, p])));
      // Bring the first proposal into view
      const first = json.proposals.find((p) => p.projectId) ?? json.proposals[0];
      if (first) setTimeout(() => gridRef.current?.focus(first.itemId), 50);
    } catch (e) { setAddError({ title: t.triage.failed, detail: e instanceof Error ? e.message : String(e) }); }
    finally { setTriageRunning(false); }
  }, [t]);
  const patchTriage = useCallback((itemId: string, patch: Partial<TriageProposal> | null) => setTriage((m) => {
    if (!m) return m; const n = { ...m };
    if (patch === null) delete n[itemId]; else n[itemId] = { ...n[itemId], ...patch };
    return n;
  }), []);
  const acceptTriage = useCallback(async (picks: TriageProposal[]) => {
    const valid = picks.filter((p): p is TriageProposal & { projectId: string } => !!p.projectId);
    if (!valid.length) return;
    const r = await applySystemTriage(valid.map((p) => ({ itemId: p.itemId, projectId: p.projectId, areas: p.areas }))).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { setAddError({ title: t.triage.failed, detail: r.error }); return; }
    setLinks((prev) => { const next = { ...prev }; for (const p of valid) next[p.itemId] = [...(next[p.itemId] ?? []).filter((x) => x !== p.projectId), p.projectId]; return next; });
    setSystems(r.data.systems);
    setTriage((m) => {
      if (!m) return m; const n = { ...m }; for (const p of valid) delete n[p.itemId];
      // On to the next proposal
      const next = Object.values(n).find((p) => p.projectId);
      if (next && valid.length === 1) setTimeout(() => gridRef.current?.focus(next.itemId), 50);
      return Object.keys(n).length ? n : null;
    });
  }, [t]);
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
      else setAddError({ title: t.errors.imagesOnly, detail: "" });
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
  const [addError, setAddError] = useState<{ title: string; detail: string } | null>(null);
  useEffect(() => {
    if (!addError) return;
    const t = setTimeout(() => setAddError(null), 6000);
    return () => clearTimeout(t);
  }, [addError]);
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
  const runDesignMdRef = useRef<(item: InspoItem, opts?: RunDesignMdOpts) => void>(() => {});
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
      if (canAutoDesignMd(item.web)) runDesignMdRef.current(item);
      return item;
    } catch (e) {
      setItems((prev) => prev.filter((i) => i !== temp));
      setAddError({ title: t.app.saveFailed, detail: e instanceof Error ? e.message : String(e) });
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
      return item;
    } catch (e) {
      setItems((prev) => prev.filter((i) => i !== temp));
      setAddError({ title: t.app.saveFailed, detail: messageOf(e, t, String(e)) });
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
      return item;
    } catch (e) {
      setItems((prev) => prev.filter((i) => i !== temp));
      setAddError({ title: t.app.saveFailed, detail: messageOf(e, t, String(e)) });
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
    addByUrl({ web, type: typeFromUrl(web), note: "" }).then((item) => {
      if (item) runDesignMdRef.current(item, { openWhenReady: true });
    });
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
      setAddError({ title: t.app.removeFailed, detail: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  // Projects change on screen first; if the server says no, they go back with a notice
  const projectFailed = (e: unknown) => setAddError({ title: t.projects.saveFailed, detail: e instanceof Error ? e.message : String(e) });
  const createProject = useCallback(async (name: string): Promise<Project | null> => {
    const r = await newProject(name).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { projectFailed(new Error(r.error)); return null; }
    setProjects((prev) => [...prev, r.data]);
    return r.data;
  }, []);
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
    // Filing an archived reference again brings it back to the board (the server does the same)
    if (on) setShelf((prev) => (prev[id]?.includes(projectId) ? { ...prev, [id]: prev[id].filter((x) => x !== projectId) } : prev));
    const r = await setFiled(projectId, [id], on).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { flip(!on); projectFailed(new Error(r.error)); return; }
    refreshSystem(projectId);
  }, [refreshSystem]);
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
  // Arrives from the server with the page; re-read after spending quota (a new DESIGN.md)
  const [quota, setQuota] = useState<QuotaView | null>(initialQuota);
  const loadQuota = useCallback(() => {
    fetch("/api/plan").then((r) => (r.ok ? r.json() : null)).then((q) => { if (q) setQuota(q); }).catch(() => {});
  }, []);

  // ─── Comments ──────────────────────────────────────────────────────────────
  const [commentMap, setCommentMap] = useState<CommentMap>(initialComments);
  const loadComments = useCallback(async () => {
    try {
      const res = await fetch("/api/comments");
      if (res.ok) setCommentMap(await res.json());
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
  const postComment = async (itemId: string, body: string, attachments: CommentAttachment[], anchor?: CommentAnchor, parentId?: string) => {
    const r = await postCommentAction(itemId, body, attachments, anchor, parentId);
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
  const [designMdJobs, setDesignMdJobs] = useState<Record<string, DesignMdState>>({});
  // Index of DESIGN.md already generated: server + those finished this session
  const [designMdIndex, setDesignMdIndex] = useState<DesignIndex>(initialDesignMdIndex);
  const [pageShots, setPageShots] = useState<Record<string, PageShot>>(initialPageShots);

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

  const handleThumbnailRemove = async (webUrl: string) => {
    const res = await fetch(`/api/thumbnail?webUrl=${encodeURIComponent(webUrl)}`, { method: "DELETE" });
    if (res.ok) setThumbMap((prev) => { const next = { ...prev }; delete next[webUrl]; return next; });
  };


  // ─── The panel and the DESIGN.md ────────────────────────────────────────────
  // The panel opens at once for any reference: the page and its post-its first. The DESIGN.md is fetched
  // quietly when it exists; generating one (it costs) waits for a click, and runs in the bottom-right
  // toast, so closing the panel never stops it.
  const patchJob = (url: string, patch: Partial<DesignMdState>) =>
    setDesignMdJobs((prev) => ({ ...prev, [url]: { ...prev[url], ...patch } }));
  const dropJob = (url: string) =>
    setDesignMdJobs((prev) => { const next = { ...prev }; delete next[url]; return next; });

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
  const designMdCtrls = useRef(new Map<string, AbortController>());
  const panelItemRef = useRef<InspoItem | null>(null);

  // One in-flight request per URL: stop = abort the fetch (the server closes Chromium
  // and cuts Claude off when the last client leaves) and also send DELETE just in case.
  const runDesignMd = async (item: InspoItem, opts: RunDesignMdOpts = {}) => {
    const url = item.web;
    designMdCtrls.current.get(url)?.abort();
    const ctrl = new AbortController();
    designMdCtrls.current.set(url, ctrl);
    setDesignMdJobs((prev) => ({
      ...prev,
      [url]: { status: "loading", name: item.name, startedAt: Date.now(), seen: false, quiet: opts.quiet, openWhenReady: opts.openWhenReady },
    }));
    try {
      const res = await fetch(`/api/design-md?url=${encodeURIComponent(url)}${opts.force ? "&force=1" : ""}`, { signal: ctrl.signal });
      const body = await res.json().catch(() => ({}));
      if (ctrl.signal.aborted) return false;
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      // Seen already when it was asked for from the open panel: no "Done" toast for what is on screen
      patchJob(url, { status: "ready", entry: body, error: undefined, ...(panelItemRef.current?.web === url ? { seen: true } : {}) });
      setDesignMdIndex((prev) => ({ ...prev, [url]: {
        coverUrl: body.coverUrl, scrollUrl: body.scrollUrl, shotUrl: body.screenshotUrl, topUrl: body.topUrl, tileUrl: body.tileUrl, thumbUrl: body.thumbUrl, shotH: body.shotH,
      } }));
      // A new DESIGN.md brings the page's capture: the board draws it from now on
      if (body.topUrl && body.tileUrl && body.thumbUrl && body.screenshotUrl && body.shotH) {
        setPageShots((prev) => ({ ...prev, [url]: { shotUrl: body.screenshotUrl, topUrl: body.topUrl, tileUrl: body.tileUrl, thumbUrl: body.thumbUrl, shotH: body.shotH, color: body.color } }));
      }
      if (!body.cached) loadQuota();
      // Open on its own only if no other reference is in front; if there is, the "Done" toast stays
      if (opts.openWhenReady && !panelItemRef.current) showPanel(item);
      return true;
    } catch (e) {
      if (ctrl.signal.aborted) return false; // stopped by the user: the job is already gone
      patchJob(url, { status: "error", error: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      if (designMdCtrls.current.get(url) === ctrl) designMdCtrls.current.delete(url);
    }
  };

  const cancelDesignMd = (url: string) => {
    const ctrl = designMdCtrls.current.get(url);
    if (!ctrl) return;
    ctrl.abort();
    designMdCtrls.current.delete(url);
    dropJob(url);
    fetch(`/api/design-md?url=${encodeURIComponent(url)}`, { method: "DELETE", keepalive: true }).catch(() => {});
  };

  /** Opens a reference in the panel. Its DESIGN.md loads quietly when one exists; `generate` makes one. */
  const openItem = (item: InspoItem, { generate = false } = {}) => {
    showPanel(item);
    if (!canAutoDesignMd(item.web)) return;
    const job = designMdJobs[item.web];
    if (job?.status === "ready" || job?.status === "loading") return;
    if (item.web in designMdIndex) runDesignMd(item, { quiet: true });
    else if (generate) runDesignMd(item);
  };

  const openItemByUrl = (url: string) => {
    const item = items.find((i) => i.web === url);
    if (item) openItem(item);
  };
  const retryDesignMdByUrl = (url: string) => {
    const item = items.find((i) => i.web === url);
    if (item) runDesignMd(item, { openWhenReady: true });
  };

  // Regenerating costs money: the server only allows it for workspace admins.
  // The panel stays open and shows the work in its DESIGN.md tabs.
  const regenerateDesignMd = (item: InspoItem) => { runDesignMd(item, { force: true }); };
  panelItemRef.current = panelItem;

  // Cmd+K (Ctrl+K) opens the command palette from anywhere in the library
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Mounted on its first ⌘K, then kept so it can animate closed
  const [paletteUsed, setPaletteUsed] = useState(false);
  if (paletteOpen && !paletteUsed) setPaletteUsed(true);
  useEffect(() => {
    const preload = () => { void loadItemPanel(); void loadCommentsPanel(); };
    if (typeof window.requestIdleCallback !== "function") { const id = setTimeout(preload, 2000); return () => clearTimeout(id); }
    const id = window.requestIdleCallback(preload, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }, []);
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
  useEffect(() => {
    const id = pathname.match(/^\/i\/([^/]+)/)?.[1];
    if (!id) {
      if (panelItemRef.current) { pushedRef.current = false; setPanelItem(null); }
      return;
    }
    if (panelItemRef.current?.id === id) return;
    const item = items.find((i) => i.id === id);
    if (item) { openItem(item); return; }
    // Not in this workspace: if it is in another one of mine, switch to it; the library remounts and opens it
    workspaceOfItem(id).then(async (r) => {
      if (!r.ok || !r.data || r.data === workspace.id) return;
      await authClient.organization.setActive({ organizationId: r.data });
      router.refresh();
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on path changes only
  }, [pathname]);

  // Whatever shows in the panel counts as seen
  useEffect(() => {
    const url = panelItem?.web;
    if (!url) return;
    const job = designMdJobs[url];
    if (job && job.status !== "loading" && !job.seen) patchJob(url, { seen: true });
  }, [panelItem, designMdJobs]);

  // "Who": only workspace members who added something. Legacy sheet labels
  // ("Both" = no known author) aren't offered as a filter; those sites stay under "all".
  const memberNames = useMemo(() => members.map((m) => m.name), [members]);
  const authorImages = useMemo(() => Object.fromEntries(members.filter((m) => m.image).map((m) => [m.name, m.image!])), [members]);

  // Back to everything: the whole library, no chips, no words
  const resetFilters = useCallback(() => {
    setQueryState("");
    const p = new URLSearchParams(window.location.search);
    for (const k of ["f", "q", "in", ...LEGACY_PARAMS]) p.delete(k);
    window.history.pushState(null, "", window.location.pathname + (p.size ? `?${p}` : ""));
  }, []);

  // Desktop has no sidebar: the island in the top bar holds the projects and the workspace menu. A phone keeps
  // the sidebar as a sheet behind the menu button.
  const isMobile = useIsMobile();
  const extMissing = useExtensionMissing();

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
    if (!ranked) return [...base].sort((a, b) => parseDate(b.date) - parseDate(a.date));
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
      out[it.web] = hit.length ? hit.join(" · ") : t.search.nearInMeaning;
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
  };

  // ─── Board ──────────────────────────────────────────────────────────────────
  // At rest, the whole space, newest first. While searching, only the results, laid out again in the
  // order they rank: the best one top left. What doesn't match isn't there.
  const boardItems = useMemo(
    () => (filtering ? filtered : [...spaceItems].sort((a, b) => parseDate(b.date) - parseDate(a.date))),
    [filtering, filtered, spaceItems],
  );

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
    (item: InspoItem) => !!item.note.trim() || !!(item.id && commentMap[item.id]?.some((c) => c.body.trim())),
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

  // Presence: which area the person is in right now (read by the /admin panel)
  const area = panelItem ? "design-md" : space === "discover" ? "directory" : showAdd ? "add" : filtering ? "search" : "library";
  useActivity(area, workspace.id);

  runDesignMdRef.current = runDesignMd;
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
  // From the library: under an area of any project, filed in that project first if it was not
  const toggleAreaIn = useCallback(async (item: InspoItem, projectId: string, area: SystemArea, on: boolean) => {
    if (!item.id) return;
    if (on && !links[item.id]?.includes(projectId)) await toggleFiled(item, projectId, true);
    const r = await assignSystemArea(projectId, area, item.id, on).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { projectFailed(new Error(r.error)); return; }
    setSystem(projectId, r.data);
  }, [setSystem, toggleFiled, links]);
  gridActions.current = { openItem, deleteItem, handleThumbnailUpload, handleThumbnailRemove, toggleFiled, createAndFile, toggleArea, toggleAreaIn, measure, acceptProposal: (p) => void acceptTriage([p]), patchProposal: patchTriage };

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

  // The open reference: its comments. The pinned ones are also post-its on its page, numbered in the order
  // they were pinned; the column holds all of them with their replies
  const panelThread = panelItem?.id ? commentMap[panelItem.id] : undefined;
  const panelComments = panelThread ?? [];
  // The same objects while the comments don't change, so the post-its don't re-render on every key typed
  const { panelNotes, pins, repliesOf } = useMemo(() => {
    const all = panelThread ?? [];
    const notes = all.filter((c) => c.anchor && !c.parentId);
    const pins: Record<string, number> = {};
    [...notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((c, i) => { pins[c.id] = i + 1; });
    // The map keeps the comments' own order: oldest first
    const repliesOf: Record<string, InspoComment[]> = {};
    for (const c of all) if (c.parentId) (repliesOf[c.parentId] ??= []).push(c);
    return { panelNotes: notes, pins, repliesOf };
  }, [panelThread]);
  // A comment picked on one side shows on the other: the post-it on the page, the thread in the column.
  // `n` changes on every pick, so picking the same one again still asks the column to open.
  const [commentFocus, setCommentFocus] = useState<{ id: string; n: number } | null>(null);
  const focusComment = useCallback((id: string) => setCommentFocus({ id, n: Date.now() }), []);
  useEffect(() => { setCommentFocus(null); }, [panelItem?.id]);
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const panelPage = (() => {
    if (!panelItem) return null;
    const kind = mediaKindOf(panelItem.web);
    // A video or a post is its own page: it fills the page card, with no post-its
    if (kind === "video") return <div className="ip-media"><VideoPlayer web={panelItem.web} title={panelItem.name} /></div>;
    if (kind === "text") return <TextPage key={panelItem.id} title={panelItem.name} body={panelItem.id ? textBodies[panelItem.id] : undefined} onSave={(text) => saveTextBody(panelItem, text)} onRename={(title) => renameTextItem(panelItem, title)} />;
    if (kind === "post") return <div className="ip-media"><PostView web={panelItem.web} onThumb={(thumb: string) => setThumbMap((prev) => (prev[panelItem.web] ? prev : { ...prev, [panelItem.web]: thumb }))} /></div>;
    const job = designMdJobs[panelItem.web];
    const src = kind === "image"
      ? thumbMap[panelItem.web] ?? panelItem.web
      : job?.entry?.screenshotUrl ?? pageShots[panelItem.web]?.shotUrl ?? thumbMap[panelItem.web] ?? `/api/shot?url=${encodeURIComponent(panelItem.web)}&v=2`;
    return (
      <PageNotes
        key={panelItem.web}
        src={src}
        alt={panelItem.name}
        fit={kind === "image"}
        notes={panelNotes}
        user={user}
        canManage={canManage}
        onPin={(body, anchor) => postComment(panelItem.id!, body, [], anchor)}
        onDelete={(id) => deleteComment(panelItem.id!, id)}
        pins={pins}
        replies={repliesOf}
        focusId={commentFocus?.id ?? null}
        onFocus={focusComment}
        onReply={(parentId, body) => postComment(panelItem.id!, body, [], undefined, parentId)}
      />
    );
  })();

  return (
    <SidebarProvider defaultOpen={false} className="shell">
      {confirmDialog}
      {panelItem && (
        <ItemPanel
          item={panelItem}
          state={designMdJobs[panelItem.web]}
          canDesignMd={canAutoDesignMd(panelItem.web)}
          page={panelItem.id ? panelPage : null}
          thread={panelItem.id ? (
            <CommentsPanel
              variant="column"
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
              onReply={(parentId, body) => postComment(panelItem.id!, body, [], undefined, parentId)}
              pins={pins}
              focusId={commentFocus?.id ?? null}
              onFocus={panelPage ? focusComment : undefined}
            />
          ) : null}
          onClose={closePanel}
          onGenerate={() => runDesignMd(panelItem)}
          onRegenerate={() => regenerateDesignMd(panelItem)}
          onRevised={(patch) => patchJob(panelItem.web, { entry: { ...designMdJobs[panelItem.web]?.entry!, ...patch } })}
          libraryName={workspace.name}
        />
      )}
      <DesignMdToasts
        jobs={designMdJobs}
        openUrl={panelItem?.web ?? null}
        onOpen={openItemByUrl}
        onDismiss={(url) => patchJob(url, { seen: true })}
        onCancel={cancelDesignMd}
        onRetry={retryDesignMdByUrl}
      />
      {addError && (
        <div className="toasts toasts--top" role="alert">
          <div className="toast toast--error" onClick={() => setAddError(null)}>
            <span className="toast__dot" />
            <span className="toast__text"><span className="toast__title">{addError.title}</span><span className="toast__sub">{addError.detail}</span></span>
          </div>
        </div>
      )}
      {paletteUsed && <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={items}
        hasDesignMd={(web) => web in designMdIndex || designMdJobs[web]?.status === "ready"}
        workspace={workspace}
        workspaces={workspaces}
        isAdmin={isAdmin}
        onOpenItem={(item) => openItem(item)}
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
      {boardDrag && <div className="board-drop" aria-hidden><span className="display">{t.add.dropHere}</span></div>}
      {showAdd && (
        <AddInspoModal
          onClose={() => { setShowAdd(false); setAddInitial(undefined); }}
          initial={addInitial}
          onSubmit={(input) => { if (input.file) addByUpload({ ...input, file: input.file }); else if (input.text) addByText({ ...input, text: input.text }); else addByUrl(input); }}
          isDuplicate={isDuplicate}
          project={currentProject?.name}
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
              else if (projectView === "system") setProjectView("board");
              toggleFilter({ kind: "person", value: name });
            }}
            onDirectory={openDirectory} quota={quota} />
          <Logo size={28} className="topbar__logo" />
          {/* On desktop one white pill, the island's twin on the right; on a phone the two buttons sit in the bar */}
          <div className="topbar__actions">
            {currentProject && (
              <>
                <span className="topbar__modes" role="tablist" aria-label={t.system.button}>
                  <button type="button" role="tab" className={`topbar__mode topbar__system${projectView === "system" ? " is-on" : ""}`} aria-selected={projectView === "system"}
                    title={systemStale ? t.system.stale(systemStale) : undefined} onClick={() => setProjectView("system")}>
                    {Icons.compass} {t.system.modeSystem}
                    <span className="topbar__fill">{t.system.fill(systemFilled, SYSTEM_AREAS.length)}</span>
                    {systemStale > 0 && <i className="topbar__dot" aria-hidden />}
                  </button>
                  <button type="button" role="tab" className={`topbar__mode${projectView === "board" ? " is-on" : ""}`} aria-selected={projectView === "board"} onClick={() => setProjectView("board")}>
                    {Icons.all} {t.system.modeBoard}
                  </button>
                </span>
              </>
            )}
            {currentProject && <span className="topbar__actions-sep" aria-hidden />}
            {/* A browser without the extension, or with it unconnected: the way to the guide, beside the other way of adding */}
            {extMissing && (
              <>
                <Link href="/extension/install" className="btn btn--ghost topbar__polish topbar__ext" title={t.ext.nudge.hint}>
                  {sectionIcon("extension")} {t.ext.nudge[extMissing]}
                </Link>
                <span className="topbar__actions-sep" aria-hidden />
              </>
            )}
            <Button variant="icon" className="topbar__add" onClick={() => setShowAdd(true)} aria-label={t.app.add}>{Icons.plus}</Button>
          </div>
        </header>

        {space === "discover" || space === "templates" ? (
          // Discover: the directory of places to look, and the templates (whole systems to start a project from)
          <Discover section={space === "templates" ? "templates" : "sites"} onSection={(s) => setSpace(s === "templates" ? "templates" : "discover")}
            templates={<TemplatesView onStarted={(p) => {
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
            onPick={(id) => setSpace(id)}
            onCreate={createProject}
          />
        ) : items.length === 0 ? (
          <EmptyStart
            onAddUrl={async (web) => {
              // First inspo: saved and its DESIGN.md opened directly, so the app shows what it does
              const item = await addByUrl({ web, type: typeFromUrl(web), note: "" });
              if (item) runDesignMd(item, { openWhenReady: true });
            }}
            isDuplicate={isDuplicate}
            onDirectory={openDirectory}
          />
        ) : currentProject && projectView === "system" ? (
          <SystemView
            key={currentProject.id}
            project={currentProject}
            system={systems[currentProject.id] ?? null}
            onSystem={(sys) => setSystem(currentProject.id, sys)}
            board={spaceItems}
            library={items}
            inbox={items.filter((i) => !(i.id && links[i.id]?.length))}
            onFile={(item) => toggleFiled(item, currentProject.id, true)}
            imageOf={smallImageOf}
            onOpenBoard={() => setProjectView("board")}
            focusArea={focusArea}
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
          />
        ) : spaceItems.length === 0 && currentProject ? (
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
              const r = await savePolishBrief(id, { about }).catch((e) => ({ ok: false as const, error: String(e) }));
              if (!r.ok) throw new Error(r.error);
              const saved = r.data.brief?.about ?? "";
              setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, intent: saved || null } : p)));
            }}
            onUpload={async (files) => { await Promise.all(files.map((file) => addByUpload({ web: "", file, type: "inspiration", note: "" }))); }}
            onFile={(picked) => fileMany(picked, currentProject.id)}
          />
        ) : spaceItems.length === 0 && space === "inbox" ? (
          <div className="empty">
            <span className="display">{t.projects.inboxEmptyTitle}</span>
            <span>{t.projects.inboxEmptyHint}</span>
          </div>
        ) : (
          <>
            <Grid
              items={boardItems}
              ratioOf={ratioOf}
              hasNote={hasNote}
              insets={insets}
              zoom={zoom}
              onZoom={setZoom}
              fitKey={fitKey}
              focusKey={panelItem ? keyOf(panelItem) : null}
              handleRef={gridRef}
              renderCard={(item, level) => (
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
                  designMdLoading={designMdJobs[item.web]?.status === "loading"}
                  designMd={designMdIndex[item.web]}
                  shot={pageShots[item.web]}
                  projects={projects}
                  projectIds={item.id ? links[item.id] : undefined}
                  backs={currentProject && item.id ? backsOf(item.id) : undefined}
                  areasIn={item.id ? areasByItem.get(item.id) : undefined}
                  proposal={triage && item.id ? triage[item.id] ?? null : undefined}
                  actions={gridActions}
                />
              )}
            />
            {filtered.length === 0 && (
              <div className="empty empty--over">
                <span className="display">{t.app.nothingHere}</span>
                <span>{searchBusy ? t.app.searchingShort : t.app.tryAnother}</span>
                <Button variant="ghost" size="sm" onClick={resetFilters} style={{ marginTop: 8 }}>{t.app.seeEverything}</Button>
              </div>
            )}
          </>
        )}
        {/* The way to find anything on a project's board, at the bottom like a conversation: people, dates, kinds,
            every tag, and what it means. Solid and bright in both themes, so it is the first thing the eye finds.
            Off the board only what the agent is still saying stays. */}
        {items.length > 0 && (searchHere || agentSpeaks) && (
          <div className="dock">
            {filtering && (
              <p className="dock__status" role="status" aria-live="polite">
                {t.search.results(filtered.length)}{jevBusy && <span className="dock__status-more"> · {t.search.reading}</span>}
              </p>
            )}
            {/* On a project's board, always: what the board is for, and the step to the system (the first time it also
                marks the project as started, so it opens on its system from then on) */}
            {searchHere && spaceItems.length > 0 && !filtering && !agent && (
              <GatherBar count={spaceItems.length} thumbs={boardItems.slice(0, 3).map(smallImageOf)} onAdd={() => setShowAdd(true)}
                onStart={async () => {
                  const id = currentProject.id;
                  if (!currentProject.started) {
                    const r = await markProjectStarted(id).catch((e) => ({ ok: false as const, error: String(e) }));
                    if (!r.ok) { projectFailed(new Error(r.error)); return; }
                    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, started: true } : p)));
                  }
                  setParams({ view: "system" });
                }} />
            )}
            {agent && agentSpeaks && (
              <AgentCard agent={agent} projects={projects} onConfirm={() => void confirmAgent()} onCancel={() => setAgent((a) => (a ? { ...a, pending: [] } : a))} onClose={() => setAgent(null)} onAsk={(order) => void askAgent(order)} onUndo={(i) => void undoAgent(i)} />
            )}
            {/* The card handed to the agent wears a ring wherever it is shown */}
            {agentTargetItem && <style>{`[data-id="${agentTargetItem.id}"].tile, [data-id="${agentTargetItem.id}"].sysf-ref { outline: 2px solid var(--dock-ink, #f2f2ef) !important; outline-offset: 3px; }`}</style>}
            {searchHere && (
              <SearchBar className="sb--dock" filters={filters} text={query} onFilters={setFilters} onText={setQuery}
                vocab={vocab} busy={searchBusy} gathering={gathering} swatches={swatches} faces={authorImages} onAsk={(v) => void askAgent(v)} asking={!!agent?.busy}
                target={agentTargetItem ? { name: agentTargetItem.name, image: smallImageOf(agentTargetItem) } : null} onClearTarget={() => setAgentTarget(null)} quick={agentQuick} />
            )}
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

const EMPTY_AREAS: SystemArea[] = [];

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
    <div className="dock__agent" role="status" aria-live="polite">
      <div className="dock__agent-head">
        <span className="dock__agent-q">{agent.text}</span>
        <button type="button" className="dock__agent-x" aria-label={t.agent.dismiss} onClick={onClose}>{Icons.x}</button>
      </div>
      {agent.busy && !agent.say ? <p className="dock__agent-say"><span className="spinner spinner--sm" /> {t.agent.thinking}</p> : null}
      {agent.error && <p className="dock__agent-say dock__agent-say--error">{t.agent.failed}: {agent.error}</p>}
      {agent.say && <p className="dock__agent-say">{agent.say}</p>}
      {agent.done.filter((d) => d.kind !== "guide" && d.kind !== "ask").length > 0 && (
        <ul className="dock__agent-did">
          {agent.done.map((d, i) => d.kind === "guide" || d.kind === "ask" ? null : (
            <li key={i} className={`${d.ok ? "" : "is-failed"}${d.undone ? " is-undone" : ""}`}>{d.ok ? Icons.check : Icons.x}
              <span>{d.ok ? line(d) : d.error}{d.ok && (d.kind === "decide" || d.kind === "organize") && d.text ? <small className="dock__agent-sub">{d.text}</small> : null}</span>
              {d.undone ? <small className="dock__agent-undone">{t.agent.undone}</small> : d.undo?.length ? <button type="button" className="dock__agent-undo" disabled={agent.busy} onClick={() => onUndo(i)}>{t.agent.undo}</button> : null}
            </li>
          ))}
        </ul>
      )}
      {asks.map((q, i) => (
        <div key={`q${i}`} className="dock__agent-ask">
          <p>{q.text}</p>
          <div className="dock__agent-options">
            {q.options!.map((o) => <button key={o.label} type="button" className="dock__agent-option" disabled={agent.busy} title={o.order} onClick={() => onAsk(o.order)}>{o.label}</button>)}
          </div>
        </div>
      ))}
      {guides.map((g, i) => (
        <div key={`g${i}`} className="dock__agent-guide">
          <p>{g.text}</p>
          {g.topic && g.topic !== "other" && g.topic !== "export_md" && <a className="btn btn--sm btn--primary" href="/extension/connect" target="_blank" rel="noreferrer">{Icons.arrow} {t.agent.guides[g.topic]}</a>}
        </div>
      ))}
      {agent.pending.length > 0 && (
        <div className="dock__agent-pending">
          <span className="dock__agent-pending-title">{t.agent.pendingTitle(agent.pending.length)}</span>
          <ul>{agent.pending.map((a, i) => <li key={i}>{will(a)}</li>)}</ul>
          <div className="dock__agent-actions">
            <Button variant="primary" size="sm" disabled={agent.busy} onClick={onConfirm}>{agent.busy ? <span className="spinner spinner--sm" /> : Icons.check} {t.agent.confirm}</Button>
            <Button variant="ghost" size="sm" disabled={agent.busy} onClick={onCancel}>{t.agent.cancel}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface GridActions {
  openItem: (item: InspoItem, opts?: { generate?: boolean }) => void;
  deleteItem: (item: InspoItem) => Promise<void>;
  handleThumbnailUpload: (web: string, file: File) => void;
  handleThumbnailRemove: (web: string) => void;
  toggleFiled: (item: InspoItem, projectId: string, on: boolean) => void;
  createAndFile: (item: InspoItem, name: string) => Promise<void>;
  toggleArea: (item: InspoItem, area: SystemArea, on: boolean) => void;
  toggleAreaIn: (item: InspoItem, projectId: string, area: SystemArea, on: boolean) => void;
  measure: (web: string, ratio: number) => void;
  acceptProposal: (p: TriageProposal) => void;
  patchProposal: (itemId: string, patch: Partial<TriageProposal> | null) => void;
}

/** One card with its handlers bound. Memoised on its own data: moving the camera or another card leaves it alone. */
const Card = memo(function Card({ item, level, ratio, tags, tagJob, score, reason, comments, authorImage, manualThumbnail, designMdLoading, designMd, shot, projects, projectIds, backs, areasIn, proposal, actions }: {
  item: InspoItem; level: ShotLevel; ratio: number; tags: InspoTags | undefined; tagJob: TagStatus | undefined; score: number | undefined; reason: string | undefined;
  /** Inside a project: the areas of its system this reference backs */
  backs?: SystemArea[];
  /** In every project: the areas it backs there */
  areasIn?: Record<string, SystemArea[]>;
  /** While organising the Inbox: the model's proposal for this reference (null = none for it) */
  proposal?: TriageProposal | null;
  comments: InspoComment[] | undefined; authorImage: string | undefined;
  manualThumbnail: string | undefined; designMdLoading: boolean; designMd: DesignIndexEntry | undefined; shot: PageShot | undefined;
  projects: Project[]; projectIds: string[] | undefined;
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
  // The post-its on the part of the page the card shows, as dots where they sit
  const pins = useMemo(() => {
    if (!showsPage) return undefined;
    const shown = Math.min(shot!.shotH, 1440 * ratio);
    return (comments ?? []).filter((c) => c.anchor).map((c) => ({ x: c.anchor!.x, y: (c.anchor!.y * c.anchor!.h) / shown })).filter((p) => p.y <= 1);
  }, [comments, showsPage, shot, ratio]);
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
      onDelete={item.id ? () => act().deleteItem(item) : undefined}
      manualThumbnail={manualThumbnail}
      onUpload={(file) => { act().handleThumbnailUpload(item.web, file); return Promise.resolve(); }}
      onRemoveThumbnail={() => { act().handleThumbnailRemove(item.web); return Promise.resolve(); }}
      onDesignMd={() => act().openItem(item, { generate: true })}
      designMdLoading={designMdLoading}
      designMdReady={designMd !== undefined}
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
      onToggleAreaIn={item.id ? (projectId, area, on) => act().toggleAreaIn(item, projectId, area, on) : undefined}
      proposal={proposal === undefined ? undefined : proposal ? {
        ...proposal,
        projects: projects,
        onAccept: () => act().acceptProposal(proposal),
        onDismiss: () => act().patchProposal(proposal.itemId, null),
        onProject: (projectId) => act().patchProposal(proposal.itemId, { projectId }),
        onArea: (area, on) => act().patchProposal(proposal.itemId, { areas: on ? [...proposal.areas, area] : proposal.areas.filter((a) => a !== area) }),
      } : null}
      board={{ ratio, pins, color: showsPage ? shot!.color : undefined, alternates: showsPage ? alternates : undefined, onMeasure: showsPage ? undefined : onMeasure }}
    />
  );
});
