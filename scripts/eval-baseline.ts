// Does criterio.md make a landing visibly better? The same model builds the same task twice, once from the person's
// words alone and once from the file, and the team judges each pair blind. Three files come from docs/templates,
// finished by hand; two from the team's own projects, as a system pass wrote them, so generation is measured too.
//   npm run eval:baseline                → builds the 5 pairs and writes .data/evals/baseline/<run>/index.html
//   npm run eval:baseline -- score <run> <votes.json>   → reads the votes copied from that page
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { promises as fs } from "fs";
import path from "path";

const MODEL = process.env.EVAL_MODEL || "anthropic/claude-sonnet-5.5";
const ROOT = ".data/evals/baseline";
const RESULTS = "scripts/evals/baseline.jsonl";
const DELIVER = "Deliver the landing as one complete HTML file with its CSS inside, in a single ```html block. Put any question or assumption in a comment at the top of the file: nobody can answer in this run.";
const NO_TOOLS = "You are a coding agent in the person's editor. In this run you cannot call tools or wait for an answer.";

/** `project`: a real project of the team's own workspace, read from the database as read_criterio hands it out, so its
 *  file is what a system pass wrote. Without it, a template: a file the team finished by hand */
interface Task { id: string; /** What the person answers to goal, audience, why-us and proof: the same on both sides */ answers: string; template?: string; project?: string; brief: string; task: string }
const HOME = "Una landing de una sola página, en un único archivo HTML con su CSS dentro.";
const TASKS: Task[] = [
  { id: "multiverse", answers: "Qué quiero que haga quien la vea: pedir una demo. A quién me dirijo: equipos de tecnología y dirección de grandes empresas que evalúan computación cuántica e IA. Por qué nosotros: unimos computación cuántica e IA en software para empresas. Pruebas: no tengo cifras publicables, no inventes ninguna.", template: "multiverse", brief: "Multiverse Computing es una empresa española de software de computación cuántica e IA para empresas.", task: HOME },
  { id: "zernio", answers: "Qué quiero que haga quien la vea: obtener una API key. A quién me dirijo: ingenieros que integran redes sociales en su producto. Por qué nosotros: una sola API para 23 canales, sin planes ni asientos, pagas por lo que usas. Pruebas: 23 canales, más de 300 tools en el MCP, y Late pasó a ser Zernio sin cambios que rompan nada.", template: "zernio", brief: "Zernio, antes Late, es una API para publicar en redes sociales desde un solo sitio, pensada para ingenieros.", task: HOME },
  { id: "xabier", answers: "Qué quiero que haga quien la vea: empezar una primera conversación por WhatsApp. A quién me dirijo: personas de Pamplona con un problema legal. Por qué nosotros: cercanía, seguridad, certeza. Pruebas: desde 2011, y reseñas de Google, sin cifras que no tenga.", template: "xabier-jareno", brief: "Xabier Jareño Abogados es un despacho de abogados de Pamplona, abierto desde 2011.", task: HOME },
  { id: "criterio-landing", answers: "Qué quiero que haga quien la vea: apuntarse a la lista de espera. A quién me dirijo: agencias, estudios, diseñadores y equipos de marketing. Por qué nosotros: tus ideas se convierten en un sistema que la IA puede seguir. Pruebas: ninguna todavía, no inventes ninguna.", project: "08e2c8f15cc546948428b68c", brief: "Criterio es un espacio donde dar estructura a tus ideas y que se conviertan en un sistema de diseño que tu IA pueda seguir.", task: HOME },
  { id: "criterio-libreria", answers: "Qué quiero que haga quien la vea: entrar a explorar la librería. A quién me dirijo: diseñadores y equipos que buscan referencias. Por qué nosotros: es una biblioteca curada a mano. Pruebas: ninguna todavía, no inventes ninguna.", project: "f3c3113a262e4cc3b9b28850", brief: "Criterio es un espacio donde dar estructura a tus ideas y que se conviertan en un sistema de diseño que tu IA pueda seguir. Esta landing presenta su librería.", task: HOME },
];
type Side = "none" | "file";

const htmlOf = (text: string) => text.match(/```html\s*([\s\S]*?)```/i)?.[1] ?? text.slice(Math.max(0, text.search(/<!doctype|<html/i)));

async function fileOf(t: Task): Promise<{ name: string; md: string }> {
  if (t.template) return (await import("../lib/example-md")).exampleCriterioMd("es", t.template);
  const { eq } = await import("drizzle-orm");
  const { db, schema } = await import("../lib/db");
  const { loadShareView } = await import("../lib/share-view");
  const [p] = await db.select({ name: schema.project.name, organizationId: schema.project.organizationId }).from(schema.project).where(eq(schema.project.id, t.project!));
  if (!p) throw new Error(`No project ${t.project}`);
  const view = await loadShareView(p.organizationId, t.project!, "clean", "es", null, "https://app.criterio.design");
  if (!view) throw new Error(`No file for ${t.project}`);
  return { name: p.name, md: view.markdown };
}

