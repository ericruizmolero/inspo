// The Vault through the connector (lib/vault.ts): any agent searches it and reads an entry's code, so a section
// starts from something that already works; partners also write it from their own agent, which is how the Vault
// grows (the code we make in-house goes in with one call, its picture with one curl).
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
import { VAULT_CATEGORIES, VAULT_LIMITS as L, type VaultCard } from "@/types/vault";
import type { McpCtx } from "./auth";
import type { WithPictures } from "./pieces";

export const vaultUrl = (origin: string, slug: string) => `${origin}/?in=vault&entry=${encodeURIComponent(slug)}`;

async function partner(ctx: McpCtx): Promise<void> {
  if (!(await isAdmin(ctx.user.email))) throw new HttpError(403, "Only criterio's own team writes the Vault. Reading it (search_vault, read_vault) is open to everyone.");
}

/** Lowercase and without accents, to look through the entries */
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const brief = (origin: string) => (c: VaultCard) => ({ entry: c.slug, title: c.title, category: c.category, ...(c.summary ? { what_it_is: c.summary } : {}), ...(c.tags.length ? { tags: c.tags } : {}), ...(c.published ? {} : { draft: true }), url: vaultUrl(origin, c.slug) });

export const SearchVaultInput = z.object({
  category: z.enum(VAULT_CATEGORIES).optional().describe("One category: a kind of section (hero, nav, pricing, faq, footer…, the same words a landing's plan uses) or a detail (buttons, text, scroll, transitions, cursor, sliders, media, utilities)."),
  query: z.string().max(120).optional().describe("A few words to find by: a name, a technique, a library (\"tabs\", \"marquee\", \"gsap\")."),
});

/** The category whose entries are not pieces to place but rules to apply: corrections that hold across whatever is
 *  built (an optical alignment, a reset). An agent building a hero does not go looking for them, so they come along:
 *  with every search, and in criterio.md as an agent reads it */
export const VAULT_RULES = "utilities";
const RULES_DO = "These are rules, not a component: do not place the demo. Once what you are building is laid out, look for each case the entry names and apply its line where the case holds; where it does not, leave it out.";

/** The words of a query that say nothing by themselves, in English and Spanish */
const FILLER = new Set(["a", "an", "the", "and", "or", "with", "without", "for", "of", "in", "on", "to", "that", "this", "is", "as", "by", "un", "una", "el", "la", "los", "las", "y", "o", "con", "sin", "para", "de", "del", "en", "que"]);
/** A word as it is looked for: "buttons" finds "button" and the other way round */
const stem = (w: string) => (w.length > 3 ? w.replace(/(es|s)$/, "") : w);

/** The Vault's entries, narrowed by a category and a few words. With neither, all of them and how many each category holds */
export async function searchVault(ctx: McpCtx, origin: string, input: z.infer<typeof SearchVaultInput>) {
  const [all, more] = await Promise.all([listVault({ drafts: await isAdmin(ctx.user.email) }), vaultWords()]);
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
  return {
    entries: found.map(brief(origin)),
    ...(rules.length ? { always_apply: rules.map(brief(origin)) } : {}),
    categories: counts,
    do: [
      found.length
        ? "Pick what fits the section you are building and the project's criterio, then call read_vault with its entry for the code. An entry is a starting point: the project's decisions (type, color, voice, every Never line) come first, and its copy is the project's own."
        : "Nothing in the Vault for that yet. Build it from the project's criterio and references.",
      rules.length ? "always_apply holds rules, not pieces: whatever you build, read each one with read_vault and apply it where its cases turn up (an icon in a button, a play triangle, tracked capitals), whether or not you searched for it." : "",
    ].filter(Boolean).join(" "),
  };
}

/** One entry whole: what it is, when to use it, its code block by block, and its picture */
export async function readVaultEntry(ctx: McpCtx, origin: string, ref: string): Promise<WithPictures> {
  const e = await readVault(ref, { drafts: await isAdmin(ctx.user.email) });
  if (!e) throw new HttpError(404, `No Vault entry "${ref}". search_vault lists them.`);
  const f = e.imageKey ? await getFile(e.imageKey).catch(() => null) : null;
  const result = {
    entry: e.slug, title: e.title, category: e.category,
    ...(e.summary ? { what_it_is: e.summary } : {}),
    ...(e.use ? { when_to_use: e.use } : {}),
    ...(e.tags.length ? { tags: e.tags } : {}),
    ...(e.liveUrl ? { live: e.liveUrl } : {}),
    ...(e.published ? {} : { draft: true }),
    url: vaultUrl(origin, e.slug),
    documentation: e.blocks ?? [],
    do: e.category === VAULT_RULES ? RULES_DO : "Adapt it, do not paste it: keep the structure and the motion, and take every value (type, color, radius, spacing, copy) from the project's criterio. Load the scripts a block names before the code that needs them.",
  };
  return { result, pictures: f && f.size <= VAULT_IMAGE_MAX ? [{ data: f.body.toString("base64"), mimeType: f.contentType }] : [] };
}

