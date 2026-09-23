"use client";

import { addInspo, removeInspo, postComment as postCommentAction, removeComment, workspaceOfItem } from "@/app/actions/library";
import { authClient } from "@/lib/auth-client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { flushSync } from "react-dom";
import { InspoItem, FilterType, FilterAuthor, FilterDate, TagMap, InspoTags, CommentMap, CommentAttachment } from "@/types/inspo";
import type { ThumbnailMap } from "@/lib/thumbnails";
import { TAG_THRESHOLD, TAXONOMY_VERSION } from "@/lib/taxonomy";
import Sidebar, { SearchBox, Icons, TaggingState, TYPES, DATES, type QuotaView } from "./Sidebar";
import FilterBar from "./FilterBar";
import InspoCard from "./InspoCard";
import AddInspoModal, { type NewInspoInput } from "./AddInspoModal";
import { webKeyOf, nameFromHost, typeFromUrl } from "@/lib/url";
import DesignMdModal from "./DesignMdModal";
import DirectoryModal from "./DirectoryModal";
import EmptyStart from "./EmptyStart";
import CommentsPanel from "./CommentsPanel";
import { proxiedSrc } from "@/lib/proxied-src";
import DesignMdToasts, { type DesignMdState } from "./DesignMdToasts";
import WorkspaceMenu from "./WorkspaceMenu";
import { useActivity } from "./useActivity";
import { useT } from "./I18nProvider";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CommandPalette from "./CommandPalette";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Logo from "@/components/Logo";

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

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Saving a new site kicks off the full experience (screenshot, tags and
// DESIGN.md). Videos and social posts have no design system to extract.
const NO_DESIGN_MD = ["youtube.com", "youtu.be", "vimeo.com", "x.com", "twitter.com", "instagram.com", "linkedin.com", "tiktok.com", "primevideo.com", "netflix.com"];
interface RunDesignMdOpts {
  force?: boolean;         // regenerate even if it exists (costs money, admins only)
  quiet?: boolean;         // cache expected: the toast only shows if it takes a while
  openWhenReady?: boolean; // open the sheet on its own when done
}

function canAutoDesignMd(web: string): boolean {
  try {
    const host = new URL(web).hostname.replace(/^www\./, "");
    return !NO_DESIGN_MD.some((d) => host === d || host.endsWith(`.${d}`));
  } catch { return false; }
}

const SIDEBAR_W = 256;
const DESKTOP_MIN = 801;
const RATIOS_KEY = "inspo:card-ratios";
// Card height/width before measuring (the placeholder is 4:3) and gap between cards.
const DEFAULT_RATIO = 0.75;
const GAP_RATIO = 0.06;

// Columns from the usable content width (window minus sidebar on desktop).
// Computed synchronously so collapsing the sidebar and reflowing the cards
// happen in the same render and GSAP Flip can animate it in one go.
function useColumnCount(collapsed: boolean) {
  const [winW, setWinW] = useState(0);
  useEffect(() => {
    const update = () => setWinW(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return useMemo(() => {
    if (!winW) return 4;
    const desktop = winW >= DESKTOP_MIN;
    const w = desktop ? winW - (collapsed ? 0 : SIDEBAR_W) : winW;
    if (!desktop && w <= 520) return 1;
    if (w <= 644) return 2;
    if (w <= 1144) return 3;
    if (w <= 1644) return 4;
    return 5;
  }, [winW, collapsed]);
}


// Jev scores conservatively: we show what scores above 0.4 and, if that's few,
// at least the top 8 as long as they're above 0.3.
function aiCutoff(scores: Record<string, number>) {
  const sorted = Object.values(scores).sort((a, b) => b - a);
  return Math.max(0.3, Math.min(0.4, sorted[7] ?? 0));
}

export default function InspoClient({
  items: initialItems,
  initialThumbnailMap = {},
  initialTagMap = {},
  aiEnabled = false,
  user,
  workspace,
  workspaces,
  members = [],
  isAdmin = false,
  initialQuota = null,
  initialComments = {},
  initialDesignMdIndex = {},
  initialSidebarOpen = true,
}: {
  items: InspoItem[];
  initialQuota?: QuotaView | null;
  initialComments?: CommentMap;
  initialDesignMdIndex?: Record<string, { coverUrl?: string; scrollUrl?: string }>;
  initialThumbnailMap?: ThumbnailMap;
  initialTagMap?: TagMap;
  aiEnabled?: boolean;
  user: SessionUser;
  workspace: Workspace;
  workspaces: Workspace[];
  members?: { name: string; image: string | null }[];
  /** Can see the activity panel (/admin) */
  isAdmin?: boolean;
  /** Saved sidebar state, read from the sidebar_state cookie on the server */
  initialSidebarOpen?: boolean;
}) {
  const { t } = useT();
  const [items, setItems] = useState(initialItems);
  // Filters live in the URL (?tipo=&autor=&fecha=&sector=&estilo=&tags=a,b&q=): a filtered view can be
  // shared and Back undoes a filter. history.pushState/replaceState sync with useSearchParams without a navigation.
  const sp = useSearchParams();
  const typeParam = sp.get("type") as FilterType | null;
  const type: FilterType = typeParam && TYPES.includes(typeParam as InspoItem["type"]) ? typeParam : "all";
  const dateParam = sp.get("date") as FilterDate | null;
  const date: FilterDate = dateParam && DATES.includes(dateParam as (typeof DATES)[number]) ? dateParam : "all";
  const author: FilterAuthor = sp.get("author") || "all";
  const sector = sp.get("sector") || "all";
  const style = sp.get("style") || "all";
  // The search box keeps its own state (a controlled input can't wait for the router) and copies itself into ?q=
  const [query, setQueryState] = useState(() => sp.get("q") ?? "");
  const tagsParam = sp.get("tags") ?? "";
  const selTags = useMemo(() => tagsParam.split(",").filter(Boolean), [tagsParam]);
  // "all" and "" drop the key. Typing replaces the entry; every other change adds one, so Back undoes it.
  const setParams = useCallback((patch: Record<string, string>, replace = false) => {
    const p = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) { if (v && v !== "all") p.set(k, v); else p.delete(k); }
    const url = window.location.pathname + (p.size ? `?${p}` : "");
    if (replace) window.history.replaceState(null, "", url); else window.history.pushState(null, "", url);
  }, []);
  const setType = useCallback((v: FilterType) => setParams({ type: v }), [setParams]);
  const setAuthor = useCallback((v: FilterAuthor) => setParams({ author: v }), [setParams]);
  const setDate = useCallback((v: FilterDate) => setParams({ date: v }), [setParams]);
  const setSector = useCallback((v: string) => setParams({ sector: v }), [setParams]);
  const setStyle = useCallback((v: string) => setParams({ style: v }), [setParams]);
  const setQuery = useCallback((v: string) => { setQueryState(v); setParams({ q: v }, true); }, [setParams]);
  const [thumbMap, setThumbMap] = useState<ThumbnailMap>(initialThumbnailMap);

  // ─── AI: tags and search ────────────────────────────────────────────────────
  const [tagMap, setTagMap] = useState<TagMap>(initialTagMap);
  // No "normal" mode: if Jev is configured, search is always AI
  const ai = aiEnabled;
  const [aiScores, setAiScores] = useState<Record<string, number> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasons, setAiReasons] = useState<Record<string, string> | null>(null);
  const [aiError, setAiError] = useState("");
  const [tagging, setTagging] = useState<TaggingState>({ running: false, done: 0, total: 0 });

  const pending = useMemo(
    () => items.filter((i) => !tagMap[i.web] || tagMap[i.web].v !== TAXONOMY_VERSION).length,
    [items, tagMap]
  );

  const toggleTag = useCallback((k: string) => {
    setParams({ tags: (selTags.includes(k) ? selTags.filter((x) => x !== k) : [...selTags, k]).join(",") });
  }, [selTags, setParams]);

  // AI search: debounce and call /api/search
  const aiQuery = ai ? query.trim() : "";
  useEffect(() => {
    if (!aiEnabled || aiQuery.length < 3) { setAiScores(null); setAiLoading(false); setAiError(""); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setAiLoading(true); setAiError("");
      try {
        const res = await fetch("/api/search", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: aiQuery }), signal: ctrl.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        setAiScores(data.scores);
        if (!data.cached) loadQuota();
        setAiReasons(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setAiError(String((e as Error).message ?? e));
      } finally {
        if (!ctrl.signal.aborted) setAiLoading(false);
      }
    }, 900);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [aiQuery, aiEnabled]);

  // Why each result: Claude writes one sentence per visible item (once scores are in)
  useEffect(() => {
    if (!aiScores || !aiQuery) { setAiReasons(null); return; }
    const cutoff = aiCutoff(aiScores);
    const results = Object.entries(aiScores)
      .filter(([, s]) => s >= cutoff)
      .sort((a, b) => b[1] - a[1]).slice(0, 40)
      .map(([web, score]) => ({ web, score }));
    if (!results.length) return;
    const ctrl = new AbortController();
    fetch("/api/explain", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: aiQuery, results }), signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.reasons) setAiReasons(d.reasons); })
      .catch(() => {});
    return () => ctrl.abort();
  }, [aiScores, aiQuery]);

  // Tags a newly added item (no PIN; the server checks it is in the sheet)
  const tagOne = useCallback(async (web: string) => {
    if (!aiEnabled) return;
    try {
      const res = await fetch("/api/tags", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ web }),
      });
      if (!res.ok) return;
      const { tags } = (await res.json()) as { tags: InspoTags };
      setTagMap((prev) => ({ ...prev, [web]: tags }));
    } catch { /* stays pending */ }
  }, [aiEnabled]);

  // Batch tagging of pending items (workspace admins only), in rounds until done
  const tagAll = async () => {
    const total = pending;
    setTagging({ running: true, done: 0, total });
    let done = 0;
    try {
      for (let guard = 0; guard < 40; guard++) {
        const res = await fetch("/api/tags", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        setTagMap((prev) => ({ ...prev, ...data.map }));
        done += data.done;
        setTagging({ running: true, done, total });
        if (data.remaining <= 0 || data.done === 0) break;
      }
      setTagging({ running: false, done, total });
    } catch (e) {
      setTagging({ running: false, done, total, error: String((e as Error).message ?? e) });
    }
  };
  const [showAdd, setShowAdd] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (document.querySelector(".modal-backdrop, .dm, .cp")) return; // something open on top
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
      const r = await addInspo({ web: input.web, type: input.type, note: input.note });
      if (!r.ok) throw new Error(r.error);
      const item = r.data;
      setItems((prev) => prev.map((i) => (i === temp ? item : i)));
      // Full experience from the start: tags and DESIGN.md without asking
      tagOne(item.web);
      if (canAutoDesignMd(item.web)) runDesignMdRef.current(item);
      return item;
    } catch (e) {
      setItems((prev) => prev.filter((i) => i !== temp));
      setAddError({ title: t.app.saveFailed, detail: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }, [user, tagOne]);

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

  // ─── Plan and quotas ───────────────────────────────────────────────────────
  // Arrives from the server with the page; re-read after spending quota (a new DESIGN.md)
  const [quota, setQuota] = useState<QuotaView | null>(initialQuota);
  const loadQuota = useCallback(() => {
    fetch("/api/plan").then((r) => (r.ok ? r.json() : null)).then((q) => { if (q) setQuota(q); }).catch(() => {});
  }, []);

  // ─── Comments ──────────────────────────────────────────────────────────────
  const [commentMap, setCommentMap] = useState<CommentMap>(initialComments);
  const [commentsItemId, setCommentsItemId] = useState<string | null>(null);
  const loadComments = useCallback(async () => {
    try {
      const res = await fetch("/api/comments");
      if (res.ok) setCommentMap(await res.json());
    } catch { /* offline: retried on the next cycle */ }
  }, []);
  // With the thread in view (drawer or sheet column), refresh every 20 s to see what others write
  const [designMdItem, setDesignMdItem] = useState<InspoItem | null>(null);
  useEffect(() => {
    if (!commentsItemId && !designMdItem) return;
    const t = setInterval(loadComments, 20000);
    return () => clearInterval(t);
  }, [commentsItemId, designMdItem, loadComments]);
  const commentsItem = useMemo(() => items.find((i) => i.id === commentsItemId) ?? null, [items, commentsItemId]);
  const postComment = async (itemId: string, body: string, attachments: CommentAttachment[]) => {
    const r = await postCommentAction(itemId, body, attachments);
    if (!r.ok) throw new Error(r.error);
    setCommentMap((prev) => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), r.data] }));
  };
  const deleteComment = async (itemId: string, id: string) => {
    const r = await removeComment(id).catch(() => null);
    if (r?.ok) setCommentMap((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? []).filter((c) => c.id !== id) }));
  };
  const [designMdJobs, setDesignMdJobs] = useState<Record<string, DesignMdState>>({});
  // Index of DESIGN.md already generated: server + those finished this session
  const [designMdIndex, setDesignMdIndex] = useState(initialDesignMdIndex);

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


  // ─── DESIGN.md ────────────────────────────────────────────────────────────
  // Generation lives here, not in the modal. The sheet only opens once the
  // DESIGN.md exists; while generating, everything happens in the bottom-right
  // toast (progress, Stop, Done). There is no loading screen in between.
  const patchJob = (url: string, patch: Partial<DesignMdState>) =>
    setDesignMdJobs((prev) => ({ ...prev, [url]: { ...prev[url], ...patch } }));
  const dropJob = (url: string) =>
    setDesignMdJobs((prev) => { const next = { ...prev }; delete next[url]; return next; });

  // One in-flight request per URL: stop = abort the fetch (the server closes Chromium
  // and cuts Claude off when the last client leaves) and also send DELETE just in case.
  // The sheet carries the thread in a column: opening it closes the comments drawer if open
  // Each open DESIGN.md has its own URL (/i/<id>): it can be shared, and Back closes it.
  // The URL changes with history.pushState, which Next syncs with usePathname without a navigation.
  const pushedRef = useRef(false);
  const showDesignMd = (item: InspoItem) => {
    setDesignMdItem(item); setCommentsItemId(null);
    if (item.id && window.location.pathname !== `/i/${item.id}`) {
      window.history.pushState(null, "", `/i/${item.id}${window.location.search}`);
      pushedRef.current = true;
    }
  };
  const closeDesignMd = () => {
    if (!window.location.pathname.startsWith("/i/")) { setDesignMdItem(null); return; }
    // Opened here: step back, so Back and close do the same. Opened from a shared link: go to the library.
    if (pushedRef.current) { window.history.back(); return; }
    window.history.replaceState(null, "", `/${window.location.search}`);
    setDesignMdItem(null);
  };
  const designMdCtrls = useRef(new Map<string, AbortController>());
  const designMdItemRef = useRef<InspoItem | null>(null);

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
      patchJob(url, { status: "ready", entry: body, error: undefined });
      setDesignMdIndex((prev) => ({ ...prev, [url]: { coverUrl: body.coverUrl, scrollUrl: body.scrollUrl } }));
      if (!body.cached) loadQuota();
      // Open on its own only if no other sheet is in front; if there is, the "Done" toast stays
      if (opts.openWhenReady && !designMdItemRef.current) showDesignMd(item);
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

  // The sheet only opens if the DESIGN.md exists (in session or on the server).
  // If it needs generating, it runs in the background and the bottom-right toast reports.
  const openDesignMd = (item: InspoItem) => {
    const job = designMdJobs[item.web];
    if (job?.status === "ready") { showDesignMd(item); return; }
    if (job?.status === "loading") return; // already running, the toast shows it
    if (item.web in designMdIndex) {
      // Exists on the server: fetched from cache (near instant) and opened on arrival
      runDesignMd(item, { quiet: true, openWhenReady: true });
      return;
    }
    runDesignMd(item);
  };

  const openDesignMdByUrl = (url: string) => {
    const item = items.find((i) => i.web === url);
    if (item) openDesignMd(item);
  };
  const retryDesignMdByUrl = (url: string) => {
    const item = items.find((i) => i.web === url);
    if (item) runDesignMd(item, { openWhenReady: true });
  };

  // Regenerating costs money: the server only allows it for workspace admins.
  // The sheet closes and the toast carries the process; when done, the new sheet opens on its own.
  const regenerateDesignMd = (item: InspoItem) => {
    closeDesignMd();
    runDesignMd(item, { force: true, openWhenReady: true });
  };
  designMdItemRef.current = designMdItem;

  // Cmd+K (Ctrl+K) opens the command palette from anywhere in the library
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The path decides what is open: Back or Forward move between the library and a DESIGN.md,
  // and a shared /i/<id> link opens that inspiration when the library loads
  const pathname = usePathname();
  useEffect(() => {
    const id = pathname.match(/^\/i\/([^/]+)/)?.[1];
    if (!id) {
      if (designMdItemRef.current) { pushedRef.current = false; setDesignMdItem(null); }
      return;
    }
    if (designMdItemRef.current?.id === id) return;
    const item = items.find((i) => i.id === id);
    if (item) { openDesignMd(item); return; }
    // Not in this workspace: if it is in another one of mine, switch to it; the library remounts and opens it
    workspaceOfItem(id).then(async (r) => {
      if (!r.ok || !r.data || r.data === workspace.id) return;
      await authClient.organization.setActive({ organizationId: r.data });
      router.refresh();
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on path changes only
  }, [pathname]);

  // Whatever shows in the modal counts as seen
  useEffect(() => {
    const url = designMdItem?.web;
    if (!url) return;
    const job = designMdJobs[url];
    if (job && job.status !== "loading" && !job.seen) patchJob(url, { seen: true });
  }, [designMdItem, designMdJobs]);

  // "Who": only workspace members who added something. Legacy sheet labels
  // ("Both" = no known author) aren't offered as a filter; those sites stay under "all".
  const memberNames = useMemo(() => members.map((m) => m.name), [members]);
  const authorImages = useMemo(() => Object.fromEntries(members.filter((m) => m.image).map((m) => [m.name, m.image!])), [members]);
  const authors = useMemo(() => {
    const used = new Set(items.map((i) => i.addedBy).filter(Boolean));
    return memberNames.filter((n) => used.has(n));
  }, [items, memberNames]);

  const resetFilters = useCallback(() => {
    setQueryState("");
    setParams({ type: "", author: "", date: "", q: "", sector: "", style: "", tags: "" });
  }, [setParams]);

  // Collapsible sidebar (desktop only). SidebarProvider saves it in a cookie that the server reads
  const [collapsed, setCollapsed] = useState(!initialSidebarOpen);
  // shadcn's SidebarProvider asks for the change (trigger, rail or Cmd+B); the cards follow with GSAP Flip
  // while the sidebar slides with a CSS transition of the same length and curve
  const setSidebarOpen = (open: boolean) => {
    if (open === !collapsed) return;
    gsap.registerPlugin(Flip);
    // Grid cards and empty-screen blocks (data-flip) move in unison
    const targets = [".card-item", "[data-flip]"];
    const state = Flip.getState(targets);
    const next = !open;
    flushSync(() => setCollapsed(next));
    Flip.from(state, {
      targets,
      duration: 0.55,
      ease: "power3.inOut",
      scale: true,
      absolute: false,
      onComplete: () => gsap.set(targets, { clearProps: "transform" }),
    });
  };

  const numCols = useColumnCount(collapsed);
  // On a phone the same trigger opens the menu sheet, so it says so
  const isMobile = useIsMobile();
  const triggerLabel = isMobile ? t.app.menu : collapsed ? t.app.showSidebar : t.app.hideSidebar;
  const gridRef = useRef<HTMLElement>(null);
  const isMount = useRef(true);

  const filtered = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const q = normalize(query.trim());
    const useAi = !!aiScores && ai && query.trim().length >= 3;
    const cutoff = useAi ? aiCutoff(aiScores!) : 0;

    return [...items]
      .sort((a, b) => useAi
        ? (aiScores![b.web] ?? 0) - (aiScores![a.web] ?? 0)
        : parseDate(b.date) - parseDate(a.date))
      .filter((item) => {
        const t = tagMap[item.web];
        if (sector !== "all" && t?.sector !== sector) return false;
        if (style !== "all" && t?.style !== style) return false;
        if (selTags.length && !selTags.every((k) => (t?.tags[k] ?? 0) >= TAG_THRESHOLD)) return false;
        if (useAi) {
          if ((aiScores![item.web] ?? 0) < cutoff) return false;
        }
        if (type !== "all" && item.type !== type) return false;
        if (author !== "all" && item.addedBy !== author) return false;
        if (date !== "all") {
          const ts = parseDate(item.date);
          if (ts === 0) return false;
          const d = new Date(ts);
          if (date === "thisYear" && d.getFullYear() !== thisYear) return false;
          if (date === "thisMonth" && (d.getFullYear() !== thisYear || d.getMonth() !== thisMonth)) return false;
        }
        if (q && !useAi) {
          const haystack = normalize([item.name, item.note, item.subNote ?? "", item.web].join(" "));
          if (!haystack.includes(q)) return false;
        }
        return true;
      });
  }, [items, type, author, date, query, tagMap, sector, style, selTags, ai, aiScores]);

  // Best match among visible results (for the AI search header)
  const aiTop = useMemo(
    () => (ai && aiScores ? filtered.reduce((m, it) => Math.max(m, aiScores[it.web] ?? 0), 0) : 0),
    [filtered, ai, aiScores],
  );

  // Real masonry: each card goes to the shortest column by its measured height
  // (height/width, so it doesn't depend on column width). Measurements are cached in
  // localStorage so the second visit loads already balanced.
  const ratiosRef = useRef<Record<string, number>>({});
  const [ratiosVersion, setRatiosVersion] = useState(0);
  const entering = useRef(false);
  const pendingRelayout = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RATIOS_KEY) || "{}");
      if (saved && typeof saved === "object") { ratiosRef.current = saved; setRatiosVersion((v) => v + 1); }
    } catch { /* no storage */ }
  }, []);

  const columns = useMemo(() => {
    const cols: InspoItem[][] = Array.from({ length: numCols }, () => []);
    const heights = new Array<number>(numCols).fill(0);
    for (const item of filtered) {
      let c = 0;
      for (let i = 1; i < numCols; i++) if (heights[i] < heights[c] - 0.001) c = i;
      cols[c].push(item);
      heights[c] += (ratiosRef.current[item.web] ?? DEFAULT_RATIO) + GAP_RATIO;
    }
    return cols;
    // ratiosVersion forces a recompute when measurements change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, numCols, ratiosVersion]);

  const relayout = () => {
    try { localStorage.setItem(RATIOS_KEY, JSON.stringify(ratiosRef.current)); } catch { /* no storage */ }
    if (entering.current) { pendingRelayout.current = true; return; }
    pendingRelayout.current = false;
    gsap.registerPlugin(Flip);
    const state = Flip.getState(".card-item");
    flushSync(() => setRatiosVersion((v) => v + 1));
    Flip.from(state, {
      targets: ".card-item",
      duration: 0.4,
      ease: "power2.inOut",
      onComplete: () => gsap.set(".card-item", { clearProps: "transform" }),
    });
  };
  const relayoutRef = useRef(relayout);
  relayoutRef.current = relayout;

  // Measures each card when its size changes (image loaded, new thumbnail…)
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let timer: number | undefined;
    const ro = new ResizeObserver((entries) => {
      let changed = false;
      for (const e of entries) {
        const el = e.target as HTMLElement;
        const id = el.dataset.flipId;
        if (!id || el.querySelector(".tile__media.is-loading")) continue;
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) continue;
        const r = h / w;
        const prev = ratiosRef.current[id];
        if (prev === undefined || Math.abs(prev - r) > 0.02) { ratiosRef.current[id] = r; changed = true; }
      }
      if (!changed) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => relayoutRef.current(), 200);
    });
    grid.querySelectorAll<HTMLElement>(".card-item").forEach((el) => ro.observe(el));
    return () => { ro.disconnect(); window.clearTimeout(timer); };
  }, [columns]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".card-item"));
    if (!cards.length) return;

    const sorted = cards.slice().sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 20) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    entering.current = true;
    gsap.from(sorted, {
      opacity: 0,
      y: isMount.current ? 16 : 8,
      duration: isMount.current ? 0.45 : 0.3,
      stagger: isMount.current ? 0.035 : 0.025,
      ease: "power3.out",
      clearProps: "all",
      onComplete: () => {
        entering.current = false;
        if (pendingRelayout.current) relayoutRef.current();
      },
    });
    isMount.current = false;
  }, [filtered]);

  // Presence: which area the person is in right now (read by the /admin panel)
  const area = designMdItem ? "design-md" : commentsItem ? "comments" : showDirectory ? "directory" : showAdd ? "add" : aiScores ? "search" : "library";
  useActivity(area, workspace.id);

  runDesignMdRef.current = runDesignMd;

  return (
    <SidebarProvider open={!collapsed} onOpenChange={setSidebarOpen} className="shell">
      {designMdItem && (
        <DesignMdModal
          url={designMdItem.web}
          name={designMdItem.name}
          state={designMdJobs[designMdItem.web]}
          onClose={closeDesignMd}
          libraryName={workspace.name}
          onRegenerate={() => regenerateDesignMd(designMdItem)}
          onRevised={(patch) => patchJob(designMdItem.web, { entry: { ...designMdJobs[designMdItem.web]?.entry!, ...patch } })}
          commentCount={designMdItem.id ? (commentMap[designMdItem.id]?.length ?? 0) : 0}
          comments={designMdItem.id ? (hide) => (
            <CommentsPanel
              variant="column"
              item={designMdItem}
              comments={commentMap[designMdItem.id!] ?? []}
              user={user}
              canManage={workspace.role === "owner" || workspace.role === "admin"}
              memberImages={authorImages}
              memberNames={memberNames}
              onPost={(body, attachments) => postComment(designMdItem.id!, body, attachments)}
              onDelete={(id) => deleteComment(designMdItem.id!, id)}
              onClose={hide}
            />
          ) : undefined}
        />
      )}
      <DesignMdToasts
        jobs={designMdJobs}
        openUrl={designMdItem?.web ?? null}
        onOpen={openDesignMdByUrl}
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
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        items={items}
        hasDesignMd={(web) => web in designMdIndex || designMdJobs[web]?.status === "ready"}
        workspace={workspace}
        workspaces={workspaces}
        isAdmin={isAdmin}
        onOpenItem={openDesignMd}
        onAddUrl={(web) => {
          // Already saved: show it in the grid instead of saving it twice
          if (isDuplicate(web)) { setQuery(nameFromHost(web)); return; }
          addByUrl({ web, type: typeFromUrl(web), note: "" });
        }}
        onAdd={() => setShowAdd(true)}
        onDirectory={() => setShowDirectory(true)}
      />
      {commentsItem && (
        <CommentsPanel
          item={commentsItem}
          comments={commentMap[commentsItem.id!] ?? []}
          user={user}
          canManage={workspace.role === "owner" || workspace.role === "admin"}
          memberImages={authorImages}
          memberNames={memberNames}
          image={thumbMap[commentsItem.web] ? proxiedSrc(thumbMap[commentsItem.web]) : designMdIndex[commentsItem.web]?.coverUrl ? proxiedSrc(designMdIndex[commentsItem.web].coverUrl!) : null}
          onPost={(body, attachments) => postComment(commentsItem.id!, body, attachments)}
          onDelete={(id) => deleteComment(commentsItem.id!, id)}
          onClose={() => setCommentsItemId(null)}
          designMd={canAutoDesignMd(commentsItem.web) ? {
            status: designMdJobs[commentsItem.web]?.status === "loading" ? "loading" : commentsItem.web in designMdIndex ? "ready" : "none",
            onGenerate: () => runDesignMd(commentsItem, { openWhenReady: true }),
            onOpen: () => openDesignMd(commentsItem),
          } : undefined}
        />
      )}
      {showAdd && (
        <AddInspoModal
          onClose={() => setShowAdd(false)}
          onSubmit={addByUrl}
          isDuplicate={isDuplicate}
        />
      )}

      <Sidebar
        quota={quota}
        brand={<WorkspaceMenu user={user} workspace={workspace} workspaces={workspaces} isAdmin={isAdmin} />}
        items={items}
        type={type}
        isAll={type === "all" && author === "all" && date === "all" && !query && sector === "all" && style === "all" && selTags.length === 0}
        onType={setType}
        onReset={resetFilters}
        onAdd={() => setShowAdd(true)}
        onDirectory={() => setShowDirectory(true)}
      />

      <SidebarInset className="content">
        <header className="topbar">
          <span className="topbar__trigger">
            <SidebarTrigger aria-label={triggerLabel} />
          </span>
          <Separator orientation="vertical" className="topbar__sep" />
          <Breadcrumb className="topbar__view" aria-label={t.settings.breadcrumb}>
            <BreadcrumbList>
              <BreadcrumbItem className="topbar__ws">{workspace.name}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="topbar__title">{type === "all" ? t.sidebar.all : t.labels.type[type]}</BreadcrumbPage>
                <span className="topbar__count">{filtered.length}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Logo size={28} className="topbar__logo" />
          {/* The main search always looks like the AI search (spark + "Describe what you are after"), as the sidebar box did */}
          <SearchBox className="topbar__search" value={query} onChange={setQuery}
            ai aiLoading={aiLoading} shortcut />
          <Button variant="icon" className="topbar__add" onClick={() => setShowAdd(true)} aria-label={t.app.add}>{Icons.plus}</Button>
        </header>

        {ai && query.trim().length >= 3 && (aiLoading || aiError || aiScores) && (
          <header className={`ai-hero${aiLoading ? " is-loading" : ""}${aiError ? " is-error" : ""}`} role="status" aria-live="polite">
            <div className="ai-hero__badge" aria-hidden>
              {aiLoading ? <span className="spinner" /> : aiError ? Icons.x : Icons.spark}
            </div>
            <div className="ai-hero__main">
              <div className="ai-hero__eyebrow">
                {aiLoading ? t.app.searching : aiError ? t.app.searchFailed : t.app.resultsFor}
              </div>
              <h2 className="ai-hero__query">{query.trim()}</h2>
              <div className="ai-hero__meta">
                {aiLoading ? (
                  <>
                    <span className="ai-hero__skeleton" style={{ width: 120 }} />
                    <span className="ai-hero__skeleton" style={{ width: 72 }} />
                  </>
                ) : aiError ? (
                  <span className="ai-hero__pill ai-hero__pill--error">{aiError}</span>
                ) : (
                  <>
                    <span className="ai-hero__pill"><strong>{filtered.length}</strong> {t.app.results(filtered.length)}</span>
                    {aiTop > 0 && (
                      <button type="button" className="ai-hero__pill ai-hero__pill--info" aria-describedby="ai-score-tip">
                        {t.app.bestMatch} <strong>{Math.round(aiTop * 100)}%</strong>
                        <span className="info-i" aria-hidden>{Icons.info}</span>
                        <span className="info-tip" role="tooltip" id="ai-score-tip">{t.app.scoreTip}</span>
                      </button>
                    )}
                    <span className="ai-hero__hint">{t.app.sortedByMatch}</span>
                  </>
                )}
              </div>
            </div>
            <button className="ai-hero__clear" onClick={() => setQuery("")}>
              {Icons.x}<span>{t.app.clear}</span><kbd>Esc</kbd>
            </button>
            <span className="ai-hero__bar" aria-hidden />
          </header>
        )}

        {items.length > 0 && (
          <FilterBar
            items={items} tagMap={tagMap}
            authors={authors} authorImages={authorImages}
            author={author} date={date} sector={sector} style={style} selTags={selTags}
            onAuthor={setAuthor} onDate={setDate} onSector={setSector} onStyle={setStyle} onToggleTag={toggleTag}
            onClear={() => setParams({ author: "", date: "", sector: "", style: "", tags: "" })}
            aiEnabled={aiEnabled} pending={pending} tagging={tagging} onTagAll={tagAll}
          />
        )}

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
        ) : filtered.length === 0 ? (
          <div className="empty">
            <span className="display">{t.app.nothingHere}</span>
            <span>{aiLoading ? t.app.searchingShort : t.app.tryAnother}</span>
            <Button variant="ghost" size="sm" onClick={resetFilters} style={{ marginTop: 8 }}>{t.app.seeEverything}</Button>
          </div>
        ) : (
          <section ref={gridRef} className="masonry">
            {columns.map((col, colIdx) => (
              <div key={colIdx} className="masonry__col">
                {col.map((item, itemIdx) => (
                  <div key={`${item.web}-${colIdx}-${itemIdx}`} className="card-item" data-flip-id={item.web}>
                    <InspoCard
                      item={item}
                      tags={tagMap[item.web]}
                      score={ai && aiScores ? aiScores[item.web] : undefined}
                      reason={ai && aiScores ? aiReasons?.[item.web] : undefined}
                      commentCount={item.id ? (commentMap[item.id]?.length ?? 0) : 0}
                      onComments={item.id ? () => setCommentsItemId(item.id!) : undefined}
                      onDelete={item.id ? () => deleteItem(item) : undefined}
                      manualThumbnail={thumbMap[item.web]}
                      onUpload={(file) => { handleThumbnailUpload(item.web, file); return Promise.resolve(); }}
                      onRemoveThumbnail={() => { handleThumbnailRemove(item.web); return Promise.resolve(); }}
                      onDesignMd={() => openDesignMd(item)}
                      designMdLoading={designMdJobs[item.web]?.status === "loading"}
                      designMdReady={item.web in designMdIndex}
                      designCover={designMdIndex[item.web]?.coverUrl}
                      designScroll={designMdIndex[item.web]?.scrollUrl}
                    />
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
