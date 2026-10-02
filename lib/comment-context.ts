// What the team said about a reference, as the models read it. One shape for every prompt and for search:
// each comment with where it is (pinned at a place on the page, or about the whole reference) and the replies
// under it. Pure, so every caller loads its rows its own way and they all read the same.

export interface CommentRowLike {
  id: string;
  parentId?: string | null;
  author: string;
  body: string;
  at: Date | string;
  /** Pinned: x and y as 0..1 of the page image */
  anchor?: { x: number; y: number } | null;
}

export interface Thread {
  author: string;
  body: string;
  /** ISO */
  at: string;
  /** Where on the page, in words ("pinned 35% down the page, on the left"), for a pinned comment */
  place?: string;
  replies: { author: string; body: string; at: string }[];
}

const iso = (at: Date | string) => (typeof at === "string" ? at : at.toISOString());

/** A pin's place in words: how far down the page and which side */
export function placeOf(anchor: { x: number; y: number }): string {
  const side = anchor.x < 1 / 3 ? "on the left" : anchor.x > 2 / 3 ? "on the right" : "in the middle";
  return `pinned ${Math.round(anchor.y * 100)}% down the page, ${side}`;
}

/** The comments grouped into threads, oldest first; replies under their comment, oldest first. Text only: a
 *  bare screenshot says nothing a model can quote. A reply whose comment is missing stands on its own. */
export function threadsOf(rows: CommentRowLike[]): Thread[] {
  const said = rows.filter((r) => r.body.trim()).sort((a, b) => iso(a.at).localeCompare(iso(b.at)));
  const ids = new Set(said.map((r) => r.id));
  const threads = new Map<string, Thread>();
  for (const r of said) {
    if (r.parentId && ids.has(r.parentId)) continue;
    threads.set(r.id, { author: r.author, body: r.body.trim(), at: iso(r.at), ...(r.anchor ? { place: placeOf(r.anchor) } : {}), replies: [] });
  }
  for (const r of said) {
    if (!r.parentId) continue;
    threads.get(r.parentId)?.replies.push({ author: r.author, body: r.body.trim(), at: iso(r.at) });
  }
  return [...threads.values()];
}

/** One line per thread: "Eric (pinned 35% down the page, on the left): … — replies: Andoni: …". Each body is
 *  cut to `chars`. */
export function threadLines(rows: CommentRowLike[], chars = 1000): string[] {
  const cut = (s: string) => (s.length > chars ? `${s.slice(0, chars)}…` : s);
  return threadsOf(rows).map((t) => {
    const head = `${t.author}${t.place ? ` (${t.place})` : ""}: ${cut(t.body)}`;
    return t.replies.length ? `${head} — replies: ${t.replies.map((r) => `${r.author}: ${cut(r.body)}`).join(" / ")}` : head;
  });
}

/** A voice as one block of a prompt: who said it, where it is pinned, the words, then its replies */
export function voiceText(v: { author: string; body: string; place?: string; replies?: { author: string; body: string }[] }): string {
  const where = v.place ? ` (${v.place})` : "";
  const replies = (v.replies ?? []).map((r) => `\n   ↳ reply from ${r.author}: """${r.body}"""`).join("");
  return `${v.author}${where}: """${v.body}"""${replies}`;
}
