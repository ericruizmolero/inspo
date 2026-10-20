"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { viewOf, FACETS } from "@/lib/taxonomy";
import { filterTest, localScores, queryWords, rankText, isDescriptive, textIndex, vocabulary, norm, newestFirst, type Filter } from "@/lib/search-query";
import type { Dict } from "@/lib/i18n/en";
import type { CommentMap, InspoItem, TagMap } from "@/types/inspo";

const NO_FILTERS: Filter[] = [];

/** Waits before asking for meaning (layer 2) and for Jev (layer 3): the first answers every few keys, the second once the typing settles */
const SEMANTIC_WAIT_MS = 180;
const JEV_WAIT_MS = 700;
/** Jev reads only the nearest few */
const JEV_TOP = 20;
// ─── Search ─────────────────────────────────────────────────────────────────
// Three layers, each shown as soon as it is there (lib/search-query.ts):
// 1. here, every keystroke: chips filter, words match each item's text (tags in both languages, notes, thread);
// 2. /api/search/semantic, a fraction of a second later, only when the words found nothing or the query describes:
//    nearness in meaning, any language;
// 3. /api/search, for descriptive queries: Jev reads the nearest 20 and reorders them.
// The box answers every key at once; the ranking and the new layout follow when the browser has room
export function useBoardSearch({ searchHere, query, filters, items, tagMap, commentMap, memberNames, spaceItems, aiEnabled, loadQuota, t }: {
  searchHere: boolean;
  query: string;
  filters: Filter[];
  items: InspoItem[];
  tagMap: TagMap;
  commentMap: CommentMap;
  memberNames: string[];
  spaceItems: InspoItem[];
  aiEnabled: boolean;
  loadQuota: () => void;
  t: Dict;
}) {
  const searched = useDeferredValue(searchHere ? query : "");
  const words = useMemo(() => queryWords(searched), [searched]);
  const text = searched.trim();
  const index = useMemo(() => textIndex(items, tagMap, commentMap), [items, tagMap, commentMap]);
  const vocab = useMemo(() => vocabulary(items, tagMap, memberNames), [items, tagMap, memberNames]);
  // The space, through the chips
  const chips = searchHere ? filters : NO_FILTERS;
  const base = useMemo(() => {
    if (!chips.length) return spaceItems;
    const test = filterTest(chips);
    return spaceItems.filter((i) => test(i, tagMap[i.web]));
  }, [spaceItems, tagMap, chips]);
  const local = useMemo(() => localScores(base.map((i) => i.web), index, words), [base, index, words]);

  // Meaning is asked for only when the words are not enough: nothing on the board has them, or the query reads as a
  // description (three words or more). A name the board already holds ("linear") answers at once, with no AI
  const needMeaning = text.length >= 3 && (local.size === 0 || words.length >= 3);
  const [semantic, setSemantic] = useState<{ q: string; scores: Record<string, number> } | null>(null);
  const [semanticBusy, setSemanticBusy] = useState(false);
  /** The meaning layer could not answer this query (network or server): Tino says so, plainly */
  const [failedFor, setFailedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!needMeaning) { setSemantic(null); setSemanticBusy(false); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setSemanticBusy(true);
      try {
        const res = await fetch("/api/search/semantic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text }), signal: ctrl.signal });
        const data = res.ok ? await res.json() : null;
        if (data?.scores) setSemantic({ q: text, scores: data.scores });
        else if (res.status >= 500) setFailedFor(text);
      } catch { if (!ctrl.signal.aborted) setFailedFor(text); /* the words layer stands alone */ }
      finally { if (!ctrl.signal.aborted) setSemanticBusy(false); }
    }, SEMANTIC_WAIT_MS);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [text, needMeaning]);
  // Only this query's answer counts: an older one would reorder the wrong results
  const near = semantic?.q === text ? semantic.scores : null;

  const [jev, setJev] = useState<{ q: string; scores: Record<string, number> } | null>(null);
  const [jevBusy, setJevBusy] = useState(false);
  const jevFor = useMemo(() => {
    if (!aiEnabled || !near || !isDescriptive(words, local.size)) return null;
    return rankText(base.map((i) => i.web), local, near, null).order.slice(0, JEV_TOP);
  }, [near, words, local, base, aiEnabled]);
  const jevKey = jevFor ? `${text}|${jevFor.join(",")}` : "";
  useEffect(() => {
    if (!jevFor?.length) { setJevBusy(false); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setJevBusy(true);
      try {
        const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text, webs: jevFor }), signal: ctrl.signal });
        const data = res.ok ? await res.json() : null;
        if (data?.scores) { setJev({ q: text, scores: data.scores }); if (!data.cached) loadQuota(); }
      } catch { /* the first two layers stand */ }
      finally { if (!ctrl.signal.aborted) setJevBusy(false); }
    }, JEV_WAIT_MS);
    return () => { clearTimeout(id); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jevKey]);
  const jevScores = jev?.q === text ? jev.scores : null;

  const ranked = useMemo(() => (words.length || near ? rankText(base.map((i) => i.web), local, near, jevScores) : null), [words, near, base, local, jevScores]);
  const filtered = useMemo(() => {
    if (!ranked) return [...base].sort(newestFirst);
    const byWeb = new Map(base.map((i) => [i.web, i]));
    return ranked.order.map((w) => byWeb.get(w)!).filter(Boolean);
  }, [ranked, base]);
  const searchBusy = semanticBusy || jevBusy;

  // Why each result is there: the tags the words found, else "close in meaning". Free, and instant.
  const reasons = useMemo(() => {
    if (!words.length) return null;
    const out: Record<string, string> = {};
    const labelMaps: Record<string, Record<string, string>> = { palette: t.taxonomy.color, sections: t.taxonomy.section, elements: t.taxonomy.element, type: t.taxonomy.type, layout: t.taxonomy.layout };
    for (const it of filtered.slice(0, 200)) {
      const v = viewOf(tagMap[it.web]);
      const labels = v ? [
        ...FACETS.flatMap((f) => v[f.field].map((k) => labelMaps[f.field][k] ?? k)),
        ...v.traits.map((k) => t.taxonomy.tag[k as keyof typeof t.taxonomy.tag] ?? k),
        ...v.keywords, ...v.credits,
      ] : [];
      const hit = labels.filter((l) => words.some((w) => norm(l).split(/\s+/).some((p) => p.startsWith(w)))).slice(0, 3);
      out[it.web] = hit.length ? hit.join(", ") : t.search.nearInMeaning;
    }
    return out;
  }, [filtered, words, tagMap, t]);
  const searchFailed = failedFor === text && !!text;
  return { text, words, chips, filtered, jevScores, reasons, vocab, searchBusy, jevBusy, searchFailed };
}
