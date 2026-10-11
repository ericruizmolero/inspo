"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { removeInspos, setFiled } from "@/app/actions/library";
import type { ToastNote } from "@/components/Toast";
import type { useConfirm } from "@/components/useConfirm";
import type { Dict } from "@/lib/i18n/en";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";

// ─── Selection: several references at once (SelectBar) ──────────────────────
// ⌘/⇧-click or the circle on a card picks it; while anything is picked, a click picks. ⇧ picks the run from
// the last pick, in the board's order. Esc or Done lets go; changing space does too.
export function useSelection({ t, items, setItems, setThumbMap, boardItems, space, projectView, links, setLinks, currentProject, confirm, refreshSystem, projectFailed, setToast, createProject }: {
  t: Dict;
  items: InspoItem[];
  setItems: Dispatch<SetStateAction<InspoItem[]>>;
  setThumbMap: Dispatch<SetStateAction<Record<string, string>>>;
  boardItems: InspoItem[];
  space: string;
  projectView: string;
  links: ProjectLinks;
  setLinks: Dispatch<SetStateAction<ProjectLinks>>;
  currentProject: Project | null;
  confirm: ReturnType<typeof useConfirm>[0];
  refreshSystem: (projectId: string) => void;
  projectFailed: (e: unknown) => void;
  setToast: Dispatch<SetStateAction<ToastNote | null>>;
  createProject: (name: string) => Promise<Project | null>;
}) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- projectFailed is a new function on every render, so listing it would rebuild this callback on every render
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- projectFailed is a new function on every render, so listing it would rebuild this callback on every render
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
  }, [selected, items, links, confirm, clearSelection, refreshSystem, t, setItems, setThumbMap, setToast]);
  const createForSelection = useCallback(async (name: string) => {
    const p = await createProject(name);
    if (!p) return;
    if (currentProject) await moveSelection(p.id);
    else await fileSelection(p.id, true);
  }, [createProject, currentProject, moveSelection, fileSelection]);
  return { selected, bar, setBar, selectItem, clearSelection, selectAll, selectionIn, fileSelection, moveSelection, removeSelection, deleteSelection, createForSelection };
}
