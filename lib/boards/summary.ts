// The line an import of a board ends with. Client-safe and pure: scripts/check-boards.ts reads it in both languages.
import { KINDS, SKIP_REASONS, type Kind, type Skipped } from "@/lib/boards/entries";
import type { Dict } from "@/lib/i18n/en";

/** What one import did with each item: new by kind, already in the library, left out and why, failed */
export interface ImportTally { imported: Record<Kind, number>; existed: number; skipped: Skipped & { invalid: number }; failed: number; capped: boolean }

/** What was new by kind, what was already there, what stayed out and why, what failed.
 *  "12 websites and 3 images imported." / "20 were already in your library. 1 skipped (a board inside the board)." */
export function importSummary(t: Dict, r: ImportTally): { title: string; detail: string } {
  const came = KINDS.filter((k) => r.imported[k]).map((k) => t.board.kinds[k](r.imported[k]));
  const out = [...SKIP_REASONS, "invalid" as const].filter((k) => r.skipped[k]);
  const left = out.reduce((n, k) => n + r.skipped[k], 0);
  const why = out.length === 1 ? t.board.reason[out[0]](left) : out.map((k) => t.board.reasons[k](r.skipped[k])).join(", ");
  return {
    title: came.length ? t.board.imported(t.board.list(came)) : r.existed ? t.board.allExisted(r.existed) : t.board.nothingImported,
    detail: [
      came.length && r.existed ? t.board.existed(r.existed) : "",
      left ? t.board.skipped(left, why) : "",
      r.failed ? t.board.failed(r.failed) : "",
      r.capped ? t.board.capped : "",
    ].filter(Boolean).join(" "),
  };
}
