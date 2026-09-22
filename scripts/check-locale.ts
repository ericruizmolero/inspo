// Comprobación del idioma: el orden en que se decide y a quién le toca cada correo.
// No es un framework de tests: assert, y limpia lo que crea.
//   npx tsx scripts/check-locale.ts
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { localeFromHeader, toLocale, DEFAULT_LOCALE, LANG_COOKIE, isLocale } from "../lib/i18n/locale";
import { localeForEmail } from "../lib/mail";
import en from "../lib/i18n/en";
import es from "../lib/i18n/es";

const id = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
const TAG = `localecheck-${id().slice(0, 8)}`;
const made: string[] = [];

async function addUser(name: string, language: string) {
  const uid = id();
  const now = new Date();
  await db.insert(schema.user).values({ id: uid, name: `${TAG}-${name}`, email: `${TAG}-${name}@example.test`, language, createdAt: now, updatedAt: now });
  made.push(uid);
  return `${TAG}-${name}@example.test`;
}

// Lo mismo que hace proxy.ts en cada petición de página.
function resolve(opts: { param?: string; cookie?: string; header?: string }) {
  if (isLocale(opts.param)) return opts.param;
  if (opts.cookie) return toLocale(opts.cookie);
  return localeFromHeader(opts.header) ?? DEFAULT_LOCALE;
}

async function main() {
  // ── Cabecera Accept-Language ───────────────────────────────────────────────
  assert.equal(localeFromHeader("en-GB,en;q=0.9"), "en");
  assert.equal(localeFromHeader("es-ES,es;q=0.9,en;q=0.8"), "es");
  assert.equal(localeFromHeader("fr-FR,fr;q=0.9,es;q=0.8"), "es", "salta los idiomas que no tenemos");
  assert.equal(localeFromHeader("fr-FR,de;q=0.8"), null, "sin ninguno de los dos, no decide");
  assert.equal(localeFromHeader(null), null);
  assert.equal(localeFromHeader("*"), null);

  // ── Orden: ?lang gana a la cookie, la cookie gana a la cabecera ────────────
  assert.equal(resolve({ param: "en", cookie: "es", header: "es-ES" }), "en", "?lang manda");
  assert.equal(resolve({ cookie: "es", header: "en-GB" }), "es", "la cookie gana a la cabecera");
  assert.equal(resolve({ header: "es-ES" }), "es", "sin cookie decide la cabecera");
  assert.equal(resolve({}), DEFAULT_LOCALE, "sin nada, inglés");
  assert.equal(resolve({ param: "de", header: "es-ES" }), "es", "un ?lang que no existe se ignora");
  assert.equal(DEFAULT_LOCALE, "en");

  // ── Correos: el idioma es el de quien recibe, no el de quien escribe ───────
  const spanish = await addUser("es", "es");
  const english = await addUser("en", "en");
  assert.equal(await localeForEmail(spanish), "es");
  assert.equal(await localeForEmail(english), "en");
  // Una dirección sin cuenta (la invitación): el fallback, que es quien invita
  assert.equal(await localeForEmail(`${TAG}-nadie@example.test`, "es"), "es", "sin cuenta manda el fallback");
  assert.equal(await localeForEmail(`${TAG}-nadie@example.test`), "en", "sin fallback, inglés");
  // Eric invita en castellano a alguien que tiene la app en inglés: el correo va en inglés
  assert.equal(await localeForEmail(english, "es"), "en", "la cuenta de quien recibe gana al fallback");

  // ── Los dos diccionarios llevan las mismas claves ──────────────────────────
  const keys = (o: unknown, path = ""): string[] =>
    o && typeof o === "object" && !Array.isArray(o)
      ? Object.entries(o).flatMap(([k, v]) => [`${path}${k}`, ...keys(v, `${path}${k}.`)])
      : [];
  const enKeys = keys(en).sort();
  const esKeys = keys(es).sort();
  assert.deepEqual(esKeys, enKeys, "a es le faltan o le sobran claves");
  assert.ok(enKeys.length > 300, `pocas claves: ${enKeys.length}`);

  // El directorio va entero en los dos idiomas
  assert.equal(Object.keys(es.recursos.items).length, Object.keys(en.recursos.items).length);
  assert.ok(Object.keys(en.recursos.items).length >= 131);

  console.log(`✓ idioma: ${enKeys.length} claves en los dos diccionarios, orden y correos correctos`);
}

main()
  .catch((e) => { console.error("✗", e); process.exitCode = 1; })
  .finally(async () => {
    for (const uid of made) await db.delete(schema.user).where(eq(schema.user.id, uid));
  });
