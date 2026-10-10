// Templates from a folder: docs/templates/<name>/ holds system.json (name, template, summary, the areas with their
// decision, why and never, and its board) and, when there is one, receta.md (the recipe of the work).
// The board is the references a project cloned from the template starts with: links, image files in the folder,
// or texts (.md files in the folder: the work's own content). Each one is saved in the workspace's library (once:
// loading again reuses it), filed in the template and set as evidence of its areas, with what to take from it there
// (`takes`, area by area) or, failing that, its note.
// The folders under docs/templates are the built-in templates: every workspace gets them the first time its
// templates are listed (ensureBuiltinTemplates), so nobody has to load them by hand. scripts/seed-template.ts
// loads one folder into one workspace, replacing what was there. A folder kept anywhere else (docs/template-drafts)
// is nobody's until that script loads it: a trial, in the one workspace it was loaded into, which can delete it.
import "server-only";
import { createHash } from "crypto";
import { existsSync, readFileSync, readdirSync } from "fs";
import { basename, dirname, extname, join, resolve } from "path";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./workspace-core";
import { addItem, findByWeb, setTags } from "./items";
import { putFile, fileUrl } from "./storage";
import { mediaPrefix } from "./media";
import { typeFromUrl } from "./url";
import { textPrefix, textTags } from "./text-refs";
import type { ProjectTemplate } from "@/types/system";
import { log } from "./log";

const P = schema.project, S = schema.projectSystem, A = schema.systemArea, PI = schema.projectItem;
/** Who "saved" a template's references: nobody of the workspace. They are the template's until a project is cloned from it */
export const TEMPLATE_AUTHOR = "Criterio";
const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

interface TemplateSpec {
  /** `poster` here is a file of the folder ("board/result.png"), not yet an address */
  name: string; template: Omit<ProjectTemplate, "builtin">; summary: string;
  areas: Record<string, { decision: string; why: string; never: string[] }>;
  board?: { web?: string; file?: string; text?: string; name: string; note: string; areas: string[]; takes?: Record<string, string> }[];
}
export const readTemplateSpec = (dir: string) => JSON.parse(readFileSync(join(dir, "system.json"), "utf8")) as TemplateSpec;

/**
 * Loads the folder's template into a workspace. `replace` takes the place of a template with the same name (only a
 * template: a project that happens to share the name is never touched). With an `id`, a template that already has
 * that id is left as it is and null comes back: two requests loading the same built-in end up with one.
 */
export async function loadTemplateFolder(dir: string, organizationId: string, opts: { authorId?: string | null; replace?: boolean; id?: string; at?: Date } = {}): Promise<{ id: string; replaced: boolean; areas: number; references: number; recipe: number } | null> {
  const spec = readTemplateSpec(dir);
  const folder = basename(dir);
  const authorId = opts.authorId ?? null;
  const recipe = (() => { try { return readFileSync(join(dir, "receta.md"), "utf8"); } catch { return ""; } })();
  const now = opts.at ?? new Date();

  // The board first: each reference in the library. All of it can be done twice without harm
  const itemIds: string[] = [];
  const evidence: Record<string, { itemId: string; take: string; pinned: boolean }[]> = {};
  for (const ref of spec.board ?? []) {
    let web = ref.web ?? "";
    if (ref.file) {
      // A fixed key per template and file, so loading again finds the same item instead of a copy
      const ext = extname(ref.file).toLowerCase();
      const key = `${mediaPrefix(organizationId)}template-${folder}-${basename(ref.file, ext)}${ext}`;
      web = fileUrl(key);
      if (!(await findByWeb(organizationId, web))) await putFile(key, readFileSync(join(dir, ref.file)), TYPES[ext] ?? "image/jpeg");
    }
    if (ref.text) {
      // The same for a text: its words in a file under a fixed key, whose path is the item's address
      const key = `${textPrefix(organizationId)}template-${folder}-${basename(ref.text, extname(ref.text))}.md`;
      web = fileUrl(key);
      if (!(await findByWeb(organizationId, web))) await putFile(key, readFileSync(join(dir, ref.text)), "text/markdown; charset=utf-8");
    }
    const found = await findByWeb(organizationId, web);
    const itemId = found?.id ?? (await addItem(organizationId, {
      name: ref.name, web, note: ref.note, type: ref.file || ref.text ? "inspiration" : typeFromUrl(web),
      author: TEMPLATE_AUTHOR, createdBy: authorId, thumbnailUrl: ref.file ? web : null,
    })).id!;
    // A text has no look to tag: its first lines are what the card and the models read
    if (ref.text && !found) await setTags(organizationId, web, await textTags(web));
    itemIds.push(itemId);
    for (const area of ref.areas) (evidence[area] ??= []).push({ itemId, take: ref.takes?.[area] ?? ref.note, pinned: true });
  }

  // The result's own picture, when it is not a page to capture: a file of the folder, kept like the board's
  let poster: string | undefined;
  if (spec.template.poster) {
    const ext = extname(spec.template.poster).toLowerCase();
    const key = `${mediaPrefix(organizationId)}template-${folder}-${basename(spec.template.poster, ext)}${ext}`;
    await putFile(key, readFileSync(join(dir, spec.template.poster)), TYPES[ext] ?? "image/jpeg");
    poster = fileUrl(key);
  }
  // Only the folders under docs/templates are built in; one loaded from elsewhere is the workspace's own
  const builtin = dirname(resolve(dir)) === BUILTIN_ROOT;

  // Then the template itself, whole or not at all
  const id = opts.id ?? newId();
  return db.transaction(async (tx) => {
    let replaced = false;
    if (opts.replace) {
      const [old] = await tx.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.name, spec.name), isNotNull(P.template))).limit(1);
      if (old) { await tx.delete(P).where(eq(P.id, old.id)); replaced = true; }
    }
    const made = await tx.insert(P).values({ id, organizationId, name: spec.name, createdBy: authorId, template: { ...spec.template, ...(poster ? { poster } : {}), ...(builtin ? { builtin: folder } : {}) }, recipe, createdAt: now, updatedAt: now })
      .onConflictDoNothing().returning({ id: P.id });
    if (!made.length) return null;
    await tx.insert(S).values({ projectId: id, organizationId, summary: spec.summary, runJson: null, createdAt: now, updatedAt: now });
    if (itemIds.length) await tx.insert(PI).values(itemIds.map((itemId) => ({ projectId: id, itemId, organizationId, addedBy: authorId, createdAt: now }))).onConflictDoNothing();
    for (const [area, a] of Object.entries(spec.areas)) {
      await tx.insert(A).values({ projectId: id, organizationId, area, decision: a.decision, confidence: 100, evidence: evidence[area] ?? [], source: "team", decidedBy: authorId, why: a.why, never: a.never.join("\n"), updatedAt: now });
    }
    return { id, replaced, areas: Object.keys(spec.areas).length, references: itemIds.length, recipe: recipe.length };
  });
}

