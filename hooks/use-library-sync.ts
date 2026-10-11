"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { applyPage, applyPulse, type Mirror } from "@/lib/library-mirror";
import { keepSame } from "@/lib/keep-same";
import type { Beat } from "@/components/useActivity";
import type { Workspace } from "@/lib/workspace-core";
import type { InspoItem, ItemsPage, PolishVote, Project, ProjectLinks, Pulse } from "@/types/inspo";

/** While the board is seen, it asks every 15 s whether its workspace changed somewhere else */
const PULSE_MS = 15_000;

// The library's references and what the board draws for each, in one state: a page or the pulse's changes fold in
// all at once (lib/library-mirror.ts). Each part keeps its own name and setter
export function useLibraryMirror(first: ItemsPage) {
  // Uncompiled, as it was inside InspoClient (which the React Compiler skips): the same renders and closures
  "use no memo";
  const [mirror, setMirror] = useState<Mirror>(() => ({
    items: first.items, thumbnailMap: first.thumbnailMap, tagMap: first.tagMap, tagJobs: first.tagJobs,
    pageShots: first.pageShots, designMdIndex: first.designMdIndex, signed: first.signed, comments: first.comments,
  }));
  const { items, thumbnailMap: thumbMap, tagMap, tagJobs, pageShots, designMdIndex, signed, comments: commentMap } = mirror;
  const setters = useMemo(() => {
    const part = <K extends keyof Mirror>(k: K) => (up: SetStateAction<Mirror[K]>) => setMirror((m) => {
      const v = typeof up === "function" ? (up as (prev: Mirror[K]) => Mirror[K])(m[k]) : up;
      return Object.is(v, m[k]) ? m : { ...m, [k]: v };
    });
    return { items: part("items"), thumbMap: part("thumbnailMap"), tagMap: part("tagMap"), tagJobs: part("tagJobs"), pageShots: part("pageShots"), commentMap: part("comments") };
  }, []);
  const { items: setItems, thumbMap: setThumbMap, tagMap: setTagMap, tagJobs: setTagJobs, commentMap: setCommentMap } = setters;
  return { setMirror, items, thumbMap, tagMap, tagJobs, pageShots, designMdIndex, signed, commentMap, setItems, setThumbMap, setTagMap, setTagJobs, setCommentMap };
}

// ─── Changed somewhere else ─────────────────────────────────────────────────
// The extension, another tab or a teammate: what they add, delete, edit or file shows up here without a
// reload. The board asks (/api/pulse) when it comes back into view and every 15 s while it is seen; a hidden tab
// asks nothing. Nothing changed: a few bytes. Something did: those rows only, folded in where they stand.
export function useLibrarySync({ first, stamp, since, bell, workspace, items, setMirror, setProjects, setLinks, setVotes, withVoteWrites, watch }: {
  first: ItemsPage;
  stamp: string;
  since: string;
  bell: string;
  workspace: Workspace;
  items: InspoItem[];
  setMirror: Dispatch<SetStateAction<Mirror>>;
  setProjects: Dispatch<SetStateAction<Project[]>>;
  setLinks: Dispatch<SetStateAction<ProjectLinks>>;
  setVotes: Dispatch<SetStateAction<PolishVote[]>>;
  withVoteWrites: RefObject<(list: PolishVote[]) => PolishVote[]>;
  watch: (web: string) => void;
}) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const lookRef = useRef({ stamp, since, bell });
  // The bell reads its feed when this moves (components/TeamBell.tsx)
  const [bellNews, setBellNews] = useState(bell);
  // The presence heartbeat rides on the pulse (components/useActivity.ts); set below, where the area is known
  const beatRef = useRef<() => Beat | null>(() => null);
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
        const res = await fetch("/api/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ws: workspace.id, ...lookRef.current, beat: beatRef.current() }) });
        if (!res.ok) return;
        const d = (await res.json()) as Pulse;
        // Away longer than deletions are remembered (lib/pulse.ts TOMBSTONE_DAYS): only a fresh library is sure
        if (d.reload) { window.location.reload(); return; }
        // A save of this tab started while the answer was on its way: the next look asks again from the same point
        if (itemsRef.current.some((i) => !i.id)) return;
        lookRef.current = { stamp: d.stamp, since: d.since, bell: d.bell ?? lookRef.current.bell };
        if (d.bell !== undefined) setBellNews(d.bell);
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
  return { bellNews, beatRef, filling };
}
