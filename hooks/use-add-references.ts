"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { useRouter } from "next/navigation";
import { addInspo, addImage } from "@/app/actions/library";
import { addText } from "@/app/actions/text";
import { assignSystemArea } from "@/app/actions/system";
import { boardOf } from "@/lib/boards/match";
import { uploadMedia } from "@/lib/media-client";
import { cue } from "@/lib/ui-sounds";
import { webKeyOf, nameFromHost, typeFromUrl, mediaKindOf, nameFromFile } from "@/lib/url";
import { messageOf } from "@/components/I18nProvider";
import type { BoardStep, ImportBoard } from "@/components/BoardImport";
import type { NewInspoInput } from "@/components/AddInspoModal";
import type { ToastNote } from "@/components/Toast";
import type { Dict } from "@/lib/i18n/en";
import type { SessionUser, Workspace } from "@/lib/workspace-core";
import type { InspoItem, ProjectLinks } from "@/types/inspo";
import type { ProjectSystem, SystemArea } from "@/types/system";

/** A new reference by link, image or text: on the board at once, saved behind it, gone again with a notice if it fails */
export function useAddReferences({ user, workspace, t, items, setItems, setLinks, setThumbMap, saveTargetRef, refreshSystem, setSystem, watch, cardCopy, projectFailed, importBoard, router, setToast }: {
  user: SessionUser;
  workspace: Workspace;
  t: Dict;
  items: InspoItem[];
  setItems: Dispatch<SetStateAction<InspoItem[]>>;
  setLinks: Dispatch<SetStateAction<ProjectLinks>>;
  setThumbMap: Dispatch<SetStateAction<Record<string, string>>>;
  saveTargetRef: RefObject<() => string | undefined>;
  refreshSystem: (projectId: string) => void;
  setSystem: (projectId: string, system: ProjectSystem) => void;
  watch: (web: string) => void;
  cardCopy: (webUrl: string, file: File) => Promise<void>;
  projectFailed: (e: unknown) => void;
  importBoard: ImportBoard;
  router: ReturnType<typeof useRouter>;
  setToast: Dispatch<SetStateAction<ToastNote | null>>;
}) {
  // ─── Add by URL only ─────────────────────────────────────────────────────────
  // The card appears instantly with the domain; the server gets the real name
  // from the site itself and replaces it. If it fails, it's removed with a notice up top.
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
      if (mediaKindOf(item.web) === "post") void importPost(item.web);
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
  return { isDuplicate, addByUrl, addByUpload, addByText, arrivingBoard };
}
