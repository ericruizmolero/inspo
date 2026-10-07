// Reading a project's polish votes (types/inspo.ts PolishVote), for the view and for its tab: who said what
// about a reference, what would happen to it if the polish closed now, and who has gone through the whole board.
import type { PolishChoice, PolishVote } from "@/types/inspo";

/** What the open votes on a reference add up to: all who voted agree, or they do not ("doubt"). Null with no open vote */
export type PolishOutcome = PolishChoice | "doubt" | null;

export const openVotes = (votes: PolishVote[] | undefined) => (votes ?? []).filter((v) => !v.closedAt);

export function outcomeOf(votes: PolishVote[] | undefined): PolishOutcome {
  const open = openVotes(votes);
  if (!open.length) return null;
  return open.every((v) => v.vote === open[0].vote) ? open[0].vote : "doubt";
}

/** A project's votes by reference */
export function votesByItem(votes: PolishVote[], projectId: string): Map<string, PolishVote[]> {
  const by = new Map<string, PolishVote[]>();
  for (const v of votes) {
    if (v.projectId !== projectId) continue;
    const list = by.get(v.itemId);
    if (list) list.push(v); else by.set(v.itemId, [v]);
  }
  return by;
}

/** Who has voted every reference on the board, settled votes included: their pass is done */
export function finishedOf(itemIds: string[], by: Map<string, PolishVote[]>, memberIds: string[]): Set<string> {
  const done = new Set<string>();
  if (!itemIds.length) return done;
  for (const id of memberIds) if (itemIds.every((itemId) => by.get(itemId)?.some((v) => v.userId === id))) done.add(id);
  return done;
}

/** Who the polish forgot a reference with, once it is off the board: those who voted to, and whoever closed it
 *  when the others wanted it kept. Empty when it was not the polish that took it off */
export function forgottenBy(votes: PolishVote[] | undefined): string[] {
  const closed = (votes ?? []).filter((v) => v.closedAt);
  const who = closed.filter((v) => v.vote === "forget").map((v) => v.userId);
  const closer = closed.find((v) => v.closedBy)?.closedBy;
  if (closer && closed.some((v) => v.vote === "keep") && !who.includes(closer)) who.push(closer);
  return closed.length ? who : [];
}
