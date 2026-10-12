// Makes the board's copy of every stored picture that lacks one (lib/board.ts cardCopyOf): uploaded images, chosen
// thumbnails and the pictures of saved posts. The board makes a missing copy the first time it is asked for, so
// this only spares the first viewer that wait. Safe to run again: a copy already there is skipped.
//   npm run files:cards            (where lib/storage.ts points: R2 when R2_* is set, else .data/files)
//   npm run files:cards -- --dry   (counts what it would make)
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

import { listFiles, fileUrl, keyOf, ensureCardCopy, fileExists } from "../lib/storage";
import { cardCopyOf } from "../lib/board";

const dry = process.argv.includes("--dry");
const PICTURES = /^inspo\/(posts\/|thumbs\/|[^/]+\/(media|thumbs)\/)/;

async function main() {
  const cards = (await listFiles("inspo/"))
    .map((f) => f.key)
    .filter((k) => PICTURES.test(k))
    .map((k) => keyOf(cardCopyOf(fileUrl(k)) ?? ""))
    .filter((k): k is string => !!k);
  let made = 0, had = 0, failed = 0;
  const queue = [...cards];
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let k = queue.shift(); k; k = queue.shift()) {
      if (await fileExists(k)) { had++; continue; }
      if (dry) { made++; continue; }
      if (await ensureCardCopy(k).catch((err) => { console.error(k, err); return false; })) made++; else failed++;
    }
  }));
  console.log(`${cards.length} pictures: ${made} ${dry ? "to make" : "made"}, ${had} already there, ${failed} failed`);
}

main().then(() => process.exit(0), (err) => { console.error(err); process.exit(1); });
