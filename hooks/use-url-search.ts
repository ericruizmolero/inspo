"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { filtersFromParams, filterKey, LEGACY_PARAMS, type Filter } from "@/lib/search-query";

// The search lives in the URL (?f=person:Eric&f=tag:c:blue&q=serif): a search can be shared and Back
// undoes a chip. Older links (?type= ?author= ?tags=…) are read as chips. history.pushState/replaceState
// sync with useSearchParams without a navigation.
export function useUrlSearch(sp: ReadonlyURLSearchParams) {
  // The chips are read from every param but ?q=, so typing (which rewrites ?q=) never rebuilds them
  const chipKey = (() => { const p = new URLSearchParams(sp.toString()); p.delete("q"); return p.toString(); })();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(chipKey)), [chipKey]);
  // The search box keeps its own state (a controlled input can't wait for the router) and copies itself into ?q=
  const [query, setQueryState] = useState(() => sp.get("q") ?? "");
  // "all" and "" drop the key. Typing replaces the entry; every other change adds one, so Back undoes it.
  const setParams = useCallback((patch: Record<string, string>, replace = false) => {
    const p = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) { if (v && v !== "all") p.set(k, v); else p.delete(k); }
    const url = window.location.pathname + (p.size ? `?${p}` : "");
    if (replace) window.history.replaceState(null, "", url); else window.history.pushState(null, "", url);
  }, []);
  // ?q= is written once typing pauses: each write is a second render through useSearchParams, and Safari
  // refuses more than 100 history calls in 10 s. Anything else that writes the URL takes the pending words first.
  const qPending = useRef<{ timer: ReturnType<typeof setTimeout>; v: string } | null>(null);
  const flushQuery = useCallback(() => {
    const pending = qPending.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    qPending.current = null;
    setParams({ q: pending.v }, true);
  }, [setParams]);
  const setQuery = useCallback((v: string) => {
    setQueryState(v);
    if (qPending.current) clearTimeout(qPending.current.timer);
    qPending.current = { v, timer: setTimeout(flushQuery, 300) };
  }, [flushQuery]);
  useEffect(() => () => { if (qPending.current) clearTimeout(qPending.current.timer); }, []);
  // Each chip change is a history entry; the old filter params go once they are chips
  const setFilters = useCallback((next: Filter[]) => {
    flushQuery();
    const p = new URLSearchParams(window.location.search);
    p.delete("f");
    for (const k of LEGACY_PARAMS) p.delete(k);
    for (const f of next) p.append("f", filterKey(f));
    window.history.pushState(null, "", window.location.pathname + (p.size ? `?${p}` : ""));
  }, [flushQuery]);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  /** Adds a chip, or takes it away when it is already there (a tag clicked in the panel, a person in the sidebar) */
  const toggleFilter = useCallback((f: Filter) => {
    const cur = filtersRef.current;
    setFilters(cur.some((x) => filterKey(x) === filterKey(f)) ? cur.filter((x) => filterKey(x) !== filterKey(f)) : [...cur, f]);
  }, [setFilters]);
  // Back to everything: the whole library, no chips, no words
  const resetFilters = useCallback(() => {
    setQueryState("");
    if (qPending.current) { clearTimeout(qPending.current.timer); qPending.current = null; }
    const p = new URLSearchParams(window.location.search);
    for (const k of ["f", "q", "in", ...LEGACY_PARAMS]) p.delete(k);
    window.history.pushState(null, "", window.location.pathname + (p.size ? `?${p}` : ""));
  }, []);
  return { filters, query, setQuery, setParams, setFilters, toggleFilter, resetFilters };
}
