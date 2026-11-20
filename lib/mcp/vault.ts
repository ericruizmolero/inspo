// The Vault through the connector (lib/vault.ts): any agent searches it and reads the code its plan opens
// (canReadVault), so a section starts from something that already works; partners also write it from their own
// agent, which is how the Vault grows (the code we make in-house goes in with one call, its picture with one curl).
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";
import { HttpError } from "../workspace-core";
import { isAdmin } from "../activity";
import { getFile } from "../storage";
import { fetchFile } from "../remote-file";
import { readOutlines } from "@/types/landing";
import { canPreview } from "../vault-preview";
import { VAULT_VIDEO_MAX, chosenFor, setVaultVideo, videoFromLink } from "../vault";
import { VAULT_IMAGE_MAX, listVault, missingEs, readVault, removeVault, saveVault, setVaultPicture, vaultWords } from "../vault";
import { PLANS, planOf, type Plan } from "../plans";
import { plans as PLAN_TEXT } from "../i18n/en/plans";
import { VAULT_ACCESS, VAULT_CATEGORIES, VAULT_LIMITS as L, VAULT_RULES, canReadVault, vaultOf, type VaultCard, type VaultEntry } from "@/types/vault";
import type { McpCtx } from "./auth";
import type { WithPictures } from "./pieces";

export const vaultUrl = (origin: string, slug: string) => `${origin}/?in=vault&entry=${encodeURIComponent(slug)}`;
const previewUrl = (origin: string, slug: string) => `${origin}/api/vault/${encodeURIComponent(slug)}/preview`;
const planPage = (origin: string) => `${origin}/settings/plan`;

/** Who reads the Vault through the connector: the person's Vault across their workspaces (vaultOf), and whether they are a partner */
export interface VaultReader { plan: Pick<Plan, "vault">; partner: boolean }
export async function vaultReader(ctx: McpCtx): Promise<VaultReader> {
  return { plan: vaultOf(ctx.workspaces.map((w) => planOf(w.plan))), partner: await isAdmin(ctx.user.email) };
}
const readable = (r: VaultReader, c: Pick<VaultCard, "access" | "category">) => canReadVault(r.plan, c, r.partner);

