// Comprobación del límite de personas por plan. No es un framework de tests: crea un
// workspace de prueba, comprueba con assert y lo borra al terminar.
//   npx tsx scripts/check-seats.ts
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { setWorkspacePlan } from "../lib/workspace-core";
import { memberLimitMessage, overCapacity, memberRank, assertSeatsOk, countPendingInvitations } from "../lib/quota";
import { HttpError } from "../lib/workspace-core";

const id = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
const TAG = `seatcheck-${id().slice(0, 8)}`;
const orgId = id();
const userIds: string[] = [];

const DAY = 24 * 60 * 60 * 1000;

async function addUser(n: number) {
  const uid = id();
  const now = new Date();
  await db.insert(schema.user).values({ id: uid, name: `${TAG}-${n}`, email: `${TAG}-${n}@example.test`, createdAt: now, updatedAt: now });
  userIds.push(uid);
  return uid;
}

async function addMember(uid: string, at: Date, role = "member") {
  const mid = id();
  await db.insert(schema.member).values({ id: mid, organizationId: orgId, userId: uid, role, createdAt: at });
  return mid;
}

async function addInvitation(email: string, expiresAt: Date, inviterId: string) {
  const iid = id();
  await db.insert(schema.invitation).values({
    id: iid, organizationId: orgId, email, role: "member", status: "pending", expiresAt, createdAt: new Date(), inviterId,
  });
  return iid;
}

async function main() {
  const now = new Date();
  await db.insert(schema.organization).values({
    id: orgId, name: TAG, slug: TAG, createdAt: now, metadata: JSON.stringify({ kind: "team", plan: "studio" }),
  });
  const owner = await addUser(0);
  await addMember(owner, now, "owner");

  // 1. Las invitaciones sin aceptar ocupan plaza
  for (let i = 1; i <= 4; i++) await addInvitation(`${TAG}-inv${i}@example.test`, new Date(Date.now() + 7 * DAY), owner);
  assert.equal(await countPendingInvitations(orgId), 4, "4 invitaciones pendientes");
  assert.equal(await memberLimitMessage(orgId, "studio"), null, "sin contar pendientes todavía cabe gente");
  const full = await memberLimitMessage(orgId, "studio", { includePending: true });
  assert.ok(full, "1 miembro + 4 invitaciones llenan el plan Studio");
  assert.match(full!, /4 invitaciones sin aceptar/, "el mensaje dice cuántas invitaciones hay");

  // 2. Reenviar una invitación no ocupa una plaza de más
  assert.equal(
    await memberLimitMessage(orgId, "studio", { includePending: true, exceptEmail: `${TAG}-INV1@example.test` }),
    null, "reenviar a una dirección ya invitada sigue cabiendo",
  );

  // 3. Las caducadas no cuentan
  await addInvitation(`${TAG}-viejo@example.test`, new Date(Date.now() - DAY), owner);
  assert.equal(await countPendingInvitations(orgId), 4, "la invitación caducada no ocupa plaza");

  // 4. Bajar de plan deja al equipo por encima del límite
  for (let i = 1; i <= 4; i++) await addMember(await addUser(i), new Date(+now + i));
  assert.equal(await overCapacity(orgId, "studio"), null, "5 personas caben en Studio");
  await setWorkspacePlan(orgId, "solo");
  const over = await overCapacity(orgId, "solo");
  assert.deepEqual(over, { members: 5, limit: 1, planName: "Solo" }, "5 personas no caben en Solo");
  await assert.rejects(
    () => assertSeatsOk({ id: orgId, plan: "solo" }),
    (e: unknown) => e instanceof HttpError && e.status === 402,
    "la IA se para mientras sobre gente",
  );

  // 5. Quien sobra al aceptar la última plaza a la vez es siempre el último, nunca los dos
  const ordered = await db.select({ id: schema.member.id, createdAt: schema.member.createdAt })
    .from(schema.member).where(eq(schema.member.organizationId, orgId));
  ordered.sort((a, b) => (+a.createdAt - +b.createdAt) || (a.id < b.id ? -1 : 1));
  for (let i = 0; i < ordered.length; i++) {
    assert.equal(await memberRank(orgId, ordered[i].id), i, `el miembro ${i} tiene rango ${i}`);
  }

  console.log("✓ plazas: pendientes, reenvío, caducadas, bajada de plan y orden de la última plaza");
}

main()
  .catch((e) => { console.error("✗", e); process.exitCode = 1; })
  .finally(async () => {
    // El borrado en cascada se lleva miembros e invitaciones; los usuarios van aparte
    await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
    for (const uid of userIds) await db.delete(schema.user).where(eq(schema.user.id, uid));
  });
