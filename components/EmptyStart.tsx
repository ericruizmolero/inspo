"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import Clouds from "@/components/Clouds";
import { normalizeWebUrl } from "@/lib/url";
import { marketingHref } from "@/lib/site";
import { useT } from "./I18nProvider";
import { Button, PromptInput } from "@/components/criterio";
import s from "./EmptyStart.module.css";
import { boardOf, PLATFORM_NAME } from "@/lib/boards/match";
import { BoardProgress, useBoardImport, type BoardStep, type ImportBoard } from "./BoardImport";

interface EmptyStartProps {
  /** Saves the first inspo from the (already normalized) URL. Resolves when the save finishes. */
  onAddUrl: (web: string) => Promise<void>;
  isDuplicate?: (web: string) => boolean;
  /** A board pasted (Are.na, Pinterest, Cosmos): what Criterio can save of it comes in, in a project of its own */
  onImportBoard: ImportBoard;
  /** A board imported on its own (pasted before signing in): its progress shows here */
  arriving?: BoardStep | null;
  /** In place of the lead: the signed-out home says what the product is instead */
  lead?: ReactNode;
  /** Under the paste field: the signed-out home's price and example file */
  children?: ReactNode;
  /** Signed in: the way to Discover's examples, which only shows where a space is still empty (meeting of 13-10) */
  onExamples?: () => void;
}

/**
 * Workspace with no inspos yet: one prompt box to paste a URL, and under it the way to the places we look.
 */
export default function EmptyStart({ onAddUrl, isDuplicate, onImportBoard, arriving, lead, children, onExamples }: EmptyStartProps) {
  const { t, locale } = useT();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const add = async (web: string) => {
    if (isDuplicate?.(web)) { setError(t.start.alreadySaved); return; }
    setBusy(true);
    try { await onAddUrl(web); } finally { setBusy(false); }
  };
  const { step: ownStep, run } = useBoardImport(onImportBoard);
  const step = ownStep ?? arriving ?? null;
  const board = boardOf(raw);
  const importBoard = async () => {
    setBusy(true);
    try {
      const failed = await run(raw);
      if (failed) setError(failed);
    } finally { setBusy(false); }
  };
  const submit = () => {
    if (board) { void importBoard(); return; }
    const web = normalizeWebUrl(raw);
    if (!web) { setError(t.start.notUrl); return; }
    void add(web);
  };

  return (
    <>
    <div className={s.scroll}>
    <section className={s.wrap}>
      <div className={s.head} data-flip>
        <h1 className={s.title}>{t.start.title}</h1>
        <p className={s.lead}>{lead ?? t.start.lead}</p>
        <PromptInput className={s.prompt} id="start-url" inputRef={inputRef} value={raw} placeholder={t.start.pasteUrl}
          label={t.start.firstUrlLabel} sendLabel={board ? (busy ? t.board.importing : t.board.import) : busy ? t.start.saving : t.start.save} disabled={busy || !!arriving} busy={busy || !!arriving}
          onChange={(v) => { setRaw(v); setError(""); }} onSubmit={submit}
          inputProps={{ inputMode: "url", spellCheck: false, "aria-invalid": !!error, "aria-describedby": error ? "start-url-error" : undefined }} />
        {error && <p id="start-url-error" className={s.error} role="alert">{error}</p>}
        {step ? <BoardProgress step={step} className={`board-progress ${s.board}`} />
          : board && !error && <p className={s.boardHint}>{t.board.hint(PLATFORM_NAME[board.platform])}</p>}
      </div>

      {children}

      {/* Nothing to paste yet: an example to start from (Discover, in the app) and the places we look, on the marketing
          site. Each one there saves back here (?add=) */}
      <div className={`${s.section} ${s.links}`} data-flip>
        {onExamples && <Button icon="compass" onClick={onExamples}>{t.start.examples}</Button>}
        <Button icon="search" iconEnd="arrow-up-right" href={marketingHref("/resources/", locale)}>{t.start.resources}</Button>
      </div>
    </section>
    </div>
    <Clouds />
    </>
  );
}
