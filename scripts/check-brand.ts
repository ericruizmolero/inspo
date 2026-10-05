// Checks the brand presentation's server side against the LOCAL database, with files on disk (never the bucket).
// No model calls unless --model is given: then it also runs both passes on a throwaway project with a pasted guide
// (a fraction of a cent) and checks that a section the team set by hand stays as it was.
// Not a test framework: it asserts, prints, and cleans up what it creates.
//   R2_BUCKET= R2_ACCESS_KEY_ID= R2_SECRET_ACCESS_KEY= npm run check:brand -- [--model]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { runMigrations } from "../lib/db/migrate";
import { putFile, deleteFiles, usingR2 } from "../lib/storage";
import { inspectBrandFile, svgIsSafe, brandTypeFor } from "../lib/brand-files";
import { createProject, deleteProject } from "../lib/projects";
import { saveBrandSection, writeBrandSections, getBrand } from "../lib/brand-store";
import { storeGuide } from "../lib/brand-guides";
import { createShare, resolveShare, revokeShare } from "../lib/share";
import { loadShareView } from "../lib/share-view";
import { brandZip } from "../lib/brand-zip";
import { tokensCss, tokensJson } from "../lib/brand-export";
import { runSystem } from "../lib/system";
import { runBrand } from "../lib/brand";

async function main() {
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "")) throw new Error("check:brand only runs against the local database");
  assert.equal(usingR2(), false, "Blank the R2 keys: the bucket in .env.local is production");
  await runMigrations();
  const [m] = await db.select({ org: schema.member.organizationId, user: schema.member.userId }).from(schema.member).limit(1);
  assert.ok(m, "the local database needs a workspace (npm run db:pull)");

  // Files: the bytes match the name, an SVG is a plain drawing
  const png = await sharp({ create: { width: 40, height: 20, channels: 4, background: "#ff0000" } }).png().toBuffer();
  const k = `inspo/${m.org}/brand/check/logo.png`;
  await putFile(k, png, "image/png");
  const got = await inspectBrandFile(k, "image/png");
  assert.ok(typeof got === "object" && got.w === 40 && got.h === 20);
  assert.equal(await inspectBrandFile(k, "image/jpeg"), "type");
  for (const bad of ["<svg><script>x()</script></svg>", '<svg onload="x()"/>', '<svg><image href="https://x.test/a.png"/></svg>', "<svg><foreignObject/></svg>", '<svg style="background:url(https://x.test)"/>'])
    assert.equal(svgIsSafe(bad), false, bad);
  assert.equal(svgIsSafe('<svg viewBox="0 0 1 1"><use href="#a"/><path d="M0 0"/></svg>'), true);
  assert.equal(brandTypeFor("font", "Inter-Bold.woff2"), "font/woff2");
  assert.equal(brandTypeFor("logo", "x.woff2"), null);
  console.log("✓ files");

  const project = await createProject(m.org, "check:brand", m.user);
  try {
    // Saving: a stale base is a conflict, not an overwrite; a run leaves the team's section alone
    const first = await saveBrandSection(m.org, project.id, "color", { lede: "", items: [{ id: "a1", name: "Ink", hex: "#101216", role: "Text", group: "neutral", weight: 3 }], accentId: null }, null, m.user);
    assert.equal(first.conflict, false);
    const stale = await saveBrandSection(m.org, project.id, "color", { lede: "lost", items: [], accentId: null }, null, m.user);
    assert.equal(stale.conflict, true);
    assert.equal((await getBrand(m.org, project.id)).color.items[0]?.name, "Ink");
    const written = await writeBrandSections(m.org, project.id, { color: { lede: "model", items: [], accentId: null }, voice: { lede: "Short.", principles: [], pairs: [] } }, "model");
    assert.deepEqual(written, ["voice"]);
    console.log("✓ saving, conflicts, the team's sections");

    // Exports
    const brand = await getBrand(m.org, project.id);
    assert.match(tokensCss(brand, "Check"), /--color-ink: #101216;/);
    JSON.parse(tokensJson(brand));
    const { file } = await brandZip({ ...brand, logo: { ...brand.logo, mark: { light: { key: k, type: "image/png" }, dark: null } } }, "Check", "# md");
    assert.match(file.toString("latin1"), /icons\/favicon-32\.png/);
    console.log("✓ tokens and zip");

    // A share: clean carries no team names, a turned-off link stops resolving
    const [link] = await createShare(m.org, project.id, "clean", "check", m.user);
    assert.ok(await resolveShare(link.token));
    const view = await loadShareView(m.org, project.id, "clean", "en", `/s/${link.token}`, "http://localhost");
    assert.ok(view && !/Saved by|What the team said|conversation/.test(view.markdown), "clean criterio.md has no team names or threads");
    assert.match(view!.markdown, /\| Ink \|/);
    await revokeShare(m.org, project.id, link.id);
    assert.equal(await resolveShare(link.token), null);
    console.log("✓ share links");

    if (process.argv.includes("--model")) {
      const key = await storeGuide(m.org, project.id, "# Northwind\nColors: Espresso #2B1D16 for text, Crema #F4ECE1 ground, Ember #D9480F the only accent.\nType: Fraunces 600 headlines, Inter 400 text.\nVoice: short, warm, no exclamation marks.");
      await writeBrandSections(m.org, project.id, {}, "import", { source: { kind: "text", label: "Northwind", key, at: new Date().toISOString(), by: "check" } });
      const usage = { organizationId: m.org, userId: m.user };
      await runSystem({ organizationId: m.org, projectId: project.id, usage, language: "en" });
      await runBrand({ organizationId: m.org, projectId: project.id, usage, language: "en" });
      const after = await getBrand(m.org, project.id);
      assert.equal(after.color.items[0]?.name, "Ink", "the team's palette survives a run");
      assert.ok(after.typography.faces.some((f) => /fraunces/i.test(f.family)), "the guide's face comes through");
      console.log("✓ both passes:", after.intro.headline);
    }
  } finally {
    await deleteProject(m.org, project.id);
    await deleteFiles([k]);
    await db.delete(schema.systemShare).where(eq(schema.systemShare.projectId, project.id));
  }
  console.log("check:brand ok");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