/** "Duo, Studio or Agency": the plans whose code reaches every piece, by the names the person knows them by */
export const FULL_PLANS = (() => {
  const names = PLANS.filter((p) => p.vault === "full").map((p) => PLAN_TEXT[p.key].name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names.join("");
})();
const lockedDo = (origin: string) => `Its code comes with the ${FULL_PLANS} plan (${planPage(origin)}).`;

async function partner(ctx: McpCtx): Promise<void> {
  if (!(await isAdmin(ctx.user.email))) throw new HttpError(403, "Only criterio's own team writes the Vault. Reading it (search_vault, read_vault) is open to everyone.");
}

/** Lowercase and without accents, to look through the entries */
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const brief = (origin: string) => (c: VaultCard) => ({ entry: c.slug, title: c.title, category: c.category, ...(c.summary ? { what_it_is: c.summary } : {}), ...(c.tags.length ? { tags: c.tags } : {}), ...(c.category === VAULT_RULES ? { rule: true } : {}), ...(c.published ? {} : { draft: true }), url: vaultUrl(origin, c.slug) });

export const SearchVaultInput = z.object({
  category: z.enum(VAULT_CATEGORIES).optional().describe("One category: a kind of section (hero, nav, pricing, faq, footer…, the same words a landing's plan uses) or a detail (buttons, text, scroll, transitions, cursor, sliders, media, utilities)."),
  query: z.string().max(120).optional().describe("A few words to find by: a name, a technique, a library (\"tabs\", \"marquee\", \"gsap\")."),
});

const RULES_DO = "These are rules, not a component: do not place the demo. Once what you are building is laid out, look for each case the entry names and apply its line where the case holds; where it does not, leave it out.";

/** The words of a query that say nothing by themselves, in English and Spanish */
const FILLER = new Set(["a", "an", "the", "and", "or", "with", "without", "for", "of", "in", "on", "to", "that", "this", "is", "as", "by", "un", "una", "el", "la", "los", "las", "y", "o", "con", "sin", "para", "de", "del", "en", "que"]);
/** A word as it is looked for: "buttons" finds "button" and the other way round */
const stem = (w: string) => (w.length > 3 ? w.replace(/(es|s)$/, "") : w);

/** The Vault's entries, narrowed by a category and a few words. With neither, all of them and how many each category holds */
export async function searchVault(ctx: McpCtx, origin: string, input: z.infer<typeof SearchVaultInput>) {
  const reader = await vaultReader(ctx);
  const [all, more] = await Promise.all([listVault({ drafts: reader.partner }), vaultWords()]);
  return searchAnswer(all, more, input, reader, origin);
}

/** search_vault's answer from the entries it looks through. `more` is what a search reads besides a card, by entry id */
export function searchAnswer(all: VaultCard[], more: Record<string, string>, input: z.infer<typeof SearchVaultInput>, reader: VaultReader, origin: string) {
  const words = [...new Set(plain(input.query ?? "").split(/[^a-z0-9]+/).filter((w) => w && !FILLER.has(w)).map(stem))];
  const inCategory = all.filter((c) => !input.category || c.category === input.category);
  // How many of the words an entry holds, in its name, category, sentence, tags, when to use it, and its Spanish
  const hits = (c: VaultCard) => { const text = plain([c.title, c.category, c.summary, c.tags.join(" "), more[c.id] ?? ""].join(" ")); return words.filter((w) => text.includes(w)).length; };
  const scored = inCategory.map((c) => ({ c, n: hits(c) }));
  // Every word, when some entry has them all; otherwise whatever holds any of them, the fullest match first:
  // "button with icon" must not come back empty because no entry says all three
  const whole = scored.filter((x) => x.n === words.length);
  const found = (whole.length || !words.length ? whole : scored.filter((x) => x.n > 0).sort((a, b) => b.n - a.n)).map((x) => x.c);
  const rules = all.filter((c) => c.category === VAULT_RULES && c.published && !found.some((f) => f.id === c.id));
  const counts: Record<string, number> = {};
  for (const c of all) counts[c.category] = (counts[c.category] ?? 0) + 1;
  const locked = found.some((c) => !readable(reader, c));
  return {
    entries: found.map((c) => ({ ...brief(origin)(c), code: readable(reader, c) ? "readable" : "locked" })),
    ...(rules.length ? { always_apply: rules.map(brief(origin)) } : {}),
    categories: counts,
    ...(locked ? { plans: planPage(origin) } : {}),
    do: [
      found.length
        ? "Pick what fits the section you are building and the project's criterio, then call read_vault with its entry for the code. An entry is a starting point: the project's decisions (type, color, voice, every Never line) come first, and its copy is the project's own."
        : "Nothing in the Vault for that yet. Build it from the project's criterio and references.",
      found.some((c) => c.category === VAULT_RULES) ? "An entry marked rule is not a piece to place: it is a set of corrections to apply wherever its cases turn up in what you build." : "",
      locked ? `An entry whose code is locked is not this workspace's to build from: read_vault gives what it is and its live preview, never its code. ${lockedDo(origin)} Prefer a readable entry; when a locked one is the fit, tell the person in a line, with that page, and build the section from the project's criterio meanwhile.` : "",
      rules.length ? "always_apply holds rules, not pieces: whatever you build, read each one with read_vault and apply it where its cases turn up (an icon in a button, a play triangle, tracked capitals), whether or not you searched for it." : "",
    ].filter(Boolean).join(" "),
  };
}

/** One entry whole: what it is, when to use it, its code block by block, and its picture. A piece whose code this
 *  reader's plan does not open comes without the code: what it is, its preview and the way to the plan */
export async function readVaultEntry(ctx: McpCtx, origin: string, ref: string): Promise<WithPictures> {
  const reader = await vaultReader(ctx);
  const e = await readVault(ref, { drafts: reader.partner });
  if (!e) throw new HttpError(404, `No Vault entry "${ref}". search_vault lists them.`);
  const f = e.imageKey ? await getFile(e.imageKey).catch(() => null) : null;
  return { result: entryAnswer(e, reader, origin), pictures: f && f.size <= VAULT_IMAGE_MAX ? [{ data: f.body.toString("base64"), mimeType: f.contentType }] : [] };
}

/** read_vault's answer for one entry, as this reader may have it */
export function entryAnswer(e: VaultEntry, reader: VaultReader, origin: string) {
  const about = {
    entry: e.slug, title: e.title, category: e.category,
    ...(e.summary ? { what_it_is: e.summary } : {}),
    ...(e.use ? { when_to_use: e.use } : {}),
    ...(e.tags.length ? { tags: e.tags } : {}),
    ...(e.liveUrl ? { live: e.liveUrl } : {}),
    ...(e.published ? {} : { draft: true }),
    url: vaultUrl(origin, e.slug),
  };
  if (!readable(reader, e)) {
    return {
      ...about, code: "locked" as const,
      ...(e.preview ? { preview: previewUrl(origin, e.slug) } : {}),
      plans: planPage(origin),
      do: `This piece's code is locked for this workspace. ${lockedDo(origin)} Tell the person so in a line, with that page${e.preview ? ", and that preview shows the piece running" : ""}. Then build the section from the project's criterio and references without it; do not take the code from the preview.`,
    };
  }
  return {
    ...about, code: "readable" as const,
    documentation: e.blocks ?? [],
    do: e.category === VAULT_RULES ? RULES_DO : "Adapt it, do not paste it: keep the structure and the motion, and take every value (type, color, radius, spacing, copy) from the project's criterio. Load the scripts a block names before the code that needs them.",
  };
}

const Block = z.object({
  title: z.string().min(1).max(L.blockTitle).describe("What this step is: \"Setup: external scripts\", \"HTML\", \"CSS\", \"JavaScript\"."),
  lang: z.string().min(1).max(L.lang).describe("The code's language: html, css, js, ts, tsx, json, bash."),
  code: z.string().min(1).max(L.code).describe("The code as it is pasted, whole."),
  note: z.string().max(L.blockNote).optional().describe("A line on what to change or watch out for."),
});

const EsInput = z.object({
  title: z.string().max(L.title).optional().describe("The name in Spanish, as a Spanish designer would call the piece. A term the trade keeps in English stays (\"Slider\", \"Hero\")."),
  summary: z.string().max(L.summary).optional().describe("summary in Spanish."),
  use: z.string().max(L.use).optional().describe("use in Spanish."),
  tags: z.array(z.string().max(L.tag)).max(L.tags).optional().describe("tags in Spanish, one for each tag and in the same order. A library's name or a term kept in English stays as it is (GSAP, Hover)."),
  blocks: z.array(z.object({ title: z.string().max(L.blockTitle).optional(), note: z.string().max(L.blockNote).optional() })).max(L.blocks).optional().describe("Each block's title and note in Spanish, one for each block and in the same order; never the code."),
});
/** `es` as it arrives: the object, or the same object as JSON text. A client that loaded this tool before the field
 *  existed has no shape for it and sends it as text; refusing that would leave its session unable to write at all */
function readEs(v: z.infer<typeof AddVaultInput>["es"]): z.infer<typeof EsInput> {
  if (v === undefined) return {};
  if (typeof v !== "string") return v;
  let parsed: unknown;
  try { parsed = JSON.parse(v); } catch { throw new HttpError(400, 'es is not valid JSON. Send it as an object, or as the same object in JSON text: {"title":"…","summary":"…","use":"…","tags":["…"],"blocks":[{"title":"…","note":"…"}]}.'); }
  const got = EsInput.safeParse(parsed);
  if (!got.success) throw new HttpError(400, `es does not have the right shape: ${got.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}.`);
  return got.data;
}

export const AddVaultInput = z.object({
  title: z.string().min(1).max(L.title).describe("The entry's name, as a card shows it: \"Folder Tabs\", \"Comparison Table (Basic)\"."),
  category: z.enum(VAULT_CATEGORIES).describe("A kind of section (hero, nav, pricing, faq, footer…) or a detail (buttons, text, scroll, transitions, cursor, sliders, media, utilities)."),
  entry: z.string().max(60).optional().describe("The entry to update, as search_vault names it. Left out, the title names it: the same title updates the same entry."),
  summary: z.string().max(L.summary).optional().describe("What it is, in a sentence."),
  use: z.string().max(L.use).optional().describe("When to reach for it and what makes it good: what an agent reads to choose it over another."),
  tags: z.array(z.string().max(L.tag)).max(L.tags).optional().describe("Techniques, libraries and behaviours: GSAP, SplitText, Tabs, Hover, Responsive."),
  blocks: z.array(Block).max(L.blocks).optional().describe("The documentation, in the order it is set up. Passing it replaces every block."),
  es: z.union([EsInput, z.string().max(20_000)]).optional().describe("The same words in Spanish (Spain: \"en directo\", not \"en vivo\"), for whoever reads the app in Spanish: the English fields are what an agent reads, these are what a person sees. Every text you pass in this call needs its Spanish here; without it the call is refused. An object; the same object as JSON text is taken too."),
  demo: z.string().max(L.demo).optional().describe("A whole, self-contained HTML document that shows the piece running, for the live preview in the app: the blocks' code plus what a demo needs around it (a ground, real-looking content, pictures by public address). Scripts load from a CDN. Left out, the preview is put together from the html, css and js blocks, centred on a plain ground. An empty string removes it."),
  ground: z.string().max(7).optional().describe("The colour the piece stands on, as #rrggbb, for a preview put together from the blocks (light or dark: the text colour follows). Take its picture on this same ground, or the card changes colour when the piece starts on hover. A demo sets its own."),
  live_url: z.string().max(2000).optional().describe("A public page where it runs, when there is one besides the preview."),
  source_url: z.string().max(2000).optional().describe("The site it was learnt from, when there is one."),
  image_url: z.string().max(2000).optional().describe("A public address of its picture (PNG, WebP or JPEG). A file on your disk goes through the upload link in the answer instead."),
  video_url: z.string().max(2000).optional().describe("A public address of a short loop of the piece running: the file itself, or a Screen Studio share link (MP4 or WebM, a few seconds, no sound, at the shape the piece asks for: the card takes the video's own). Only for a piece its card cannot play live: one that moves on scroll, needs a click or a drag, or is heavy to start. With it the card plays the loop, always, in place of the piece. Prefer the Screen Studio link: it also brings the picture a shared link to the piece shows. A file on your disk of up to 4 MB goes through the upload link instead."),
  remove_video: z.boolean().optional().describe("True takes the loop away: the card plays the piece itself again."),
  access: z.enum(VAULT_ACCESS).optional().describe(`Who reads its code: "paid" (the plans with the whole Vault: ${FULL_PLANS}) or "free" (every signed-in account, Free included). A new entry is paid unless you pass free; left out on an update, it stays as it was. Rules (utilities) reach everyone either way.`),
});

// The link an entry's picture is sent to: signed, not stored, for one entry and one person, for half an hour
const UPLOAD_MINUTES = 30;
interface Grant { u: string; e: string; x: number }
function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is not set");
  return s ?? "dev-secret";
}
const sign = (body: string) => createHmac("sha256", secret()).update(`vault-upload|${body}`).digest("base64url").slice(0, 32);
const uploadUrl = (origin: string, userId: string, entryId: string) => {
  const body = Buffer.from(JSON.stringify({ u: userId, e: entryId, x: Date.now() + UPLOAD_MINUTES * 60_000 } satisfies Grant)).toString("base64url");
  return `${origin}/api/mcp/vault/${body}.${sign(body)}`;
};

