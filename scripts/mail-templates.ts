// The email templates in Resend (lib/mail-templates.ts), one per key and language, kept to the registry and the
// layout of lib/mail-layout.ts.
//
//   npm run mail:templates layout        every criterio-* template in the registry gets the current layout around the
//                                        body it has in Resend, the registry's variables, a subject that reads
//                                        each text variable through its raw twin and a plain-text part made from
//                                        its HTML the same way, and is published again
//   npm run mail:templates seed <file>   creates the registry's templates that Resend lacks, from the copy that file
//                                        exports as `seed` ({ en, es }: key → subject and body), and publishes them
//
// Both converge: run again, they change nothing that is already right, and never make a second template for an alias.
// A template with a draft in Resend (an edit not yet published, or the dashboard's editor reformatting the HTML when
// it opens one) is left alone and named: Resend reads back only the published version, and publishing would put live
// a draft the script never compared.
// Reads RESEND_API_KEY from .env.local, and never prints it. The wording itself is edited in Resend, not here.
import { existsSync } from "node:fs";
import path from "node:path";
import { LOCALES, type Locale } from "../lib/i18n/locale";
import { bodyOf, layoutHtml, type Body } from "../lib/mail-layout";
import { TEMPLATE_KEYS, aliasOf, stopOf, textPart, throughTwins, variablesOf, type TemplateKey } from "../lib/mail-templates";

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

/** What Resend should hold for a template, around `body` and with the editors' `subject` */
function wanted(key: TemplateKey, locale: Locale, subject: string, body: string) {
  return {
    subject: throughTwins(key, subject),
    html: layoutHtml({ locale, stop: stopOf(key) }, body),
    text: textPart(key, locale, body),
    variables: Object.entries(variablesOf(key)).map(([k, kind]) => ({ key: k, type: kind === "number" ? "number" : "string" })),
  };
}

const sameVariables = (a: Remote["variables"], b: { key: string; type: string }[]) =>
  JSON.stringify(a.map((v) => `${v.key}:${v.type}`).sort()) === JSON.stringify(b.map((v) => `${v.key}:${v.type}`).sort());

async function layout(): Promise<void> {
  const missing: string[] = [], drafts: string[] = [];
  let changed = 0;
  for (const key of TEMPLATE_KEYS) for (const locale of LOCALES) {
    const alias = aliasOf(key, locale);
    let t: Remote;
    try { t = await api<Remote>("GET", `/templates/${alias}`); }
    catch (e) { if (String(e).includes(" 404 ")) { missing.push(alias); continue; } throw e; }
    if (t.status !== "published" || t.has_unpublished_versions) { drafts.push(alias); continue; }
    const body = bodyOf(t.html);
    if (body === null) throw new Error(`${alias}: its body markers are gone in Resend; put them back around the body before laying it out`);
    const want = wanted(key, locale, t.subject, body);
    if (t.subject === want.subject && t.html === want.html && t.text === want.text && sameVariables(t.variables, want.variables)) continue;
    await api("PATCH", `/templates/${alias}`, want);
    await api("POST", `/templates/${alias}/publish`);
    changed++;
    console.log(`laid out ${alias}`);
  }
  console.log(`${changed} published again, ${TEMPLATE_KEYS.length * LOCALES.length - changed - missing.length - drafts.length} already right`);
  const problems = [
    missing.length && `Missing in Resend (seed them): ${missing.join(", ")}`,
    drafts.length && `A draft in Resend, left alone (publish or discard it there, then run again): ${drafts.join(", ")}`,
  ].filter(Boolean);
  if (problems.length) throw new Error(problems.join("\n"));
}

async function seed(file: string): Promise<void> {
  const { seed: copy } = (await import(path.resolve(file))) as { seed: Record<Locale, Record<TemplateKey, { subject: string; body: Body }>> };
  const have = await remoteAliases();
  let made = 0;
  for (const key of TEMPLATE_KEYS) for (const locale of LOCALES) {
    const alias = aliasOf(key, locale);
    if (have.has(alias)) continue;
    const c = copy[locale][key];
    await api("POST", "/templates", { alias, name: alias, ...wanted(key, locale, c.subject, c.body.html) });
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
