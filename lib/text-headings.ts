// Apart from lib/criterio-md.ts so the board can use it without loading the file builder and its skills text.
// criterio.md lowers a text's own headings to #### below its entry (### R4 · …).

const one = (s: string) => s.replace(/\s+/g, " ").trim();

/** The other way, for a text typed over in the file: a heading that is still there goes back to the level it
 *  had in the text as it was kept; one written new stays as typed */
export function restoreTextHeadings(edited: string, original: string): string {
  const level = new Map<string, string>();
  for (const l of original.split("\n")) { const m = l.match(/^(#{1,3})\s+(.*)$/); if (m && !level.has(one(m[2]))) level.set(one(m[2]), m[1]); }
  if (!level.size) return edited;
  return edited.split("\n").map((l) => { const m = l.match(/^####\s+(.*)$/); const was = m && level.get(one(m[1])); return was ? `${was} ${m![1]}` : l; }).join("\n");
}
