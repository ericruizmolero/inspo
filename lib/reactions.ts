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

/** A comment holds at most this many reactions in all, so a loop of clicks cannot grow a row without end */
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

/** Someone's reaction added, or taken away when they had already given it: what the tab shows before the server answers */
export function toggleIn(list: readonly CommentReaction[], emoji: string, me: { id: string; name: string }): CommentReaction[] {
  const g = list.find((x) => x.emoji === emoji);
  if (!g) return [...list, { emoji, people: [me] }];
  const had = g.people.some((p) => p.id === me.id);
  const people = had ? g.people.filter((p) => p.id !== me.id) : [...g.people, me];
  return people.length ? list.map((x) => (x === g ? { emoji, people } : x)) : list.filter((x) => x !== g);
}
