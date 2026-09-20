// Migración única: Google Sheet + mapas de miniaturas/etiquetas → workspace de equipo.
//   npx tsx scripts/migrate-sheet.ts
// Idempotente: crea (si no existen) los usuarios, el equipo y los items por URL.
// Variables: TEAM_NAME, TEAM_SLUG, TEAM_MEMBERS="Nombre <correo>, Nombre <correo>"
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { eq } from "drizzle-orm";
import { promises as fs } from "fs";
import path from "path";
import { db, schema } from "../lib/db";
import { fetchInspoItems } from "../lib/sheets";
import { addItem, findByWeb, setThumbnail, setTags, newId } from "../lib/items";
import { ensurePersonalWorkspace } from "../lib/workspace-core";
import type { TagMap } from "../types/inspo";

const TEAM_NAME = process.env.TEAM_NAME || "treseiscero";
const TEAM_SLUG = process.env.TEAM_SLUG || "treseiscero";
const MEMBERS = (process.env.TEAM_MEMBERS || "Eric <ericruizmolero@treseiscero.app>, Andoni <andoni@treseiscero.app>")
  .split(",").map((s) => s.trim()).filter(Boolean)
  .map((s) => { const m = s.match(/^(.*?)\s*<(.+)>$/); return m ? { name: m[1].trim(), email: m[2].trim().toLowerCase() } : { name: s.split("@")[0], email: s.toLowerCase() }; });

async function ensureUser(name: string, email: string) {
  const [u] = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
  if (u) return u;
  const now = new Date();
  const row = { id: newId(), name, email, emailVerified: true, image: null, createdAt: now, updatedAt: now };
  await db.insert(schema.user).values(row);
  console.log(`+ usuario ${name} <${email}>`);
  return row;
}

async function ensureTeam() {
  const [o] = await db.select().from(schema.organization).where(eq(schema.organization.slug, TEAM_SLUG)).limit(1);
  if (o) return o;
  const row = { id: newId(), name: TEAM_NAME, slug: TEAM_SLUG, logo: null, createdAt: new Date(), metadata: JSON.stringify({ kind: "team" }) };
  await db.insert(schema.organization).values(row);
  console.log(`+ equipo ${TEAM_NAME}`);
  return row;
}

async function ensureMember(organizationId: string, userId: string, role: string) {
  const rows = await db.select().from(schema.member).where(eq(schema.member.userId, userId));
  if (rows.some((m) => m.organizationId === organizationId)) return;
  await db.insert(schema.member).values({ id: newId(), organizationId, userId, role, createdAt: new Date() });
}

async function readJson<T>(file: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(file, "utf-8")) as T; } catch { return null; }
}

// En producción los mapas viejos viven en Blob; los leemos con el mismo patrón que antes
async function readLegacyBlobMap<T>(prefix: string): Promise<T | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix });
  const sorted = blobs.sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt));
  for (const b of sorted) {
    const res = await fetch(b.url, { headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } });
    if (res.ok) return (await res.json()) as T;
  }
  return null;
}

async function main() {
  const users = [];
  for (const m of MEMBERS) users.push(await ensureUser(m.name, m.email));
  const team = await ensureTeam();
  for (const u of users) {
    await ensureMember(team.id, u.id, "owner");
    await ensurePersonalWorkspace(u.id, u.name, u.email);
  }
  const byName = new Map(users.map((u) => [u.name.toLowerCase(), u]));

  const items = await fetchInspoItems();
  console.log(`sheet: ${items.length} filas`);
  let added = 0, skipped = 0;
  for (const it of items) {
    if (await findByWeb(team.id, it.web)) { skipped++; continue; }
    const creator = byName.get(it.puestoPor.toLowerCase());
    const [d, m, y] = it.fecha.split("/");
    const fechaIso = y && m && d ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` : undefined;
    try {
      await addItem(team.id, {
        empresa: it.empresa, web: it.web, tipo: it.tipo, comentarios: it.comentarios, subcomentarios: it.subcomentarios,
        autor: creator?.name ?? it.puestoPor, createdBy: creator?.id ?? null, fechaIso,
      });
      added++;
    } catch (e) { console.warn(`! ${it.web}: ${e instanceof Error ? e.message : e}`); }
  }
  console.log(`items: +${added}, ya existían ${skipped}`);

  const thumbs = (await readLegacyBlobMap<Record<string, string>>("inspo/thumbnail-map"))
    ?? (await readJson<Record<string, string>>(path.join("public", "thumbs", "_map.json"))) ?? {};
  let t = 0;
  for (const [web, url] of Object.entries(thumbs)) if (await setThumbnail(team.id, web, url)) t++;
  console.log(`miniaturas: ${t}/${Object.keys(thumbs).length}`);

  const tags = (await readLegacyBlobMap<TagMap>("inspo/tag-map"))
    ?? (await readJson<TagMap>(path.join(".data", "tags.json"))) ?? {};
  let g = 0;
  for (const [web, tg] of Object.entries(tags)) { if (await findByWeb(team.id, web)) { await setTags(team.id, web, tg); g++; } }
  console.log(`etiquetas: ${g}/${Object.keys(tags).length}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
