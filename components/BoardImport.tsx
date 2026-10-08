"use client";

import { useCallback, useState } from "react";
import { PLATFORM_NAME, type Platform } from "@/lib/boards/match";
import type { Kind } from "@/lib/boards/entries";
import { Progress } from "@/components/criterio";
import { useT } from "./I18nProvider";

/** Where an import of a board stands: reading it on its platform, then saving what it holds in batches */
export type BoardStep = { phase: "reading"; platform: Platform } | { phase: "saving"; done: number; total: number };

/** Imports the board a pasted address points to, telling each step. Resolves with what went wrong, or null
 *  once what it holds is in its project and the user is in it. */
export type ImportBoard = (input: string, onStep: (step: BoardStep) => void) => Promise<string | null>;

export const noneImported = (): Record<Kind, number> => ({ web: 0, image: 0, video: 0, post: 0, text: 0 });

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
