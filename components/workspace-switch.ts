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

/**
 * The session holds one active workspace for every tab, and each save resolves its workspace from it (withCtx). A tab
 * that comes back to the front after another tab switched would save into the other workspace, or fail with "that
 * project no longer exists": it makes its own workspace the active one again. The last workspace any tab showed is
 * kept in localStorage, so a tab that is already in step sends nothing.
 */
export function ActiveWorkspace({ id }: { id: string }) {
  useEffect(() => {
    try { localStorage.setItem(SHOWN_KEY, id); } catch { /* private mode: nothing to compare against */ }
    const reclaim = () => {
      if (document.visibilityState !== "visible") return;
      try {
        if (localStorage.getItem(SHOWN_KEY) === id) return;
        localStorage.setItem(SHOWN_KEY, id);
      } catch { return; }
      void authClient.organization.setActive({ organizationId: id }).catch(() => {});
    };
    window.addEventListener("focus", reclaim);
    document.addEventListener("visibilitychange", reclaim);
    return () => { window.removeEventListener("focus", reclaim); document.removeEventListener("visibilitychange", reclaim); };
  }, [id]);
  return null;
}
