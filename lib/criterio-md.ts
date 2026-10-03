// criterio.md: the project's system as a file an agent reads before designing. Shared by client
// (download, copy, the Markdown view) and server (the check script). Headings are the reader's language;
// the body is whatever language the decisions were written in.
//
// The file is built in blocks (the head, the paragraph, one block per area) so the app can show it as it
// is and let a block be edited: the system stays the one source, the file is its other face.
import { SYSTEM_AREAS, confidenceOf, type ProjectSystem, type SystemArea } from "@/types/system";

export interface CriterioMdInput {
  project: string;
  system: ProjectSystem;
  /** The workspace's references by id, for the names and URLs behind each decision */
  items: Record<string, { name: string; web: string }>;
  labels: Record<SystemArea, string>;
  strings: { intro: string; summary: string; decided: string; proposed: string; open: string; confidence: string; evidence: string; take: string; why: string };
}

export type CriterioBlock =
  /** The title, the note to the reader and the date, as lines of the file */
  | { kind: "head"; lines: string[] }
  | { kind: "summary"; heading: string; text: string }
  | {
    kind: "area"; area: SystemArea; heading: string;
    /** Empty when the area is open */
    decision: string; why: string;
    whyLabel: string; openText: string;
    /** The status and the references behind the decision, as lines of the file */
    meta: string[];
  };

export function criterioBlocks({ project, system, items, labels, strings }: CriterioMdInput): CriterioBlock[] {
  const date = (system.updatedAt ?? new Date().toISOString()).slice(0, 10);
  const blocks: CriterioBlock[] = [{ kind: "head", lines: [`# ${project}: criterio.md`, `> ${strings.intro}`, `**criterio.design** · ${date}`] }];
  if (system.summary) blocks.push({ kind: "summary", heading: strings.summary, text: system.summary });
  for (const key of SYSTEM_AREAS) {
    const a = system.areas.find((x) => x.area === key);
    const base = { kind: "area" as const, area: key, heading: labels[key], whyLabel: strings.why, openText: strings.open };
    if (!a || !a.decision) { blocks.push({ ...base, decision: "", why: "", meta: [] }); continue; }
    const level = confidenceOf(a);
    const status = a.source === "team" ? strings.decided : strings.proposed;
    const meta = [`- **${status}**${level === "low" ? ` · ${strings.confidence} ${a.confidence}/100` : ""}`];
    if (a.evidence.length) {
      meta.push(`- **${strings.evidence}:**`);
      for (const e of a.evidence) {
        const it = items[e.itemId];
        const name = it ? `[${it.name}](${it.web})` : e.itemId;
        meta.push(`  - ${name}${e.take ? `. ${strings.take}: ${e.take}` : ""}`);
      }
    }
    blocks.push({ ...base, decision: a.decision, why: a.why, meta });
  }
  return blocks;
}

/** The file, from its blocks */
export function blocksToMd(blocks: CriterioBlock[]): string {
  const L: string[] = [];
  const p = (s = "") => L.push(s);
  for (const b of blocks) {
    if (b.kind === "head") { for (const line of b.lines) { p(line); p(); } continue; }
    if (b.kind === "summary") { p(`## ${b.heading}`); p(); p(b.text); p(); continue; }
    p(`## ${b.heading}`);
    p();
    if (!b.decision) { p(`_${b.openText}_`); p(); continue; }
    p(b.decision);
    p();
    if (b.why) { p(`**${b.whyLabel}:** ${b.why}`); p(); }
    for (const line of b.meta) p(line);
    p();
  }
  return L.join("\n");
}

export function renderCriterioMd(input: CriterioMdInput): string {
  return blocksToMd(criterioBlocks(input));
}
