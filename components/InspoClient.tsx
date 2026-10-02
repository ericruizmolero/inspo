"use client";

import { addInspo, addImage, removeInspo, postComment as postCommentAction, removeComment, editNote as editNoteAction, workspaceOfItem, newProject, editProject, removeProject, setFiled, editTags as editTagsAction } from "@/app/actions/library";
import { authClient } from "@/lib/auth-client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue, memo, type RefObject } from "react";
import { InspoItem, TagMap, TagStatus, InspoTags, CommentMap, CommentAttachment, CommentAnchor, InspoComment, Project, ProjectLinks, DesignIndex, DesignIndexEntry, PageShot } from "@/types/inspo";
import type { ThumbnailMap } from "@/lib/thumbnails";
import { COLORS, viewOf, FACETS } from "@/lib/taxonomy";
import { filtersFromParams, filterKey, LEGACY_PARAMS, filterTest, localScores, queryWords, rankText, isDescriptive, textIndex, vocabulary, norm, type Filter } from "@/lib/search-query";
import Sidebar, { Icons, type QuotaView } from "./Sidebar";
import Island from "./Island";
import SearchBar from "./SearchBar";
import InspoCard from "./InspoCard";
import AddInspoModal, { type NewInspoInput } from "./AddInspoModal";
import { webKeyOf, nameFromHost, typeFromUrl, mediaKindOf, nameFromFile, hasOwnPage } from "@/lib/url";
import { uploadMedia } from "@/lib/media-client";
import PageNotes from "./PageNotes";
import Canvas, { type CanvasHandle, type ShotLevel } from "./Canvas";
import { layoutCanvas, keyOf, TILE_W, DEFAULT_RATIO, CANVAS_MAX_RATIO } from "@/lib/canvas-layout";
import EmptyStart from "./EmptyStart";
import ProjectStart from "./ProjectStart";
import DesignMdToasts, { isDarkSite, type DesignMdState } from "./DesignMdToasts";
import WorkspaceMenu from "./WorkspaceMenu";
import { useActivity } from "./useActivity";
import { useT, messageOf } from "./I18nProvider";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { Button } from "@/components/ui/button";
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
// A video's or a post's own view, in the reference sheet's page card; only loaded when one opens
const VideoPlayer = dynamic(() => import("./VideoPlayer"), { ssr: false });
const PostView = dynamic(() => import("./PostView"), { ssr: false });
const PolishModal = dynamic(() => import("./PolishModal"), { ssr: false });
const SystemModal = dynamic(() => import("./SystemModal"), { ssr: false });
const DirectoryModal = dynamic(() => import("./DirectoryModal"), { ssr: false });
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
const RATIOS_KEY = "inspo:canvas-ratios";
/** What floats over the canvas: the bars on top, the zoom pill at the bottom */
const TOP_DESKTOP = 64;
const TOP_MOBILE = 64;
/** The search dock at the bottom, with the results line over it */
const BOTTOM = 112;

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
  aiEnabled?: boolean;
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
  members?: { name: string; image: string | null }[];
  /** Can see the activity panel (/admin) */
  isAdmin?: boolean;
  /** Each site's stored full-page screenshot (lib/page-shots.ts): what the canvas draws */
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
  const inParam = sp.get("in");
  const space = inParam === "inbox" || (inParam && projects.some((p) => p.id === inParam)) ? inParam : "all";
  const currentProject = projects.find((p) => p.id === space) ?? null;
  const setSpace = useCallback((v: string) => setParams({ in: v }), [setParams]);
  // Adding from inside a project files it there: read at save time, whatever the callback closed over
  const projectRef = useRef<string | null>(null);
  projectRef.current = currentProject?.id ?? null;
  const [confirm, confirmDialog] = useConfirm();

  // The items in the current space (inbox, a project or everything), before any other filter
  const spaceItems = useMemo(() => space === "all" ? items
    : space === "inbox" ? items.filter((i) => !(i.id && links[i.id]?.length))
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

  // Gathers an item's tags again (after a failure, or for a fresh look)
  const retryTags = useCallback(async (web: string) => {
    watch(web);
    const res = await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ web }) }).catch(() => null);
    if (!res?.ok) setTagJobs((prev) => ({ ...prev, [web]: "failed" }));
  }, [watch]);

  // Adds or removes one tag by hand; the edits are the workspace's and outlive a new tagging
  const editTags = useCallback(async (item: InspoItem, change: { add?: string; remove?: string }) => {
    if (!item.id) return;
    const r = await editTagsAction(item.id, change);
    if (!r.ok) { setAddError({ title: t.app.saveFailed, detail: r.error }); return; }
    setTagMap((prev) => (prev[item.web] ? { ...prev, [item.web]: { ...prev[item.web], user: r.data } } : prev));
  }, [t]);

  const [showAdd, setShowAdd] = useState(false);
  const [showPolish, setShowPolish] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
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
  const [showDirectory, setShowDirectory] = useState(false);

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
  const addByUrl = useCallback(async (input: NewInspoInput): Promise<InspoItem | null> => {
    const d = new Date();
    const temp: InspoItem = {
      name: nameFromHost(input.web), web: input.web, type: input.type, note: input.note,
      date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
      addedBy: user.name || user.email,
    };
    setItems((prev) => [temp, ...prev]);
    try {
      const projectId = projectRef.current ?? undefined;
      const r = await addInspo({ web: input.web, type: input.type, note: input.note, projectId });
      if (!r.ok) throw new Error(r.error);
      const item = r.data;
      if (projectId && item.id) setLinks((prev) => ({ ...prev, [item.id!]: [projectId] }));
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
      const projectId = projectRef.current ?? undefined;
      const r = await addImage({ url, fileName: input.file.name, type: input.type, note: input.note, projectId });
      if (!r.ok) throw new Error(r.error);
      const item = r.data;
      if (projectId && item.id) setLinks((prev) => ({ ...prev, [item.id!]: [projectId] }));
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

  // A guest who pasted a URL on the start canvas comes back from login with ?add=<url>:
  // it saves itself and its DESIGN.md opens, as if pasted from inside.
  // The param is removed with the Next router, not history.replaceState: the router
  // keeps its own URL and, on a workspace switch (router.refresh + remount), it
  // restored it with ?add= and the site got added to the second workspace too.
  // Just in case, the handled URL is noted in sessionStorage and not repeated in the tab.
  // And if it comes back with ?directory=1 (pressed "sign in" from the guest directory), the directory opens.
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
    router.replace(window.location.pathname + (params.size ? `?${params}` : ""), { scroll: false });
    if (wantsDirectory) setShowDirectory(true);
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
    const r = await setFiled(projectId, [id], on).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { flip(!on); projectFailed(new Error(r.error)); }
  }, []);
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
    if (!r.ok) { setLinks(prevLinks); projectFailed(new Error(r.error)); }
  }, [links]);
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
  // The panel: one reference open on the right, the canvas still live on the left
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
      // A new DESIGN.md brings the page's capture: the canvas draws it from now on
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

  // ─── Search ─────────────────────────────────────────────────────────────────
  // Three layers, each shown as soon as it is there (lib/search-query.ts):
  // 1. here, every keystroke: chips filter, words match each item's text (tags in both languages, notes, thread);
  // 2. /api/search/semantic, a fraction of a second later: nearness in meaning, any language;
  // 3. /api/search, for descriptive queries: Jev reads the nearest 20 and reorders them.
  // The box answers every key at once; the ranking and the new layout follow when the browser has room
  const searched = useDeferredValue(query);
  const words = useMemo(() => queryWords(searched), [searched]);
  const text = searched.trim();
  const index = useMemo(() => textIndex(items, tagMap, commentMap), [items, tagMap, commentMap]);
  const vocab = useMemo(() => vocabulary(items, tagMap, memberNames), [items, tagMap, memberNames]);
  // The space, through the chips
  const base = useMemo(() => {
    if (!filters.length) return spaceItems;
    const test = filterTest(filters);
    return spaceItems.filter((i) => test(i, tagMap[i.web]));
  }, [spaceItems, tagMap, filters]);
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
  const filtering = filters.length > 0 || words.length > 0;
  const navProps = {
    quota, items,
    isAll: space === "all" && !filtering,
    onReset: resetFilters, onAdd: () => setShowAdd(true), onDirectory: () => setShowDirectory(true),
    space, onSpace: setSpace, projects, links,
    onCreateProject: createProject, onRenameProject: renameProject, onDeleteProject: deleteProject,
  };

  // ─── Canvas ─────────────────────────────────────────────────────────────────
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
    // A site is drawn as its page, cut at the canvas's maximum height, unless someone chose a thumbnail for it
    if (shot && !thumbMap[item.web]) return Math.min(shot.shotH / 1440, CANVAS_MAX_RATIO);
    // Not measured yet: a site will arrive as a tall page, anything else about as a cover
    return ratios[item.web] ?? (mediaKindOf(item.web) === "web" ? 1.5 : DEFAULT_RATIO);
  }, [pageShots, thumbMap, ratios]);

  // Always the automatic layout: columns, newest first. Nobody moves cards by hand (for now).
  const slots = useMemo(() => layoutCanvas(boardItems, undefined, (i) => TILE_W * ratioOf(i)), [boardItems, ratioOf]);

  // What floats over the canvas, so framing keeps clear of it
  const winW = useWindowWidth();
  const desktop = winW >= DESKTOP_MIN;
  const insets = useMemo(() => ({
    top: desktop ? TOP_DESKTOP : TOP_MOBILE,
    left: 0,
    right: 0,
    bottom: BOTTOM,
  }), [desktop]);
  const canvasRef = useRef<CanvasHandle | null>(null);
  // The camera frames the results again when the chips change or a slower layer answers, not on every key
  const fitKey = `${space}|${filters.map(filterKey).join(",")}|${near ? 1 : 0}|${jevScores ? 1 : 0}|${filtering ? filtered.length : -1}`;

  // Presence: which area the person is in right now (read by the /admin panel)
  const area = panelItem ? "design-md" : showDirectory ? "directory" : showAdd ? "add" : filtering ? "search" : "library";
  useActivity(area, workspace.id);

  runDesignMdRef.current = runDesignMd;
  // The cards' handlers, behind one stable ref: a card only re-renders when its own data changes
  const gridActions = useRef<GridActions>(null!);
  gridActions.current = { openItem, deleteItem, handleThumbnailUpload, handleThumbnailRemove, toggleFiled, createAndFile, measure };

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
    if (kind === "post") return <div className="ip-media"><PostView web={panelItem.web} onThumb={(thumb: string) => setThumbMap((prev) => (prev[panelItem.web] ? prev : { ...prev, [panelItem.web]: thumb }))} /></div>;
    const job = designMdJobs[panelItem.web];
    const src = kind === "image"
      ? thumbMap[panelItem.web] ?? panelItem.web
      : job?.entry?.screenshotUrl ?? pageShots[panelItem.web]?.shotUrl ?? thumbMap[panelItem.web] ?? `/api/shot?url=${encodeURIComponent(panelItem.web)}&v=2`;
    const host = (() => { try { return new URL(panelItem.web).hostname.replace(/^www\./, ""); } catch { return panelItem.name; } })();
    return (
      <PageNotes
        key={panelItem.web}
        src={src}
        alt={panelItem.name}
        host={kind === "image" ? panelItem.name : host}
        dark={isDarkSite(job?.entry)}
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
          tags={tagMap[panelItem.web]}
          tagJob={tagJobs[panelItem.web]}
          onRetryTags={() => retryTags(panelItem.web)}
          onEditTags={(change) => editTags(panelItem, change)}
          onTag={(sel) => { if (!filters.some((f) => f.kind === "tag" && f.value === sel)) toggleFilter({ kind: "tag", value: sel }); closePanel(); }}
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
      {showSystem && currentProject && (
        <SystemModal
          project={currentProject}
          board={spaceItems}
          library={items}
          imageOf={(i) => thumbMap[i.web] ?? designMdIndex[i.web]?.coverUrl ?? null}
          onClose={() => setShowSystem(false)}
        />
      )}
      {showPolish && currentProject && (
        <PolishModal
          project={currentProject}
          board={spaceItems}
          library={items}
          tagMap={tagMap}
          imageOf={(i) => thumbMap[i.web] ?? designMdIndex[i.web]?.coverUrl ?? null}
          comments={commentMap}
          hasDesignMd={(web) => web in designMdIndex || designMdJobs[web]?.status === "ready"}
          onDiscard={async (picked) => { for (const i of picked) await toggleFiled(i, currentProject.id, false); }}
          onClose={() => setShowPolish(false)}
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
      {showDirectory && (
        <DirectoryModal
          onClose={() => setShowDirectory(false)}
          onAdd={(web) => { if (!isDuplicate(web)) addByUrl({ web, type: typeFromUrl(web), note: "" }); }}
          isAdded={isDuplicate}
        />
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
          // Already saved: show it on the canvas instead of saving it twice
          if (isDuplicate(web)) { setQuery(nameFromHost(web)); return; }
          addByUrl({ web, type: typeFromUrl(web), note: "" });
        }}
        onAdd={() => setShowAdd(true)}
        onDirectory={() => setShowDirectory(true)}
      />}
      {showAdd && (
        <AddInspoModal
          onClose={() => setShowAdd(false)}
          onSubmit={(input) => { if (input.file) addByUpload({ ...input, file: input.file }); else addByUrl(input); }}
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
            items={items} links={links} projects={projects} space={space} onSpace={setSpace}
            onCreateProject={createProject} onRenameProject={renameProject} onDeleteProject={deleteProject}
            onDirectory={() => setShowDirectory(true)} quota={quota} />
          <Logo size={28} className="topbar__logo" />
          {/* On desktop one white pill, the island's twin on the right; on a phone the two buttons sit in the bar */}
          <div className="topbar__actions">
            {currentProject && (
              <>
                <Button variant="ghost" className="topbar__polish topbar__system" onClick={() => setShowSystem(true)}>{Icons.compass} {t.system.button}</Button>
                <Button variant="ghost" className="topbar__polish" onClick={() => setShowPolish(true)}>{Icons.gem} {t.polish.button}</Button>
              </>
            )}
            {currentProject && <span className="topbar__actions-sep" aria-hidden />}
            <Button variant="icon" className="topbar__add" onClick={() => setShowAdd(true)} aria-label={t.app.add}>{Icons.plus}</Button>
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyStart
            onAddUrl={async (web) => {
              // First inspo: saved and its DESIGN.md opened directly, so the app shows what it does
              const item = await addByUrl({ web, type: typeFromUrl(web), note: "" });
              if (item) runDesignMd(item, { openWhenReady: true });
            }}
            isDuplicate={isDuplicate}
            onDirectory={() => setShowDirectory(true)}
          />
        ) : spaceItems.length === 0 && currentProject ? (
          // An empty project is a starting point: paste a site, or bring references from the library
          <ProjectStart
            key={currentProject.id}
            project={currentProject}
            items={items}
            links={links}
            imageOf={(i) => thumbMap[i.web] ?? designMdIndex[i.web]?.coverUrl ?? null}
            onAddUrl={async (web) => {
              // Already in the library: filed here instead of "already saved"
              const key = webKeyOf(web);
              const saved = items.find((i) => webKeyOf(i.web) === key);
              if (saved) await toggleFiled(saved, currentProject.id, true);
              else await addByUrl({ web, type: typeFromUrl(web), note: "" });
            }}
            onFile={(picked) => fileMany(picked, currentProject.id)}
          />
        ) : spaceItems.length === 0 && space === "inbox" ? (
          <div className="empty">
            <span className="display">{t.projects.inboxEmptyTitle}</span>
            <span>{t.projects.inboxEmptyHint}</span>
          </div>
        ) : (
          <>
            <Canvas
              items={boardItems}
              slots={slots}
              insets={insets}
              fitKey={fitKey}
              focusKey={null}
              handleRef={canvasRef}
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
        {/* The one way to find anything, at the bottom like a conversation: people, dates, kinds, every tag,
            and what it means. Solid and bright in both themes, so it is the first thing the eye finds. */}
        {items.length > 0 && (
          <div className="dock">
            {filtering && (
              <p className="dock__status" role="status" aria-live="polite">
                {t.search.results(filtered.length)}{jevBusy && <span className="dock__status-more"> · {t.search.reading}</span>}
              </p>
            )}
            <SearchBar className="sb--dock" filters={filters} text={query} onFilters={setFilters} onText={setQuery}
              vocab={vocab} busy={searchBusy} gathering={gathering} swatches={swatches} faces={authorImages} />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

interface GridActions {
  openItem: (item: InspoItem, opts?: { generate?: boolean }) => void;
  deleteItem: (item: InspoItem) => Promise<void>;
  handleThumbnailUpload: (web: string, file: File) => void;
  handleThumbnailRemove: (web: string) => void;
  toggleFiled: (item: InspoItem, projectId: string, on: boolean) => void;
  createAndFile: (item: InspoItem, name: string) => Promise<void>;
  measure: (web: string, ratio: number) => void;
}

/** One card with its handlers bound. Memoised on its own data: moving the camera or another card leaves it alone. */
const Card = memo(function Card({ item, level, ratio, tags, tagJob, score, reason, comments, authorImage, manualThumbnail, designMdLoading, designMd, shot, projects, projectIds, actions }: {
  item: InspoItem; level: ShotLevel; ratio: number; tags: InspoTags | undefined; tagJob: TagStatus | undefined; score: number | undefined; reason: string | undefined;
  comments: InspoComment[] | undefined; authorImage: string | undefined;
  manualThumbnail: string | undefined; designMdLoading: boolean; designMd: DesignIndexEntry | undefined; shot: PageShot | undefined;
  projects: Project[]; projectIds: string[] | undefined;
  actions: RefObject<GridActions>;
}) {
  // The handlers are read when used, never kept from this render: the card re-renders only with its own data
  const act = () => actions.current;
  const onMeasure = useCallback((r: number) => actions.current.measure(item.web, r), [actions, item.web]);
  // Under the tile: the note of whoever saved it; with no note, the first reply with text.
  // `people` are everyone in the thread (saver first, then each new voice), at most three circles;
  // `more` counts the replies not already on the line (a lone comment shown as the line is not "1 reply").
  const caption = useMemo(() => {
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
    const more = (comments?.length ?? 0) - (item.note.trim() ? 0 : 1);
    return { ...root, people, more: Math.max(0, more) };
  }, [item.note, item.addedBy, authorImage, comments]);
  // The page's top, at the size it is seen: a site someone gave a thumbnail keeps that thumbnail
  const showsPage = !manualThumbnail && !!shot;
  const key = level === "thumb" ? "thumbUrl" : level === "tile" ? "tileUrl" : "topUrl";
  const page = showsPage ? shot![key] : designMd?.coverUrl;
  // The same page at the other sizes: whichever is already decoded stands in while this one loads
  const alternates = useMemo(() => (shot ? [shot.tileUrl, shot.thumbUrl, shot.topUrl] : undefined), [shot]);
  // The post-its on the part of the page the card shows, as dots where they sit
  const pins = useMemo(() => {
    if (!showsPage) return undefined;
    const shown = Math.min(shot!.shotH, 1440 * CANVAS_MAX_RATIO);
    return (comments ?? []).filter((c) => c.anchor).map((c) => ({ x: c.anchor!.x, y: (c.anchor!.y * c.anchor!.h) / shown })).filter((p) => p.y <= 1);
  }, [comments, showsPage, shot]);
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
      projects={item.id ? projects : undefined}
      projectIds={projectIds}
      onToggleProject={(projectId, on) => act().toggleFiled(item, projectId, on)}
      onCreateProject={(name) => act().createAndFile(item, name)}
      canvas={{ ratio, pins, color: showsPage ? shot!.color : undefined, alternates: showsPage ? alternates : undefined, onMeasure: showsPage ? undefined : onMeasure }}
    />
  );
});
