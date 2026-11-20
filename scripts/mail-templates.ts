// The email templates in Resend (lib/mail-templates.ts), one per key and language, kept to the registry and the
// layout of lib/mail-layout.ts.
//
//   npm run mail:templates layout        every criterio-* template in the registry gets the current layout around the
//                                        body it has in Resend, the registry's variables, and is published again
//   npm run mail:templates seed <file>   creates the registry's templates that Resend lacks, from the copy that file
//                                        exports as `seed` ({ en, es }: key → subject and body), and publishes them
//
// Both converge: run again, they change nothing that is already right, and never make a second template for an alias.
// Reads RESEND_API_KEY from .env.local, and never prints it. The wording itself is edited in Resend, not here.
import { existsSync } from "node:fs";
import path from "node:path";
import { LOCALES, type Locale } from "../lib/i18n/locale";
import { bodyOf, layoutHtml, layoutText, type Body } from "../lib/mail-layout";
import { LETTERS, TEMPLATE_KEYS, aliasOf, stopOf, variablesOf, type TemplateKey } from "../lib/mail-templates";

if (!process.env.RESEND_API_KEY && existsSync(".env.local")) process.loadEnvFile(".env.local");
const KEY = process.env.RESEND_API_KEY;
if (!KEY) throw new Error("mail:templates needs RESEND_API_KEY (in .env.local)");

interface Remote { id: string; alias: string; subject: string; html: string; text: string | null; status: string; has_unpublished_versions: boolean; variables: { key: string; type: string }[] }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One Resend call, spaced to stay under its rate limit, retried when it says too many */
async function api<T>(method: string, route: string, body?: unknown): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await sleep(550);
    const res = await fetch(`https://api.resend.com${route}`, { method, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.status === 429 && attempt < 5) { await sleep(2000); continue; }
    const text = await res.text();
    if (!res.ok) throw new Error(`Resend ${method} ${route}: ${res.status} ${text}`);
    return (text ? JSON.parse(text) : null) as T;
  }
}

async function remoteAliases(): Promise<Set<string>> {
  const out = new Set<string>();
  for (let after: string | null = null; ;) {
    const page: { data: { id: string; alias: string }[]; has_more: boolean } = await api("GET", `/templates?limit=100${after ? `&after=${after}` : ""}`);
    for (const t of page.data) out.add(t.alias);
    if (!page.has_more || !page.data.length) return out;
    after = page.data[page.data.length - 1].id;
  }
}

/** What Resend should hold for a template, around `body` */
function wanted(key: TemplateKey, locale: Locale, body: string) {
  const frame = { locale, stop: stopOf(key) };
  const letter = (LETTERS as readonly string[]).includes(key);
  return {
    html: layoutHtml(frame, body),
    // The letter's text part is the code's own; a template's is derived by Resend from its HTML
    ...(letter ? { text: layoutText(frame, "{{{BODY_TEXT}}}") } : {}),
    variables: Object.entries(variablesOf(key)).map(([k, kind]) => ({ key: k, type: kind === "number" ? "number" : "string" })),
  };
}

const sameVariables = (a: Remote["variables"], b: { key: string; type: string }[]) =>
  JSON.stringify(a.map((v) => `${v.key}:${v.type}`).sort()) === JSON.stringify(b.map((v) => `${v.key}:${v.type}`).sort());

async function layout(): Promise<void> {
  const missing: string[] = [];
  let changed = 0;
  for (const key of TEMPLATE_KEYS) for (const locale of LOCALES) {
    const alias = aliasOf(key, locale);
    let t: Remote;
    try { t = await api<Remote>("GET", `/templates/${alias}`); }
    catch (e) { if (String(e).includes(" 404 ")) { missing.push(alias); continue; } throw e; }
    const body = bodyOf(t.html);
    if (body === null) throw new Error(`${alias}: its body markers are gone in Resend; put them back around the body before laying it out`);
    const want = wanted(key, locale, body);
    const differs = t.html !== want.html || !sameVariables(t.variables, want.variables) || ("text" in want && t.text !== want.text);
    if (differs) await api("PATCH", `/templates/${alias}`, want);
    if (differs || t.status !== "published" || t.has_unpublished_versions) { await api("POST", `/templates/${alias}/publish`); changed++; console.log(`laid out ${alias}`); }
  }
  console.log(`${changed} published again, ${TEMPLATE_KEYS.length * LOCALES.length - changed - missing.length} already right`);
  if (missing.length) throw new Error(`Missing in Resend (seed them): ${missing.join(", ")}`);
}

async function seed(file: string): Promise<void> {
  const { seed: copy } = (await import(path.resolve(file))) as { seed: Record<Locale, Record<TemplateKey, { subject: string; body: Body }>> };
  const have = await remoteAliases();
  let made = 0;
  for (const key of TEMPLATE_KEYS) for (const locale of LOCALES) {
    const alias = aliasOf(key, locale);
    if (have.has(alias)) continue;
    const c = copy[locale][key];
    await api("POST", "/templates", { alias, name: alias, subject: c.subject, ...wanted(key, locale, c.body.html) });
    await api("POST", `/templates/${alias}/publish`);
    made++;
    console.log(`seeded ${alias}`);
  }
  console.log(`${made} seeded, ${TEMPLATE_KEYS.length * LOCALES.length - made} already in Resend`);
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "layout") await layout();
  else if (cmd === "seed" && arg) await seed(arg);
  else throw new Error("Usage: npm run mail:templates layout | seed <file>");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
