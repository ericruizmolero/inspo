"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { keepSame } from "@/lib/keep-same";
import type { InspoItem, TagMap, TagStatus } from "@/types/inspo";

/** A new item's job is asked about every 4 s, for up to 5 minutes (a whole-page capture can take one);
 *  past that it keeps "gathering" until the page is opened again */
const TAG_POLL_MS = 4000;
const TAG_WATCH_MS = 5 * 60 * 1000;
// ─── Tags: one job per item, on the server ──────────────────────────────────
// Every add starts its item's job (lib/tag-jobs.ts), whatever the tab does next. Here: which items are
// still gathering, and asking how they go for the ones added or retried in this tab.
export function useTagWatch({ items, tagJobs, setTagJobs, setTagMap }: {
  items: InspoItem[];
  tagJobs: Record<string, TagStatus>;
  setTagJobs: Dispatch<SetStateAction<Record<string, TagStatus>>>;
  setTagMap: Dispatch<SetStateAction<TagMap>>;
}) {
  const [watching, setWatching] = useState<Record<string, number>>({}); // web → when it started
  const watch = useCallback((web: string) => {
    setTagJobs((prev) => ({ ...prev, [web]: "pending" }));
    setWatching((prev) => ({ ...prev, [web]: Date.now() }));
  }, []);
  useEffect(() => {
    const webs = Object.keys(watching);
    if (!webs.length) return;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tags?${webs.map((w) => `web=${encodeURIComponent(w)}`).join("&")}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { jobs: Record<string, TagStatus>; tags: TagMap };
        setTagMap((prev) => keepSame(prev, { ...prev, ...data.tags }));
        setTagJobs((prev) => {
          const next = { ...prev };
          for (const w of webs) { if (data.jobs[w]) next[w] = data.jobs[w]; else delete next[w]; }
          return keepSame(prev, next);
        });
        setWatching((prev) => {
          const next = { ...prev };
          for (const w of webs) if (!data.jobs[w] || data.jobs[w] === "failed" || Date.now() - prev[w] > TAG_WATCH_MS) delete next[w];
          return next;
        });
      } catch { setWatching((prev) => ({ ...prev })); } // asks again next round
    }, TAG_POLL_MS);
    return () => clearTimeout(id);
  }, [watching]);
  const gathering = useMemo(() => items.filter((i) => tagJobs[i.web] === "pending" || tagJobs[i.web] === "running").length, [items, tagJobs]);
  return { watch, gathering };
}
