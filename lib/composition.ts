// How each reference of a project is built as a page, read once from its stored picture so the system pass can
// count the structures the team keeps saving (lib/composition-core.ts). Server only.
//
// What it costs: one call to the tagger's cheap vision model per reference (~$0.0004), only for the references of
// a project, only once per reference and COMPOSITION_VERSION. It is kept on the item's tags (tags_json.composition),
// so it travels wherever the tags do: the board, the file, the MCP.
import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { llm } from "./llm";
import { prompt } from "./prompts";
import { storedPicture } from "./tagger";
import { mediaKindOf } from "./url";
import { billOf, recordUsage, type UsageCtx } from "./usage";
import { AUTO_REF } from "./usage-core";
import { COMPOSITION_VERSION, FIXED, NAV, OPENING, PAGE_KINDS, STRUCTURES, keysOf } from "./composition-core";
import type { InspoTags, RefComposition } from "@/types/inspo";
import { log } from "./log";

const T = schema.inspoItem;
const PI = schema.projectItem;

const list = (terms: { key: string; description: string }[]) => terms.map((t) => `- ${t.key}: ${t.description}`).join("\n");

const CompositionSchema = z.object({
  page: z.enum(keysOf(PAGE_KINDS)),
  structure: z.enum(keysOf(STRUCTURES)),
  side_share: z.number().int().min(0).max(50).describe("The narrower column's share of the page width in percent; 0 when there is no side column"),
  fixed: z.enum(keysOf(FIXED)),
  nav: z.enum(keysOf(NAV)),
  opening: z.enum(keysOf(OPENING)),
  sketch: z.string().describe("One plain English sentence of 15 to 40 words"),
});

export const COMPOSITION_SYSTEM = `You read how a saved design reference is built as a page: its columns, what stays put while the rest scrolls, where the navigation sits. A designer will ask an agent to build a page "like the ones I keep saving", so be literal: describe the structure you see, never the style.

The picture is a capture of the page's first screens (a full-page capture is cut at five screens) or a saved image or post.

page, what the reference shows:
${list(PAGE_KINDS)}

structure, how the page divides its width (read the main body, not the footer):
${list(STRUCTURES)}

side_share: for aside-left or aside-right, the narrower column's share of the width in percent (25 for a quarter). 0 otherwise.

fixed, what stays where it is while the page scrolls:
${list(FIXED)}

nav:
${list(NAV)}

opening, what the first screen leads with:
${list(OPENING)}

sketch: the build in one sentence a developer could lay out from: what sits in each column or band, in what order, what stays and what scrolls ("Narrow left column, about a quarter, holds the name, a short bio and contact and stays put; the right column runs a vertical list of large project images with small captions"). No colours, no typefaces, no adjectives of taste.

A photo, an illustration, a logo or a type specimen is page "not-a-page", structure "none", fixed "none", nav "none", opening "none", and its sketch says in a few words what it is.`;

/** One reference's composition from its stored picture; null when it has no picture to read */
async function readOne(web: string, name: string, usage: UsageCtx): Promise<RefComposition | null> {
  const image = await storedPicture(web);
  if (!image) return null;
  const res = await llm({ ...prompt("composition", { system: COMPOSITION_SYSTEM, text: `Name: ${name}\nRead how it is built.`, image, schema: CompositionSchema }) });
  // Nobody asked for it by hand: logged with its cost, never one of the plan's AI actions
  void recordUsage(usage, { action: "composition", ...billOf(res), ref: `${AUTO_REF}${web}` });
  const out = CompositionSchema.parse(JSON.parse(res.text));
  const aside = out.structure === "aside-left" || out.structure === "aside-right";
  return {
    page: out.page, structure: out.structure, share: aside ? out.side_share : 0,
    fixed: out.fixed, nav: out.nav, opening: out.opening,
    sketch: out.sketch.trim().split(/\s+/).slice(0, 50).join(" "), v: COMPOSITION_VERSION,
  };
}

/** References read per pass at most, and how long a pass waits for them: what is left is read on the next one */
const PER_PASS = 60;
const PARALLEL = 6;

/**
 * Reads the composition of every reference of the project that has tags but no current composition, a few at a
 * time, until `deadlineMs`. Never throws: a reference that fails stays unread and is tried on the next pass.
 * Returns how many were read.
 */
export async function ensureCompositions(organizationId: string, projectId: string, usage: UsageCtx, { deadlineMs = 25_000 } = {}): Promise<number> {
  const rows = await db.select({ id: T.id, web: T.web, name: T.name, tags: T.tagsJson }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId)));
  const due = rows.filter((r) => {
    const kind = mediaKindOf(r.web);
    const tags = r.tags as InspoTags | null;
    return tags && kind !== "text" && kind !== "video" && (tags.composition?.v ?? 0) < COMPOSITION_VERSION;
  }).slice(0, PER_PASS);
  if (!due.length) return 0;
  const until = Date.now() + deadlineMs;
  let read = 0;
  const queue = [...due];
  const worker = async () => {
    for (let r = queue.shift(); r && Date.now() < until; r = queue.shift()) {
      try {
        const c = await readOne(r.web, r.name, usage);
        // Only the composition is written, on the tags as they are now: a retag in between keeps its own
        // A reference with no picture is marked read with nothing to say, so it is not asked again
        const value: RefComposition = c ?? { page: "not-a-page", structure: "none", share: 0, fixed: "none", nav: "none", opening: "none", sketch: "", v: COMPOSITION_VERSION };
        await db.update(T).set({ tagsJson: sql`jsonb_set(${T.tagsJson}, '{composition}', ${JSON.stringify(value)}::jsonb)` })
          .where(and(eq(T.id, r.id), sql`${T.tagsJson} is not null`));
        read++;
      } catch (err) {
        log.warn("composition.read_failed", { ref: r.web, err });
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  log.info("composition.read", { ref: projectId, due: due.length, read });
  return read;
}

/** The compositions already read for these items, by item id */
export async function compositionsOf(itemIds: string[]): Promise<Map<string, RefComposition>> {
  if (!itemIds.length) return new Map();
  const rows = await db.select({ id: T.id, c: sql<RefComposition | null>`${T.tagsJson}->'composition'` }).from(T).where(inArray(T.id, itemIds));
  return new Map(rows.filter((r) => r.c).map((r) => [r.id, r.c!]));
}
