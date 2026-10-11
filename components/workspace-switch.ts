"use client";

import { createContext, useContext, useLayoutEffect } from "react";
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

/** The workspace this tab shows. Each same-origin request carries it in X-Workspace, and the server saves into it (lib/workspace.ts) */
let tab: string | null = null;

if (typeof window !== "undefined") {
  const send = window.fetch.bind(window);
  // Server Actions and router navigations go through the global fetch, so this is the one place every request passes
  window.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!tab || new URL(url, location.href).origin !== location.origin) return send(input, init);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has("x-workspace")) headers.set("x-workspace", tab);
    return send(input, { ...init, headers });
  };
}

let tail: Promise<boolean> = Promise.resolve(true);
let tailId: string | null = null;

/**
 * The only way the client changes workspace. Once the server accepts, the tab saves into the new one, and the session
 * keeps it for the next page load. `claim` false leaves the tab alone for a page that claims the workspace with
 * TabWorkspace once it shows it (the library's instant switch). Requests run one after another, so the last one asked for is the one that stays; asking again for the
 * workspace already waiting in line sends nothing more. Resolves false when the server refused.
 */
export function setActiveWorkspace(id: string, claim = true): Promise<boolean> {
  if (tailId === id) return tail;
  tailId = id;
  const run = tail.then(() => authClient.organization.setActive({ organizationId: id })).then(({ error }) => !error, () => false);
  tail = run;
  void run.then((ok) => {
    if (tail !== run) return;
    tailId = null;
    if (ok && claim) tab = id;
  });
  return run;
}

/** A page that shows a workspace names it here, so what this tab saves goes to it whatever another tab switched to */
export function TabWorkspace({ id }: { id: string }) {
  useLayoutEffect(() => { tab = id; }, [id]);
  return null;
}
