// Picks the embedding model: the same items and queries, several models, the top 5 of each side by side.
// In memory: nothing is written. Queries in several languages, since the library is tagged in English.
//   npm run embed:bakeoff
//   npm run embed:bakeoff -- --models a/b,c/d --org <organization id>
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

const args = process.argv.slice(2);
const arg = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const MODELS = (arg("models") ?? "baai/bge-m3,openai/text-embedding-3-small").split(",");
const QUERIES = [
  "calm editorial site with big serif type", "web editorial tranquila con serif grande",
  "dark product page with pricing", "página oscura con precios", "dunkle Produktseite mit Preisen",
  "design studio portfolio grid", "estudio de diseño con proyectos en rejilla",
  "playful illustration", "3d immersive experience", "música y vídeo",
];

const cos = (a: number[], b: number[]) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] ** 2; y += b[i] ** 2; } return d / Math.sqrt(x * y); };

async function main() {
  const { db, schema } = await import("../lib/db");
  const { eq, inArray } = await import("drizzle-orm");
  const { embedTexts, itemText } = await import("../lib/embed");
  const T = schema.inspoItem, C = schema.inspoComment;
  const org = arg("org") ?? (await db.execute<{ o: string }>(`select organization_id o from inspo_item group by 1 order by count(*) desc limit 1` as never)).rows[0].o;
  const rows = await db.select().from(T).where(eq(T.organizationId, org));
  const thread = await db.select().from(C).where(inArray(C.itemId, rows.map((r) => r.id)));
  const texts = rows.map((r) => itemText(r, thread.filter((c) => c.itemId === r.id).map((c) => `${c.authorName}: ${c.body}`)));
  console.log(`${rows.length} items, ${QUERIES.length} queries`);

  for (const model of MODELS) {
    const t0 = Date.now();
    const items: number[][] = [];
    for (let i = 0; i < texts.length; i += 64) items.push(...(await embedTexts(texts.slice(i, i + 64), model)).vectors);
    const qs = (await embedTexts(QUERIES, model)).vectors;
    console.log(`\n══ ${model} (${items[0].length} d, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    QUERIES.forEach((q, k) => {
      const top = items.map((v, i) => [cos(v, qs[k]), i] as const).sort((a, b) => b[0] - a[0]).slice(0, 5);
      console.log(`"${q}"\n   ${top.map(([s, i]) => `${rows[i].name.slice(0, 22)} ${s.toFixed(2)}`).join(" · ")}`);
    });
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
