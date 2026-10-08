"use client";

import { useCallback, useState } from "react";
import { PLATFORM_NAME, type Platform } from "@/lib/boards/match";
import { KINDS, SKIP_REASONS, type Kind, type Skipped } from "@/lib/boards/entries";
import type { Dict } from "@/lib/i18n/en";
import { Progress } from "@/components/criterio";
import { useT } from "./I18nProvider";

/** Where an import of a board stands: reading it on its platform, then saving what it holds in batches */
export type BoardStep = { phase: "reading"; platform: Platform } | { phase: "saving"; done: number; total: number };

/** Imports the board a pasted address points to, telling each step. Resolves with what went wrong, or null
 *  once what it holds is in its project and the user is in it. */
export type ImportBoard = (input: string, onStep: (step: BoardStep) => void) => Promise<string | null>;

export const noneImported = (): Record<Kind, number> => ({ web: 0, image: 0, video: 0, post: 0, text: 0 });

/** The notice once an import ends: what came in by kind, then what stayed out and why.
 *  "38 websites, 12 images imported." / "3 skipped (2 files, 1 board inside the board). 1 could not be saved." */
export function importSummary(t: Dict, r: { imported: Record<Kind, number>; skipped: Skipped; failed: number; capped: boolean }): { title: string; detail: string } {
  const came = KINDS.filter((k) => r.imported[k]).map((k) => t.board.kinds[k](r.imported[k]));
  const out = SKIP_REASONS.filter((k) => r.skipped[k]);
  const left = out.reduce((n, k) => n + r.skipped[k], 0);
  return {
    title: came.length ? t.board.imported(came.join(", ")) : t.board.nothingImported,
    detail: [
      left ? t.board.skipped(left, out.map((k) => t.board.reasons[k](r.skipped[k])).join(", ")) : "",
      r.failed ? t.board.failed(r.failed) : "",
      r.capped ? t.board.capped : "",
    ].filter(Boolean).join(" "),
  };
}

/** One import at a time from a paste field (first run, Add, Import): its step while it runs, and what went wrong */
export function useBoardImport(importBoard: ImportBoard) {
  const [step, setStep] = useState<BoardStep | null>(null);
  const run = useCallback(async (input: string): Promise<string | null> => {
    try { return await importBoard(input, setStep); } finally { setStep(null); }
  }, [importBoard]);
  return { step, run };
}

/** The Progress blocks and the line that says what is happening, under the paste field */
export function BoardProgress({ step, className }: { step: BoardStep; className?: string }) {
  const { t } = useT();
  const line = step.phase === "reading" ? t.board.reading(PLATFORM_NAME[step.platform]) : t.board.saving(step.done, step.total);
  // Reading has no count: one lit block says it started
  const [value, max] = step.phase === "reading" ? [1, 22] : [step.done, Math.max(step.total, 1)];
  return (
    <div className={className} role="status">
      <Progress value={value} max={max} label={line} />
      <p className="board-progress__line">{line}</p>
    </div>
  );
}
