// Checks that docs/design-system/ and the code that paints it at /library agree:
// every "muestra:" of componentes.md has a sample in Specimens.tsx (and the other way round), every link to a
// decision points at a file, no card still asks for a screenshot, and every component exported by
// components/criterio/index.tsx has its card. Run: npm run check:design-system
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "docs", "design-system");
const read = (p: string) => readFileSync(p, "utf8");
const problems: string[] = [];

const componentes = read(path.join(ROOT, "componentes.md"));
const specimens = read(path.join(process.cwd(), "components", "design-library", "Specimens.tsx"));

// 1. samples
const asked = new Set([...componentes.matchAll(/ · muestra: ([a-z0-9-]+)/g)].map((m) => m[1]));
const drawn = new Set([...specimens.matchAll(/^  "?([a-z0-9-]+)"?: \(\) =>/gm)].map((m) => m[1]));
for (const s of asked) if (!drawn.has(s)) problems.push(`componentes.md pide la muestra "${s}" y Specimens.tsx no la dibuja`);
for (const s of drawn) if (!asked.has(s)) problems.push(`Specimens.tsx dibuja "${s}" y ninguna ficha la pide`);

// 2. no screenshots
if (/ · captura: /.test(componentes)) problems.push("componentes.md aún pide capturas (captura:); las muestras son vivas");

// 3. links to decisions resolve
const mdFiles = [
  ...readdirSync(ROOT).filter((f) => f.endsWith(".md")).map((f) => path.join(ROOT, f)),
  ...readdirSync(path.join(ROOT, "construir")).filter((f) => f.endsWith(".md")).map((f) => path.join(ROOT, "construir", f)),
  ...readdirSync(path.join(ROOT, "decisiones")).filter((f) => f.endsWith(".md")).map((f) => path.join(ROOT, "decisiones", f)),
];
for (const file of mdFiles) {
  const dir = path.dirname(file);
  for (const m of read(file).matchAll(/\]\(((?:\.\.\/)?(?:decisiones\/)?[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+\.md)\)/g)) {
    if (!existsSync(path.resolve(dir, m[1]))) problems.push(`${path.relative(ROOT, file)} enlaza a ${m[1]}, que no existe`);
  }
}

// 4. every export of the system has a card (its name appears as a chip in componentes.md)
const index = read(path.join(process.cwd(), "components", "criterio", "index.tsx"));
const exported = [...index.matchAll(/^export function ([A-Z][A-Za-z]+)/gm)].map((m) => m[1]);
for (const name of exported) if (!componentes.includes(`\`${name}\``)) problems.push(`${name} se exporta en components/criterio/index.tsx y no tiene ficha en componentes.md`);

// 5. decisions have the frontmatter the library needs
for (const f of readdirSync(path.join(ROOT, "decisiones")).filter((f) => /^\d{4}-/.test(f))) {
  const head = read(path.join(ROOT, "decisiones", f)).split("\n---")[0];
  for (const key of ["title:", "date:", "status:", "kind:"]) if (!head.includes(key)) problems.push(`decisiones/${f} no tiene ${key.slice(0, -1)}`);
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log(`✓ sistema de diseño: ${asked.size} muestras, ${exported.length} componentes del sistema con ficha, enlaces y decisiones en orden`);
