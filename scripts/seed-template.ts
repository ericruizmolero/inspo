// Loads a template into a workspace from a folder with system.json (name, template, summary, areas with
// decision, why and never, and its board) and receta.md (the recipe). Writes to the DATABASE_URL in .env.local.
// The board is the references a project cloned from the template starts with: links, image files in the
// folder, or texts (.md files in the folder: the work's own content). Each one is saved in the workspace's library
// (once: loading again reuses it), filed in the template and set as evidence of its areas, with what to take from it
// there (`takes`, area by area) or, failing that, its note.
//   npx tsx --conditions=react-server scripts/seed-template.ts docs/templates/multiverse <workspaceId> [authorUserId]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { readFileSync } from "fs";
import { join, extname, basename } from "path";

async function main() {
  const [dir, organizationId, authorId] = process.argv.slice(2);
  if (!dir || !organizationId) throw new Error("usage: seed-template.ts <folder> <workspaceId> [authorUserId]");
  const { db, schema } = await import("../lib/db");
  const { newId } = await import("../lib/workspace-core");
  const { and, eq, isNotNull } = await import("drizzle-orm");
  const spec = JSON.parse(readFileSync(join(dir, "system.json"), "utf8")) as {
    name: string; template: { from: string; to: string; about: string; video?: string }; summary: string;
    areas: Record<string, { decision: string; why: string; never: string[] }>;
    board?: { web?: string; file?: string; text?: string; name: string; note: string; areas: string[]; takes?: Record<string, string> }[];
  };
  const recipe = (() => { try { return readFileSync(join(dir, "receta.md"), "utf8"); } catch { return ""; } })();
  const P = schema.project, S = schema.projectSystem, A = schema.systemArea;
  const now = new Date();
  // Loading the same template again replaces it. Only a template: a project that happens to share the name is never touched
  const [old] = await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.name, spec.name), isNotNull(P.template))).limit(1);
  if (old) await db.delete(P).where(eq(P.id, old.id));
  const id = newId();
  await db.insert(P).values({ id, organizationId, name: spec.name, createdBy: authorId ?? null, template: spec.template, recipe, createdAt: now, updatedAt: now });
  await db.insert(S).values({ projectId: id, organizationId, summary: spec.summary, runJson: null, createdAt: now, updatedAt: now });
  // The board: each reference in the library, filed in the template, and the evidence of its areas
  const { addItem, findByWeb, setTags } = await import("../lib/items");
  const { putFile, fileUrl } = await import("../lib/storage");
  const { mediaPrefix } = await import("../lib/media");
  const { typeFromUrl } = await import("../lib/url");
  const { textPrefix, textTags } = await import("../lib/text-refs");
  const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
  const evidence: Record<string, { itemId: string; take: string; pinned: boolean }[]> = {};
  for (const ref of spec.board ?? []) {
    let web = ref.web ?? "";
    if (ref.file) {
      // A fixed key per template and file, so loading again finds the same item instead of a copy
      const ext = extname(ref.file).toLowerCase();
      const key = `${mediaPrefix(organizationId)}template-${basename(dir)}-${basename(ref.file, ext)}${ext}`;
      web = fileUrl(key);
      if (!(await findByWeb(organizationId, web))) await putFile(key, readFileSync(join(dir, ref.file)), TYPES[ext] ?? "image/jpeg");
    }
    if (ref.text) {
      // The same for a text: its words in a file under a fixed key, whose path is the item's address
      const key = `${textPrefix(organizationId)}template-${basename(dir)}-${basename(ref.text, extname(ref.text))}.md`;
      web = fileUrl(key);
      if (!(await findByWeb(organizationId, web))) await putFile(key, readFileSync(join(dir, ref.text)), "text/markdown; charset=utf-8");
    }
    const found = await findByWeb(organizationId, web);
    const itemId = found?.id ?? (await addItem(organizationId, {
      name: ref.name, web, note: ref.note, type: ref.file || ref.text ? "inspiration" : typeFromUrl(web),
      author: "Criterio", createdBy: authorId ?? null, thumbnailUrl: ref.file ? web : null,
    })).id!;
    // A text has no look to tag: its first lines are what the card and the models read
    if (ref.text && !found) await setTags(organizationId, web, await textTags(web));
    await db.insert(schema.projectItem).values({ projectId: id, itemId, organizationId, addedBy: authorId ?? null, createdAt: now }).onConflictDoNothing();
    for (const area of ref.areas) (evidence[area] ??= []).push({ itemId, take: ref.takes?.[area] ?? ref.note, pinned: true });
  }
  for (const [area, a] of Object.entries(spec.areas)) {
    await db.insert(A).values({ projectId: id, organizationId, area, decision: a.decision, confidence: 100, evidence: evidence[area] ?? [], source: "team", decidedBy: authorId ?? null, why: a.why, never: a.never.join("\n"), updatedAt: now });
  }
  console.log(`${old ? "replaced" : "created"} template "${spec.name}" (${id}) in ${organizationId}: ${Object.keys(spec.areas).length} areas, ${spec.board?.length ?? 0} references, recipe ${recipe.length} chars`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
