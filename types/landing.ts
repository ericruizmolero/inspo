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

/** A way the hero could go, proposed with the plan: what changes against the others and the references behind it */
export interface HeroDirection {
  name: string;
  /** What changes: type, layout, density or tone, never colour alone */
  change: string;
  /** The references it leans on, by item id */
  refs: string[];
}
export const DIRECTIONS_MAX = 4;

export interface LandingOutline {
  id: string;
  name: string;
  /** The one thing someone should do after seeing the page */
  goal: string;
  sections: LandingSection[];
  /** Set when the landing exists: this closes the Build path */
  built?: { at: string; via?: string; url?: string };
  /** Hero directions to build and choose between */
  directions?: HeroDirection[];
  /** Drafted by an agent from its own context and not accepted yet: the app shows it as a suggestion, the file as a draft */
  draft?: { at: string; via?: string; origin?: string };
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

function readDirection(v: unknown): HeroDirection[] {
  if (!v || typeof v !== "object") return [];
  const r = v as Record<string, unknown>;
  const name = str(r.name, 80), change = str(r.change, OUTLINE_TEXT_MAX);
  if (!name || !change) return [];
  return [{ name, change, refs: Array.isArray(r.refs) ? r.refs.filter((x): x is string => typeof x === "string").slice(0, 12) : [] }];
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
    const directions = Array.isArray(r.directions) ? r.directions.flatMap(readDirection).slice(0, DIRECTIONS_MAX) : [];
    const d = r.draft as Record<string, unknown> | null | undefined;
    const draftAt = d ? str(d.at, 40) : "", draftVia = d ? str(d.via, 80) : "", origin = d ? str(d.origin, 200) : "";
    return [{
      id, name, goal, sections,
      ...(at ? { built: { at, ...(via ? { via } : {}), ...(url ? { url } : {}) } } : {}),
      ...(directions.length ? { directions } : {}),
      ...(draftAt ? { draft: { at: draftAt, ...(draftVia ? { via: draftVia } : {}), ...(origin ? { origin } : {}) } } : {}),
    }];
  }).slice(0, OUTLINES_MAX);
}
