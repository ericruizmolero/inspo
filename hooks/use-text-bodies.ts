"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readTexts } from "@/app/actions/text";
import { mediaKindOf } from "@/lib/url";
import type { InspoItem } from "@/types/inspo";

/** The words of the library's text references, by item id (their files are read once each).
 *  A text that could not be read is null; one not asked for yet is missing. The second value sets a
 *  text's words here once they were saved, so every place that shows them follows. */
export function useTextBodies(items: InspoItem[]): [Record<string, string | null>, (id: string, text: string) => void] {
  const [bodies, setBodies] = useState<Record<string, string | null>>({});
  const asked = useRef(new Set<string>());
  const ids = items.filter((i) => i.id && mediaKindOf(i.web) === "text").map((i) => i.id!).join(",");
  useEffect(() => {
    const want = ids.split(",").filter((id) => id && !asked.current.has(id));
    if (!want.length) return;
    for (const id of want) asked.current.add(id);
    void readTexts(want).then((r) => {
      if (!r.ok) { for (const id of want) asked.current.delete(id); return; }
      setBodies((prev) => ({ ...prev, ...Object.fromEntries(want.map((id) => [id, r.data[id] ?? null])) }));
    }).catch(() => { for (const id of want) asked.current.delete(id); });
  }, [ids]);
  const setBody = useCallback((id: string, text: string) => setBodies((prev) => ({ ...prev, [id]: text })), []);
  return [bodies, setBody];
}
