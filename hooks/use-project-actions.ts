"use client";

import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import { newProject, editProject, removeProject, markProjectStarted, setFiled, readBoardAction, importBatch, boardProject } from "@/app/actions/library";
import { setProjectClient, saveProjectBrief } from "@/app/actions/brief";
import { boardOf, PLATFORM_NAME } from "@/lib/boards/match";
import { batchesOf } from "@/lib/boards/entries";
import { importSummary } from "@/lib/boards/summary";
import { noneImported, type ImportBoard } from "@/components/BoardImport";
import type { ToastNote } from "@/components/Toast";
import type { useConfirm } from "@/components/useConfirm";
import type { Dict } from "@/lib/i18n/en";
import type { InspoItem, PolishVote, Project, ProjectLinks } from "@/types/inspo";
import type { VoteWrite } from "./use-polish-votes";

/** Projects change on screen first; if the server says no, they go back with a notice */
export function useProjectActions({ t, projects, setProjects, links, setLinks, space, currentProject, confirm, setParams, setSpace, setItems, setToast, watch, refreshSystem, voteWrites, setVotes, projectFailed }: {
  t: Dict;
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  links: ProjectLinks;
  setLinks: Dispatch<SetStateAction<ProjectLinks>>;
  space: string;
  currentProject: Project | null;
  confirm: ReturnType<typeof useConfirm>[0];
  setParams: (patch: Record<string, string>, replace?: boolean) => void;
  setSpace: (v: string) => void;
  setItems: Dispatch<SetStateAction<InspoItem[]>>;
  setToast: Dispatch<SetStateAction<ToastNote | null>>;
  watch: (web: string) => void;
  refreshSystem: (projectId: string) => void;
  voteWrites: RefObject<Map<string, VoteWrite>>;
  setVotes: Dispatch<SetStateAction<PolishVote[]>>;
  projectFailed: (e: unknown) => void;
}) {
  const createProject = useCallback(async (name: string): Promise<Project | null> => {
    const r = await newProject(name).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { projectFailed(new Error(r.error)); return null; }
    setProjects((prev) => [...prev, r.data]);
    return r.data;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- projectFailed is a new function on every render, so listing it would rebuild this callback on every render
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
    let done = 0, failed = 0, existed = 0, invalid = 0, full = 0;
    onStep({ phase: "saving", done, total });
    for (const batch of batchesOf(board.entries)) {
      // The plan ran out of room: the rest is not sent, it is said
      if (full) { full += batch.length; done += batch.length; continue; }
      const r = await importBatch(project.id, batch).catch((e) => ({ ok: false as const, error: String(e) }));
      if (r.ok) {
        r.data.results.forEach((x, i) => {
          if (x.id && x.status === "added") { ids.push(x.id); imported[batch[i].kind]++; }
          else if (x.id && x.status === "existed") { ids.push(x.id); existed++; }
          else if (x.status === "invalid") invalid++;
          else if (x.status === "full") full++;
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
    setToast({ ok: true, ...importSummary(t, { imported, existed, skipped: { ...board.skipped, invalid }, failed, capped: board.capped, full }) });
    return null;
  }, [t, watch, setSpace, setItems, setLinks, setProjects, setToast]);
  const renameProject = useCallback(async (id: string, name: string) => {
    const before = projects.find((p) => p.id === id);
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    const r = await editProject(id, name).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { if (before) setProjects((prev) => prev.map((p) => (p.id === id ? before : p))); projectFailed(new Error(r.error)); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- projectFailed is a new function on every render, so listing it would rebuild this callback on every render
  }, [projects]);
  const deleteProject = useCallback(async (project: Project) => {
    if (!(await confirm({ title: t.projects.confirmRemove(project.name), description: t.projects.confirmRemoveHint, action: t.common.delete, danger: true }))) return;
    const prevProjects = projects, prevLinks = links;
    if (space === project.id) setParams({ in: "" }, true);
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    setLinks((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.filter((x) => x !== project.id)])));
    const r = await removeProject(project.id).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { setProjects(prevProjects); setLinks(prevLinks); projectFailed(new Error(r.error)); }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- projectFailed is a new function on every render, so listing it would rebuild this callback on every render; the strings are read from the dictionary it was built with, and listing t would rebuild it when the language changes
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- projectFailed is a new function on every render, so listing it would rebuild this callback on every render
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- projectFailed is a new function on every render, so listing it would rebuild this callback on every render
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- projectFailed is a new function on every render, so listing it would rebuild this callback on every render
  }, [links, refreshSystem]);
  const createAndFile = useCallback(async (item: InspoItem, name: string) => {
    const p = await createProject(name);
    if (p) await toggleFiled(item, p.id, true);
  }, [createProject, toggleFiled]);
  const setClient = async (id: string, itemId: Parameters<typeof setProjectClient>[1]) => {
    const r = await setProjectClient(id, itemId).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { projectFailed(new Error(r.error)); return; }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, clientItemId: itemId } : p)));
  };
  const saveBrief = async (id: string, patch: Parameters<typeof saveProjectBrief>[1]) => {
    const r = await saveProjectBrief(id, patch).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) { projectFailed(new Error(r.error)); return null; }
    const { brief } = r.data;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, brief, intent: brief.about || null } : p)));
    return brief;
  };
  const describe = async (id: string, about: string) => {
    const r = await saveProjectBrief(id, { about }).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) throw new Error(r.error);
    const saved = r.data.brief?.about ?? "";
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, intent: saved || null } : p)));
  };
  return { createProject, importBoard, renameProject, deleteProject, toggleFiled, startSystem, fileMany, createAndFile, setClient, saveBrief, describe };
}
