// Grants or removes access to the activity panel (/admin) without the UI.
//   npx tsx scripts/set-admin.ts <email>            → grants access
//   npx tsx scripts/set-admin.ts <email> --remove   → removes it
//   npx tsx scripts/set-admin.ts --list            → shows the list
// Against production: DATABASE_URL=$TURSO_DATABASE_URL DATABASE_AUTH_TOKEN=$TURSO_AUTH_TOKEN npx tsx scripts/set-admin.ts …
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  if (args.includes("--list")) {
    const rows = await db.select().from(schema.appAdmin);
    console.log(rows.length ? rows.map((r) => `${r.email}  (added by ${r.addedBy || "—"} on ${r.createdAt.toLocaleDateString("es-ES")})`).join("\n") : "Nobody added from the panel (only the fixed ones)");
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log("Usage: npx tsx scripts/set-admin.ts <email> [--remove] | --list");
    process.exit(1);
  }
  if (args.includes("--remove")) {
    await db.delete(schema.appAdmin).where(eq(schema.appAdmin.email, email));
    console.log(`✓ ${email} can no longer see the panel`);
    return;
  }
  const res = await db.insert(schema.appAdmin).values({ email, addedBy: "script", createdAt: new Date() }).onConflictDoNothing().returning({ email: schema.appAdmin.email });
  console.log(res.length ? `✓ ${email} can now see the panel` : `${email} already had access`);
}
main();