// ─── Built-in templates ──────────────────────────────────────────────────────

const BUILTIN_ROOT = join(process.cwd(), "docs", "templates");
/** The folders that hold a template, in the order they are shown (by name) */
function builtinFolders(): string[] {
  try {
    return readdirSync(BUILTIN_ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(BUILTIN_ROOT, d.name, "system.json"))).map((d) => d.name).sort();
  } catch { return []; }
}
/** The repo's file behind a built-in template's image, from the storage key loading it wrote. For the scripts: a
 *  local workspace's template images may be in no storage they can read. null: not one of those images */
export function builtinTemplateFile(key: string): Buffer | null {
  const name = key.split("/").pop() ?? "";
  for (const folder of builtinFolders()) {
    const ref = (readTemplateSpec(join(BUILTIN_ROOT, folder)).board ?? []).find((r) => {
      const ext = r.file ? extname(r.file).toLowerCase() : "";
      return r.file && name === `template-${folder}-${basename(r.file, ext)}${ext}`;
    });
    if (ref?.file) return readFileSync(join(BUILTIN_ROOT, folder, ref.file));
  }
  return null;
}
/** The same id for the same workspace and folder, so two servers loading it at once write one template */
const builtinId = (organizationId: string, folder: string) => createHash("sha1").update(`${organizationId}:template:${folder}`).digest("hex").slice(0, 24);

// Once per workspace and server instance: after that the folders are not read again
const ensured = new Map<string, Promise<void>>();

/** Every workspace has the built-in templates: the ones it lacks (by name) are loaded, the rest are left alone */
export function ensureBuiltinTemplates(organizationId: string): Promise<void> {
  const running = ensured.get(organizationId);
  if (running) return running;
  const job = (async () => {
    const folders = builtinFolders();
    if (!folders.length) return;
    const have = new Set((await db.select({ name: P.name }).from(P).where(and(eq(P.organizationId, organizationId), isNotNull(P.template)))).map((r) => r.name));
    const t0 = Date.now();
    for (const [i, folder] of folders.entries()) {
      const dir = join(BUILTIN_ROOT, folder);
      if (have.has(readTemplateSpec(dir).name)) continue;
      // A millisecond apart, so they list in the folders' order
      const made = await loadTemplateFolder(dir, organizationId, { id: builtinId(organizationId, folder), at: new Date(t0 + i) });
      if (made) log.info("templates.builtin_loaded", { folder, organizationId, references: made.references });
    }
  })().catch((e) => { ensured.delete(organizationId); log.error("templates.builtins_not_loaded", { organizationId, err: e }); });
  ensured.set(organizationId, job);
  return job;
}
