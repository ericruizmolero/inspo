"use client";

// Switching workspace is instant: the other workspaces' libraries are loaded in the background once a
// switch looks likely (the pointer on the workspace menu, the menu or ⌘K opening), so a switch only swaps
// what is on screen. Never on a plain page view: each one is a whole library load on the server. The server is told afterwards (the session's active workspace), without
// reloading the page; what the server sends on a later navigation takes over again.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceSwitchContext } from "./workspace-switch";
import { authClient } from "@/lib/auth-client";
import type { LibraryData } from "@/lib/library";
import type { SessionUser, Workspace } from "@/lib/workspace-core";
import InspoClient from "./InspoClient";

type Cached = { data: LibraryData; at: number };
// Kept for the tab's life: a switch back and forth never waits twice
const cache = new Map<string, Cached>();
const loading = new Map<string, Promise<LibraryData | null>>();
/** A copy younger than this is shown and kept; an older one is shown, then replaced once fresh data arrives */
const FRESH_MS = 30_000;

function fetchLibrary(id: string): Promise<LibraryData | null> {
  const running = loading.get(id);
  if (running) return running;
  const p = fetch(`/api/library?ws=${encodeURIComponent(id)}`)
    .then((r) => (r.ok ? (r.json() as Promise<LibraryData>) : null))
    .then((data) => { if (data) cache.set(id, { data, at: Date.now() }); return data; })
    .catch(() => null)
    .finally(() => loading.delete(id));
  loading.set(id, p);
  return p;
}

export default function LibraryHost({ library, user, workspaces, aiEnabled }: {
  library: LibraryData;
  user: SessionUser;
  workspaces: Workspace[];
  aiEnabled: boolean;
}) {
  const [shown, setShown] = useState(library);
  // Bumped to remount the library when a stale copy is replaced by fresh data
  const [round, setRound] = useState(0);
  const shownId = useRef(library.workspace.id);
  shownId.current = shown.workspace.id;

  // What the server renders wins whenever it changes (a navigation, a refresh)
  useEffect(() => {
    cache.set(library.workspace.id, { data: library, at: Date.now() });
    setShown(library);
  }, [library]);

  const others = useCallback(() => workspaces.filter((w) => w.id !== shownId.current), [workspaces]);
  const prefetch = useCallback(() => {
    for (const w of others()) {
      const c = cache.get(w.id);
      if (!c || Date.now() - c.at > FRESH_MS) fetchLibrary(w.id);
    }
  }, [others]);

  const switchTo = useCallback(async (id: string) => {
    if (id === shownId.current) return;
    // The server learns first in the background; anything saved from now on goes to the new workspace
    const active = authClient.organization.setActive({ organizationId: id }).catch(() => null);
    // A project or an open reference belong to the workspace being left: back to its library
    if (window.location.pathname !== "/" || window.location.search) window.history.replaceState(null, "", "/");
    const hit = cache.get(id);
    if (hit) {
      setShown(hit.data);
      if (Date.now() - hit.at > FRESH_MS) {
        // Shown at once from an older copy; the fresh one replaces it as soon as it is here
        await active;
        const fresh = await fetchLibrary(id);
        if (fresh && shownId.current === id) { setShown(fresh); setRound((r) => r + 1); }
      }
      return;
    }
    const data = await fetchLibrary(id);
    await active;
    if (data) setShown(data);
  }, []);

  const switcher = useMemo(() => ({ switchTo, prefetch }), [switchTo, prefetch]);

  return (
    <WorkspaceSwitchContext.Provider value={switcher}>
      <InspoClient
        key={`${shown.workspace.id}:${round}`}
        items={shown.items}
        stamp={shown.stamp}
        initialThumbnailMap={shown.initialThumbnailMap}
        initialTagMap={shown.initialTagMap}
        initialTagJobs={shown.initialTagJobs}
        initialProjects={shown.initialProjects}
        initialProjectLinks={shown.initialProjectLinks}
        initialSystems={shown.initialSystems}
        aiEnabled={aiEnabled}
        user={user}
        workspace={shown.workspace}
        workspaces={workspaces}
        members={shown.members}
        isAdmin={shown.isAdmin}
        initialQuota={shown.initialQuota}
        initialComments={shown.initialComments}
        initialDesignMdIndex={shown.initialDesignMdIndex}
        initialPageShots={shown.initialPageShots}
      />
    </WorkspaceSwitchContext.Provider>
  );
}
