// Writes lib/mcp/tino.ts: the favicon as a block of text, for an agent to print in a code block. A plain downsample leaves
// a one-cell gap in the visor's lower edge, so the row is closed here, and the drawing follows the favicon if it changes.
//   npx tsx scripts/build-tino.ts
import { writeFileSync } from "node:fs";
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
  writeFileSync("lib/mcp/tino.ts", `// Written by scripts/build-tino.ts from app/icon.png.\nexport const TINO = ${JSON.stringify(lines.join("\n"))};\n`);
  console.log(lines.join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); });
