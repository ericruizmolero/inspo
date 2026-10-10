// A contact sheet: up to 20 pictures of a board on one JPEG, each cut to its first screen and marked with its code
// (r12), so a model that reads one image can compare references side by side and name them. Pure apart from sharp.
import sharp from "sharp";

const MAX_TILES = 20;
const COLS = 5;
const TILE_W = 320;
const TILE_H = 240;
const GAP = 8;
/** Pixels per cell of the glyphs below: a code reads at about 28 px tall */
const CELL = 4;

// The codes are drawn as squares, not as SVG text: a server with no fonts installed would draw nothing
const GLYPHS: Record<string, string[]> = {
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

/** The code on a solid black tag, white squares, sized to the code */
function tag(code: string): Buffer {
  const chars = [...code.toLowerCase()].filter((c) => GLYPHS[c]);
  const pad = CELL * 2;
  const w = pad * 2 + chars.length * 6 * CELL - CELL, h = pad * 2 + 7 * CELL;
  const cells = chars.flatMap((c, i) => GLYPHS[c].flatMap((row, y) => [...row].flatMap((on, x) => on === "1" ? [`<rect x="${pad + (i * 6 + x) * CELL}" y="${pad + y * CELL}" width="${CELL}" height="${CELL}"/>`] : [])));
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#000"/><g fill="#fff">${cells.join("")}</g></svg>`);
}

/** One JPEG grid of the first 20 entries: each picture 320 wide cut to 4:3 from the top (a page's first screen),
 *  its code in the top left corner. A picture sharp cannot read leaves its tile empty, with its code */
export async function contactSheet(entries: { code: string; image: Buffer }[]): Promise<Buffer> {
  const shown = entries.slice(0, MAX_TILES);
  const rows = Math.max(1, Math.ceil(shown.length / COLS));
  const cols = Math.min(COLS, Math.max(1, shown.length));
  const tiles = await Promise.all(shown.map(async ({ code, image }, i) => {
    const left = GAP + (i % COLS) * (TILE_W + GAP), top = GAP + Math.floor(i / COLS) * (TILE_H + GAP);
    const picture = await sharp(image, { failOn: "none" }).resize(TILE_W, TILE_H, { fit: "cover", position: "top" }).flatten({ background: "#fff" }).png().toBuffer().catch(() => null);
    return [...(picture ? [{ input: picture, left, top }] : []), { input: tag(code), left, top }];
  }));
  return sharp({ create: { width: GAP + cols * (TILE_W + GAP), height: GAP + rows * (TILE_H + GAP), channels: 3, background: "#808080" } })
    .composite(tiles.flat())
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}
