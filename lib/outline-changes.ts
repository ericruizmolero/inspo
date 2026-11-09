// A landing's plan changed section by section (set_outline with changes, lib/mcp/pieces.ts): the rest stays as saved.
import { HttpError } from "./workspace-core";
import type { LandingSection } from "@/types/landing";

/** One change to a saved plan: the section at a place (1 is the first) replaced, removed, or a new one put there */
export interface OutlineChange { at: number; section?: LandingSection; insert?: boolean; remove?: boolean }

/** A plan's sections after the changes, each place read against the plan as it was given */
export function changedSections(sections: readonly LandingSection[], changes: readonly OutlineChange[]): LandingSection[] {
  const slots: (LandingSection | null)[][] = sections.map((s) => [s]);
  const tail: LandingSection[] = [];
  for (const c of changes) {
    const i = Math.trunc(c.at) - 1;
    if (c.insert) {
      if (!c.section) throw new HttpError(400, `The change at ${c.at} inserts a section but gives none.`);
      if (i >= sections.length) { tail.push(c.section); continue; }
      if (i < 0) throw new HttpError(400, `There is no place ${c.at}: the first is 1.`);
      slots[i].splice(slots[i].length - 1, 0, c.section);
      continue;
    }
    if (i < 0 || i >= sections.length) throw new HttpError(400, `There is no section ${c.at}: the plan has ${sections.length}.`);
    const own = slots[i].length - 1;
    if (c.remove) slots[i][own] = null;
    else if (c.section) slots[i][own] = c.section;
    else throw new HttpError(400, `The change at ${c.at} needs a section, insert or remove.`);
  }
  return [...slots.flat().filter((s): s is LandingSection => !!s), ...tail];
}

