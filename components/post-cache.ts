"use client";

// A post from X, read once per session. Every place that shows one (its sheet, PostView; its card on the board,
// InspoCard; its card in Polish, PolishView) asks here, so the post is fetched once however many of them are
// mounted, and one already read is on screen at once.

import { useEffect, useState } from "react";
import type { Post } from "@/lib/posts";

export type LoadedPost = { post: Post | null; thumb: string | null };

const posts = new Map<string, LoadedPost>();
const inflight = new Map<string, Promise<LoadedPost>>();

/** What was already read for this address, if anything (null post: X no longer serves it) */
export const cachedPost = (web: string): LoadedPost | undefined => posts.get(web);

/** Reads the post (/api/post imports it the first time, see app/api/post/route.ts) and keeps the answer.
 *  A request that never got an answer keeps nothing, so the next one asks again */
export function loadPost(web: string): Promise<LoadedPost> {
  const had = posts.get(web);
  if (had) return Promise.resolve(had);
  let p = inflight.get(web);
  if (!p) {
    p = fetch("/api/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ web }) })
      // The server said no (not in the workspace, X refused it): that is an answer, kept as no post
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { post?: Post | null; thumb?: string | null }) => {
        const loaded: LoadedPost = { post: d.post ?? null, thumb: d.thumb ?? null };
        posts.set(web, loaded);
        return loaded;
      })
      .finally(() => inflight.delete(web));
    inflight.set(web, p);
  }
  return p;
}

/** The post at this address: undefined while it is being read (or with no address), null if X no longer serves it.
 *  The answer lives in state, not only in the map: the React Compiler memoises what a render reads from the map
 *  by `web` alone, so a map filled after the first render would never reach the component */
export function usePost(web: string | null): LoadedPost | undefined {
  const [read, setRead] = useState<{ web: string; loaded: LoadedPost } | null>(() => {
    const had = web ? posts.get(web) : undefined;
    return web && had ? { web, loaded: had } : null;
  });
  useEffect(() => {
    if (!web) return;
    const had = posts.get(web);
    if (had) { setRead((r) => (r?.web === web ? r : { web, loaded: had })); return; }
    let gone = false;
    // The request itself failed: no post for now, nothing kept, so the next one asks again
    loadPost(web).then((loaded) => { if (!gone) setRead({ web, loaded }); }, () => { if (!gone) setRead({ web, loaded: { post: null, thumb: null } }); });
    return () => { gone = true; };
  }, [web]);
  if (!web) return undefined;
  return read?.web === web ? read.loaded : posts.get(web);
}
