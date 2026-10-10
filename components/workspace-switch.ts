"use client";

import { createContext, useContext, useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export interface WorkspaceSwitcher {
  /** Shows that workspace now; tells the server in the background */
  switchTo: (id: string) => Promise<void>;
  /** Loads the other workspaces ahead of a likely switch (the pointer on the menu, the menu or ⌘K opening) */
  prefetch: () => void;
}

/** Provided by the library (components/LibraryHost.tsx) */
export const WorkspaceSwitchContext = createContext<WorkspaceSwitcher | null>(null);
/** The instant switch, or null outside the library (the caller falls back to a page refresh) */
export const useWorkspaceSwitch = () => useContext(WorkspaceSwitchContext);

const SHOWN_KEY = "criterio:active-workspace";

let tail: Promise<boolean> = Promise.resolve(true);
let tailId: string | null = null;

/**
 * The only way the client changes the session's active workspace. Requests run one after another, so the last one asked
 * for is the one the session keeps; asking again for the workspace already waiting in line sends nothing more. Resolves
 * false when the server refused, and the key stays as it was so the next focus tries again.
 */
export function setActiveWorkspace(id: string): Promise<boolean> {
  if (tailId === id) return tail;
  tailId = id;
  const run = tail.then(() => authClient.organization.setActive({ organizationId: id })).then(
    ({ error }) => {
      if (!error) try { localStorage.setItem(SHOWN_KEY, id); } catch { /* private mode: nothing to compare against */ }
      return !error;
    },
    () => false,
  );
  tail = run;
  void run.then(() => { if (tail === run) tailId = null; });
  return run;
}

/**
 * The session holds one active workspace for every tab, and each save resolves its workspace from it (withCtx). A page
 * that shows another workspace than the session's, because another tab switched or Back served it from the router
 * cache, would save into the wrong one or fail with "that project no longer exists": it makes its own workspace the
 * active one again, on mount and whenever the tab comes back to the front. The key holds the last workspace the session
 * was set to, so a page already in step sends nothing.
 */
export function ActiveWorkspace({ id }: { id: string }) {
  useEffect(() => {
    const claim = () => {
      try { if (localStorage.getItem(SHOWN_KEY) === id) return; } catch { return; }
      void setActiveWorkspace(id);
    };
    const reclaim = () => { if (document.visibilityState === "visible") claim(); };
    claim();
    window.addEventListener("focus", reclaim);
    document.addEventListener("visibilitychange", reclaim);
    return () => { window.removeEventListener("focus", reclaim); document.removeEventListener("visibilitychange", reclaim); };
  }, [id]);
  return null;
}
