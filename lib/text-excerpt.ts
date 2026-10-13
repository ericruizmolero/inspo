// A pasted text's words on one line, without its Markdown marks: what its card shows and what the models are told of
// it. Pure, so the board's card can make it from the whole text it already has.

/** What the tags keep of it (lib/text-refs.ts textTags): enough for a small card and for the models */
const EXCERPT_MAX = 480;

/** Its first lines on one line: what the card shows and what the models are told of it */
export function excerptOf(text: string, max = EXCERPT_MAX): string {
  // Markdown marks are dropped and the lines run on: a list reads as an enumeration
  const lines = text.split("\n").filter((l) => !/^\s*(```|~~~|([-*_])(\s*\2){2,}\s*$)/.test(l))
    .map((l) => l.replace(/^\s*(>\s*)?((#{1,6}|[-*+\u2022]|\d+[.)])\s+)?(\[[ xX]\]\s+)?/, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*|__|~~|`/g, "").replace(/(^|[^\p{L}\p{N}])[*_](?=\S)|(?<=\S)[*_](?![\p{L}\p{N}])/gu, "$1").replace(/\s+/g, " ").trim()).filter(Boolean);
  const one = lines.reduce((all, l) => (all ? `${all}${/[.:;!?\u2026]$/.test(all) ? " " : ", "}${l}` : l), "");
  return one.length > max ? `${one.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : one;
}
