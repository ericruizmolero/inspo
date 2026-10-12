// Emoji reactions on a comment, as in Slack or WhatsApp. Only these can be given: the picker shows them and the
// server refuses anything else. The first row is the quick one.
import type { CommentReaction } from "@/types/inspo";

export const REACTIONS = [
  "👍", "❤️", "😂", "🔥", "👀", "🙌",
  "👏", "🎉", "😍", "🤔", "😮", "😢",
  "🙏", "💯", "✅", "❌", "🎯", "✨",
  "💡", "🚀", "👌", "🤯", "😅", "🫶",
] as const;

export const isReaction = (e: unknown): e is string => typeof e === "string" && (REACTIONS as readonly string[]).includes(e);

/** A comment holds at most this many reactions (one per person), so a row cannot grow without end */
export const MAX_REACTIONS = 200;

/** The rows grouped by emoji, in the order each emoji was first given */
export function groupReactions(rows: readonly { e: string; u: string; n: string }[]): CommentReaction[] {
  const out: CommentReaction[] = [];
  for (const r of rows) {
    const g = out.find((x) => x.emoji === r.e);
    if (g) g.people.push({ id: r.u, name: r.n }); else out.push({ emoji: r.e, people: [{ id: r.u, name: r.n }] });
  }
  return out;
}

/** Someone's reaction given: one each, so another emoji replaces theirs and the same one again takes it away. What
 *  the tab shows before the server answers, the same rule as toggleReaction in lib/comments.ts */
export function toggleIn(list: readonly CommentReaction[], emoji: string, me: { id: string; name: string }): CommentReaction[] {
  const had = list.some((g) => g.emoji === emoji && g.people.some((p) => p.id === me.id));
  const out = list.map((g) => ({ emoji: g.emoji, people: g.people.filter((p) => p.id !== me.id) })).filter((g) => g.people.length);
  if (had) return out;
  const g = out.find((x) => x.emoji === emoji);
  return g ? out.map((x) => (x === g ? { emoji, people: [...g.people, me] } : x)) : [...out, { emoji, people: [me] }];
}
