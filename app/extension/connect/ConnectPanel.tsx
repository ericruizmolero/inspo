"use client";

import { createKey } from "@/app/actions/ext-keys";
import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button, TextField } from "@/components/criterio";
import AuthWindow from "@/components/AuthWindow";
import { browserName, useExtension } from "@/hooks/use-extension";

export default function ConnectPanel({ currentId, youAre }: { currentId: string; youAre: string }) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ key: string } | null>(null);
  const { info, received, handKey } = useExtension();
  const [copied, setCopied] = useState(false);

  useEffect(() => { setName(browserName(t.ext.browser)); }, [t.ext.browser]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await createKey(currentId, name.trim() || t.ext.browser);
      if (!r.ok) throw new Error(r.error);
      const data = r.data;
      setResult(data);
      // Hand it to the extension; if it is not there, the copy button remains
      handKey(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.key); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* no permission */ }
  };

  const status = t.invite.signedInAs(youAre);

  if (result) {
    return (
      <AuthWindow title={t.ext.connect} heading={t.ext.keyCreated} status={status} live>
        {received ? (
          <p className="ext-ok">{t.ext.keyReceived}</p>
        ) : (
          <>
            <p className="auth__hint">{info ? t.ext.handingOver : t.ext.notDetected}</p>
            <div className="ext-key">
              <code>{result.key}</code>
              <Button size="s" onClick={copy}>{copied ? t.ext.copiedKey : t.common.copy}</Button>
            </div>
            <p className="auth__hint">{t.ext.onlyOnce}</p>
          </>
        )}
      </AuthWindow>
    );
  }

  return (
    <AuthWindow as="form" onSubmit={create} title={t.ext.connect} heading={t.ext.nameIt} status={status}
      footer={<Button variant="primary" type="submit" disabled={busy}>{busy ? t.ext.creating : t.ext.createKey}</Button>}>
      <p className="auth__hint">{t.ext.allWorkspaces} {t.ext.nameHint}</p>
      <TextField label={t.settings.name} value={name} onChange={(e) => setName(e.target.value)} placeholder={t.ext.namePlaceholder} maxLength={60} />
      {error && <p className="modal__error">{error}</p>}
    </AuthWindow>
  );
}
