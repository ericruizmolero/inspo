// Locale check: the order it's decided in and whose locale each email uses.
// Not a test framework: assert, and it cleans up what it creates.
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

// The same thing proxy.ts does on every page request.
function resolve(opts: { param?: string; cookie?: string; header?: string }) {
  if (isLocale(opts.param)) return opts.param;
  if (opts.cookie) return toLocale(opts.cookie);
  return localeFromHeader(opts.header) ?? DEFAULT_LOCALE;
}

async function main() {
  // ── Accept-Language header ─────────────────────────────────────────────────
  assert.equal(localeFromHeader("en-GB,en;q=0.9"), "en");
  assert.equal(localeFromHeader("es-ES,es;q=0.9,en;q=0.8"), "es");
  assert.equal(localeFromHeader("fr-FR,fr;q=0.9,es;q=0.8"), "es", "skips languages we don't have");
  assert.equal(localeFromHeader("fr-FR,de;q=0.8"), null, "with neither, it doesn't decide");
  assert.equal(localeFromHeader(null), null);
  assert.equal(localeFromHeader("*"), null);

  // ── Order: ?lang beats the cookie, the cookie beats the header ─────────────
  assert.equal(resolve({ param: "en", cookie: "es", header: "es-ES" }), "en", "?lang wins");
  assert.equal(resolve({ cookie: "es", header: "en-GB" }), "es", "the cookie beats the header");
  assert.equal(resolve({ header: "es-ES" }), "es", "with no cookie the header decides");
  assert.equal(resolve({}), DEFAULT_LOCALE, "with nothing, English");
  assert.equal(resolve({ param: "de", header: "es-ES" }), "es", "an unknown ?lang is ignored");
  assert.equal(DEFAULT_LOCALE, "en");

  // ── Emails: the locale is the recipient's, not the sender's ────────────────
  const spanish = await addUser("es", "es");
  const english = await addUser("en", "en");
  assert.equal(await localeForEmail(spanish), "es");
  assert.equal(await localeForEmail(english), "en");
  // An address with no account (the invitation): the fallback, which is the inviter's
  assert.equal(await localeForEmail(`${TAG}-nadie@example.test`, "es"), "es", "with no account the fallback wins");
  assert.equal(await localeForEmail(`${TAG}-nadie@example.test`), "en", "with no fallback, English");
  // Eric invites in Spanish someone who uses the app in English: the email goes in English
  assert.equal(await localeForEmail(english, "es"), "en", "the recipient's account beats the fallback");

  // ── Both dictionaries have the same keys ───────────────────────────────────
  const keys = (o: unknown, path = ""): string[] =>
    o && typeof o === "object" && !Array.isArray(o)
      ? Object.entries(o).flatMap(([k, v]) => [`${path}${k}`, ...keys(v, `${path}${k}.`)])
      : [];
  const enKeys = keys(en).sort();
  const esKeys = keys(es).sort();
  assert.deepEqual(esKeys, enKeys, "es is missing keys or has extra ones");
  assert.ok(enKeys.length > 300, `too few keys: ${enKeys.length}`);

  // The whole directory is in both languages
  assert.equal(Object.keys(es.directory.items).length, Object.keys(en.directory.items).length);
  assert.ok(Object.keys(en.directory.items).length >= 131);

  console.log(`✓ locale: ${enKeys.length} keys in both dictionaries, order and emails correct`);
}

main()
  .catch((e) => { console.error("✗", e); process.exitCode = 1; })
  .finally(async () => {
    for (const uid of made) await db.delete(schema.user).where(eq(schema.user.id, uid));
  });
