// A landing as a plan: an ordered list of sections, each with its job towards the page's one goal. Stored on
// project_system.outlines. One project can hold several: they share the criterio, the references and what was learned,
// which key on a section's kind, so a correction to a hero holds for every hero of the brand. Shared by client and server.
import { SECTIONS } from "@/lib/taxonomy";

export const SECTION_KINDS = SECTIONS.map((s) => s.key) as [string, ...string[]];
export const OUTLINES_MAX = 20;
export const OUTLINE_SECTIONS_MAX = 16;
export const OUTLINE_TEXT_MAX = 300;

export interface LandingSection {
  /** A kind of SECTIONS (lib/taxonomy.ts): the same word the references are tagged with */
  kind: string;
  /** What this section does for the goal. A section with no job towards it does not belong on the page */
  job: string;
  /** What backs it, from the project's answers */
  proof?: string;
  /** The action it asks for, when it asks for one */
  cta?: string;
  /** The references it draws from, by item id */
  refs: string[];
}

export interface LandingOutline {
  id: string;
  name: string;
  /** The one thing someone should do after seeing the page */
  goal: string;
  sections: LandingSection[];
  /** Set when the landing exists: this closes the Build path */
  built?: { at: string; via?: string; url?: string };
}

const str = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, max) : "");

function readSection(v: unknown): LandingSection[] {
  if (!v || typeof v !== "object") return [];
  const r = v as Record<string, unknown>;
  const kind = str(r.kind, 40), job = str(r.job, OUTLINE_TEXT_MAX);
  if (!SECTION_KINDS.includes(kind) || !job) return [];
  const proof = str(r.proof, OUTLINE_TEXT_MAX), cta = str(r.cta, OUTLINE_TEXT_MAX);
  const refs = Array.isArray(r.refs) ? r.refs.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
  return [{ kind, job, ...(proof ? { proof } : {}), ...(cta ? { cta } : {}), refs }];
}

/** The stored list read into its shape: an outline with no name, goal or sections drops */
export function readOutlines(v: unknown): LandingOutline[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x): LandingOutline[] => {
    if (!x || typeof x !== "object") return [];
    const r = x as Record<string, unknown>;
    const id = str(r.id, 40), name = str(r.name, 80), goal = str(r.goal, OUTLINE_TEXT_MAX);
    const sections = Array.isArray(r.sections) ? r.sections.flatMap(readSection).slice(0, OUTLINE_SECTIONS_MAX) : [];
    if (!id || !name || !goal || !sections.length) return [];
    const b = r.built as Record<string, unknown> | null | undefined;
    const at = b ? str(b.at, 40) : "";
    const via = b ? str(b.via, 80) : "", url = b ? str(b.url, 2000) : "";
    return [{ id, name, goal, sections, ...(at ? { built: { at, ...(via ? { via } : {}), ...(url ? { url } : {}) } } : {}) }];
  }).slice(0, OUTLINES_MAX);
}
