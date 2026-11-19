// The Vault's own store (types/vault.ts): entries we curate, each a piece of a site with the code that makes it.
// It belongs to no workspace. Partners write it (lib/mcp/vault.ts is the way in, from an agent); everyone signed in
// reads the cards, and the code travels through the connector to whoever builds with it.
import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { imageTypeOf } from "./brand-files";
import { deleteFiles, fileUrl, putFile } from "./storage";
import { fetchFile } from "./remote-file";
import { safeFetch } from "./safe-fetch";
import { canPreview, previewDoc } from "./vault-preview";
import { VAULT_CATEGORIES, VAULT_LIMITS as L, vaultSlug, type VaultBlock, type VaultCard, type VaultEntry, type VaultEs } from "@/types/vault";
import type { Locale } from "./i18n/locale";

const V = schema.vaultItem;

/** Where the Vault's pictures live in storage: shared by everyone signed in (app/api/files) */
export const VAULT_PREFIX = "vault/";
export const VAULT_IMAGE_MAX = 4 * 1024 * 1024;
const EXT: Record<string, string> = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg", "video/mp4": "mp4", "video/webm": "webm" };
/** A loop by address may weigh this much; one sent to the upload link is held to VAULT_IMAGE_MAX by the platform */
export const VAULT_VIDEO_MAX = 25 * 1024 * 1024;
/** What a file's first bytes say it is: an MP4 (or a QuickTime file, the same container) or a WebM; null otherwise */
export const videoTypeOf = (b: Buffer): "video/mp4" | "video/webm" | null =>
  b.subarray(4, 8).toString("latin1") === "ftyp" ? "video/mp4" : b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 ? "video/webm" : null;

/** An MP4's picture, width over height, from its first track with a size (moov › trak › tkhd, whose last eight bytes
 *  are the two as 16.16 fixed point); null when the file says none, or is a WebM: the browser measures those */
export function videoRatioOf(b: Buffer): number | null {
  const boxes = function* (from: number, to: number): Generator<{ type: string; start: number; end: number }> {
    for (let at = from; at + 8 <= to;) {
      let size = b.readUInt32BE(at), head = 8;
      if (size === 1 && at + 16 <= to) { size = Number(b.readBigUInt64BE(at + 8)); head = 16; }
      else if (size === 0) size = to - at;
      if (size < head || at + size > to) return;
      yield { type: b.subarray(at + 4, at + 8).toString("latin1"), start: at + head, end: at + size };
      at += size;
    }
  };
  try {
    for (const moov of boxes(0, b.length)) {
      if (moov.type !== "moov") continue;
      for (const trak of boxes(moov.start, moov.end)) {
        if (trak.type !== "trak") continue;
        for (const tkhd of boxes(trak.start, trak.end)) {
          if (tkhd.type !== "tkhd" || tkhd.end - tkhd.start < 8) continue;
          const w = b.readUInt32BE(tkhd.end - 8) / 65536, h = b.readUInt32BE(tkhd.end - 4) / 65536;
          if (w >= 16 && h >= 16) return Math.round((w / h) * 1000) / 1000;
        }
      }
    }
  } catch { /* a cut or odd file: no size */ }
  return null;
}

type Row = typeof V.$inferSelect;

/** The entry's Spanish, for whoever reads the app in Spanish; an agent, and everyone else, gets the English */
const esOf = (r: Row, locale?: Locale): VaultEs => (locale === "es" && r.es ? r.es : {});

const cardOf = (r: Row, locale?: Locale): VaultCard => ({
  id: r.id, slug: r.slug, title: esOf(r, locale).title || r.title, category: r.category,
  // Tags go one to one: a list that no longer matches the English one is from before a change
  tags: esOf(r, locale).tags?.length === r.tags.length ? esOf(r, locale).tags! : r.tags, summary: esOf(r, locale).summary || r.summary,
  image: r.imageKey ? fileUrl(r.imageKey) : null, video: r.videoKey ? fileUrl(r.videoKey) : null, videoRatio: r.videoKey ? r.videoRatio : null, liveUrl: r.liveUrl, published: !!r.publishedAt, preview: canPreview(r), createdAt: (r.publishedAt ?? r.createdAt).toISOString(),
});

/** The Vault's cards, newest first. Drafts only for partners */
export async function listVault(o: { drafts?: boolean; categories?: readonly string[]; locale?: Locale } = {}): Promise<VaultCard[]> {
  const rows = await db.select().from(V)
    .where(and(o.drafts ? undefined : isNotNull(V.publishedAt), o.categories?.length ? inArray(V.category, [...o.categories]) : undefined))
    .orderBy(desc(V.publishedAt), desc(V.createdAt));
  return rows.map((r) => cardOf(r, o.locale));
}

