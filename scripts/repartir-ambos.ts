// Reparte al azar entre los miembros del workspace las webs que llegaron de la hoja
// sin autor conocido (etiqueta heredada "Ambos"). Pone nombre y usuario creador.
//   npx tsx scripts/repartir-ambos.ts                → base de datos local, solo cuenta
//   npx tsx scripts/repartir-ambos.ts --apply        → base de datos local, escribe
//   npx tsx scripts/repartir-ambos.ts --prod --apply → Turso (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
const args = process.argv.slice(2);
if (args.includes("--prod")) {
  process.env.DATABASE_URL = process.env.TURSO_DATABASE_URL;
  process.env.DATABASE_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;
}
const apply = args.includes("--apply");

async function main() {
  const { and, eq } = await import("drizzle-orm");
  const { db, schema } = await import("../lib/db");
  const legacy = await db.select({ id: schema.inspoItem.id, org: schema.inspoItem.organizationId, empresa: schema.inspoItem.empresa })
    .from(schema.inspoItem).where(eq(schema.inspoItem.autor, "Ambos"));
  console.log(`${legacy.length} webs con autor "Ambos"${apply ? "" : " (solo cuenta; añade --apply para repartir)"}`);
  if (!legacy.length) return;

  const byOrg = new Map<string, typeof legacy>();
  for (const it of legacy) byOrg.set(it.org, [...(byOrg.get(it.org) ?? []), it]);

  for (const [orgId, items] of byOrg) {
    const members = await db.select({ id: schema.user.id, name: schema.user.name })
      .from(schema.member).innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
      .where(eq(schema.member.organizationId, orgId));
    if (members.length < 1) { console.log(`· workspace ${orgId}: sin miembros, se salta`); continue; }
    // Barajar y repartir en turnos: la diferencia entre miembros nunca pasa de 1.
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    const tally = new Map(members.map((m) => [m.name, 0]));
    for (let i = 0; i < shuffled.length; i++) {
      const m = members[i % members.length];
      tally.set(m.name, (tally.get(m.name) ?? 0) + 1);
      if (apply) {
        await db.update(schema.inspoItem).set({ autor: m.name, createdBy: m.id })
          .where(and(eq(schema.inspoItem.id, shuffled[i].id), eq(schema.inspoItem.autor, "Ambos")));
      }
    }
    console.log(`· workspace ${orgId}: ${items.length} webs → ${[...tally].map(([n, c]) => `${n} ${c}`).join(", ")}`);
  }
}
main();
