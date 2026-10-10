// What the team said about a reference, as the models read it. One shape for every prompt and for search:
// each comment with the replies under it. Pure, so every caller loads its rows its own way and they all read
// the same.

export interface CommentRowLike {
  id: string;
  parentId?: string | null;
  author: string;
  body: string;
  at: Date | string;
}

interface Thread {
  author: string;
  body: string;
  /** ISO */
  at: string;
  replies: { author: string; body: string; at: string }[];
}

const iso = (at: Date | string) => (typeof at === "string" ? at : at.toISOString());

/** The comments grouped into threads, oldest first; replies under their comment, oldest first. Text only: a
 *  bare screenshot says nothing a model can quote. A reply whose comment is missing stands on its own. */
function threadsOf(rows: CommentRowLike[]): Thread[] {
  const said = rows.filter((r) => r.body.trim()).sort((a, b) => iso(a.at).localeCompare(iso(b.at)));
  const ids = new Set(said.map((r) => r.id));
  const threads = new Map<string, Thread>();
  for (const r of said) {
    if (r.parentId && ids.has(r.parentId)) continue;
    threads.set(r.id, { author: r.author, body: r.body.trim(), at: iso(r.at), replies: [] });
  }
  for (const r of said) {
    if (!r.parentId) continue;
    threads.get(r.parentId)?.replies.push({ author: r.author, body: r.body.trim(), at: iso(r.at) });
  }
  return [...threads.values()];
}

/** One line per thread: "Eric: … — replies: Andoni: …". Each body is cut to `chars`. */
export function threadLines(rows: CommentRowLike[], chars = 1000): string[] {
  const cut = (s: string) => (s.length > chars ? `${s.slice(0, chars)}…` : s);
  return threadsOf(rows).map((t) => {
    const head = `${t.author}: ${cut(t.body)}`;
    return t.replies.length ? `${head} — replies: ${t.replies.map((r) => `${r.author}: ${cut(r.body)}`).join(" / ")}` : head;
  });
}
