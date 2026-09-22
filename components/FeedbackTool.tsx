"use client";

// Barra de feedback visual (Agentation), en todas las páginas. La persona deja todas las
// notas que quiera sobre la página y, cuando termina, pulsa "Enviar al equipo": ahí (y solo
// ahí) sale un correo a los socios con el mismo markdown que copia la barra.
// Cada nota se guarda además en el servidor según se añade (/api/feedback), por si acaso.
// Sin sesión (login, planes, invitación) la barra funciona igual y las notas se quedan en
// localStorage, pero enviar pide entrar primero: /api/feedback exige sesión.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Agentation, loadAnnotations, type Annotation } from "agentation";
import { feedbackMarkdown, pathOf } from "@/lib/feedback-core";

const ENDPOINT = "/api/feedback";
type SendState = "idle" | "sending" | "sent" | "error";

export default function FeedbackTool({ canSend = true }: { canSend?: boolean }) {
  const pathname = usePathname();
  const [notes, setNotes] = useState<Map<string, Annotation>>(() => new Map());
  const [state, setState] = useState<SendState>("idle");
  const stateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Agentation guarda sus notas por ruta en localStorage: al cambiar de página se recuperan
  useEffect(() => {
    setNotes(new Map(loadAnnotations(pathname).map((a) => [a.id, a])));
    setState("idle");
  }, [pathname]);

  const post = useCallback((body: Record<string, unknown>) => {
    const payload = JSON.stringify({ url: window.location.href, viewport: `${window.innerWidth}×${window.innerHeight}`, ...body });
    return fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
  }, []);

  const track = useCallback((event: "annotation.add" | "annotation.update", a: Annotation) => {
    setNotes((m) => new Map(m).set(a.id, a));
    setState("idle");
    if (canSend) post({ event, annotation: a }).catch(() => {});
  }, [post, canSend]);

  const forget = useCallback((a: Annotation) => {
    setNotes((m) => { const n = new Map(m); n.delete(a.id); return n; });
    if (canSend) post({ event: "annotation.delete", annotation: a }).catch(() => {});
  }, [post, canSend]);

  const list = useMemo(() => [...notes.values()].sort((a, b) => a.timestamp - b.timestamp), [notes]);

  const send = useCallback(async () => {
    if (!list.length || state === "sending") return;
    if (!canSend) {
      // Las notas siguen en localStorage: al volver con sesión a esta misma ruta se pueden enviar
      const here = window.location.pathname + window.location.search;
      window.location.assign(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    setState("sending");
    if (stateTimer.current) clearTimeout(stateTimer.current);
    const path = pathOf(window.location.href);
    const output = feedbackMarkdown(list, path, `${window.innerWidth}×${window.innerHeight}`);
    try {
      const res = await post({ event: "submit", output, annotations: list });
      if (!res.ok) throw new Error(String(res.status));
      setState("sent");
      // Enviado: el botón se retira hasta que haya notas nuevas o editadas
      stateTimer.current = setTimeout(() => setNotes(new Map()), 2500);
    } catch {
      setState("error");
    }
  }, [list, state, post, canSend]);

  useEffect(() => () => { if (stateTimer.current) clearTimeout(stateTimer.current); }, []);

  const label = !canSend ? "Entra para enviarlo al equipo" : state === "sending" ? "Enviando…" : state === "sent" ? "Enviado al equipo" : state === "error" ? "No se pudo enviar · reintentar" : "Enviar al equipo";

  return (
    <>
      <Agentation
        copyToClipboard
        onAnnotationAdd={(a) => track("annotation.add", a)}
        onAnnotationUpdate={(a) => track("annotation.update", a)}
        onAnnotationDelete={forget}
        onAnnotationsClear={() => setNotes(new Map())}
      />
      {list.length > 0 && (
        <button
          type="button"
          className="fb-send"
          data-state={state}
          onClick={send}
          disabled={state === "sending" || state === "sent"}
          aria-live="polite"
        >
          {state === "sent" ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2.5 7.5l3 3 6-6" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2L6.5 7.5M12 2L8.5 12l-2-4.5L2 5.5z" /></svg>
          )}
          <span>{label}</span>
          {state === "idle" && <span className="fb-send__count">{list.length}</span>}
        </button>
      )}
    </>
  );
}
