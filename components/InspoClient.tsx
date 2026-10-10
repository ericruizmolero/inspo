"use client";

import { removeInspo } from "@/app/actions/library";
import { useRouter, useSearchParams } from "next/navigation";

import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import type { InspoItem, Project, ProjectLinks, PolishVote, ItemsPage } from "@/types/inspo";
import { COLORS } from "@/lib/taxonomy";
import { filterKey, newestFirst } from "@/lib/search-query";
import Sidebar, { type QuotaView } from "./Sidebar";
import Connectors from "./Connectors";
import ThemeToggle from "./ThemeToggle";
import Island from "./Island";
import SearchBar from "./SearchBar";
import { Button as CrButton, Busy, EmptyState, IconButton, PillBar, PillBarSep, StatusBar, StatusCell } from "@/components/criterio";
import { captionFor } from "./InspoCard";
import BoardCard, { type GridActions } from "./BoardCard";
import AgentCard from "./AgentCard";
import Toast, { type ToastNote } from "./Toast";
import GatherBar from "./GatherBar";
import InboxZero from "./InboxZero";
import SelectBar from "./SelectBar";
import { refInfoOf } from "@/lib/ref-info";
import { restoreTextHeadings } from "@/lib/text-headings";
import { webKeyOf, nameFromHost, typeFromUrl, mediaKindOf, hasOwnPage } from "@/lib/url";
import type { SystemSpot } from "./RefCriterio";
import RefPage from "./RefPage";
import ProjectModes, { PROJECT_VIEWS } from "./ProjectModes";
import { saveText, renameText } from "@/app/actions/text";
import { useTextBodies } from "@/hooks/use-text-bodies";
import { useUrlSearch } from "@/hooks/use-url-search";
import { useSystems } from "@/hooks/use-systems";
import { usePolishVotes, usePolishTally } from "@/hooks/use-polish-votes";
import { useTagWatch } from "@/hooks/use-tag-watch";
import { useLibraryMirror, useLibrarySync } from "@/hooks/use-library-sync";
import { useAddDialog } from "@/hooks/use-add-dialog";
import { useProjectActions } from "@/hooks/use-project-actions";
import { useAddReferences } from "@/hooks/use-add-references";
import { useComments } from "@/hooks/use-comments";
import { usePanelRoute } from "@/hooks/use-panel-route";
import { useBoardSearch } from "@/hooks/use-board-search";
import { useBoardRatios } from "@/hooks/use-board-ratios";
import { useKeptZoom } from "@/hooks/use-kept-zoom";
import { useWindowWidth } from "@/hooks/use-window-width";
import { useSelection } from "@/hooks/use-selection";
import { useAgent } from "@/hooks/use-agent";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { thumbnailActions } from "./thumbnail-actions";
import Grid, { type GridHandle, type ShotLevel } from "./Grid";
import { leaveBoard, leavePolish } from "./view-morph";
import SoundControl from "./SoundControl";
import ZoomPill from "./ZoomPill";
import { cue } from "@/lib/ui-sounds";
import { keyOf } from "@/lib/board";
import EmptyStart from "./EmptyStart";
import ProjectStart from "./ProjectStart";
import { filledOf, unreadOf, type SystemArea, type SystemSummary } from "@/types/system";
import ProjectChooser from "./ProjectChooser";
import { assignSystemArea, loadSystem } from "@/app/actions/system";
import WorkspaceMenu from "./WorkspaceMenu";
import { preloadTemplates } from "./templates-cache";
import { useActivity } from "./useActivity";
import { useT } from "./I18nProvider";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { afterPaint } from "@/components/ui/liquid";
import { useConfirm } from "./useConfirm";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import Logo from "@/components/Logo";
import dynamic from "next/dynamic";

// Opened by a click or a shortcut, never on the first paint: each loads on its own, and the panel (the
// most used) is fetched once the page is idle, so the first click doesn't wait for it
const loadItemPanel = () => import("./ItemPanel");
const loadCommentsPanel = () => import("./CommentsPanel");
const ItemPanel = dynamic(loadItemPanel, { ssr: false });
const CommentsPanel = dynamic(loadCommentsPanel, { ssr: false });
const SystemView = dynamic(() => import("./SystemView"), { ssr: false });
const PolishView = dynamic(() => import("./PolishView"), { ssr: false });
const RefCriterio = dynamic(() => import("./RefCriterio"), { ssr: false });
const CommandPalette = dynamic(() => import("./CommandPalette"), { ssr: false });
// Discover and its templates only show in their own space (still server-rendered when a link lands there),
// the add dialog only once opened
const Discover = dynamic(() => import("./Discover"));
const TemplatesView = dynamic(() => import("./TemplatesView"));
const AddInspoModal = dynamic(() => import("./AddInspoModal"), { ssr: false });

