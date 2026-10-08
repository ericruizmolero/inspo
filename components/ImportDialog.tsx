"use client";
// Bringing what someone already saved elsewhere: a board from Are.na, Pinterest or Cosmos, pasted here and imported
// as in the first run and in Add (useBoardImport), and the bookmarks on X and in the browser, which only the
// extension can read, so this opens its import page. Platforms are named in words, never with their logos.
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";
import { Dialog, DialogDescription, DialogWindow } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/criterio";
import { boardOf, PLATFORM_NAME } from "@/lib/boards/match";
import { BoardProgress, useBoardImport, type ImportBoard } from "./BoardImport";
import { canInstall, isOlder, openExtensionImport, OPENS_IMPORT_FROM, useExtension, useExtensionMissing } from "@/hooks/use-extension";
import "./ImportDialog.css";

export default function ImportDialog({ onClose, onImportBoard }: { onClose: () => void; onImportBoard: ImportBoard }) {
  const { t } = useT();
  const s = t.imports;
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const { step, run } = useBoardImport(onImportBoard);
  const board = boardOf(raw);
  const submit = async () => {
    if (step) return;
    if (!board) { setError(s.notBoard); return; }
    setError("");
    const failed = await run(raw);
    if (failed) setError(failed); else onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogWindow className="impd" bar={s.open} heading={s.title} closeLabel={t.common.close}>
        <div className="impd__body">
          <DialogDescription className="impd__lead">{s.lead}</DialogDescription>
          <section className="impd__part">
            <h3 className="t-label">{s.boardTitle}</h3>
            <form className="impd__row" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
              <Input value={raw} onChange={(e) => { setRaw(e.target.value); setError(""); }} disabled={!!step} aria-label={s.boardLabel}
                placeholder={s.boardPlaceholder} inputMode="url" autoComplete="off" spellCheck={false} autoFocus
                aria-invalid={!!error} aria-describedby={error ? "impd-error" : undefined} />
              <Button variant="primary" type="submit" disabled={!raw.trim() || !!step}>{step ? t.board.importing : t.board.import}</Button>
            </form>
            {step ? <BoardProgress step={step} className="board-progress" />
              : error ? <p id="impd-error" className="impd__error" role="alert">{error}</p>
              : <p className="impd__hint">{board ? t.board.hint(PLATFORM_NAME[board.platform]) : s.boardHint}</p>}
          </section>
          <section className="impd__part">
            <h3 className="t-label">{s.bookmarksTitle}</h3>
            <p className="impd__text">{s.bookmarksLead}</p>
            <ExtensionImport />
          </section>
        </div>
      </DialogWindow>
    </Dialog>
  );
}

/** What this browser can do about bookmarks: open the extension's import page, or the step it still lacks */
function ExtensionImport() {
  const { t } = useT();
  const s = t.imports;
  const { info } = useExtension();
  const missing = useExtensionMissing();
  const [installable, setInstallable] = useState<boolean | null>(null);
  useEffect(() => { setInstallable(canInstall()); }, []);
  if (installable === null) return null;
  if (!installable) return <p className="impd__hint">{s.notHere}</p>;
  const ready = !!info?.connected && !!info.version && !isOlder(info.version, OPENS_IMPORT_FROM);
  const action = ready ? (
    <div className="impd__actions">
      <Button onClick={() => openExtensionImport("x")}>{s.fromX}</Button>
      <Button onClick={() => openExtensionImport("browser")}>{s.fromBrowser}</Button>
    </div>
  ) : info?.connected ? <div className="impd__actions"><Button href="/extension/install">{s.update}</Button></div>
    : missing === "connect" ? <div className="impd__actions"><Button href="/extension/connect">{s.connect}</Button></div>
    : missing === "install" ? <div className="impd__actions"><Button href="/extension/install">{s.install}</Button></div>
    : null;
  return <>{action}<p className="impd__hint">{s.onBoards}</p></>;
}
