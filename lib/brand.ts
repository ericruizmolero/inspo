// The brand's values, read by the model from what the project already decided. The eight areas say in words what
// the project does; this pass turns them into values a page is drawn with: the palette with its hex, the faces and
// their scale, the curves and durations, the voice's principles and pairs, the intro. It reads the measurements of
// the references behind each decision (their DESIGN.md), the client's own site when the project is a redesign, and
// any guide the team pasted in. A section the team set by hand is left alone; every other one is rewritten, so the
// values keep up with the decisions.
import "server-only";
import { createHash } from "crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError } from "./workspace-core";
import { getErrors } from "./i18n";
import { llm, LlmError, type LlmInput } from "./llm";
import { AUTO_REF, autoBrandPass, billOf, recordUsage, type UsageCtx } from "./usage";
import { brandChain } from "./quota";
import type { OutputLanguage } from "./output-language";
import { prompt, PROMPTS } from "./prompts";
import { getSystem } from "./system";
import { getDesignMd } from "./design-store";
import { guideTexts } from "./brand-guides";
import { mediaKindOf } from "./url";
import { familyKey } from "./font-names";
import { resolveFace } from "./brand-fonts";
import { clampBezier, HEX_RE_LOOSE } from "./brand-values";
import { getBrand, projectClient, writeBrandSections } from "./brand-store";
import { brandId, runMayWrite, type BrandFace, type BrandSection, type BrandSections, type BrandSpec } from "@/types/brand";
import type { ProjectSystem, SystemArea } from "@/types/system";
import type { DesignSpec } from "@/types/design";
import { log } from "./log";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;

/** References measured per area: enough to read values from, not the whole board */
const PER_AREA = 6;

// ─── What the model reads ────────────────────────────────────────────────────

/** The slice of a DESIGN.md that speaks to an area: its measured values, never the prose around them */
function sliceFor(area: SystemArea, spec: DesignSpec): unknown {
  switch (area) {
    case "color": return { theme: spec.theme, colors: spec.colors.map((c) => ({ name: c.name, hex: c.hex, group: c.group, role: c.role })), glance: spec.brief?.color };
    case "typography": return { fonts: spec.fonts.map((f) => ({ family: f.family, role: f.role, weights: f.weights, usage: f.usage })), scale: spec.typeScale, glance: spec.brief?.typography };
    case "motion": return { motion: spec.motion, glance: spec.brief?.motion };
    case "logo": return { glance: spec.brief?.logo };
    case "voice": return { glance: spec.brief?.voice };
    case "imagery": return { imagery: spec.imagery, glance: spec.brief?.imagery };
    case "layout": return { layout: spec.layout, spacing: spec.spacing, radii: spec.radii };
    case "iconography": return { glance: spec.brief?.iconography };
  }
}

async function boardOf(organizationId: string, projectId: string) {
  const rows = await db.select({ id: T.id, name: T.name, web: T.web }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))).orderBy(PI.createdAt);
  return rows;
}

// ─── What the model writes ───────────────────────────────────────────────────

export const BrandOutSchema = z.object({
  intro: z.object({ headline: z.string(), paragraphs: z.array(z.string()) }),
  color: z.object({
    lede: z.string(),
    items: z.array(z.object({ name: z.string(), hex: z.string(), role: z.string(), group: z.enum(["brand", "accent", "neutral", "semantic"]), weight: z.number() })),
    accent: z.string(),
  }),
  typography: z.object({
    lede: z.string(),
    faces: z.array(z.object({ family: z.string(), role: z.enum(["display", "text", "mono"]), weights: z.array(z.number()), note: z.string() })),
    scale: z.array(z.object({ label: z.string(), px: z.number(), family: z.string(), weight: z.number(), lineHeight: z.number(), tracking: z.number() })),
    sample: z.string(),
    trackingRule: z.string(),
  }),
  motion: z.object({
    lede: z.string(),
    curves: z.array(z.object({ name: z.string(), x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number(), use: z.string() })),
    durations: z.array(z.object({ name: z.string(), ms: z.number(), use: z.string() })),
    staggerMs: z.number(),
    rule: z.string(),
  }),
  voice: z.object({
    lede: z.string(),
    principles: z.array(z.object({ title: z.string(), body: z.string(), sample: z.string() })),
    pairs: z.array(z.object({ context: z.string(), do: z.string(), dont: z.string() })),
  }),
  logo: z.object({ lede: z.string() }),
  imagery: z.object({ lede: z.string(), traits: z.array(z.object({ label: z.string(), value: z.string() })), avoid: z.array(z.string()), refs: z.array(z.string()) }),
  applications: z.object({ lede: z.string(), handle: z.string(), tagline: z.string(), bio: z.string(), postLine: z.string() }),
});
type Out = z.infer<typeof BrandOutSchema>;

