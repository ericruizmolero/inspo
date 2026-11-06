"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { removeInspos } from "@/app/actions/library";
import type { InspoItem, PolishChoice, PolishVote } from "@/types/inspo";

// ─── Polish in the Cajón ─────────────────────────────────────────────────────
// The Cajón has no place further back to send a card to, and no project to hang votes on: Keep leaves it in the
// Cajón (remembered on this machine, per workspace) and Forget deletes it. One person decides at once, as alone in a
// project. A forgotten card leaves the Cajón at once but is only deleted on leaving Polish, so Undo brings it back
// for as long as one is in it (Eric, 06-11: "Se queda / se borra").
const KEPT_KEY = (workspaceId: string) => `criterio:inbox-kept:${workspaceId}`;
/** The project id the Cajón's keeps are filed under in the votes PolishView reads */
export const INBOX_POLISH = "inbox";

export function useInboxPolish({ workspaceId, userId, active, inbox, deletable, setItems, onFailed }: {
  workspaceId: string;
  userId: string;
  /** Polish open on the Cajón: forgotten cards wait to be deleted until this goes false */
  active: boolean;
  /** The Cajón's references */
  inbox: InspoItem[];
  deletable: (item: InspoItem) => boolean;
  setItems: Dispatch<SetStateAction<InspoItem[]>>;
  onFailed: (e: unknown) => void;
}) {
  const [kept, setKept] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    try { const raw = JSON.parse(localStorage.getItem(KEPT_KEY(workspaceId)) ?? "[]"); if (Array.isArray(raw)) setKept(new Set(raw.filter((x): x is string => typeof x === "string"))); } catch { /* it lasts the visit */ }
  }, [workspaceId]);
  const saveKept = useCallback((next: Set<string>) => {
    try { localStorage.setItem(KEPT_KEY(workspaceId), JSON.stringify([...next])); } catch { /* it lasts the visit */ }
  }, [workspaceId]);

  /** Forgotten here and out of the Cajón, not yet deleted */
  const bin = useRef(new Map<string, InspoItem>());
  const activeRef = useRef(active);
  activeRef.current = active;
  const failRef = useRef(onFailed);
  failRef.current = onFailed;
  const flush = useCallback(async () => {
    if (!bin.current.size) return;
    const gone = [...bin.current.values()];
    bin.current.clear();
    const r = await removeInspos(gone.map((i) => i.id!)).catch((e) => ({ ok: false as const, error: String(e) }));
    if (!r.ok) {
      setItems((prev) => [...gone.filter((g) => !prev.some((i) => i.id === g.id)), ...prev]);
      failRef.current(new Error(r.error));
    }
  }, [setItems]);
  // Leaving Polish deletes what was forgotten in it. A tick later: Polish hands over a card still in the air as it unmounts
  useEffect(() => {
    if (active) return;
    const timer = window.setTimeout(() => void flush(), 0);
    return () => window.clearTimeout(timer);
  }, [active, flush]);
  useEffect(() => {
    const away = () => void flush();
    window.addEventListener("pagehide", away);
    return () => { window.removeEventListener("pagehide", away); void flush(); };
  }, [flush]);

  /** What PolishView reads as this person's votes: the Cajón's keeps */
  const votes = useMemo(() => {
    const m = new Map<string, PolishVote[]>();
    for (const i of inbox) if (i.id && kept.has(i.id)) m.set(i.id, [{ projectId: INBOX_POLISH, itemId: i.id, userId, vote: "keep", closedAt: null, closedBy: null }]);
    return m;
  }, [inbox, kept, userId]);
  const left = inbox.filter((i) => i.id && !kept.has(i.id)).length;

  const vote = useCallback((list: InspoItem[], choice: PolishChoice | null) => {
    const ids = list.map((i) => i.id).filter((x): x is string => !!x);
    if (!ids.length) return;
    if (choice === "forget") {
      const mine = list.filter((i) => i.id && deletable(i));
      if (mine.length < list.length) failRef.current(new Error("not-yours"));
      if (!mine.length) return;
      for (const i of mine) bin.current.set(i.id!, i);
      const out = new Set(mine.map((i) => i.id));
      setItems((prev) => prev.filter((i) => !out.has(i.id)));
      if (!activeRef.current) void flush();
      return;
    }
    setKept((prev) => {
      const next = new Set(prev);
      for (const id of ids) if (choice === "keep") next.add(id); else next.delete(id);
      saveKept(next);
      return next;
    });
  }, [deletable, setItems, flush, saveKept]);
  /** Undo of a forget: back in the Cajón, if it has not been deleted yet */
  const restore = useCallback((item: InspoItem) => {
    const id = item.id;
    if (!id || !bin.current.has(id)) return;
    bin.current.delete(id);
    setItems((prev) => (prev.some((i) => i.id === id) ? prev : [item, ...prev]));
  }, [setItems]);

  return { votes, left, vote, restore };
}
