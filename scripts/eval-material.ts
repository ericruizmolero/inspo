// What closes the gap between a one-shot landing and the real thing: the material, the model, or iterating? Each project
// runs three ways, and the team looks at them beside the finished work. A: the file, plus pictures, real texts and the
// brand's own photos. B: A on a stronger model. C: B, then three rounds of looking at its own render and fixing it.
//   npm run eval:material              → a new run
//   npm run eval:material -- <run>     → resumes a run, keeping what it already built
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import sharp from "sharp";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FAST = "anthropic/claude-sonnet-5.5";
const STRONG = process.env.EVAL_STRONG_MODEL || "anthropic/claude-opus-5.5";
const REVIEWS = 3;
const ROOT = ".data/evals/material";
const RESULTS = "scripts/evals/material.jsonl";
const DELIVER = "Deliver the landing as one complete HTML file with its CSS inside, in a single ```html block. Load the real typefaces. Use the listed picture addresses for real <img> tags. Put any question in a comment at the top: nobody can answer in this run.";

interface Project {
  id: string; template: string; said: string; texts: string[];
  /** Pictures the agent looks at, as files */
  look: string[];
  /** The brand's own pictures, as addresses it can use on the page */
  photos: string[];
  /** The finished work, to compare by eye */
  target: string[];
}

const XABIER = "https://xn--xabierjareoabogados-43b.com/images/opt";
const PROJECTS: Project[] = [
  {
    id: "zernio", template: "zernio",
    said: "Zernio, antes Late, es una API para publicar en redes sociales desde un solo sitio, pensada para ingenieros. Qué quiero que haga quien la vea: obtener una API key. A quién me dirijo: ingenieros que integran redes sociales en su producto. Por qué nosotros: una sola API para 23 canales, sin planes ni asientos, pagas por lo que usas. Pruebas: 23 canales, más de 300 tools en el MCP, y Late pasó a ser Zernio sin cambios que rompan nada.",
    texts: ["docs/templates/zernio/board/titulares.md"], look: ["/tmp/tgt/zernio.com.png"], photos: [],
    target: ["hero-codigo", "channels-pila-3d", "the-shift", "pricing-calculadora"].map((f) => `docs/templates/zernio/board/${f}.jpg`),
  },
  {
    id: "xabier", template: "xabier-jareno",
    said: "Xabier Jareño Abogados es un despacho de abogados de Pamplona, abierto desde 2011. Qué quiero que haga quien la vea: empezar una primera conversación por WhatsApp. A quién me dirijo: personas de Pamplona con un problema legal. Por qué nosotros: cercanía, seguridad, certeza. Pruebas: desde 2011, y reseñas de Google, sin cifras que no tenga.",
    texts: ["el-equipo", "el-espacio", "footer", "servicios", "valores"].map((f) => `docs/templates/xabier-jareno/board/${f}.md`),
    look: ["hero-logo-centrado", "servicios-tabs", "seccion-retrato-firma", "equipo-fichas", "footer-logo"].map((f) => `docs/templates/xabier-jareno/board/${f}.jpg`),
    photos: ["despacho-arco", "despacho-entre-arcos", "detalle-mesa-silla", "equipo-1", "equipo-2", "equipo-3", "equipo-trabajando"].map((f) => `${XABIER}/${f}-2048.webp`),
    target: ["/tmp/tgt/xn--xabierjareoabogados-43b.com.png"],
  },
];