async function rowOf(ref: string): Promise<Row | null> {
  const key = String(ref ?? "").trim();
  if (!key) return null;
  const [row] = await db.select().from(V).where(or(eq(V.id, key), eq(V.slug, key.toLowerCase()))).limit(1);
  return row ?? null;
}

/** One entry by id or slug. `code` false leaves the documentation out (the app, for whoever is not a partner) */
export async function readVault(ref: string, o: { drafts?: boolean; code?: boolean; locale?: Locale } = {}): Promise<(VaultEntry & { imageKey: string | null }) | null> {
  const r = await rowOf(ref);
  if (!r || (!r.publishedAt && !o.drafts)) return null;
  const U = schema.user;
  const [by] = r.createdBy ? await db.select({ name: U.name, image: U.image }).from(U).where(eq(U.id, r.createdBy)).limit(1) : [];
  const es = esOf(r, o.locale);
  const steps = es.blocks?.length === r.blocks.length ? es.blocks : null;
  const blocks = steps ? r.blocks.map((b, i) => ({ ...b, title: steps[i]?.title || b.title, ...(steps[i]?.note && b.note ? { note: steps[i].note } : {}) })) : r.blocks;
  return { ...cardOf(r, o.locale), use: es.use || r.use, sourceUrl: r.sourceUrl, blocks: o.code === false ? null : blocks, by: by?.name ?? null, byImage: by?.image ?? null, imageKey: r.imageKey };
}

