// criterio.md: the project's system as a file an agent reads before designing. Shared by client
// (download, copy) and server (the check script). Headings are the reader's language; the body is
// whatever language the decisions were written in.
import { SYSTEM_AREAS, confidenceOf, type ProjectSystem, type SystemArea } from "@/types/system";

export interface CriterioMdInput {
  project: string;
  system: ProjectSystem;
  /** The workspace's references by id, for the names and URLs behind each decision */
  items: Record<string, { name: string; web: string }>;
  labels: Record<SystemArea, string>;
  strings: { intro: string; summary: string; decided: string; proposed: string; open: string; confidence: string; evidence: string; take: string; why: string };
}

export function renderCriterioMd({ project, system, items, labels, strings }: CriterioMdInput): string {
  const L: string[] = [];
  const p = (s = "") => L.push(s);
  const date = (system.updatedAt ?? new Date().toISOString()).slice(0, 10);

  p(`# ${project}: criterio.md`);
  p();
  p(`> ${strings.intro}`);
  p();
  p(`**criterio.design** · ${date}`);
  p();
  if (system.summary) {
    p(`## ${strings.summary}`);
    p();
    p(system.summary);
    p();
  }
  for (const key of SYSTEM_AREAS) {
    const a = system.areas.find((x) => x.area === key);
    p(`## ${labels[key]}`);
    p();
    if (!a || !a.decision) { p(`_${strings.open}_`); p(); continue; }
    const level = confidenceOf(a);
    const status = a.source === "team" ? strings.decided : strings.proposed;
    p(a.decision);
    p();
    if (a.why) { p(`**${strings.why}:** ${a.why}`); p(); }
    p(`- **${status}**${level === "low" ? ` · ${strings.confidence} ${a.confidence}/100` : ""}`);
    if (a.evidence.length) {
      p(`- **${strings.evidence}:**`);
      for (const e of a.evidence) {
        const it = items[e.itemId];
        const name = it ? `[${it.name}](${it.web})` : e.itemId;
        p(`  - ${name}${e.take ? `. ${strings.take}: ${e.take}` : ""}`);
      }
    }
    p();
  }
  return L.join("\n");
}
