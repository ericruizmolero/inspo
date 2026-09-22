// Comprobación del flujo real de invitaciones contra la app en marcha. Hace falta
// `npm run dev` en otra terminal (sin RESEND_API_KEY: los enlaces salen por .data/last-mail.txt).
//   npm run check:invites            (puerto 3000 por defecto)
//   BASE=http://localhost:3777 npm run check:invites
//
// Esto no lo pilla un test de funciones sueltas: Better Auth usa hooks distintos para
// aceptar una invitación (beforeAcceptInvitation) que para añadir un miembro a mano
// (beforeAddMember), y colgar la comprobación del hook equivocado la deja sin efecto.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { setWorkspacePlan } from "../lib/workspace-core";

const BASE = process.env.BASE || "http://localhost:3000";
const TAG = `flowcheck-${crypto.randomUUID().slice(0, 8)}`;
const mail = (who: string) => `${TAG}-${who}@example.test`;
const PEOPLE = ["jefa", "uno", "dos", "tres", "eva", "fran", "gus"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

/** Entra por magic link leyendo el enlace de .data/last-mail.txt. Devuelve la cookie de sesión. */
async function login(email: string): Promise<string> {
  const r = await fetch(`${BASE}/api/auth/sign-in/magic-link`, {
    method: "POST", headers: { "Content-Type": "application/json", origin: BASE },
    body: JSON.stringify({ email, callbackURL: `${BASE}/` }),
  });
  if (!r.ok) throw new Error(`magic-link ${r.status} para ${email}: ${await r.text()}`);
  await sleep(500);
  const txt = await fs.readFile(".data/last-mail.txt", "utf8");
  const url = txt.split("\n").find((l) => l.includes("/api/auth/magic-link/verify"));
  if (!url) throw new Error(`sin enlace para ${email}. Último correo:\n${txt}`);
  const res = await fetch(url, { redirect: "manual" });
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie.includes("session_token")) throw new Error(`sin sesión para ${email}`);
  return cookie;
}

const post = (path: string, cookie: string, body: unknown) =>
  fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", cookie, origin: BASE }, body: JSON.stringify(body) })
    .then(async (r) => ({ status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, unknown> }));

const invite = (cookie: string, orgId: string, email: string) =>
  post("/api/auth/organization/invite-member", cookie, { email, role: "member", organizationId: orgId });
const accept = (cookie: string, invitationId: string) =>
  post("/api/auth/organization/accept-invitation", cookie, { invitationId });

let orgId = "";

async function main() {
  const jefa = await login(mail("jefa"));
  const created = await post("/api/auth/organization/create", jefa, { name: TAG, slug: TAG });
  orgId = created.body.id as string;
  assert.ok(orgId, `no se creó el equipo: ${JSON.stringify(created.body)}`);
  await setWorkspacePlan(orgId, "studio");

  // 1. Tres personas entran: el equipo queda en 4 de 5
  for (const who of ["uno", "dos", "tres"]) {
    const inv = await invite(jefa, orgId, mail(who));
    assert.equal(inv.status, 200, `no se pudo invitar a ${who}: ${JSON.stringify(inv.body)}`);
    const acc = await accept(await login(mail(who)), inv.body.id as string);
    assert.equal(acc.status, 200, `${who} no pudo entrar: ${JSON.stringify(acc.body)}`);
  }

  // 2. Una invitación más llena el plan; la siguiente se rechaza al invitar, no al aceptar
  const eva = await invite(jefa, orgId, mail("eva"));
  assert.equal(eva.status, 200, "la quinta plaza debería caber");
  const lleno = await invite(jefa, orgId, mail("sobra"));
  assert.equal(lleno.status, 403, "con 4 miembros y 1 invitación el plan está lleno");
  assert.match(String(lleno.body.message), /1 invitation not yet accepted/);

  // 3. Dos invitaciones de más para la última plaza, metidas a mano: es el estado que
  //    dejaban las invitaciones creadas antes del arreglo.
  const ids: Record<string, string> = { eva: eva.body.id as string };
  for (const who of ["fran", "gus"]) {
    ids[who] = newId();
    await db.insert(schema.invitation).values({
      id: ids[who], organizationId: orgId, email: mail(who), role: "member", status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000), createdAt: new Date(),
      inviterId: (await db.select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, mail("jefa"))))[0].id,
    });
  }

  // 4. Las tres a la vez
  const cookies: Record<string, string> = {};
  for (const who of ["eva", "fran", "gus"]) cookies[who] = await login(mail(who));
  const res = await Promise.all(["eva", "fran", "gus"].map((who) => accept(cookies[who], ids[who]).then((r) => ({ who, ...r }))));

  const [members, invs] = await Promise.all([
    db.select({ id: schema.member.id }).from(schema.member).where(eq(schema.member.organizationId, orgId)),
    db.select({ email: schema.invitation.email, status: schema.invitation.status }).from(schema.invitation).where(eq(schema.invitation.organizationId, orgId)),
  ]);
  for (const r of res) console.log(`  ${r.who.padEnd(4)} ${r.status} ${r.body.message ?? "entra"}`);

  assert.equal(res.filter((r) => r.status === 200).length, 1, "solo una persona puede coger la última plaza");
  assert.equal(members.length, 5, "el equipo no puede pasar de las 5 del plan Studio");
  for (const r of res.filter((x) => x.status !== 200)) {
    assert.equal(invs.find((i) => i.email === mail(r.who))!.status, "pending", `la invitación de ${r.who} tiene que seguir sirviendo`);
  }

  console.log("✓ invitaciones: tope al invitar, tope al aceptar y última plaza para una sola persona");
}

main()
  .catch((e) => { console.error("✗", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(async () => {
    if (orgId) await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
    await db.delete(schema.user).where(inArray(schema.user.email, PEOPLE.map(mail)));
  });
