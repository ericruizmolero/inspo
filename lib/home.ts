// What the home (components/ProjectChooser.tsx) offers under its box, and the order of its projects.
import type { InspoItem, Project } from "@/types/inspo";
import { parseDate } from "@/lib/search-query";

/** A quick action under the box: the inbox to sort (only when it holds something), a link to save, the last project */
export type HomeAction = { kind: "inbox"; count: number } | { kind: "save" } | { kind: "continue"; project: Project };

export function homeActions(inbox: number, last: Project | null): HomeAction[] {
  const out: HomeAction[] = [];
  if (inbox > 0) out.push({ kind: "inbox", count: inbox });
  out.push({ kind: "save" });
  if (last) out.push({ kind: "continue", project: last });
  return out;
}

export type ProjectSort = "recent" | "name";
export const PROJECT_SORTS: readonly ProjectSort[] = ["recent", "name"];
export const isProjectSort = (v: unknown): v is ProjectSort => PROJECT_SORTS.includes(v as ProjectSort);

const DAY = 86_400_000;

/** Recent: the day of its newest reference (`newest`, newest first) or the day it was made, whichever is later; on a
 *  tie, the one made later. A reference carries only the day it was saved, not the day it was filed, so both count
 *  in days */
export function sortProjects(projects: Project[], newest: Record<string, InspoItem[]>, sort: ProjectSort, locale: string): Project[] {
  if (sort === "name") return [...projects].sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base", numeric: true }));
  const touched = (p: Project) => Math.max(parseDate(newest[p.id]?.[0]?.date ?? ""), Math.floor((Date.parse(p.createdAt ?? "") || 0) / DAY) * DAY);
  // The list comes oldest first (lib/projects.ts loadProjects): reversed, a tie keeps the one made later on top
  return [...projects].reverse().sort((a, b) => touched(b) - touched(a));
}