const Block = z.object({
  title: z.string().min(1).max(L.blockTitle).describe("What this step is: \"Setup: external scripts\", \"HTML\", \"CSS\", \"JavaScript\"."),
  lang: z.string().min(1).max(L.lang).describe("The code's language: html, css, js, ts, tsx, json, bash."),
  code: z.string().min(1).max(L.code).describe("The code as it is pasted, whole."),
  note: z.string().max(L.blockNote).optional().describe("A line on what to change or watch out for."),
});

export const AddVaultInput = z.object({
  title: z.string().min(1).max(L.title).describe("The entry's name, as a card shows it: \"Folder Tabs\", \"Comparison Table (Basic)\"."),
  category: z.enum(VAULT_CATEGORIES).describe("A kind of section (hero, nav, pricing, faq, footer…) or a detail (buttons, text, scroll, transitions, cursor, sliders, media, utilities)."),
  entry: z.string().max(60).optional().describe("The entry to update, as search_vault names it. Left out, the title names it: the same title updates the same entry."),
  summary: z.string().max(L.summary).optional().describe("What it is, in a sentence."),
  use: z.string().max(L.use).optional().describe("When to reach for it and what makes it good: what an agent reads to choose it over another."),
  tags: z.array(z.string().max(L.tag)).max(L.tags).optional().describe("Techniques, libraries and behaviours: GSAP, SplitText, Tabs, Hover, Responsive."),
  blocks: z.array(Block).max(L.blocks).optional().describe("The documentation, in the order it is set up. Passing it replaces every block."),
  es: z.object({
    title: z.string().max(L.title).optional().describe("The name in Spanish, as a Spanish designer would call the piece. A term the trade keeps in English stays (\"Slider\", \"Hero\")."),
    summary: z.string().max(L.summary).optional().describe("summary in Spanish."),
    use: z.string().max(L.use).optional().describe("use in Spanish."),
    tags: z.array(z.string().max(L.tag)).max(L.tags).optional().describe("tags in Spanish, one for each tag and in the same order. A library's name or a term kept in English stays as it is (GSAP, Hover)."),
    blocks: z.array(z.object({ title: z.string().max(L.blockTitle).optional(), note: z.string().max(L.blockNote).optional() })).max(L.blocks).optional().describe("Each block's title and note in Spanish, one for each block and in the same order; never the code."),
  }).optional().describe("The same words in Spanish (Spain: \"en directo\", not \"en vivo\"), for whoever reads the app in Spanish: the English fields are what an agent reads, these are what a person sees. Every text you pass in this call needs its Spanish here; without it the call is refused."),
  demo: z.string().max(L.demo).optional().describe("A whole, self-contained HTML document that shows the piece running, for the live preview in the app: the blocks' code plus what a demo needs around it (a ground, real-looking content, pictures by public address). Scripts load from a CDN. Left out, the preview is put together from the html, css and js blocks, centred on a plain ground. An empty string removes it."),
  ground: z.string().max(7).optional().describe("The colour the piece stands on, as #rrggbb, for a preview put together from the blocks (light or dark: the text colour follows). Take its picture on this same ground, or the card changes colour when the piece starts on hover. A demo sets its own."),
  live_url: z.string().max(2000).optional().describe("A public page where it runs, when there is one besides the preview."),
  source_url: z.string().max(2000).optional().describe("The site it was learnt from, when there is one."),
  image_url: z.string().max(2000).optional().describe("A public address of its picture (PNG, WebP or JPEG). A file on your disk goes through the upload link in the answer instead."),
  video_url: z.string().max(2000).optional().describe("A public address of a short loop of the piece running: the file itself, or a Screen Studio share link (MP4 or WebM, a few seconds, no sound, at the shape the piece asks for: the card takes the video's own). Only for a piece its card cannot play live: one that moves on scroll, needs a click or a drag, or is heavy to start. With it the card plays the loop, always, in place of the piece. A file on your disk of up to 4 MB goes through the upload link instead."),
  remove_video: z.boolean().optional().describe("True takes the loop away: the card plays the piece itself again."),
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
  const es = input.es ?? {};
  const owed = [
    es.title ? "" : "es.title",
    !input.summary || es.summary ? "" : "es.summary",
    !input.use || es.use ? "" : "es.use",
    !input.tags?.length || es.tags?.length === input.tags.length ? "" : `es.tags (${input.tags.length}, in the order of tags)`,
    !input.blocks?.length || (es.blocks?.length === input.blocks.length && input.blocks.every((b, i) => es.blocks![i]?.title && (!b.note || es.blocks![i]?.note))) ? "" : `es.blocks (${input.blocks.length}, in the order of blocks: each one's title, and its note where the block has one)`,
  ].filter(Boolean);
  const before = await readVault(input.entry || input.title, { drafts: true });
  if (owed.length && !(owed.length === 1 && owed[0] === "es.title" && before)) throw new HttpError(400, `The Vault is read in Spanish too. Send the call again with the Spanish of what it writes: ${owed.join("; ")}.`);
  const { entry, created } = await saveVault({ ...input, slug: input.entry }, ctx.user.id);
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
    const body = await videoFromLink(input.video_url);
    if (body) { await setVaultVideo(entry.id, body); video = true; }
    else videoFailed = `The video at video_url could not be read (MP4 or WebM, at most ${VAULT_VIDEO_MAX / 1024 / 1024} MB).`;
  }
  const link = uploadUrl(origin, ctx.user.id, entry.id);
  return {
    entry: entry.slug, title: entry.title, category: entry.category, created, published: !!entry.publishedAt, blocks: entry.blocks.length, has_picture: picture, has_video: video, live_preview: canPreview(entry),
    url: vaultUrl(origin, entry.slug),
    picture_upload: `curl -sS --data-binary @preview.png -H "Content-Type: image/png" "${link}"`,
    video_upload: `curl -sS --data-binary @loop.mp4 -H "Content-Type: video/mp4" "${link}"`,
    ...(pictureFailed ? { picture_failed: pictureFailed } : {}),
    ...(videoFailed ? { video_failed: videoFailed } : {}),
    do: [
      picture ? "" : `It has no picture yet, and a card without one says nothing: capture it running on its ground or its demo, at 1600×1200 (4:3, as the card shows it) (PNG, WebP or JPEG, at most ${VAULT_IMAGE_MAX / 1024 / 1024} MB) and send it with picture_upload, within ${UPLOAD_MINUTES} minutes.`,
      video ? "Its card plays the loop, always, at the video's own shape." : "Its card plays the piece itself on hover. If it only moves on scroll, needs a click or is heavy to start, record a loop of a few seconds (MP4, at the shape the piece asks for) and send it with video_upload (up to 4 MB) or video_url.",
      "It is published: everyone sees it and every agent can read its code.",
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
 * section its plans name, the entries that build one. Names only; the code comes with read_vault. Never in the file
 * the team sees or exports.
 */
export async function vaultMd(org: string, projectId: string): Promise<string> {
  const all = await listVault();
  if (!all.length) return "";
  const S = schema.projectSystem;
  const [head] = await db.select({ outlines: S.outlines }).from(S).where(and(eq(S.organizationId, org), eq(S.projectId, projectId))).limit(1);
  const kinds = [...new Set(readOutlines(head?.outlines).flatMap((o) => o.sections.map((s) => s.kind)))];
  const chosen = await chosenFor(org, projectId);
  const row = (c: VaultCard) => `- \`${c.slug}\` ${c.title}${c.summary ? `: ${c.summary}` : ""}`;
  // Rules travel with the file whatever its plans name: nobody building a section asks for them
  const rules = all.filter((c) => c.category === VAULT_RULES).slice(0, 6);
  const planned = kinds.filter((k) => k !== VAULT_RULES).map((k) => ({ kind: k, entries: all.filter((c) => c.category === k && !chosen.some((x) => x.id === c.id)).slice(0, 4) })).filter((g) => g.entries.length);
  const counts: Record<string, number> = {};
  for (const c of all) counts[c.category] = (counts[c.category] ?? 0) + 1;
  const rest = Object.entries(counts).filter(([k]) => k !== VAULT_RULES && !planned.some((g) => g.kind === k)).map(([k, n]) => `${k} (${n})`).join(", ");
  return [
    "\n\n## From the Vault\n",
    "> Pieces criterio's team built and documented, with their code: a way to start a section from something that already works. Call read_vault with an entry's name for its code, and search_vault for the rest. An entry gives structure and motion; type, color, spacing and copy are this project's, from the decisions above.\n",
    chosen.length ? `### Chosen by the team\n\n> The team picked these for this project: start from them where they fit, before any other entry.\n\n${chosen.map((c) => `${row(c)} (${c.category})`).join("\n")}\n` : "",
    rules.length ? `### Rules for whatever you build\n\n> Not pieces to place: corrections to apply. After laying out any interface, read each one with read_vault and apply it wherever its cases turn up, whether or not the plan names it.\n\n${rules.map(row).join("\n")}\n` : "",
    ...planned.map((g) => `### ${g.kind}\n\n${g.entries.map(row).join("\n")}\n`),
    rest ? `${planned.length ? "Also in the Vault" : "In the Vault"}: ${rest}.\n` : "",
  ].filter(Boolean).join("\n");
}