/** The entry a picture link is for, once the link holds and its person is still a partner */
export async function readVaultUpload(token: string): Promise<{ entryId: string; userId: string }> {
  const bad = new HttpError(403, "This link is not valid. Ask for a new one with add_to_vault.");
  const [body, sig] = token.split(".");
  const want = body ? sign(body) : "";
  if (!body || !sig || sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) throw bad;
  let grant: Grant;
  try { grant = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Grant; } catch { throw bad; }
  if (!grant.u || !grant.e || !(grant.x > Date.now())) throw new HttpError(410, "This link has expired. Ask for a new one with add_to_vault.");
  const U = schema.user;
  const [u] = await db.select({ email: U.email }).from(U).where(eq(U.id, grant.u)).limit(1);
  if (!(await isAdmin(u?.email))) throw bad;
  return { entryId: grant.e, userId: grant.u };
}

/** Writes an entry of the Vault (partners). The answer carries the link its picture is sent to */
export async function addToVault(ctx: McpCtx, origin: string, input: z.infer<typeof AddVaultInput>) {
  await partner(ctx);
  // Whatever text this call writes comes with its Spanish: the app is read in both, and nothing translates it later
  const es = readEs(input.es);
  const owed = [
    es.title ? "" : "es.title",
    !input.summary || es.summary ? "" : "es.summary",
    !input.use || es.use ? "" : "es.use",
    !input.tags?.length || es.tags?.length === input.tags.length ? "" : `es.tags (${input.tags.length}, in the order of tags)`,
    !input.blocks?.length || (es.blocks?.length === input.blocks.length && input.blocks.every((b, i) => es.blocks![i]?.title && (!b.note || es.blocks![i]?.note))) ? "" : `es.blocks (${input.blocks.length}, in the order of blocks: each one's title, and its note where the block has one)`,
  ].filter(Boolean);
  const before = await readVault(input.entry || input.title, { drafts: true });
  if (owed.length && !(owed.length === 1 && owed[0] === "es.title" && before)) throw new HttpError(400, `The Vault is read in Spanish too. Send the call again with the Spanish of what it writes, in es: ${owed.join("; ")}. If your copy of this tool has no es field, pass es anyway, as JSON text: {"title":"…","summary":"…","use":"…","tags":["…"],"blocks":[{"title":"…","note":"…"}]}.`);
  const { entry, created } = await saveVault({ ...input, es, slug: input.entry }, ctx.user.id);
  const lacks = missingEs(entry);
  let picture = !!entry.imageKey;
  let pictureFailed = "";
  if (input.image_url?.trim()) {
    const f = await fetchFile(input.image_url.trim(), undefined, (t) => /^image\/(png|webp|jpeg)$/.test(t), VAULT_IMAGE_MAX).catch(() => null);
    if (f) { await setVaultPicture(entry.id, f.body); picture = true; }
    else pictureFailed = "The picture at image_url could not be read: send the file with picture_upload.";
  }
  let video = !!entry.videoKey;
  let videoFailed = "";
  if (input.remove_video) { await setVaultVideo(entry.id, null); video = false; }
  if (input.video_url?.trim()) {
    const got = await videoFromLink(input.video_url);
    if (got) { await setVaultVideo(entry.id, got.video, got.frame); video = true; }
    else videoFailed = `The video at video_url could not be read (MP4 or WebM, at most ${VAULT_VIDEO_MAX / 1024 / 1024} MB).`;
  }
  const link = uploadUrl(origin, ctx.user.id, entry.id);
  return {
    entry: entry.slug, title: entry.title, category: entry.category, created, published: !!entry.publishedAt, access: entry.access, blocks: entry.blocks.length, has_picture: picture, has_video: video, live_preview: canPreview(entry),
    url: vaultUrl(origin, entry.slug),
    picture_upload: `curl -sS --data-binary @preview.png -H "Content-Type: image/png" "${link}"`,
    video_upload: `curl -sS --data-binary @loop.mp4 -H "Content-Type: video/mp4" "${link}"`,
    ...(pictureFailed ? { picture_failed: pictureFailed } : {}),
    ...(videoFailed ? { video_failed: videoFailed } : {}),
    do: [
      picture ? "" : `It has no picture yet, and a card without one says nothing: capture it running on its ground or its demo, at 1600×1200 (4:3, as the card shows it) (PNG, WebP or JPEG, at most ${VAULT_IMAGE_MAX / 1024 / 1024} MB) and send it with picture_upload, within ${UPLOAD_MINUTES} minutes.`,
      video ? "Its card plays the loop, always, at the video's own shape." : "Its card plays the piece itself on hover. If it only moves on scroll, needs a click or is heavy to start, record a loop of a few seconds (MP4, at the shape the piece asks for) and send it with video_upload (up to 4 MB) or video_url.",
      entry.access === "free" || entry.category === VAULT_RULES ? "It is published: everyone sees it and every agent can read its code." : `It is published: everyone sees it, and its code reaches the agents of ${FULL_PLANS} (access paid; pass access free to open it to every account).`,
      lacks.length ? `In Spanish it still lacks ${lacks.join("; ")}: the app shows the English there. Pass them in es, with title and category alone, to complete it.` : "",
    ].filter(Boolean).join(" "),
  };
}