const PROMPT = `You turn a project's design SYSTEM into the values of its BRAND GUIDELINES: the page a designer, a developer or an AI agent opens to build anything for this brand. The system's decisions are already made, in words, area by area. You give them values.

INPUT
- system: the project's decisions per area (decision, why, never). They are the source of truth. Every value you write implements them; nothing you write contradicts them or a "never" line.
- measured: for each area, the references behind its decision with what their sites measured (hex, families, sizes, easing). Use their real values whenever the decision points at them. Never invent a hex or a family the decision and the measurements do not support.
- client_site: present when the project is a redesign. Its colours, families, logo and copy are the brand's own: keep them unless a decision explicitly replaces them.
- guide: guidelines the team pasted in. Treat its explicit values (hex, families, sizes, rules, copy) as the brand's own.
- keep: sections the team wrote by hand. Do not rewrite them; read them, so everything else agrees with them.
- current: the values as they stand. Improve them; keep what is right; do not churn.

WHAT TO WRITE
- intro.headline: the brand's statement, 4 to 9 words, said the way the brand speaks (see voice). Not a description of the project. intro.paragraphs: 2 or 3 short paragraphs (40 to 70 words each): what the brand is and for whom, what the design does on purpose, what this guideline is for.
- color.items: 4 to 8 colours. Names are evocative, one or two words ("Ink", "Paper", "Signal"). hex is #RRGGBB. role says where it goes, one sentence. group: neutral (grounds, inks, greys), brand, accent, semantic. weight 1 to 4 is how much of the brand it covers: the ground 4, the ink and the main brand colour 3, an accent 2, the rest 1. Neutrals ordered dark to light. color.accent: the name of the one colour that marks things (a button, a link, the active item).
- typography.faces: 1 to 3 families, exactly as the decision or the measurements name them. role display (headlines), text (everything read), mono. weights: the ones the brand uses. note: what it carries and how, one sentence.
- typography.scale: 6 to 10 steps from the largest to the smallest: Display, H1 to H4 as needed, Body large, Body, Small. px, the family of one of the faces, weight, lineHeight (unitless), tracking in em (negative at large sizes when the decision tightens headlines). sample: one short line in the brand's voice that every step is set in. trackingRule: one or two sentences on how sizes and tracking behave.
- motion: lede (one sentence on how the brand moves); curves: 1 or 2 cubic-bezier curves with x1 y1 x2 y2 (x between 0 and 1), named by their job; durations: 2 or 3 (fast, base, slow) in ms with what each is for; staggerMs; rule: 2 to 4 sentences on how things accelerate, settle and what never moves. A static brand gets a short honest rule and one gentle curve.
- voice: lede (one sentence: how the brand writes). principles: 3 or 4, each a title of 2 to 4 words, a body of one or two sentences, and a sample: a line the brand would publish that shows it. pairs: 4, for the contexts "Campaign line", "Product spec", "Error message", "Call to action" (translated), each with what to write (do) and what never to write (dont), both real lines.
- logo.lede: one or two sentences on what the mark is and how it is treated.
- imagery: lede (one sentence on what the pictures are and how they feel); traits: 4 to 6, each a label of one or two words (Light, Colour, Crop, Subjects, Texture, Composition, translated) and a value of one specific sentence a photographer or an image model can follow; avoid: 2 to 4 lines a picture never does (from the imagery "never" when there is one); refs: the ids (r1, r2…) of up to 6 references that are pictures and show this imagery best, best first. Only pictures, never screenshots of websites unless the decision is about product UI.
- applications: handle (lowercase, no @), tagline (under 8 words), bio (under 20 words, the brand's voice), postLine (under 8 words, a line for a social post).
- Every lede is one or two sentences, under 30 words, specific to THIS brand. If a sentence could sit in any other brand's guide, rewrite it.

STYLE
- No em dashes. No hype ("unleash", "elevate", "seamless"). Concrete over abstract.
- Never write reference ids in the text.`;

// ─── The pass ────────────────────────────────────────────────────────────────

