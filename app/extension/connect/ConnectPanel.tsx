"use client";

import { createKey } from "@/app/actions/ext-keys";
import { useEffect, useState } from "react";
import { useT } from "@/components/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

// Messages between this page and extension/chrome/content.js (same tab, same origin)
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

export default function ConnectPanel({ currentId }: { currentId: string }) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ key: string } | null>(null);
  const [extPresent, setExtPresent] = useState(false);
  const [received, setReceived] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setName(browserName(t.ext.browser)); }, [t.ext.browser]);

  // The extension announces it is listening and confirms when it saves the key
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
      const r = await createKey(currentId, name.trim() || t.ext.browser);
      if (!r.ok) throw new Error(r.error);
      const data = r.data;
      setResult(data);
      // Hand it to the extension; if it is not there, the copy button remains
      window.postMessage({ source: FROM_PAGE, type: "ext-key", key: data.key, base: window.location.origin, workspace: data.workspace }, window.location.origin);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.key); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* no permission */ }
  };

  if (result) {
    return (
      <div className="page__body">
        <Card>
          <CardHeader>
            <CardTitle>{t.ext.keyCreated}</CardTitle>
            {!received && <CardDescription>{extPresent ? t.ext.handingOver : t.ext.notDetected}</CardDescription>}
          </CardHeader>
          <CardContent>
            {received ? (
              <p className="ext-ok">{t.ext.keyReceived}</p>
            ) : (
              <div className="ext-key">
                <code>{result.key}</code>
                <Button variant="default" size="sm" onClick={copy}>{copied ? t.ext.copiedKey : t.common.copy}</Button>
              </div>
            )}
          </CardContent>
          {!received && <CardFooter><p className="card-note">{t.ext.onlyOnce}</p></CardFooter>}
        </Card>
      </div>
    );
  }

  return (
    <form className="page__body" onSubmit={create}>
      {error && <p className="modal__error">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle><Label htmlFor="ext-key-name" className="text-base leading-snug">{t.ext.nameIt}</Label></CardTitle>
          <CardDescription>{t.ext.allWorkspaces} {t.ext.nameHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <Input id="ext-key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.ext.namePlaceholder} maxLength={60} />
        </CardContent>
        <CardFooter>
          <Button variant="primary" type="submit" disabled={busy}>{busy ? t.ext.creating : t.ext.createKey}</Button>
        </CardFooter>
      </Card>
    </form>
  );
}