const htmlOf = (text: string) => text.match(/```html\s*([\s\S]*?)```/i)?.[1] ?? text.slice(Math.max(0, text.search(/<!doctype|<html/i)));
const jpeg = async (file: string | Buffer) => sharp(file).resize({ width: 1280, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();

async function shot(html: string, png: string, width: number, height: number) {
  await promisify(execFile)(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${width},${height}`, "--virtual-time-budget=6000", `--screenshot=${path.resolve(png)}`, `file://${path.resolve(html)}`], { timeout: 60_000 }).catch(() => {});
}

let spent = 0;
async function model(id: string, label: string, model: string, effort: "medium" | "high", system: string, text: string, images: Buffer[]) {
  const { llm } = await import("../lib/llm");
  const res = await llm({ model, fallback: null, system, text, images, effort, maxTokens: effort === "high" ? 64000 : 40000 });
  spent += res.costUsd ?? 0;
  await fs.appendFile(RESULTS, JSON.stringify({ at: new Date().toISOString(), project: id, label, model, effort, costUsd: res.costUsd ?? 0, ms: res.ms }) + "\n");
  console.log(`  ✓ ${id} · ${label} · $${(res.costUsd ?? 0).toFixed(3)} · ${Math.round(res.ms / 1000)}s · total $${spent.toFixed(2)}`);
  return htmlOf(res.text);
}

async function run(p: Project, dir: string) {
  const { exampleCriterioMd } = await import("../lib/example-md");
  const { promptGet } = await import("../lib/mcp/prompts");
  const { name, md } = exampleCriterioMd("es", p.template);
  const texts = (await Promise.all(p.texts.map((f) => fs.readFile(f, "utf8")))).join("\n\n");
  const images = await Promise.all(p.look.map(jpeg));
  const prompt = promptGet("design_with_criterio", { project: name, task: `${p.said} Una landing de una sola página.` }, "es")!.messages[0].content.text;
  const system = "You are a coding agent in the person's editor, connected to criterio.design over MCP. In this run you cannot call tools or wait for an answer: the tool results you would ask for are given below.";
  const text = [prompt, `---\nread_criterio answered:\n\n${md}\n---`, `The project's real texts, to use literally:\n\n${texts}`, p.photos.length ? `The brand's own pictures, public addresses you can use:\n${p.photos.join("\n")}` : "", `The pictures attached are the project's references: ${p.look.map((f) => path.basename(f)).join(", ")}. Study them; take what the file says to take, and copy none.`, DELIVER].filter(Boolean).join("\n\n");

  const save = async (label: string, html: string) => {
    const file = path.join(dir, `${p.id}.${label}.html`);
    await fs.writeFile(file, html);
    await shot(file, path.join(dir, `${p.id}.${label}.png`), 1440, 2600);
    return file;
  };
  const kept = (label: string) => fs.readFile(path.join(dir, `${p.id}.${label}.html`), "utf8").catch(() => null);
  if (!(await kept("A"))) await save("A", await model(p.id, "A", FAST, "medium", system, text, images));
  let html = await kept("B") ?? await model(p.id, "B", STRONG, "high", system, text, images);
  await save("B", html);
  for (let i = 1; i <= REVIEWS; i++) {
    const file = path.join(dir, `${p.id}.look.html`);
    await fs.writeFile(file, html);
    const desk = path.join(dir, `${p.id}.look-d.png`), phone = path.join(dir, `${p.id}.look-p.png`);
    await shot(file, desk, 1440, 2600);
    await shot(file, phone, 500, 1600);
    const seen = await Promise.all([desk, phone].map((f) => fs.readFile(f).then(jpeg)));
    const review = [
      `This is your landing as it renders, on desktop and on a phone, then the references. The goal: ${p.said}`,
      "Look at the render as a demanding art director. Name the five things that most hurt it: what does not serve the goal, what looks generic, what is broken, empty or badly spaced, what breaks the file. Then fix them, all of them, and raise the craft: type, rhythm, real pictures, detail. Do not change what already works.",
      `The file, for its rules:\n\n${md}`, `The current HTML:\n\`\`\`html\n${html}\n\`\`\``, DELIVER,
    ].join("\n\n");
    html = await model(p.id, `C${i}`, STRONG, "high", system, review, [...seen, ...images]);
  }
  await save("C", html);
}

async function page(dir: string) {
  const col = (t: string, src: string, href?: string) => `<figure><figcaption>${t}${href ? ` <a href="${href}" target="_blank">Open</a>` : ""}</figcaption><img src="${src}"></figure>`;
  const rows: string[] = [];
  for (const p of PROJECTS) {
    const real = await Promise.all(p.target.map(async (f, i) => { const name = `${p.id}.real-${i}${path.extname(f)}`; await fs.copyFile(f, path.join(dir, name)); return col(i ? "" : "Real work", name); }));
    rows.push(`<h2>${p.id}</h2><div class="r"><div>${real.join("")}</div>${["A", "B", "C"].map((l) => col({ A: "A: material", B: "B: + stronger model", C: "C: + 3 reviews" }[l]!, `${p.id}.${l}.png`, `${p.id}.${l}.html`)).join("")}</div>`);
  }
  await fs.writeFile(path.join(dir, "index.html"), `<!doctype html><meta charset="utf-8"><title>Material, model, iteration</title><style>body{font:14px system-ui;margin:20px}.r{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:start}img{width:100%;border:1px solid #ccc;display:block}figure{margin:0 0 8px}figcaption{padding:4px 0}</style><h1>What closes the gap?</h1>${rows.join("")}`);
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set");
  const dir = path.join(ROOT, process.argv[2] ?? new Date().toISOString().replace(/[:.]/g, "-"));
  await fs.mkdir(dir, { recursive: true });
  const done = await Promise.allSettled(PROJECTS.map((p) => run(p, dir)));
  for (const r of done) if (r.status === "rejected") console.error(String(r.reason).slice(0, 200));
  await page(dir);
  console.log(`Spent $${spent.toFixed(2)}. Open ${path.join(dir, "index.html")}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); }).finally(async () => {
  const { pool } = await import("../lib/db");
  await pool.end().catch(() => {});
});
