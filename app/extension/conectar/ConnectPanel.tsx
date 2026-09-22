"use client";

import { useEffect, useState } from "react";
import type { Workspace } from "@/lib/workspace-core";
import { WorkspaceAvatar } from "@/components/WorkspaceMenu";

// Mensajes que cruzan entre esta página y extension/chrome/content.js (misma pestaña, mismo origen)
const FROM_PAGE = "criterio";
const FROM_EXT = "criterio-ext";

function browserName(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Arc\//.test(ua)) return "Arc";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Navegador";
}

export default function ConnectPanel({ workspaces, currentId }: { workspaces: Workspace[]; currentId: string }) {
  const [orgId, setOrgId] = useState(currentId);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ key: string; workspace: { name: string } } | null>(null);
  const [extPresent, setExtPresent] = useState(false);
  const [received, setReceived] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setName(browserName()); }, []);

  // La extensión avisa de que está escuchando y confirma cuando guarda la llave
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== FROM_EXT) return;
      if (e.data.type === "ext-hello") setExtPresent(true);
      if (e.data.type === "ext-key-received") setReceived(true);
    };
    window.addEventListener("message", onMessage);
    window.postMessage({ source: FROM_PAGE, type: "page-hello" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/ext/v1/keys", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId, name: name.trim() || "Navegador" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setResult(data);
      // Se la entregamos a la extensión; si no está, queda el botón de copiar
      window.postMessage({ source: FROM_PAGE, type: "ext-key", key: data.key, base: window.location.origin, workspace: data.workspace }, window.location.origin);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.key); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sin permiso */ }
  };

  if (result) {
    return (
      <div className="page__body">
        <section className="panel">
          <div className="panel__head"><span className="panel__title">Llave creada para {result.workspace.name}</span></div>
          {received ? (
            <p className="ext-ok">La extensión ya tiene la llave. Puedes cerrar esta pestaña y guardar webs desde cualquier sitio.</p>
          ) : (
            <>
              <p className="panel__hint">
                {extPresent ? "Entregando la llave a la extensión…" : "No se ha detectado la extensión en esta pestaña. Copia la llave y pégala en la extensión, en “Ya tengo una llave”."}
              </p>
              <div className="ext-key">
                <code>{result.key}</code>
                <button className="btn btn--sm" type="button" onClick={copy}>{copied ? "Copiada" : "Copiar"}</button>
              </div>
              <p className="panel__hint">Es la única vez que se enseña. Si la pierdes, revócala en Equipo y crea otra.</p>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <form className="page__body" onSubmit={create}>
      {error && <p className="modal__error">{error}</p>}
      <section className="panel">
        <div className="panel__head"><span className="panel__title">¿Dónde guarda este navegador?</span></div>
        <ul className="list">
          {workspaces.map((w) => (
            <li key={w.id} className="list__row ext-choice">
              <label className="ext-choice__label">
                <input type="radio" name="workspace" value={w.id} checked={orgId === w.id} onChange={() => setOrgId(w.id)} />
                <WorkspaceAvatar workspace={w} small />
                <span className="list__main">
                  <span className="list__name">{w.name}</span>
                  <span className="list__sub">{w.kind === "personal" ? "Tu espacio personal" : "Equipo"}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="panel__hint">Cada llave guarda en un solo workspace. Para otro, conecta la extensión otra vez.</p>
      </section>
      <section className="panel">
        <div className="panel__head"><span className="panel__title">Nombre para reconocerla</span></div>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chrome del portátil" maxLength={60} />
        <p className="panel__hint">Aparecerá en la lista de llaves de Equipo, con la fecha del último uso.</p>
      </section>
      <div>
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? "Creando…" : "Crear llave y conectar"}</button>
      </div>
    </form>
  );
}