const DESKTOP_MIN = 801;
/** What floats over the board: the bars on top, the search dock at the bottom */
const TOP_DESKTOP = 64;
const TOP_MOBILE = 64;
/** The search dock at the bottom, with the results line over it */
const BOTTOM = 112;
/** The same edge where there is no dock (the library, the inbox) */
const BOTTOM_BARE = 24;

export default function InspoClient({
  first,
  stamp,
  since,
  bell,
  initialProjects = [],
  initialProjectLinks = {},
  initialSummaries = {},
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
  /** What the views around each project's system read of it, by project id (lib/system/areas.ts loadSystemSummaries) */
  initialSummaries?: Record<string, SystemSummary>;
  aiEnabled?: boolean;
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
  members?: { id: string; name: string; image: string | null }[];
  /** Can see the activity panel (/admin) */
  isAdmin?: boolean;
}) {
  const { t, locale } = useT();
  const { setMirror, items, thumbMap, tagMap, tagJobs, pageShots, designMdIndex, signed, commentMap, setItems, setThumbMap, setTagMap, setTagJobs, setCommentMap } = useLibraryMirror(first);
  const sp = useSearchParams();
  const { filters, query, setQuery, setParams, setFilters, toggleFilter, resetFilters } = useUrlSearch(sp);

  // ─── Projects ──────────────────────────────────────────────────────────────
  // ?in=inbox (not filed anywhere) or ?in=<project id>; no param = everything. Filters apply inside the space.
  const [projects, setProjects] = useState(initialProjects);
  const [links, setLinks] = useState<ProjectLinks>(initialProjectLinks);
  // A notice up top: what failed, or (ok) what an import brought
  const [toast, setToast] = useState<ToastNote | null>(null);
  // Projects change on screen first; if the server says no, they go back with a notice
  const projectFailed = (e: unknown) => setToast({ title: t.projects.saveFailed, detail: e instanceof Error ? e.message : String(e) });
  const { systems, fullSystems, setSystem, refreshSystem } = useSystems(initialSummaries);
  const { votes, setVotes, voteWrites, withVoteWrites, solo, castVote, closePolishOf, restoreToProject } = usePolishVotes({ initialPolishVotes, user, members, setLinks, refreshSystem, projectFailed });
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
  // Which areas of the current project's system each reference backs (for the card's "to the system")
  const backsByItem = useMemo(() => {
    const m = new Map<string, SystemArea[]>();
    for (const a of currentSystem?.areas ?? []) for (const id of a.evidence) m.set(id, [...(m.get(id) ?? []), a.area]);
    return m;
  }, [currentSystem]);
  const backsOf = useCallback((id: string) => backsByItem.get(id) ?? EMPTY_AREAS, [backsByItem]);
  // The same in every project: which areas each reference backs, project by project (the folder button's areas)
  const areasByItem = useMemo(() => {
    const m = new Map<string, Record<string, SystemArea[]>>();
    for (const [pid, sys] of Object.entries(systems)) for (const a of sys?.areas ?? []) for (const id of a.evidence) {
      const rec = m.get(id) ?? {};
      rec[pid] = [...(rec[pid] ?? []), a.area];
      m.set(id, rec);
    }
    return m;
  }, [systems]);
  const systemFilled = filledOf(currentSystem ?? undefined);
  const systemStale = useMemo(() => {
    if (!currentProject || !currentSystem?.read) return 0;
    const boardIds = items.filter((i) => i.id && links[i.id]?.includes(currentProject.id)).map((i) => i.id!);
    return unreadOf(currentSystem, boardIds);
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

  const { watch, gathering } = useTagWatch({ items, tagJobs, setTagJobs, setTagMap });
  const { bellNews, beatRef, filling } = useLibrarySync({ first, stamp, since, bell, workspace, items, setMirror, setProjects, setLinks, setVotes, withVoteWrites, watch });

  const { showAdd, setShowAdd, addInitial, setAddInitial, boardDrag } = useAddDialog({ t, setToast });
  const gridRef = useRef<GridHandle | null>(null);
  // The directory is Discover's resources: every "open the directory" lands there
  const openDirectory = useCallback(() => setSpace("discover"), [setSpace]);
  useEffect(() => {
    if (!toast) return;
    cue(toast.ok ? "success" : "error");
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const { createProject, importBoard, renameProject, deleteProject, toggleFiled, startSystem, fileMany, createAndFile, setClient, saveBrief, describe } = useProjectActions({ t, projects, setProjects, links, setLinks, space, currentProject, confirm, setParams, setSpace, setItems, setToast, watch, refreshSystem, voteWrites, setVotes, projectFailed });
  const { handleThumbnailUpload, cardCopy, handleThumbnailRemove } = thumbnailActions(setThumbMap);
  const router = useRouter();
  const { isDuplicate, addByUrl, addByUpload, addByText, arrivingBoard } = useAddReferences({ user, workspace, t, items, setItems, setLinks, setThumbMap, saveTargetRef, refreshSystem, setSystem, watch, cardCopy, projectFailed, importBoard, router, setToast });

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

  // ─── Plan and quotas ───────────────────────────────────────────────────────
  // Arrives from the server with the page; re-read after a search that spent quota and whenever the island's menu opens
  const [quota, setQuota] = useState<QuotaView | null>(initialQuota);
  const loadQuota = useCallback(() => {
    fetch("/api/plan").then((r) => (r.ok ? r.json() : null)).then((q) => { if (q) setQuota(q); }).catch(() => {});
  }, []);

  // The panel: one reference open on the right, the board still live on the left
  const [panelItem, setPanelItem] = useState<InspoItem | null>(null);
  const { postComment, editNote, deleteComment } = useComments({ t, commentMap, setCommentMap, setItems, setPanelItem, confirm });

  useEffect(() => {
    // The templates too: Discover opens with its cards already read, not waiting for the server
    const preload = () => { void loadItemPanel(); void loadCommentsPanel(); void preloadTemplates(workspace.id); };
    if (typeof window.requestIdleCallback !== "function") { const id = setTimeout(preload, 2000); return () => clearTimeout(id); }
    const id = window.requestIdleCallback(preload, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }, [workspace.id]);
  const { paletteOpen, setPaletteOpen, paletteUsed } = useCommandPalette();
  const { showPanel, closePanel, openItem, pushedRef } = usePanelRoute({ items, filling, panelItem, setPanelItem, workspace, router });

  // "Who": only workspace members who added something. Legacy sheet labels
  // ("Both" = no known author) aren't offered as a filter; those sites stay under "all".
  const memberNames = useMemo(() => members.map((m) => m.name), [members]);
  const authorImages = useMemo(() => Object.fromEntries(members.filter((m) => m.image).map((m) => [m.name, m.image!])), [members]);

  // Desktop has no sidebar: the island in the top bar holds the projects and the workspace menu. A phone keeps
  // the sidebar as a sheet behind the menu button.
  const isMobile = useIsMobile();

  const { text, words, chips, filtered, jevScores, reasons, vocab, searchBusy, jevBusy } = useBoardSearch({ searchHere, query, filters, items, tagMap, commentMap, memberNames, spaceItems, aiEnabled, loadQuota, t });

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

  const { polishVotes, polishTab, panelForgotten } = usePolishTally({ votes, currentProject, spaceItems, panelItem, links, projects, members, user, locale });

  const { measure, ratioOf } = useBoardRatios(pageShots, thumbMap);

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
  const signedOf = useCallback((u: string | null) => (u && signed[u]) || u, [signed]);
  const smallImageOf = useCallback((i: InspoItem) => signedOf(thumbMap[i.web] ?? designMdIndex[i.web]?.coverUrl ?? pageShots[i.web]?.tileUrl ?? null), [signedOf, thumbMap, designMdIndex, pageShots]);
  // The same choice a card makes on the board, at the smallest stored size: a project's cover is its board from afar
  const miniImageOf = useCallback((i: InspoItem) => signedOf(thumbMap[i.web] ?? pageShots[i.web]?.thumbUrl ?? designMdIndex[i.web]?.coverUrl ?? null), [signedOf, thumbMap, designMdIndex, pageShots]);
  const [zoom, setZoom] = useKeptZoom();

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
  beatRef.current = useActivity(area, workspace.id, { carried: true });

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
  const { selected, bar, setBar, selectItem, clearSelection, selectAll, selectionIn, fileSelection, moveSelection, removeSelection, deleteSelection, createForSelection } = useSelection({ t, items, setItems, setThumbMap, boardItems, space, projectView, links, setLinks, currentProject, confirm, refreshSystem, projectFailed, setToast, createProject });

  gridActions.current = { select: selectItem, openItem, deleteItem, handleThumbnailUpload, handleThumbnailRemove, toggleFiled, createAndFile, toggleArea, measure };

  const [openArea, setOpenArea] = useState<SystemArea | null>(null);
  const [focusArea, setFocusArea] = useState<{ area: SystemArea; n: number } | null>(null);
  const [focusRef, setFocusRef] = useState<{ code: string; n: number } | null>(null);
  const { agent, setAgent, agentSpeaks, agentTargetItem, setAgentTarget, agentQuick, askAgent, undoAgent, confirmAgent } = useAgent({ t, items, projects, links, currentProject, space, projectView, panelItem, filtered, searchHere, openArea, setFocusArea, setProjects, setLinks, setItems, setSystem, setQuery, setSpace, setProjectView, saveTarget });

  // The open reference: its thread, every comment with its replies (the post-its once pinned on the page among them)
  const panelComments = (panelItem?.id ? commentMap[panelItem.id] : undefined) ?? [];
  const canManage = workspace.role === "owner" || workspace.role === "admin";

  // What the open reference writes in criterio.md: in the project open, or else the first one it is in. A text is
  // the file's Content, typed in its own page; one in no project is in no file yet
  const panelProject = panelItem?.id && mediaKindOf(panelItem.web) !== "text"
    ? (currentProject && links[panelItem.id]?.includes(currentProject.id) ? currentProject : projects.find((p) => links[panelItem.id!]?.includes(p.id))) ?? null
    : null;
  // The system view and the sheet's criterio read the whole system: asked for once, when its project or a sheet in
  // it opens, so the system view opens on it instead of on empty areas
  const wantSystem = [currentProject?.id, panelProject?.id].find((id): id is string => !!id && !fullSystems[id]) ?? null;
  useEffect(() => {
    if (!wantSystem) return;
    let alive = true;
    loadSystem(wantSystem).then((r) => { if (alive && r.ok) setSystem(wantSystem, r.data.system); }).catch(() => { /* opened without it; the system view reads it on its own */ });
    return () => { alive = false; };
  }, [wantSystem, setSystem]);
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
    <BoardCard
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
      signedThumbnail={signed[thumbMap[item.web] ?? item.web]}
      designMd={designMdIndex[item.web]}
      signedCover={signed[designMdIndex[item.web]?.coverUrl ?? ""]}
      signedScroll={signed[designMdIndex[item.web]?.scrollUrl ?? ""]}
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
  ), [workspace.name, ratioOf, tagMap, tagJobs, jevScores, reasons, commentMap, authorImages, thumbMap, signed, designMdIndex, pageShots, projects, links, currentProject, backsOf, areasByItem, selected, canManage, user]);

  return (
    <SidebarProvider defaultOpen={false} className="shell">
      {confirmDialog}
      {panelItem && (
        <ItemPanel
          item={panelItem}
          isSite={hasOwnPage(panelItem.web)}
          page={panelItem.id ? <RefPage panelItem={panelItem} textBodies={textBodies} saveTextBody={saveTextBody} renameTextItem={renameTextItem} setThumbMap={setThumbMap} pageShots={pageShots} thumbMap={thumbMap} /> : null}
          criterio={panelItem.id && panelProject && fullSystems[panelProject.id] ? (
            <RefCriterio item={panelItem} project={panelProject} system={fullSystems[panelProject.id]} library={items} boardIds={panelBoardIds}
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
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
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
            items={items} links={links} projects={projects} systems={systems} space={space} onSpace={setSpace} bellNews={bellNews}
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
                  <ProjectModes projectView={projectView} polishTab={polishTab} solo={solo} members={members} systemFilled={systemFilled} systemStale={systemStale}
                    onChange={(i) => { leaveView(PROJECT_VIEWS[i]); afterPaint(() => setProjectView(PROJECT_VIEWS[i])); }} />
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
            system={fullSystems[currentProject.id] ?? null}
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
            onClient={(itemId) => setClient(currentProject.id, itemId)}
            // criterio.md is built from project.brief and project.intent: both follow the save, no reload
            onBrief={(patch) => saveBrief(currentProject.id, patch)}
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
            onDescribe={(about) => describe(currentProject.id, about)}
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
              largeImageOf={(item) => signedOf(thumbMap[item.web] ?? pageShots[item.web]?.topUrl ?? null) ?? smallImageOf(item)}
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
