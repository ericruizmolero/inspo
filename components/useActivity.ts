"use client";

// Presencia: manda un latido a /api/actividad cada 20 s mientras la pestaña está
// visible, y uno más al cambiar de zona, al ocultar la pestaña o al cerrarla.
// Cada zona (area) abre un segmento nuevo, así el panel de /admin sabe dónde se
// pasa el tiempo. El servidor solo suma huecos cortos entre latidos (lib/activity.ts),
// así que el tiempo con la pestaña en segundo plano no cuenta.
import { useEffect, useRef } from "react";

const INTERVAL_MS = 20 * 1000;
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

// Una visita por carga de la app (pestaña), compartida entre páginas gracias a sessionStorage
function visitId(): string {
  try {
    const k = "inspo:visit";
    let v = sessionStorage.getItem(k);
    if (!v) { v = newId(); sessionStorage.setItem(k, v); }
    return v;
  } catch { return newId(); }
}

export function useActivity(area: string, organizationId?: string | null) {
  const orgRef = useRef(organizationId);
  orgRef.current = organizationId;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const segmentId = newId();
    const visit = visitId();
    const path = window.location.pathname;
    const payload = () => JSON.stringify({ segmentId, visitId: visit, area, path, organizationId: orgRef.current ?? null });

    const ping = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/actividad", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload(), keepalive: true }).catch(() => {});
    };
    // Al cerrar u ocultar la pestaña, sendBeacon llega aunque la página muera
    const flush = () => {
      try { navigator.sendBeacon("/api/actividad", new Blob([payload()], { type: "application/json" })); }
      catch { fetch("/api/actividad", { method: "POST", body: payload(), keepalive: true }).catch(() => {}); }
    };
    const onVisibility = () => { if (document.visibilityState === "visible") ping(); else flush(); };

    ping();
    const t = setInterval(ping, INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush(); // cierra el segmento al cambiar de zona
    };
  }, [area]);
}
