"use client";
import { useEffect, useState } from "react";
import type { SystemActivity } from "@/lib/area-comments";
import { loadSystemActivity } from "@/app/actions/area-comments";

/** The project's latest changes and who talks where; read again whenever `stamp` changes (the system moved) */
export function useSystemActivity(projectId: string, stamp: string): SystemActivity | null {
  const [activity, setActivity] = useState<SystemActivity | null>(null);
  useEffect(() => {
    let alive = true;
    loadSystemActivity(projectId).then((r) => { if (alive && r.ok) setActivity(r.data); });
    return () => { alive = false; };
  }, [projectId, stamp]);
  return activity;
}
