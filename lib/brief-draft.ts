// The brief drafts itself: when the client's site is set or a document is imported, one model call reads the
// brand's own words and writes the fields of DRAFT_FIELDS that nobody on the team wrote. What it writes enters
// `drafted` until someone edits or confirms it. Decided in
// docs/design-system/decisiones/2026-10-10-el-brief-pide-una-frase-y-el-resto-se-rellena-solo.md.
import "server-only";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "./db";
import { fetchSiteText, type SiteText } from "./extract";
import { getDesignMd } from "./design-store";
import { projectGuides } from "./brand-guides";
import { saveBrief } from "./brief";
import { llm, llmEnabled, type LlmInput } from "./llm";
import { prompt, PROMPTS } from "./prompts";
import { AUTO_REF, billOf, recordUsage } from "./usage";
import { assertQuota } from "./quota";
import { SECTORS } from "./taxonomy";
import { log } from "./log";
import type { OutputLanguage } from "./output-language";
import type { Ctx } from "./workspace-core";
import { BRIEF_LIMITS, DRAFT_FIELDS, draftFilled, KEEP_PARTS, PRICE_RANGES, isMarketTag, readBrief, type Brief, type DraftField } from "@/types/brief";

export type BriefDraft = Pick<Brief, DraftField>;

/** "other" is the tagger's way of saying none fits; the brief says it with null */
const SECTOR_KEYS = SECTORS.map((s) => s.key).filter((k) => k !== "other") as [string, ...string[]];

export const BriefDraftSchema = z.object({
  sector: z.enum(SECTOR_KEYS).nullable(),
  product: z.object({ what: z.string(), price: z.enum(PRICE_RANGES).nullable() }),
  markets: z.array(z.string()),
  traits: z.array(z.string()),
  keep: z.array(z.enum(KEEP_PARTS)),
  voiceSamples: z.array(z.string()),
});

/** What a draft writes over the current brief. A field the team wrote (filled and not in `drafted`) is never
 *  touched; every other one takes the draft's value, and is drafted while that value says something. Pure, so a
 *  second run over the same draft writes the same brief. Saved with saveBrief, which keeps `drafted` as sent */
export function mergeDraft(current: Brief, draft: BriefDraft): Partial<Brief> {
  const patch: Partial<BriefDraft> = {};
  const drafted = new Set(current.drafted);
  for (const k of DRAFT_FIELDS) {
    if (draftFilled(current, k) && !drafted.has(k)) continue;
    (patch as Record<DraftField, unknown>)[k] = draft[k];
    if (draftFilled(draft, k)) drafted.add(k); else drafted.delete(k);
  }
  return { ...patch, drafted: DRAFT_FIELDS.filter((k) => drafted.has(k)) };
}

/** What a draft reads: the client's site (its text, its DESIGN.md, the sector its tags give) and the imported documents */
export interface DraftSources {
  web: string | null;
  site: SiteText | null;
  designMd: string | null;
  /** The client item's tagsJson.sector: when it is there, the sector comes from it and not from the model */
  tagsSector: string | null;
  guides: string[];
}

const DESIGN_MD_READ = 6000;
const GUIDES_READ = 12_000;

export async function draftSources(organizationId: string, projectId: string): Promise<DraftSources> {
  const P = schema.project, T = schema.inspoItem;
  const [row] = await db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  const clientItemId = readBrief(row?.brief)?.clientItemId;
  const [item] = clientItemId
    ? await db.select({ web: T.web, tags: T.tagsJson }).from(T).where(and(eq(T.organizationId, organizationId), eq(T.id, clientItemId))).limit(1)
    : [];
  const web = item?.web || null;
  const [site, design, guides] = await Promise.all([
    web ? fetchSiteText(web).catch(() => null) : null,
    web ? getDesignMd(web).catch(() => null) : null,
    projectGuides(organizationId, projectId).then((g) => g.texts).catch(() => []),
  ]);
  const tagged = item?.tags?.sector;
  return { web, site, designMd: design?.markdown ?? null, tagsSector: tagged && SECTOR_KEYS.includes(tagged) ? tagged : null, guides };
}

const DRAFT_SYSTEM = `You read a brand's own words (its website, a document its team imported, or both) and draft part of the brief of a design project for that brand. Write only what the text supports: an empty field is better than a guess.

RETURN
- "sector": the one SECTORS key that fits the business, or null when none fits clearly.
- "product": "what" is what it sells or offers, one plain sentence of at most 16 words, never a slogan. "price" is "affordable", "mid" or "premium" only when its prices, its offer or its register say it plainly; else null.
- "markets": the languages and places it speaks to, as BCP 47 tags (es-ES, en-GB, pt-BR), from the page language, its language versions, currencies, addresses and shipping. The main one first, at most 6. A bare language ("en") only when nothing says the place.
- "traits": three single words for how the brand sounds and presents itself, read from its copy. Precise words over generic praise: never "innovative", "quality" or "modern" when a more exact word fits.
- "keep": which of its current "logo", "colors" and "type" are distinctive and settled enough that a redesign should keep them, judged from the DESIGN.md and the site's fonts and colours. Empty when there is nothing to judge.
- "voiceSamples": 3 to 6 short texts copied verbatim from the brand's own copy: the headline, a claim, a sentence that sounds like the brand. Never rewritten or translated; never navigation, cookie or legal text.

SECTORS (JSON): ${JSON.stringify(SECTORS.filter((s) => s.key !== "other"))}`;

