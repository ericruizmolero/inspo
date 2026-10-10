"use client";

import { useCallback, useRef, useState } from "react";
import { summaryOf, type ProjectSystem, type SystemSummary } from "@/types/system";

// The systems, alive: filing a reference into a project that has started its system re-reads the
// board a moment later (one cheap model call), so the system never lags behind the board
// Two maps: every project's summary, which the tabs, the chooser and the cards read; and the whole system of the
// projects whose system or sheet was opened. A whole system written anywhere updates both
export function useSystems(initialSummaries: Record<string, SystemSummary>) {
  const [systems, setSystems] = useState(initialSummaries);
  const [fullSystems, setFullSystems] = useState<Record<string, ProjectSystem>>({});
  const systemsRef = useRef(systems);
  systemsRef.current = systems;
  const systemTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const setSystem = useCallback((projectId: string, system: ProjectSystem) => {
    setFullSystems((prev) => ({ ...prev, [projectId]: system }));
    setSystems((prev) => ({ ...prev, [projectId]: summaryOf(system) }));
  }, []);
  const refreshSystem = useCallback((projectId: string) => {
    if (!systemsRef.current[projectId]?.read) return;  // the team has not read the board yet: nothing to keep alive
    clearTimeout(systemTimers.current[projectId]);
    systemTimers.current[projectId] = setTimeout(async () => {
      try {
        const res = await fetch("/api/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, auto: true }) });
        const json = await res.json().catch(() => ({})) as ProjectSystem & { error?: string };
        if (res.ok && !json.error) setSystem(projectId, json);
      } catch { /* the modal shows the board as unread; the next read catches up */ }
    }, 2500);
  }, [setSystem]);
  return { systems, fullSystems, setSystem, refreshSystem };
}