/** Everything the brand pass reads: built from the database by runBrand, from a fixture and the system it just wrote by the eval */
export interface BrandSnapshot {
  name: string;
  brief: { about: string | null; tone: string[] | null; avoid: string | null };
  system: { summary: string; areas: { area: SystemArea; decision?: string; why?: string; never?: string[] }[] };
  measured: Record<string, unknown[]>;
  clientSite: Record<string, unknown> | null;
  guides: string[];
  keep: Record<string, unknown>;
  current: Record<string, unknown>;
  pictures: { id?: string; name: string; kind: string }[];
}

/** Per area, the references behind its decision (by code) with what their sites measured */
export function measuredOf(areas: { area: SystemArea; evidence: { ref: string; take?: string }[] }[], sites: Map<string, { name: string; spec: DesignSpec | null }>): Record<string, unknown[]> {
  const measured: Record<string, unknown[]> = {};
  for (const a of areas) {
    const rows = a.evidence.filter((e) => sites.has(e.ref)).slice(0, PER_AREA).flatMap((e) => {
      const { name, spec } = sites.get(e.ref)!;
      return spec ? [{ id: e.ref, name, take: e.take, measured: sliceFor(a.area, spec) }] : [];
    });
    if (rows.length) measured[a.area] = rows;
  }
  return measured;
}

/** A redesign's current site, as the brand pass reads it */
export const clientSiteOf = (web: string, spec: DesignSpec) => ({ web, theme: spec.theme, colors: spec.colors, fonts: spec.fonts.map((f) => ({ family: f.family, role: f.role, weights: f.weights })), scale: spec.typeScale, motion: spec.motion, glance: spec.brief });

/** Names the prompt an eval scored (see SYSTEM_PROMPT_ID) */
export const BRAND_PROMPT_ID = `v${PROMPTS.brand.version}-${createHash("sha1").update(PROMPT).digest("hex").slice(0, 7)}`;

/** The brand pass as one model call */
export function brandRequest(s: BrandSnapshot, language?: OutputLanguage): LlmInput & { schema: typeof BrandOutSchema } {
  const text = [
    `Brand: ${s.name}`,
    `Brief: ${JSON.stringify(s.brief)}`,
    `system (JSON): ${JSON.stringify(s.system)}`,
    `measured (JSON): ${JSON.stringify(s.measured)}`,
    s.clientSite ? `client_site (JSON): ${JSON.stringify(s.clientSite)}` : null,
    s.guides.length ? `guide (the team's own guidelines, verbatim):\n${s.guides.map((g) => `<<<\n${g}\n>>>`).join("\n")}` : null,
    Object.keys(s.keep).length ? `keep (JSON): ${JSON.stringify(s.keep)}` : null,
    `current (JSON): ${JSON.stringify(s.current)}`,
    `pictures on the board (JSON): ${JSON.stringify(s.pictures)}`,
  ].filter(Boolean).join("\n\n");
  return { ...prompt("brand", { system: PROMPT, text, language }), schema: BrandOutSchema };
}

/** Values a run of an older brand prompt wrote: the next pass redoes them, free. A run from before versions is v1 */
export const brandStale = (brand: BrandSpec) => !!brand.run && (brand.run.version ?? 1) !== PROMPTS.brand.version;

const inflight = new Map<string, Promise<ProjectSystem>>();

