"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { AgentAction, AgentDone, AgentPatch, AgentReply, AgentTurn } from "@/lib/agent";
import type { Dict } from "@/lib/i18n/en";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { SYSTEM_AREAS, type ProjectSystem, type SystemArea } from "@/types/system";

type ProjectView = "system" | "polish" | "board";

// ─── The agent: every action, asked for in words from the search box ──────────
// The request goes with where the person is (project, view, open reference, what is on screen); the
// server plans and runs what is safe, and what it changed comes back as a patch the state applies.
// Deleting comes back pending and waits for a yes here.
export function useAgent({ t, items, projects, links, currentProject, space, projectView, panelItem, filtered, searchHere, openArea, setFocusArea, setProjects, setLinks, setItems, setSystem, setQuery, setSpace, setProjectView, saveTarget }: {
  t: Dict;
  items: InspoItem[];
  projects: Project[];
  links: ProjectLinks;
  currentProject: Project | null;
  space: string;
  projectView: ProjectView;
  panelItem: InspoItem | null;
  filtered: InspoItem[];
  searchHere: boolean;
  openArea: SystemArea | null;
  setFocusArea: Dispatch<SetStateAction<{ area: SystemArea; n: number } | null>>;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setLinks: Dispatch<SetStateAction<ProjectLinks>>;
  setItems: Dispatch<SetStateAction<InspoItem[]>>;
  setSystem: (projectId: string, system: ProjectSystem) => void;
  setQuery: (v: string) => void;
  setSpace: (v: string) => void;
  setProjectView: (v: ProjectView) => void;
  saveTarget: () => string | undefined;
}) {
  const searchHereRef = useRef(searchHere);
  searchHereRef.current = searchHere;
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
  const applyAgentPatch = useCallback((patch: AgentPatch) => {
    if (patch.projects) setProjects(patch.projects);
    if (patch.links) setLinks(patch.links);
    for (const [id, sys] of Object.entries(patch.systems ?? {})) setSystem(id, sys);
    if (patch.added?.length) setItems((prev) => [...patch.added!.filter((a) => !prev.some((i) => i.id === a.id)), ...prev]);
    if (patch.removed?.length) { const gone = new Set(patch.removed); setItems((prev) => prev.filter((i) => !i.id || !gone.has(i.id))); }
  }, [setItems, setLinks, setProjects, setSystem]);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- saveTarget is a new function on every render, so listing it would rebuild this callback on every render
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
  return { agent, setAgent, agentSpeaks, agentTargetItem, setAgentTarget, agentQuick, askAgent, undoAgent, confirmAgent };
}
