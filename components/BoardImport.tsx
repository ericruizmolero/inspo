"use client";

import { PLATFORM_NAME, type Platform } from "@/lib/boards/match";
import { Progress } from "@/components/criterio";
import { useT } from "./I18nProvider";

/** Where an import of a board stands: reading it on its platform, then saving its websites in batches */
export type BoardStep = { phase: "reading"; platform: Platform } | { phase: "saving"; done: number; total: number };

/** Imports the board a pasted address points to, telling each step. Resolves with what went wrong, or null
 *  once the websites are in their project and the user is in it. */
export type ImportBoard = (input: string, onStep: (step: BoardStep) => void) => Promise<string | null>;

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
