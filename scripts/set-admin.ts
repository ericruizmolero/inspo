// Da o quita acceso al panel de actividad (/admin) sin pasar por la interfaz.
//   npx tsx scripts/set-admin.ts <correo>            → da acceso
//   npx tsx scripts/set-admin.ts <correo> --quitar   → lo quita
//   npx tsx scripts/set-admin.ts --lista             → enseña la lista
// Contra producción: DATABASE_URL=$TURSO_DATABASE_URL DATABASE_AUTH_TOKEN=$TURSO_AUTH_TOKEN npx tsx scripts/set-admin.ts …
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db";

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();
  if (args.includes("--lista")) {
    const rows = await db.select().from(schema.appAdmin);
    console.log(rows.length ? rows.map((r) => `${r.email}  (añadido por ${r.addedBy || "—"} el ${r.createdAt.toLocaleDateString("es-ES")})`).join("\n") : "Nadie añadido desde el panel (solo los fijos)");
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log("Uso: npx tsx scripts/set-admin.ts <correo> [--quitar] | --lista");
    process.exit(1);
  }
  if (args.includes("--quitar")) {
    await db.delete(schema.appAdmin).where(eq(schema.appAdmin.email, email));
    console.log(`✓ ${email} ya no ve el panel`);
    return;
  }
  const res = await db.insert(schema.appAdmin).values({ email, addedBy: "script", createdAt: new Date() }).onConflictDoNothing().returning({ email: schema.appAdmin.email });
  console.log(res.length ? `✓ ${email} ya puede ver el panel` : `${email} ya tenía acceso`);
}
main();
