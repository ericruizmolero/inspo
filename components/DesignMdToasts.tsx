"use client";

import { useEffect, useState } from "react";
import type { DesignSpec } from "@/types/design";
import type { RevisionMeta } from "@/lib/design-revise";
import { useT } from "./I18nProvider";

export interface DesignMdEntry {
  url: string; markdown: string; generatedAt: string; model: string; cached: boolean;
  spec?: DesignSpec; screenshotUrl?: string;
  /** Historial de revisiones del workspace, la más reciente primero */
  revisions?: RevisionMeta[];
}

export interface DesignMdState {
  status: "loading" | "ready" | "error";
  empresa: string;
  startedAt: number;
  entry?: DesignMdEntry;
  error?: string;
  seen: boolean; // el usuario ya ha visto el resultado (o lo ha descartado)
  /** Se espera respuesta inmediata (caché): el toast no aparece salvo que tarde */
  quiet?: boolean;
  /** Abrir la ficha sola al terminar (primera inspo, regenerar, volver del login) */
  openWhenReady?: boolean;
}

// ─── Pasos estimados (no hay progreso real del servidor) ─────────────────────
// Los textos están en el diccionario (t.toast.steps); aquí solo hace falta cuántos son.
const STEP_COUNT = 5;
// Duración típica ~75 s; la barra nunca llega al 100 % hasta que termina
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
  openUrl: string | null; // URL cuyo modal está abierto ahora mismo
  onOpen: (url: string) => void;
  onDismiss: (url: string) => void;
  onCancel: (url: string) => void;
  onRetry: (url: string) => void;
}

// Un toast por generación, abajo a la derecha. Es toda la UI del proceso: mientras
// se genera enseña la web, el paso, el tiempo y un botón para pararlo; al acabar,
// se toca para abrir la ficha.
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
              <Thumb url={url} empresa={j.empresa} />
              <div className="toast__text">
                <span className="toast__title">DESIGN.md · {j.empresa}</span>
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
              <button
                className="btn btn--ghost btn--sm toast__stop"
                title={t.toast.stopTitle}
                onClick={(e) => { e.stopPropagation(); onCancel(url); }}
              >{IcStop} {t.toast.stop}</button>
              <span className="toast__bar"><span style={{ width: `${pct}%` }} /></span>
            </div>
          );
        }
        return (
          <div key={url} className={`toast toast--${j.status}`} onClick={() => j.status === "ready" && onOpen(url)} role={j.status === "ready" ? "button" : "alert"}>
            <span className="toast__dot" />
            <div className="toast__text">
              <span className="toast__title">DESIGN.md · {j.empresa}</span>
              <span className="toast__sub">
                {j.status === "ready" ? t.toast.ready : (j.error || t.toast.failed)}
              </span>
            </div>
            {j.status === "error" && (
              <button className="btn btn--ghost btn--sm" onClick={(e) => { e.stopPropagation(); onRetry(url); }}>{t.common.retry}</button>
            )}
            <button
              className="btn-icon toast__close"
              aria-label={t.toast.dismiss}
              onClick={(e) => { e.stopPropagation(); onDismiss(url); }}
            >×</button>
          </div>
        );
      })}
    </div>
  );
}

// Miniatura de la web (og:image) con un haz que la "lee"; si no hay imagen, la inicial.
function Thumb({ url, empresa }: { url: string; empresa: string }) {
  const [state, setState] = useState<"loading" | "ok" | "none">("loading");
  return (
    <div className={`toast__thumb${state === "ok" ? " is-loaded" : ""}`}>
      {state === "none" && <span className="toast__thumb-blank">{empresa.slice(0, 1).toUpperCase()}</span>}
      <img src={`/api/og?url=${encodeURIComponent(url)}`} alt="" onLoad={() => setState("ok")} onError={() => setState("none")} />
      <span className="toast__beam" aria-hidden />
    </div>
  );
}
