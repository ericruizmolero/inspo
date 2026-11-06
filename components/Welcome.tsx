"use client";
// The very first time in (Eric, 06-11, after Trove's first run): four steps, one thing per screen. The project's name,
// its first reference, and then, both optional, the Chrome extension and an AI client over MCP: the three ways
// criterio works (collect, keep collecting from any site, take it out to an agent). Shown only to a new account
// with nothing saved; each optional step says "Not now" and both live on in Connectors.
import { useEffect, useRef, useState } from "react";
import { useT } from "./I18nProvider";
import { Button, Icon, PromptInput } from "@/components/criterio";
import { normalizeWebUrl } from "@/lib/url";
import { boardOf, PLATFORM_NAME } from "@/lib/boards/match";
import { BoardProgress, useBoardImport, type ImportBoard } from "./BoardImport";
import ConnectDialog from "./ConnectDialog";
import { canInstall, useExtension } from "@/hooks/use-extension";
import { loadConnections } from "@/app/actions/mcp";
import type { Project } from "@/types/inspo";
import s from "./Welcome.module.css";

type Step = "name" | "first" | "extension" | "agent";

export default function Welcome({ onCreateProject, onAddUrl, onImportBoard, onDone }: {
  /** Makes the project the steps happen in */
  onCreateProject: (name: string) => Promise<Project | null>;
  /** Saves the first reference into that project */
  onAddUrl: (web: string, projectId: string) => Promise<void>;
  /** A board pasted instead: it comes in with a project of its own, named after it */
  onImportBoard: ImportBoard;
  /** The flow is over: the project made here, or null when a board brought its own (the app is already in it) */
  onDone: (projectId: string | null) => void;
}) {
  const { t } = useT();
  const w = t.welcome;
  const [installable, setInstallable] = useState(false);
  useEffect(() => { setInstallable(canInstall()); }, []);
  // The extension step only where the extension runs (Chrome on a computer)
  const steps: Step[] = installable ? ["name", "first", "extension", "agent"] : ["name", "first", "agent"];
  const [step, setStep] = useState<Step>("name");
  const at = steps.indexOf(step);
  const next = () => { const n = steps[at + 1]; if (n) setStep(n); else onDone(projectId); };

  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  // ─── First reference ─────────────────────────────────────────────────────────
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { step: boardStep, run } = useBoardImport(onImportBoard);
  const board = boardOf(raw);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, [step]);

  const saveFirst = async () => {
    if (board) {
      setBusy(true);
      try {
        const failed = await run(raw);
        if (failed) { setError(failed); return; }
        next();
      } finally { setBusy(false); }
      return;
    }
    const web = normalizeWebUrl(raw);
    if (!web) { setError(t.start.notUrl); return; }
    setBusy(true);
    try {
      // The project is made here, with its first reference, so a board pasted instead leaves no empty one behind
      const project = projectId ? { id: projectId } : await onCreateProject(name.trim());
      if (!project) return;
      setProjectId(project.id);
      await onAddUrl(web, project.id);
      next();
    } finally { setBusy(false); }
  };

  // ─── Extension and AI client ─────────────────────────────────────────────────
  const { info } = useExtension();
  const extDone = !!info?.connected;
  const [connecting, setConnecting] = useState(false);
  const [apps, setApps] = useState(0);
  useEffect(() => { if (!connecting) void loadConnections().then((r) => { if (r.ok) setApps(r.data.length); }); }, [connecting]);
  const agentDone = apps > 0;

  const copy = w.steps[step];
  return (
    <div className={s.scroll}>
      <section className={s.wrap} aria-labelledby="welcome-title">
        <ol className={s.bar}>
          {steps.map((k, i) => (
            <li key={k} className={`${s.step}${i <= at ? ` ${s.on}` : ""}`} aria-current={i === at ? "step" : undefined}>
              <span className={s.num}>{String(i + 1).padStart(2, "0")}</span>
              <span>{w.steps[k].label}</span>
            </li>
          ))}
        </ol>

        <h1 id="welcome-title" className={s.title}>{copy.title}<span className={s.titleMuted}>{copy.why}</span></h1>
        <p className={s.lead}>{copy.lead}</p>

        {step === "name" && (
          <PromptInput className={s.prompt} id="welcome-name" inputRef={inputRef} value={name} placeholder={w.steps.name.placeholder}
            label={w.steps.name.label} sendLabel={t.welcome.next}
            onChange={setName} onSubmit={() => { if (name.trim()) next(); }} />
        )}

        {step === "first" && (
          <>
            <PromptInput className={s.prompt} id="welcome-url" inputRef={inputRef} value={raw} placeholder={w.steps.first.placeholder}
              label={w.steps.first.label} sendLabel={board ? (busy ? t.board.importing : t.board.import) : busy ? t.start.saving : t.start.save}
              disabled={busy} busy={busy}
              onChange={(v) => { setRaw(v); setError(""); }} onSubmit={() => void saveFirst()}
              inputProps={{ inputMode: "url", spellCheck: false, "aria-invalid": !!error, "aria-describedby": error ? "welcome-url-error" : "welcome-url-hint" }} />
            {error ? <p id="welcome-url-error" className={s.error} role="alert">{error}</p>
              : boardStep ? <BoardProgress step={boardStep} className={`board-progress ${s.board}`} />
              : <p id="welcome-url-hint" className={s.hint}>{board ? t.board.hint(PLATFORM_NAME[board.platform]) : w.steps.first.hint}</p>}
          </>
        )}

        {step === "extension" && (
          <div className={s.actions}>
            {extDone ? (
              <p className={s.done}><Icon name="check" size={16} />{w.steps.extension.done}</p>
            ) : (
              // A tab of its own: installing leaves the store, and this flow stays where it was
              <a className="cr-btn cr-btn-primary cr-btn-m" href={info ? "/extension/connect" : "/extension/install"} target="_blank" rel="noopener">
                {info ? w.steps.extension.connect : w.steps.extension.install}<Icon name="arrow-up-right" size={16} />
              </a>
            )}
            <Button variant={extDone ? "primary" : "secondary"} onClick={next}>{extDone ? w.next : w.notNow}</Button>
          </div>
        )}

        {step === "agent" && (
          <div className={s.actions}>
            {agentDone ? (
              <p className={s.done}><Icon name="check" size={16} />{w.steps.agent.done}</p>
            ) : (
              <Button variant="primary" icon="cable" onClick={() => setConnecting(true)}>{w.steps.agent.connect}</Button>
            )}
            <Button variant={agentDone ? "primary" : "secondary"} onClick={next}>{agentDone ? w.finish : w.notNow}</Button>
          </div>
        )}

        {(step === "extension" || step === "agent") && <p className={s.hint}>{w.optional}</p>}
      </section>
      {connecting && <ConnectDialog onClose={() => setConnecting(false)} />}
    </div>
  );
}