export function runBrand(input: { organizationId: string; projectId: string; usage: UsageCtx; language?: OutputLanguage; force?: BrandSection[]; /** The client calls this pass chained to a system pass; autoBrandPass decides whether it counts */ auto?: boolean }): Promise<ProjectSystem> {
  const key = `${input.organizationId}|${input.projectId}`;
  const running = inflight.get(key);
  if (running) return running;
  const job = (async () => {
    const { organizationId, projectId } = input;
    const [[project], system, brand, client, board] = await Promise.all([
      db.select({ name: P.name, brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1),
      getSystem(organizationId, projectId), getBrand(organizationId, projectId), projectClient(organizationId, projectId), boardOf(organizationId, projectId),
    ]);
    if (!project) throw new HttpError(404, (await getErrors()).projectNotFound);
    const [guides, chained] = await Promise.all([guideTexts(brand), input.auto ? brandChain(organizationId, projectId).then((c) => autoBrandPass(true, { ...c, now: new Date() })) : false]);
    const auto = chained || brandStale(brand);
    if (!system.areas.some((a) => a.decision) && !client && !guides.length) throw new HttpError(400, (await getErrors()).systemEmptyBoard);

    // Codes for the board, as the system run names them
    const code = new Map(board.map((r, i) => [r.id, `r${i + 1}`]));
    const byCode = new Map(board.map((r, i) => [`r${i + 1}`, r.id]));
    const rowOf = new Map(board.map((r, i) => [`r${i + 1}`, r]));
    const specs = new Map<string, DesignSpec | null>();
    const specOf = async (web: string) => { if (!specs.has(web)) specs.set(web, mediaKindOf(web) === "web" ? (await getDesignMd(web).catch(() => null))?.spec ?? null : null); return specs.get(web) ?? null; };
    const areas = system.areas.map((a) => ({ area: a.area, evidence: a.evidence.flatMap((e) => code.has(e.itemId) ? [{ ref: code.get(e.itemId)!, take: e.take }] : []) }));
    const wanted = [...new Set(areas.flatMap((a) => a.evidence.slice(0, PER_AREA).map((e) => e.ref)))];
    const sites = new Map(await Promise.all(wanted.map(async (c) => [c, { name: rowOf.get(c)!.name, spec: await specOf(rowOf.get(c)!.web) }] as const)));
    const clientSpec = client ? await specOf(client.web) : null;

    const snapshot: BrandSnapshot = {
      name: project.name,
      brief: { about: project.brief?.about || null, tone: project.brief?.tone ?? null, avoid: project.brief?.avoid || null },
      system: { summary: system.summary, areas: system.areas.filter((a) => a.decision || a.never).map((a) => ({ area: a.area, decision: a.decision || undefined, why: a.why || undefined, never: a.never ? a.never.split("\n") : undefined })) },
      measured: measuredOf(areas, sites),
      clientSite: client && clientSpec ? clientSiteOf(client.web, clientSpec) : null,
      guides,
      keep: Object.fromEntries((Object.keys(brand.meta) as BrandSection[]).filter((k) => !runMayWrite(brand, k) && !input.force?.includes(k)).map((k) => [k, brand[k]])),
      current: { intro: brand.intro, color: brand.color.items.map((c) => ({ name: c.name, hex: c.hex, role: c.role, group: c.group })), faces: brand.typography.faces.map((f) => ({ family: f.family, role: f.role })), voice: brand.voice },
      pictures: board.filter((r) => mediaKindOf(r.web) !== "text").map((r) => ({ id: code.get(r.id), name: r.name, kind: mediaKindOf(r.web) })).slice(0, 80),
    };

    let res: Awaited<ReturnType<typeof llm>>;
    try {
      res = await llm(brandRequest(snapshot, input.language));
    } catch (err) {
      if (!(err instanceof LlmError) || !err.finishReason) throw err;
      throw new HttpError(502, `${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
    }
    void recordUsage(input.usage, { action: "brand", ...billOf(res), ref: `${auto ? AUTO_REF : ""}project:${projectId}` });
    const out = BrandOutSchema.parse(JSON.parse(res.text));
    const sections = await toSections(out, brand, client?.web ?? null, byCode);
    const written = await writeBrandSections(organizationId, projectId, sections, "model", { force: input.force, run: { at: new Date().toISOString(), model: res.model, version: PROMPTS.brand.version } });
    log.info("brand.built", { ref: projectId, sections: written, tokensIn: res.usage.input, tokensOut: res.usage.output, ms: res.ms, costUsd: res.costUsd });
    return getSystem(organizationId, projectId);
  })();
  inflight.set(key, job);
  job.finally(() => inflight.delete(key)).catch(() => {}); // the caller gets the job's error
  return job;
}

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").replace(/\s*[–—]\s*/g, ", ").trim().slice(0, max);
const round = (n: number, step: number) => Math.round(n / step) * step;

/** The model's answer as sections, checked: real hex, curves CSS accepts, faces looked up where they load from */
async function toSections(out: Out, brand: BrandSpec, clientWeb: string | null, byCode: Map<string, string>): Promise<Partial<BrandSections>> {
  const items = out.color.items.filter((c) => HEX_RE_LOOSE.test(c.hex)).slice(0, 12).map((c) => ({
    id: brand.color.items.find((x) => x.name.toLowerCase() === c.name.toLowerCase())?.id ?? brandId(),
    name: clean(c.name, 40), hex: `#${c.hex.replace("#", "").slice(0, 6)}`.toUpperCase(), role: clean(c.role, 200), group: c.group,
    weight: Math.min(4, Math.max(1, Math.round(c.weight))),
  }));
  const accent = items.find((c) => c.name.toLowerCase() === out.color.accent.toLowerCase()) ?? items.find((c) => c.group === "accent") ?? items.find((c) => c.group === "brand");

  // A face keeps its id (and what was found about it) while its family stays
  const faces: BrandFace[] = await Promise.all(out.typography.faces.slice(0, 3).map(async (f) => {
    const was = brand.typography.faces.find((x) => familyKey(x.family) === familyKey(f.family));
    const weights = [...new Set(f.weights.map((w) => Math.min(900, Math.max(100, round(w, 100)))))].sort((a, b) => a - b);
    const found = was && was.source !== "system" ? { family: was.family, source: was.source, slug: was.slug, siteWeb: was.siteWeb, weights } : await resolveFace(f.family, weights, clientWeb).catch(() => null);
    return {
      id: was?.id ?? brandId(), family: found?.family ?? clean(f.family, 80), role: f.role, source: found?.source ?? "system",
      weights: found?.weights?.length ? found.weights : weights.length ? weights : [400], ...(found?.slug ? { slug: found.slug } : {}), ...(found?.siteWeb ? { siteWeb: found.siteWeb } : {}),
      ...(was?.files ? { files: was.files } : {}), note: clean(f.note, 300),
    };
  }));
  const faceFor = (family: string) => faces.find((x) => familyKey(x.family) === familyKey(family)) ?? faces.find((x) => x.role === "text") ?? faces[0];
  const scale = faces.length ? out.typography.scale.slice(0, 12).map((s) => ({
    id: brandId(), label: clean(s.label, 30), px: Math.min(400, Math.max(6, Math.round(s.px))), faceId: faceFor(s.family).id,
    weight: Math.min(900, Math.max(100, round(s.weight, 100))), lineHeight: Math.min(3, Math.max(0.6, Math.round(s.lineHeight * 100) / 100)),
    tracking: Math.min(0.5, Math.max(-0.2, Math.round(s.tracking * 1000) / 1000)),
  })) : [];

  const sections: Partial<BrandSections> = {
    intro: { headline: clean(out.intro.headline, 200), paragraphs: out.intro.paragraphs.map((p) => clean(p, 600)).filter(Boolean).slice(0, 3) },
    color: { lede: clean(out.color.lede, 600), items, accentId: accent?.id ?? null },
    typography: { lede: clean(out.typography.lede, 600), faces, scale, sample: clean(out.typography.sample, 120), trackingRule: clean(out.typography.trackingRule, 600) },
    motion: {
      lede: clean(out.motion.lede, 600),
      curves: out.motion.curves.slice(0, 3).map((c, i) => ({ id: brand.motion.curves[i]?.id ?? brandId(), name: clean(c.name, 40), bezier: clampBezier([c.x1, c.y1, c.x2, c.y2]), use: clean(c.use, 200) })),
      durations: out.motion.durations.slice(0, 4).map((d) => ({ id: brandId(), name: clean(d.name, 40), ms: Math.min(5000, Math.max(0, Math.round(d.ms))), use: clean(d.use, 200) })),
      staggerMs: Math.min(1000, Math.max(0, Math.round(out.motion.staggerMs))), rule: out.motion.rule.trim().slice(0, 1200),
    },
    voice: {
      lede: clean(out.voice.lede, 600),
      principles: out.voice.principles.slice(0, 6).map((p) => ({ id: brandId(), title: clean(p.title, 80), body: clean(p.body, 300), sample: clean(p.sample, 200) })),
      pairs: out.voice.pairs.slice(0, 8).map((p) => ({ id: brandId(), context: clean(p.context, 60), do: clean(p.do, 200), dont: clean(p.dont, 200) })),
    },
    logo: { ...brand.logo, lede: clean(out.logo.lede, 600) },
    imagery: {
      ...brand.imagery, lede: clean(out.imagery.lede, 600),
      traits: out.imagery.traits.slice(0, 6).map((x) => ({ id: brandId(), label: clean(x.label, 40), value: clean(x.value, 300) })).filter((x) => x.label && x.value),
      avoid: out.imagery.avoid.map((x) => clean(x, 200)).filter(Boolean).slice(0, 6),
      // The examples the team picked stay; with none, the ones the model names
      itemIds: brand.imagery.itemIds.length ? brand.imagery.itemIds : out.imagery.refs.map((r) => byCode.get(r)).filter((x): x is string => !!x).slice(0, 6),
    },
    applications: {
      ...brand.applications, lede: clean(out.applications.lede, 600),
      handle: out.applications.handle.toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30) || brand.applications.handle,
      domain: brand.applications.domain || (clientWeb ? (() => { try { return new URL(clientWeb).hostname.replace(/^www\./, ""); } catch { return ""; } })() : ""),
      tagline: clean(out.applications.tagline, 120), bio: clean(out.applications.bio, 200), postLine: clean(out.applications.postLine, 120),
    },
  };
  return sections;
}