export async function removeFromVault(ctx: McpCtx, input: { entry: string }) {
  await partner(ctx);
  const { title } = await removeVault(input.entry);
  return { removed: title };
}

/**
 * What the Vault holds for this project's landings, appended to criterio.md as an agent reads it: for each kind of
 * section its plans name, the entries that build one. Names only; the code comes with read_vault, and an entry whose
 * code this reader's plan does not open says so. Never in the file the team sees or exports.
 */
export async function vaultMd(reader: VaultReader, origin: string, org: string, projectId: string): Promise<string> {
  const all = await listVault();
  if (!all.length) return "";
  const S = schema.projectSystem;
  const [head] = await db.select({ outlines: S.outlines }).from(S).where(and(eq(S.organizationId, org), eq(S.projectId, projectId))).limit(1);
  const kinds = [...new Set(readOutlines(head?.outlines).flatMap((o) => o.sections.map((s) => s.kind)))];
  return vaultMdOf(all, kinds, await chosenFor(org, projectId), reader, origin);
}

/** vaultMd from what it reads: the Vault's cards, the kinds of section the project's plans name, the team's picks */
export function vaultMdOf(all: VaultCard[], kinds: string[], chosen: VaultCard[], reader: VaultReader, origin: string): string {
  if (!all.length) return "";
  const row = (c: VaultCard) => `- \`${c.slug}\` ${c.title}${c.summary ? `: ${c.summary}` : ""}${readable(reader, c) ? "" : " (code locked)"}`;
  // Rules travel with the file whatever its plans name: nobody building a section asks for them
  const rules = all.filter((c) => c.category === VAULT_RULES).slice(0, 6);
  const planned = kinds.filter((k) => k !== VAULT_RULES).map((k) => ({ kind: k, entries: all.filter((c) => c.category === k && !chosen.some((x) => x.id === c.id)).slice(0, 4) })).filter((g) => g.entries.length);
  const counts: Record<string, number> = {};
  for (const c of all) counts[c.category] = (counts[c.category] ?? 0) + 1;
  const rest = Object.entries(counts).filter(([k]) => k !== VAULT_RULES && !planned.some((g) => g.kind === k)).map(([k, n]) => `${k} (${n})`).join(", ");
  const locked = [...chosen, ...planned.flatMap((g) => g.entries)].some((c) => !readable(reader, c));
  return [
    "\n\n## From the Vault\n",
    "> Pieces criterio's team built and documented, with their code: a way to start a section from something that already works. Call read_vault with an entry's name for its code, and search_vault for the rest. An entry gives structure and motion; type, color, spacing and copy are this project's, from the decisions above.\n",
    locked ? `> An entry marked (code locked) is not this workspace's to build from: read_vault gives what it is and its live preview, never its code. ${lockedDo(origin)} When one is the fit, tell the person.\n` : "",
    chosen.length ? `### Chosen by the team\n\n> The team picked these for this project: start from them where they fit, before any other entry.\n\n${chosen.map((c) => `${row(c)} (${c.category})`).join("\n")}\n` : "",
    rules.length ? `### Rules for whatever you build\n\n> Not pieces to place: corrections to apply. After laying out any interface, read each one with read_vault and apply it wherever its cases turn up, whether or not the plan names it.\n\n${rules.map(row).join("\n")}\n` : "",
    ...planned.map((g) => `### ${g.kind}\n\n${g.entries.map(row).join("\n")}\n`),
    rest ? `${planned.length ? "Also in the Vault" : "In the Vault"}: ${rest}.\n` : "",
  ].filter(Boolean).join("\n");
}
