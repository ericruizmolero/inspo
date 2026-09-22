"use client";

import { createKey } from "@/app/actions/ext-keys";
import { useEffect, useState } from "react";
import type { Workspace } from "@/lib/workspace-core";
import { WorkspaceAvatar } from "@/components/WorkspaceMenu";
import { useT } from "@/components/I18nProvider";

// Mensajes que cruzan entre esta página y extension/chrome/content.js (misma pestaña, mismo origen)
const FROM_PAGE = "criterio";
const FROM_EXT = "criterio-ext";

function browserName(fallback: string): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Arc\//.test(ua)) return "Arc";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return fallback;
}

export default function ConnectPanel({ workspaces, currentId }: { workspaces: Workspace[]; currentId: string }) {
  const { t } = useT();
  const [orgId, setOrgId] = useState(currentId);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ key: string; workspace: { name: string } } | null>(null);
  const [extPresent, setExtPresent] = useState(false);
  const [received, setReceived] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setName(browserName(t.ext.browser)); }, [t.ext.browser]);

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
      const r = await createKey(orgId, name.trim() || t.ext.browser);
      if (!r.ok) throw new Error(r.error);
      const data = r.data;
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
          <div className="panel__head"><span className="panel__title">{t.ext.keyCreated(result.workspace.name)}</span></div>
          {received ? (
            <p className="ext-ok">{t.ext.keyReceived}</p>
          ) : (
            <>
              <p className="panel__hint">
                {extPresent ? t.ext.handingOver : t.ext.notDetected}
              </p>
              <div className="ext-key">
                <code>{result.key}</code>
                <button className="btn btn--sm" type="button" onClick={copy}>{copied ? t.ext.copiedKey : t.common.copy}</button>
              </div>
              <p className="panel__hint">{t.ext.onlyOnce}</p>
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
        <div className="panel__head"><span className="panel__title">{t.ext.whereSave}</span></div>
        <ul className="list">
          {workspaces.map((w) => (
            <li key={w.id} className="list__row ext-choice">
              <label className="ext-choice__label">
                <input type="radio" name="workspace" value={w.id} checked={orgId === w.id} onChange={() => setOrgId(w.id)} />
                <WorkspaceAvatar workspace={w} small />
                <span className="list__main">
                  <span className="list__name">{w.name}</span>
                  <span className="list__sub">{w.kind === "personal" ? t.ext.personalSpace : t.ext.team}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="panel__hint">{t.ext.oneWorkspace}</p>
      </section>
      <section className="panel">
        <div className="panel__head"><span className="panel__title">{t.ext.nameIt}</span></div>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.ext.namePlaceholder} maxLength={60} />
        <p className="panel__hint">{t.ext.nameHint}</p>
      </section>
      <div>
        <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? t.ext.creating : t.ext.createKey}</button>
      </div>
    </form>
  );
}
