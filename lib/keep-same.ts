// Polls bring the whole state back each time, as new objects even when nothing changed. Swapped in as they
// come, every card, the layout and the system view render again for nothing. keepSame hands back the old
// objects wherever the new ones are equal by value, so an unchanged poll is the same state to React and a
// changed card is the only one that renders.

const isPlain = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);

/** `next`, reusing `prev` and any part of it that is equal by value (plain objects, arrays and primitives) */
export function keepSame<T>(prev: T, next: T): T {
  if (Object.is(prev, next)) return prev;
  if (Array.isArray(prev) && Array.isArray(next)) {
    let same = prev.length === next.length;
    const out = next.map((v, i) => { const kept = keepSame(prev[i], v); if (!Object.is(kept, prev[i])) same = false; return kept; });
    return (same ? prev : out) as T;
  }
  if (isPlain(prev) && isPlain(next)) {
    const keys = Object.keys(next);
    let same = keys.length === Object.keys(prev).length;
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      const kept = keepSame(prev[k], next[k]);
      if (!(k in prev) || !Object.is(kept, prev[k])) same = false;
      out[k] = kept;
    }
    return (same ? prev : out) as T;
  }
  return next;
}