async function build(t: Task, side: Side, dir: string) {
  const { llm } = await import("../lib/llm");
  const said = `${t.brief} ${t.answers}`;
  let system = NO_TOOLS, text = `${said}\n\n${t.task}\n\n${DELIVER}`;
  if (side === "file") {
    const { promptGet } = await import("../lib/mcp/prompts");
    const { name, md } = await fileOf(t);
    const prompt = promptGet("design_with_criterio", { project: name, task: `${said} ${t.task}` }, "es")!.messages[0].content.text;
    system = "You are a coding agent in the person's editor, connected to criterio.design over MCP. In this run you cannot call tools or wait for an answer: the tool results you would ask for are given below.";
    text = `${prompt}\n\n---\nread_criterio answered (the whole file; read the parts the prompt says to read):\n\n${md}\n---\n\n${DELIVER}`;
  }
  const res = await llm({ model: MODEL, fallback: null, system, text, effort: "medium", maxTokens: 64000 });
  const html = htmlOf(res.text);
  await fs.writeFile(path.join(dir, `${t.id}.${side}.html`), html);
  const row = { at: new Date().toISOString(), task: t.id, kind: t.template ? "finished" : "generated", side, model: MODEL, costUsd: res.costUsd ?? 0, ms: res.ms, bytes: html.length };
  await fs.appendFile(RESULTS, JSON.stringify(row) + "\n");
  console.log(`  ✓ ${t.id} · ${side} · $${row.costUsd.toFixed(3)} · ${Math.round(row.ms / 1000)}s · ${html.length} bytes`);
}

/** One page, each pair side by side in sandboxed frames. Which side is which lives only in key.json */
async function blindPage(dir: string) {
  const key: Record<string, { A: Side; B: Side }> = {};
  const rows: string[] = [];
  for (const [i, t] of TASKS.entries()) {
    const flip = Math.random() < 0.5;
    key[t.id] = flip ? { A: "file", B: "none" } : { A: "none", B: "file" };
    const n = `pair-${i + 1}`;
    // A page's comments can name the file: they would give the pair away to anyone who reads the source
    for (const s of ["A", "B"] as const) await fs.writeFile(path.join(dir, `${n}-${s}.html`), (await fs.readFile(path.join(dir, `${t.id}.${key[t.id][s]}.html`), "utf8")).replace(/<!--[\s\S]*?-->/g, ""));
    rows.push(`<section><h2>Pair ${i + 1}</h2><p>${t.brief} ${t.answers}</p><div class="two">${["A", "B"].map((s) => `<figure><figcaption><label><input type="radio" name="${t.id}" value="${s}"> ${s} serves it better</label> <a href="${n}-${s}.html" target="_blank">Open</a></figcaption><iframe sandbox="allow-scripts allow-same-origin" src="${n}-${s}.html" loading="lazy"></iframe></figure>`).join("")}</div></section>`);
  }
  await fs.writeFile(path.join(dir, "key.json"), JSON.stringify(key, null, 1));
  await fs.writeFile(path.join(dir, "index.html"), `<!doctype html><meta charset="utf-8"><title>Blind pairs</title><style>body{font:15px system-ui;margin:24px;max-width:none}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}iframe{width:200%;height:1720px;border:1px solid #bbb;transform:scale(.5);transform-origin:0 0;margin-bottom:-860px}figure{margin:0;overflow:hidden;height:860px}section{margin-bottom:48px}textarea{width:100%;height:90px}</style>
<h1>Which landing better serves its goal?</h1><p>Judge alone, and do not open any other file in this folder. Press Open to see a page at full size.</p>${rows.join("")}
<button id="c">Show my votes</button><textarea id="o"></textarea><script>c.onclick=()=>{const v={};document.querySelectorAll("input:checked").forEach(i=>v[i.name]=i.value);o.value=JSON.stringify(v)}</script>`);
}

async function score(run: string, votesFile: string) {
  const dir = path.join(ROOT, run);
  const key = JSON.parse(await fs.readFile(path.join(dir, "key.json"), "utf8")) as Record<string, { A: Side; B: Side }>;
  const votes = JSON.parse(await fs.readFile(votesFile, "utf8")) as Record<string, "A" | "B">;
  const wins = TASKS.filter((t) => votes[t.id] && key[t.id][votes[t.id]] === "file");
  console.log(`The file won ${wins.length} of ${Object.keys(votes).length}: ${wins.map((t) => t.id).join(", ") || "none"}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "score") return score(args[1], args[2]);
  const { llmEnabled } = await import("../lib/llm");
  if (!llmEnabled()) throw new Error("OPENROUTER_API_KEY is not set");
  const run = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(ROOT, run);
  await fs.mkdir(dir, { recursive: true });
  const jobs = TASKS.flatMap((t) => (["none", "file"] as Side[]).map((s) => [t, s] as const));
  let next = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (next < jobs.length) { const [t, s] = jobs[next++]; await build(t, s, dir); }
  }));
  await blindPage(dir);
  console.log(`Open ${path.join(dir, "index.html")}`);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); }).finally(async () => {
  const { pool } = await import("../lib/db");
  await pool.end().catch(() => {});
});