/** Names the prompt an eval scored, like SYSTEM_PROMPT_ID */
export const DRAFT_PROMPT_ID = `brief@${PROMPTS.brief.version}`;

/** The draft as one model call; null when there is nothing to read */
export function draftRequest(s: DraftSources, language?: OutputLanguage): (LlmInput & { schema: typeof BriefDraftSchema }) | null {
  if (!s.site && !s.guides.length) return null;
  let room = GUIDES_READ;
  const guides = s.guides.map((g) => { const cut = g.slice(0, Math.max(0, room)); room -= cut.length; return cut; }).filter(Boolean);
  const site = s.site && {
    url: s.web, title: s.site.title, description: s.site.description, site_name: s.site.siteName, lang: s.site.lang,
    language_versions: s.site.hreflang, currencies: s.site.currencies, headings: s.site.headings, text: s.site.textSample,
    meta: s.site.meta, fonts: s.site.signals.fonts, colors: s.site.signals.colors,
  };
  const text = [
    site ? `client_site (JSON): ${JSON.stringify(site)}` : null,
    s.designMd ? `client_site DESIGN.md (what its design measured, cut):\n${s.designMd.slice(0, DESIGN_MD_READ)}` : null,
    guides.length ? `imported documents (the team's own text about the brand, verbatim):\n${guides.map((g) => `<<<\n${g}\n>>>`).join("\n")}` : null,
  ].filter(Boolean).join("\n\n");
  return { ...prompt("brief", { system: DRAFT_SYSTEM, text, language }), schema: BriefDraftSchema };
}

/** The model's answer as the brief keeps it; the tags' sector, when there is one, over the model's */
export function readDraft(raw: string, tagsSector: string | null): BriefDraft {
  const out = BriefDraftSchema.parse(JSON.parse(raw));
  const line = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
  const list = (xs: string[], n: number, max: number) => [...new Set(xs.map((x) => line(x, max)).filter(Boolean))].slice(0, n);
  return {
    sector: tagsSector ?? out.sector,
    product: { what: line(out.product.what, 300), price: out.product.price },
    markets: list(out.markets, BRIEF_LIMITS.markets, 35).filter(isMarketTag),
    traits: list(out.traits, BRIEF_LIMITS.traits, BRIEF_LIMITS.word),
    keep: [...new Set(out.keep)],
    voiceSamples: list(out.voiceSamples, BRIEF_LIMITS.voiceSamples, 600),
  };
}

type DraftCtx = Pick<Ctx, "workspace" | "user">;

/** Reads the sources, asks the model and saves what it may write. Logged as an automatic call (AUTO_REF): it runs
 *  on saving, nobody asked for it, so it is not one of the plan's AI actions; a workspace that spent them gets none */
export async function draftBrief(ctx: DraftCtx, projectId: string): Promise<{ brief: Brief } | null> {
  if (!llmEnabled()) return null;
  const org = ctx.workspace.id;
  await assertQuota(ctx.workspace, "ai");
  const sources = await draftSources(org, projectId);
  const req = draftRequest(sources, ctx.workspace.outputLanguage);
  if (!req) return null;
  const res = await llm(req);
  void recordUsage({ organizationId: org, userId: ctx.user.id }, { action: "system", ...billOf(res), ref: `${AUTO_REF}project:${projectId}:brief-draft` });
  log.info("brief.drafted", { ref: projectId, ms: res.ms, tokensIn: res.usage.input, tokensOut: res.usage.output, costUsd: res.costUsd });
  const draft = readDraft(res.text, sources.tagsSector);
  // Read again after the call: a field the team wrote while the model thought is theirs
  const [row] = await db.select({ brief: schema.project.brief }).from(schema.project).where(and(eq(schema.project.organizationId, org), eq(schema.project.id, projectId))).limit(1);
  const current = readBrief(row?.brief) ?? readBrief({})!;
  return saveBrief(org, projectId, mergeDraft(current, draft), ctx.user.id);
}

/** draftBrief once the response is out, so saving the site or the document stays fast. Never throws */
export function draftBriefAfter(ctx: DraftCtx, projectId: string): void {
  const run = () => draftBrief(ctx, projectId).catch((err) => log.warn("brief.draft_failed", { ref: projectId, err })).then(() => {});
  try { after(run); } catch { void run(); }
}
