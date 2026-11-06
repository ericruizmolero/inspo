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
      // Only a real answer is kept: X gave the post, or said it has none (200 with post null). A refusal (404 while
      // the card is still being added, a lost session) keeps nothing, so the sheet or the next card asks again;
      // kept, a post pasted a second ago read "X no ha dado este post" for the whole session
      .then((r) => { if (!r.ok) throw new Error(`post ${r.status}`); return r.json(); })
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
    let retry: ReturnType<typeof setTimeout> | undefined;
    const got = (loaded: LoadedPost) => { if (!gone) setRead({ web, loaded }); };
    // Refused or failed: no post for now, nothing kept, and asked once more in a moment (a card mounts before the
    // add that saves its row has finished)
    loadPost(web).then(got, () => {
      if (gone) return;
      retry = setTimeout(() => loadPost(web).then(got, () => got({ post: null, thumb: null })), 3000);
    });
    return () => { gone = true; clearTimeout(retry); };
  }, [web]);
  if (!web) return undefined;
  return read?.web === web ? read.loaded : posts.get(web);
}
