// Loads a template into a workspace from a folder (lib/template-seed.ts says what the folder holds), replacing the
// template of the same name if the workspace has it. Writes to the DATABASE_URL in .env.local.
// Not needed for the folders under docs/templates: those are built in, and every workspace gets them by itself.
//   npx tsx --conditions=react-server scripts/seed-template.ts docs/templates/multiverse <workspaceId> [authorUserId]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const [dir, organizationId, authorId] = process.argv.slice(2);
  if (!dir || !organizationId) throw new Error("usage: seed-template.ts <folder> <workspaceId> [authorUserId]");
  const { loadTemplateFolder, readTemplateSpec } = await import("../lib/template-seed");
  const made = await loadTemplateFolder(dir, organizationId, { authorId, replace: true });
  console.log(`${made?.replaced ? "replaced" : "created"} template "${readTemplateSpec(dir).name}" (${made?.id}) in ${organizationId}: ${made?.areas} areas, ${made?.references} references, recipe ${made?.recipe} chars`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