const line = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const address = (s: unknown) => { const u = line(s, 2000); return /^https?:\/\//i.test(u) ? u : null; };

export interface VaultInput {
  title: string; category: string; slug?: string; summary?: string; use?: string; tags?: readonly string[];
  blocks?: readonly VaultBlock[]; demo?: string; ground?: string; live_url?: string; source_url?: string;
  /** The same words in Spanish, piece by piece: one left out stays, unless its English changed in this write */
  es?: VaultEs;
}

/** What an entry still lacks in Spanish, by the name add_to_vault takes it under: the app shows the English there */
export function missingEs(r: Pick<Row, "summary" | "use" | "tags" | "blocks" | "es">): string[] {
  const es = r.es ?? {};
  return [
    es.title ? "" : "es.title",
    !r.summary || es.summary ? "" : "es.summary",
    !r.use || es.use ? "" : "es.use",
    !r.tags.length || es.tags?.length === r.tags.length ? "" : `es.tags (${r.tags.length}, in the order of tags)`,
    !r.blocks.length || (es.blocks?.length === r.blocks.length && r.blocks.every((b, i) => es.blocks![i]?.title && (!b.note || es.blocks![i]?.note))) ? "" : `es.blocks (${r.blocks.length}, in the order of blocks: each one's title, and its note where the block has one)`,
  ].filter(Boolean);
}

/** Writes an entry: a new one, or the one with that slug, whole fields at a time (what is not passed stays) */
export async function saveVault(input: VaultInput, userId: string): Promise<{ entry: Row; created: boolean }> {
  const title = line(input.title, L.title);
  const slug = vaultSlug(input.slug || title);
  if (!title || !slug) throw new HttpError(400, "The entry needs a title.");
  if (!VAULT_CATEGORIES.includes(input.category)) throw new HttpError(400, `"${input.category}" is not a category of the Vault. One of: ${VAULT_CATEGORIES.join(", ")}.`);
  const blocks = input.blocks?.map((b) => ({ title: line(b.title, L.blockTitle), lang: line(b.lang, L.lang).toLowerCase(), code: String(b.code ?? "").replace(/\r\n/g, "\n").replace(/^\n+|\s+$/g, "").slice(0, L.code), ...(line(b.note, L.blockNote) ? { note: line(b.note, L.blockNote) } : {}) }))
    .filter((b) => b.code).slice(0, L.blocks);
  const tags = input.tags ? [...new Set(input.tags.map((t) => line(t, L.tag)).filter(Boolean))].slice(0, L.tags) : undefined;
  const now = new Date();
  const existing = await rowOf(slug);
  // The Spanish: what this write brings over what was there. A piece whose English changes here without its Spanish
  // is dropped, so the app shows the new English and not a translation of the old
  const was = existing?.es ?? {};
  const given = input.es ?? {};
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const esTags = given.tags ? given.tags.map((t) => line(t, L.tag)).slice(0, L.tags) : undefined;
  const esBlocks = given.blocks ? given.blocks.slice(0, L.blocks).map((b) => ({ title: line(b?.title, L.blockTitle), ...(line(b?.note, L.blockNote) ? { note: line(b?.note, L.blockNote) } : {}) })) : undefined;
  const keep = {
    title: given.title !== undefined ? line(given.title, L.title) : !existing || existing.title === title ? was.title : undefined,
    summary: given.summary !== undefined ? line(given.summary, L.summary) : input.summary === undefined || line(input.summary, L.summary) === existing?.summary ? was.summary : undefined,
    use: given.use !== undefined ? String(given.use).trim().slice(0, L.use) : input.use === undefined || String(input.use).trim().slice(0, L.use) === existing?.use ? was.use : undefined,
    tags: esTags ?? (!tags || same(tags, existing?.tags) ? was.tags : undefined),
    blocks: esBlocks ?? (!blocks || same(blocks.map((b) => [b.title, b.note ?? ""]), existing?.blocks.map((b) => [b.title, b.note ?? ""])) ? was.blocks : undefined),
  };
  const es = Object.fromEntries(Object.entries(keep).filter(([, v]) => (Array.isArray(v) ? v.length : v))) as VaultEs;
  const set = {
    es: Object.keys(es).length ? es : null,
    title, category: input.category,
    ...(input.summary !== undefined ? { summary: line(input.summary, L.summary) } : {}),
    ...(input.use !== undefined ? { use: String(input.use).trim().slice(0, L.use) } : {}),
    ...(tags ? { tags } : {}),
    ...(blocks ? { blocks } : {}),
    ...(input.demo !== undefined ? { demo: String(input.demo).trim().slice(0, L.demo) || null } : {}),
    ...(input.ground !== undefined ? { ground: /^#[0-9a-f]{6}$/i.test(input.ground.trim()) ? input.ground.trim().toUpperCase() : null } : {}),
    ...(input.live_url !== undefined ? { liveUrl: address(input.live_url) } : {}),
    ...(input.source_url !== undefined ? { sourceUrl: address(input.source_url) } : {}),
    // There are no drafts: an entry is published as it is written, and one left unpublished from before is published by its next write
    publishedAt: existing?.publishedAt ?? now,
    updatedAt: now,
  };
  if (existing) {
    const [entry] = await db.update(V).set(set).where(eq(V.id, existing.id)).returning();
    return { entry, created: false };
  }
  const [entry] = await db.insert(V).values({ id: newId(), slug, createdBy: userId, createdAt: now, ...set }).returning();
  return { entry, created: true };
}

/** The document an entry's live preview shows, or null when it has nothing to run */
export async function vaultPreview(ref: string, o: { drafts?: boolean } = {}): Promise<string | null> {
  const r = await rowOf(ref);
  if (!r || (!r.publishedAt && !o.drafts)) return null;
  return previewDoc(r);
}

/** Sets an entry's picture from its bytes. The type is what the bytes say; the one before is deleted */
export async function setVaultPicture(ref: string, body: Buffer): Promise<string> {
  const r = await rowOf(ref);
  if (!r) throw new HttpError(404, `No Vault entry "${ref}".`);
  const type = imageTypeOf(body);
  if (!type) throw new HttpError(415, "The picture is not a PNG, WebP or JPEG.");
  if (body.length > VAULT_IMAGE_MAX) throw new HttpError(413, `The picture is over ${VAULT_IMAGE_MAX / 1024 / 1024} MB: scale it down and send it again.`);
  // The bytes name the file, so a new picture has a new address and no cache shows the old one
  const key = `${VAULT_PREFIX}${r.id}/${createHash("sha256").update(body).digest("hex").slice(0, 16)}.${EXT[type]}`;
  await putFile(key, body, type);
  await db.update(V).set({ imageKey: key, updatedAt: new Date() }).where(eq(V.id, r.id));
  if (r.imageKey && r.imageKey !== key) await deleteFiles([r.imageKey]).catch(() => {});
  return fileUrl(key);
}

/** Sets an entry's loop from its bytes, or takes it away (null): the card then plays the piece itself again */
export async function setVaultVideo(ref: string, body: Buffer | null): Promise<{ video: string | null; ratio: number | null }> {
  const r = await rowOf(ref);
  if (!r) throw new HttpError(404, `No Vault entry "${ref}".`);
  let key: string | null = null;
  let ratio: number | null = null;
  if (body) {
    const type = videoTypeOf(body);
    if (!type) throw new HttpError(415, "The video is not an MP4 or a WebM.");
    if (body.length > VAULT_VIDEO_MAX) throw new HttpError(413, `The video is over ${VAULT_VIDEO_MAX / 1024 / 1024} MB: a loop of a few seconds fits in far less.`);
    key = `${VAULT_PREFIX}${r.id}/${createHash("sha256").update(body).digest("hex").slice(0, 16)}.${EXT[type]}`;
    await putFile(key, body, type);
    ratio = videoRatioOf(body);
  }
  await db.update(V).set({ videoKey: key, videoRatio: ratio, updatedAt: new Date() }).where(eq(V.id, r.id));
  if (r.videoKey && r.videoKey !== key) await deleteFiles([r.videoKey]).catch(() => {});
  return { video: key ? fileUrl(key) : null, ratio };
}

const VIDEO_TYPE = (t: string) => /^video\/(mp4|webm|quicktime)$/.test(t);
/** The video a link leads to: the file itself, or the one a share page hands out as og:video (Screen Studio does;
 *  a page that only offers a player, not a file, gives null) */
export async function videoFromLink(link: string): Promise<Buffer | null> {
  const url = link.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const direct = await fetchFile(url, undefined, VIDEO_TYPE, VAULT_VIDEO_MAX).catch(() => null);
  if (direct) return direct.body;
  const page = await safeFetch(new URL(url), { headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" }, signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!page?.ok) return null;
  const html = (await page.text()).slice(0, 600_000);
  const found = [...html.matchAll(/<meta[^>]+(?:property|name)="og:video(?::secure_url|:url)?"[^>]+content="([^"]+)"/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
  for (const src of found) {
    const f = await fetchFile(src, url, VIDEO_TYPE, VAULT_VIDEO_MAX).catch(() => null);
    if (f) return f.body;
  }
  return null;
}

/** A file sent to an entry's upload link: a picture or a loop, told apart by its bytes */
export async function setVaultMedia(ref: string, body: Buffer): Promise<{ picture: string } | { video: string }> {
  return videoTypeOf(body) ? { video: (await setVaultVideo(ref, body)).video! } : { picture: await setVaultPicture(ref, body) };
}

/** Deletes an entry, its picture and its loop */
export async function removeVault(ref: string): Promise<{ title: string }> {
  const r = await rowOf(ref);
  if (!r) throw new HttpError(404, `No Vault entry "${ref}".`);
  await db.delete(V).where(eq(V.id, r.id));
  const files = [r.imageKey, r.videoKey].filter((k): k is string => !!k);
  if (files.length) await deleteFiles(files).catch(() => {});
  return { title: r.title };
}

// ─── A team's picks ──────────────────────────────────────────────────────────
const PV = schema.projectVault;

async function projectIn(organizationId: string, projectId: string): Promise<void> {
  const P = schema.project;
  const [p] = await db.select({ id: P.id }).from(P).where(and(eq(P.id, String(projectId ?? "")), eq(P.organizationId, organizationId))).limit(1);
  if (!p) throw new HttpError(404, "That project is not in this workspace.");
}

/** The projects of a workspace an entry was chosen for */
export async function projectsUsing(organizationId: string, ref: string): Promise<string[]> {
  const r = await rowOf(ref);
  if (!r) return [];
  const rows = await db.select({ projectId: PV.projectId }).from(PV).where(and(eq(PV.organizationId, organizationId), eq(PV.vaultId, r.id)));
  return rows.map((x) => x.projectId);
}

/** Chooses a published entry for a project of this workspace, or takes the choice back */
export async function pickForProject(organizationId: string, userId: string, ref: string, projectId: string, on: boolean): Promise<void> {
  await projectIn(organizationId, projectId);
  const r = await rowOf(ref);
  if (!r || !r.publishedAt) throw new HttpError(404, `No Vault entry "${ref}".`);
  if (on) await db.insert(PV).values({ projectId, vaultId: r.id, organizationId, addedBy: userId }).onConflictDoNothing();
  else await db.delete(PV).where(and(eq(PV.projectId, projectId), eq(PV.vaultId, r.id), eq(PV.organizationId, organizationId)));
}

/** The published entries a project's team chose, oldest pick first */
export async function chosenFor(organizationId: string, projectId: string): Promise<VaultCard[]> {
  const rows = await db.select({ v: V }).from(PV).innerJoin(V, eq(V.id, PV.vaultId))
    .where(and(eq(PV.organizationId, organizationId), eq(PV.projectId, projectId), isNotNull(V.publishedAt))).orderBy(PV.createdAt);
  return rows.map((x) => cardOf(x.v));
}

/** Every pick of a workspace, by entry: the Vault's grid knows which cards are already in a project without asking card by card */
export async function picksOf(organizationId: string): Promise<Record<string, string[]>> {
  const rows = await db.select({ vaultId: PV.vaultId, projectId: PV.projectId }).from(PV).where(eq(PV.organizationId, organizationId));
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.vaultId] ??= []).push(r.projectId);
  return out;
}
