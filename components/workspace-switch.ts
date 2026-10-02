"use client";

import { createContext, useContext } from "react";

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
