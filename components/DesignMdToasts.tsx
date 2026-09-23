"use client";

import { useEffect, useState } from "react";
import type { DesignSpec } from "@/types/design";
import type { RevisionMeta } from "@/lib/design-revise";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";

export interface DesignMdEntry {
  url: string; markdown: string; generatedAt: string; model: string; cached: boolean;
  spec?: DesignSpec; screenshotUrl?: string;
  /** Workspace revision history, newest first */
  revisions?: RevisionMeta[];
}

export interface DesignMdState {
  status: "loading" | "ready" | "error";
  name: string;
  startedAt: number;
  entry?: DesignMdEntry;
  error?: string;
  seen: boolean; // the user has seen the result (or dismissed it)
  /** An instant (cached) answer is expected: the toast only shows if it takes a while */
  quiet?: boolean;
  /** Open the sheet on its own when done (first inspo, regenerate, back from login) */
  openWhenReady?: boolean;
}

// ─── Estimated steps (the server reports no real progress) ─────────────────────
// The copy lives in the dictionary (t.toast.steps); here we only need how many there are.
const STEP_COUNT = 5;
// Typical run ~75 s; the bar never reaches 100 % until it finishes
const TYPICAL_MS = 75000;
const QUIET_MS = 2500;

function stepIndex(startedAt: number): number {
  return Math.min(Math.floor((Date.now() - startedAt) / 9000), STEP_COUNT - 1);
}
function progressFor(startedAt: number): number {
  return Math.min(0.94, (Date.now() - startedAt) / TYPICAL_MS);
}
function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

const IcStop = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden><rect x="1.5" y="1.5" width="7" height="7" rx="1.5" /></svg>
);

interface DesignMdToastsProps {
  jobs: Record<string, DesignMdState>;
  openUrl: string | null; // URL whose modal is open right now
  onOpen: (url: string) => void;
  onDismiss: (url: string) => void;
  onCancel: (url: string) => void;
  onRetry: (url: string) => void;
}

// One toast per generation, bottom right. It is the whole UI of the process: while
// generating it shows the site, the step, the time and a button to stop it; when done,
// tapping it opens the sheet.
export default function DesignMdToasts({ jobs, openUrl, onOpen, onDismiss, onCancel, onRetry }: DesignMdToastsProps) {
  const { t } = useT();
  const STEPS = t.toast.steps;
  const [, tick] = useState(0);
  const now = Date.now();

  const visible = Object.entries(jobs).filter(([url, j]) => {
    if (url === openUrl) return false;
    if (j.status === "loading") return !(j.quiet && now - j.startedAt < QUIET_MS);
    return !j.seen;
  });
  const anyLoading = Object.values(jobs).some((j) => j.status === "loading");

  useEffect(() => {
    if (!anyLoading) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [anyLoading]);

  if (!visible.length) return null;

  return (
    <div className="toasts">
      {visible.map(([url, j]) => {
        if (j.status === "loading") {
          const step = stepIndex(j.startedAt);
          const elapsed = Math.floor((now - j.startedAt) / 1000);
          const pct = Math.round(progressFor(j.startedAt) * 100);
          return (
            <div key={url} className="toast toast--loading toast--rich" role="status" aria-live="polite">
              <Thumb url={url} name={j.name} />
              <div className="toast__text">
                <span className="toast__title">DESIGN.md · {j.name}</span>
                <span className="toast__sub">{hostOf(url)}</span>
                <span className="toast__sub toast__sub--step">
                  <span className="spinner" />
                  <span className="toast__step">{step + 1}/{STEP_COUNT}</span>
                  <span className="toast__steplabel">{STEPS[step]}…</span>
                  <span className="toast__time">{elapsed}s</span>
                </span>
                <span className="toast__dots" aria-hidden>
                  {STEPS.map((s, i) => <i key={s} className={i < step ? "is-done" : i === step ? "is-current" : ""} />)}
                </span>
              </div>
              <Button variant="ghost" size="sm"
                className="toast__stop"
                title={t.toast.stopTitle}
                onClick={(e) => { e.stopPropagation(); onCancel(url); }}>{IcStop} {t.toast.stop}</Button>
              <span className="toast__bar"><span style={{ width: `${pct}%` }} /></span>
            </div>
          );
        }
        return (
          <div key={url} className={`toast toast--${j.status}`} onClick={() => j.status === "ready" && onOpen(url)} role={j.status === "ready" ? "button" : "alert"}>
            <span className="toast__dot" />
            <div className="toast__text">
              <span className="toast__title">DESIGN.md · {j.name}</span>
              <span className="toast__sub">
                {j.status === "ready" ? t.toast.ready : (j.error || t.toast.failed)}
              </span>
            </div>
            {j.status === "error" && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRetry(url); }}>{t.common.retry}</Button>
            )}
            <Button variant="icon"
              className="toast__close"
              aria-label={t.toast.dismiss}
              onClick={(e) => { e.stopPropagation(); onDismiss(url); }}>×</Button>
          </div>
        );
      })}
    </div>
  );
}

// Site thumbnail (og:image) with a beam that "reads" it; with no image, the initial.
function Thumb({ url, name }: { url: string; name: string }) {
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");
  return (
    <div className={`toast__thumb${state === "ok" ? " is-loaded" : ""}`}>
      {state === "none" && <span className="toast__thumb-blank">{name.slice(0, 1).toUpperCase()}</span>}
      <img src={`/api/og?url=${encodeURIComponent(url)}`} alt="" onLoad={() => setState("ok")} onError={() => setState("none")} />
      <span className="toast__beam" aria-hidden />
    </div>
  );
}
