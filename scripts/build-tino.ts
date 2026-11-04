// Writes lib/mcp/tino.ts: the favicon as a block of text, for an agent to print in a code block. A plain downsample leaves
// a one-cell gap in the visor's lower edge, so the row is closed here, and the drawing follows the favicon if it changes.
//   npx tsx scripts/build-tino.ts
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SIZE = 24;

async function main() {
  const { data } = await sharp("app/icon.png").flatten({ background: "#fff" }).grayscale().resize(SIZE, SIZE, { kernel: "lanczos3" }).raw().toBuffer({ resolveWithObject: true });
  const dark = (x: number, y: number) => data[y * SIZE + x] < 128;
  const rows: string[] = [];
  for (let y = 0; y < SIZE; y += 2) {
    let row = "";
    for (let x = 0; x < SIZE; x++) {
      const up = dark(x, y), down = dark(x, Math.min(y + 1, SIZE - 1));
      row += up && down ? "█" : up ? "▀" : down ? "▄" : " ";
    }
    rows.push(row.trimEnd().replace(/▄ ▄/g, "▄▄▄"));
  }
  const lines = rows.filter((r, i) => r.trim() || (i > 0 && i < rows.length - 1 && rows[i + 1]?.trim()));
  // The same favicon in shapes, for the MCP App: only the ears move, so they need to come apart from the body
  const svg = readFileSync("app/icon.svg", "utf8");
  const paths = [...svg.matchAll(/<path([^>]*?) d="([^"]*)"/g)].map((m) => ({ attrs: m[1], d: m[2] }));
  const ears = paths.slice(0, 2).map((p) => { const t = /translate\(([\d.]+) ([\d.]+)\) rotate\((-?[\d.]+)\)/.exec(p.attrs)!; return { x: Number(t[1]), y: Number(t[2]), rotate: Number(t[3]), d: p.d }; });
  writeFileSync("lib/mcp/tino.ts", `// Written by scripts/build-tino.ts from app/icon.png and app/icon.svg.\nexport const TINO = ${JSON.stringify(lines.join("\n"))};\nexport const TINO_SHAPES = ${JSON.stringify({ ears, body: paths[2].d, visor: paths[3].d })};\n`);
  // Claude Code's command carries him too: the first thing the person sees, before any tool answers
  writeFileSync("plugins/criterio/commands/setup.md", `---
description: Set up this project in criterio, or continue where it stopped
---

Start your first message with this drawing, exactly as it is, in a code block, and nothing else in the block:

\`\`\`
${lines.join("\n")}
\`\`\`

Then set up this project in criterio with me. Call the \`start_setup\` tool and follow it: its answer says what to do next, and so does every tool you use after it. One step at a time. Do not repeat what is already there, and do not print the drawing again.

If the tool is not available, tell me to run \`/mcp\` and sign in to criterio, and stop.
`);
  console.log(lines.join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); });
