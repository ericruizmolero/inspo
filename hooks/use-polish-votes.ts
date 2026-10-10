"use client";

import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { votesByItem, finishedOf, forgottenBy, openVotes } from "@/lib/polish-tally";
import { votePolish, closeProjectPolish, restoreToBoard } from "@/app/actions/library";
import type { InspoItem, PolishChoice, PolishVote, Project, ProjectLinks } from "@/types/inspo";
import type { SessionUser } from "@/lib/workspace-core";

export type VoteWrite = { projectId: string; itemId: string; vote: PolishChoice | null; closedAt: string | null; saved: number | null };

// ─── Polish votes ────────────────────────────────────────────────────────────
// In a team nothing leaves the board on a vote: closing the polish does it. Alone, a vote is settled as it is cast
export function usePolishVotes({ initialPolishVotes, user, members, setLinks, refreshSystem, projectFailed }: {
  initialPolishVotes: PolishVote[];
  user: SessionUser;
  members: { id: string }[];
  setLinks: Dispatch<SetStateAction<ProjectLinks>>;
  refreshSystem: (projectId: string) => void;
  projectFailed: (e: unknown) => void;
}) {
  const [votes, setVotes] = useState<PolishVote[]>(initialPolishVotes);
  /** This tab's own votes on their way or just saved, by "project:item": a look at the server taken meanwhile must not undo them */
  const voteWrites = useRef(new Map<string, VoteWrite>());
  const withVoteWrites = useRef((list: PolishVote[]): PolishVote[] => {
    const w = voteWrites.current, now = Date.now();
    for (const [k, x] of w) if (x.saved && now - x.saved > 20_000) w.delete(k);
    if (!w.size) return list;
    const out = list.filter((v) => !(v.userId === user.id && w.has(`${v.projectId}:${v.itemId}`)));
    for (const x of w.values()) if (x.vote) out.push({ projectId: x.projectId, itemId: x.itemId, userId: user.id, vote: x.vote, closedAt: x.closedAt, closedBy: x.closedAt ? user.id : null });
    return out;
  });
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
  return { votes, setVotes, voteWrites, withVoteWrites, solo, castVote, closePolishOf, restoreToProject };
}

export function usePolishTally({ votes, currentProject, spaceItems, panelItem, links, projects, members, user, locale }: {
  votes: PolishVote[];
  currentProject: Project | null;
  spaceItems: InspoItem[];
  panelItem: InspoItem | null;
  links: ProjectLinks;
  projects: Project[];
  members: { id: string; name: string }[];
  user: SessionUser;
  locale: string;
}) {
  // Uncompiled, as it was inside InspoClient (which the React Compiler skips): the same renders and closures
  "use no memo";
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
  return { polishVotes, polishTab, panelForgotten };
}
