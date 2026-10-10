// A project's brief (types/brief.ts), kept on project.brief: saved here, and turned here into what every prompt
// reads (briefForModel, briefPrompt). criterio.md writes it with briefLines (lib/criterio-md.ts).
import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError } from "./workspace-core";
import { getErrors } from "./i18n";
import { SECTORS } from "./taxonomy";
import { readBrief, type Brief } from "@/types/brief";

const P = schema.project;

async function stored(organizationId: string, projectId: string): Promise<unknown> {
  const [row] = await db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!row) throw new HttpError(404, (await getErrors()).projectNotFound);
  return row.brief;
}
const write = (organizationId: string, projectId: string, brief: Brief) =>
  db.update(P).set({ brief, updatedAt: new Date() }).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId)));

const SECTOR_KEYS = new Set(SECTORS.map((s) => s.key));

/** Cleans what was sent: unknown keys drop, texts are cut, lists are capped, the sector is a SECTORS key. */
export function cleanBrief(input: Record<string, unknown>, userId: string): Brief {
  const b = readBrief(input) ?? readBrief({})!;
  return { ...b, sector: b.sector && SECTOR_KEYS.has(b.sector) ? b.sector : null, updatedAt: new Date().toISOString(), updatedBy: userId };
}

/** Saves the brief. What is not sent stays: the sentence alone is the usual call, the client's site is set on its own.
 *  A field the team sends is theirs now, so it leaves `drafted`, unless the call sends `drafted` itself (the draft) */
export async function saveBrief(organizationId: string, projectId: string, input: Partial<Brief>, userId: string): Promise<{ brief: Brief }> {
  const current = readBrief(await stored(organizationId, projectId));
  const drafted = input.drafted ?? (current?.drafted ?? []).filter((k) => !(k in input));
  const brief = cleanBrief({ ...(current ?? {}), ...input, drafted }, userId);
  await write(organizationId, projectId, brief);
  return { brief };
}

/** Marks the reference that is the client's current site (a redesign), or clears it. Only a reference filed in the project */
export async function setClientBrand(organizationId: string, projectId: string, itemId: string | null, userId: string): Promise<void> {
  const current = await stored(organizationId, projectId);
  if (itemId) {
    const PI = schema.projectItem;
    const [own] = await db.select({ id: PI.itemId }).from(PI).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId), eq(PI.itemId, itemId))).limit(1);
    if (!own) throw new HttpError(400, (await getErrors()).badBody);
  }
  const base = readBrief(current) ?? cleanBrief({}, userId);
  await write(organizationId, projectId, { ...base, clientItemId: itemId, updatedAt: new Date().toISOString(), updatedBy: userId });
}

// ─── What the models read ──────────────────────────────────────────────────

const MODEL_KEYS: Record<Exclude<keyof Brief, "drafted" | "clientItemId" | "updatedAt" | "updatedBy">, string> = {
  about: "about", sector: "sector", product: "product", markets: "markets", competitors: "competitors",
  competitorsNote: "competitors_note", traits: "brand_traits", neverSay: "never_say", firstSeconds: "first_five_seconds",
  platforms: "platforms", stack: "build_stack", a11y: "accessibility", keep: "keep_from_client_brand", voiceSamples: "voice_samples",
};
const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v && typeof v === "object" ? Object.values(v).some(filled) : !!v);

/** The whole brief as every prompt reads it, empty fields left out. What a model drafted and nobody has touched goes
 *  apart, under unconfirmed_draft. Null when the project has no brief */
export function briefForModel(stored: unknown) {
  const b = readBrief(stored);
  if (!b) return null;
  const draft = new Set<string>(b.drafted);
  const team: Record<string, unknown> = {}, unconfirmed: Record<string, unknown> = {};
  for (const [k, key] of Object.entries(MODEL_KEYS) as [keyof typeof MODEL_KEYS, string][]) {
    const v = k === "a11y" ? `WCAG ${b.a11y ?? "AA"}` : k === "product" ? { what: b.product.what || undefined, price_range: b.product.price ?? undefined } : b[k];
    if (filled(v)) (draft.has(k) ? unconfirmed : team)[key] = v;
  }
  return Object.keys(unconfirmed).length ? { ...team, unconfirmed_draft: unconfirmed } : team;
}

/** The brief as one block of a prompt: the fields and how to weigh them, the same words in every pass */
export const briefPrompt = (stored: unknown) => `PROJECT BRIEF (JSON): ${JSON.stringify(briefForModel(stored))}
The brief is the team's word on the project and outranks what a reference only suggests. Fields under "unconfirmed_draft" are not: a model guessed them from the client's site and nobody has confirmed them, so the board and the team's words overrule them. "competitors" are sites the brand must not look like ("competitors_note" says how): never follow or cite them. "keep_from_client_brand" names what of the client's current brand stays as it is. "accessibility" is the contrast and type-size level every decision passes. "platforms" and "build_stack" say where it lives and what it is built with. "never_say" and "voice_samples" bind the voice. "markets" are the languages and places it speaks to.`;
