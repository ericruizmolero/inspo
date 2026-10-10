"use client";

import { createKey } from "@/app/actions/ext-keys";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { browserName, canInstall, isOlder, useExtension } from "@/hooks/use-extension";
import { Button, Card, StatusRing } from "@/components/criterio";

// Web pages cannot link to chrome:// addresses, so it is shown to be copied. Arc, Edge and
// Brave take the same address and send it to their own.
const EXTENSIONS_URL = "chrome://extensions";
const ZIP = "/extension/download";
// The key normally reaches the extension at once; past this, the key is shown to be pasted by hand
const HANDOVER_MS = 4000;

type StepState = "done" | "now" | "next";

function Step({ n, state, title, doneLabel, children }: { n: number; state: StepState; title: string; doneLabel: string; children?: ReactNode }) {
  return (
    <li className={`steps__item is-${state}`} aria-current={state === "now" ? "step" : undefined}>
      <span className="steps__mark" aria-hidden>{state === "done" ? <StatusRing tone="synced" label={doneLabel} /> : n}</span>
      <div className="steps__main">
        <h2 className="steps__title">{title}{state === "done" && <span className="sr-only"> ({doneLabel})</span>}</h2>
        {children}
      </div>
    </li>
  );
}

export default function InstallGuide({ currentId, latest }: { currentId: string; latest: string }) {
  const { t } = useT();
  const g = t.ext.install;
  const { info, received, handKey } = useExtension();
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState<"address" | "key" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key, setKey] = useState("");
  const [slow, setSlow] = useState(false);
  // Read after mounting: the server does not know which browser this is
  const [supported, setSupported] = useState(true);
  useEffect(() => { setSupported(canInstall()); }, []);

  const installed = !!info;
  const connected = received || !!info?.connected;
  const outdated = !!info?.version && isOlder(info.version, latest);
  const now = !installed ? (downloaded ? 2 : 1) : connected ? 4 : 3;
  const stateOf = (n: number, done: boolean): StepState => (done ? "done" : n === now ? "now" : "next");

  useEffect(() => {
    if (!key || received) return;
    const id = setTimeout(() => setSlow(true), HANDOVER_MS);
    return () => clearTimeout(id);
  }, [key, received]);

  const copy = async (what: "address" | "key", text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 2000); } catch { /* no permission */ }
  };

  const connect = async () => {
    setBusy(true); setError(""); setSlow(false);
    try {
      const r = await createKey(currentId, browserName(t.ext.browser));
      if (!r.ok) throw new Error(r.error);
      setKey(r.data.key);
      handKey(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="page__body">
      {!supported && <Card tone="butter" className="steps__notice">{g.wrongBrowser}</Card>}
      {outdated && info?.version && (
        <Card tone="butter" className="steps__notice" title={g.update.title(latest)}>
          <p>{g.update.body(info.version)}</p>
          {/* One ember per view: while the connect step still waits, its button is the primary one */}
          <a className="cr-btn cr-btn-primary cr-btn-s" href={ZIP} download>{g.download.action}</a>
        </Card>
      )}

      <ol className="steps">
        <Step n={1} state={stateOf(1, installed || downloaded)} title={g.download.title} doneLabel={g.done}>
          {!installed && (
            <>
              <p className="steps__text">{g.download.body}</p>
              <div className="steps__actions">
                <a className={`cr-btn cr-btn-${downloaded ? "secondary" : "primary"} cr-btn-m`} href={ZIP} download onClick={() => setDownloaded(true)}>
                  {downloaded ? g.download.again : g.download.action}
                </a>
                <span className="steps__meta">{g.version(latest)}</span>
              </div>
            </>
          )}
        </Step>

        <Step n={2} state={stateOf(2, installed)} title={g.load.title} doneLabel={g.done}>
          {!installed && (
            <>
              <ol className="steps__list">
                <li>{g.load.unzip}</li>
                <li>
                  {g.load.open}
                  <span className="steps__address">
                    <span>{EXTENSIONS_URL}</span>
                    <Button size="s" onClick={() => copy("address", EXTENSIONS_URL)} aria-label={g.load.copyAddress}>{copied === "address" ? t.common.copied : t.common.copy}</Button>
                  </span>
                </li>
                <li>{g.load.devMode}</li>
                <li>{g.load.unpacked}</li>
              </ol>
              <p className="steps__text">
                {g.load.after} <Button variant="quiet" size="s" className="steps__link" onClick={() => window.location.reload()}>{g.load.reload}</Button>
              </p>
            </>
          )}
        </Step>

        <Step n={3} state={stateOf(3, connected)} title={g.connect.title} doneLabel={g.done}>
          {connected ? (
            <p className="steps__text">{g.connect.connected}</p>
          ) : (
            <>
              <p className="steps__text">{g.connect.body}</p>
              {error && <p className="modal__error">{error}</p>}
              {key && slow ? (
                <>
                  <p className="steps__text">{t.ext.notDetected}</p>
                  <div className="ext-key">
                    <code>{key}</code>
                    <Button size="s" onClick={() => copy("key", key)}>{copied === "key" ? t.ext.copiedKey : t.common.copy}</Button>
                  </div>
                  <p className="card-note">{t.ext.onlyOnce}</p>
                </>
              ) : (
                <div className="steps__actions">
                  <Button variant={installed ? "primary" : "secondary"} onClick={connect} disabled={!installed || busy || !!key}>
                    {busy || key ? g.connect.connecting : t.team.connectBrowser}
                  </Button>
                  {!installed && <span className="steps__meta">{g.connect.waiting}</span>}
                </div>
              )}
            </>
          )}
        </Step>

        <Step n={4} state={stateOf(4, false)} title={g.save.title} doneLabel={g.done}>
          <p className="steps__text">{g.save.body}</p>
          {connected && (
            <div className="steps__actions">
              <Link className="cr-btn cr-btn-secondary cr-btn-m" href="/">{g.save.action}</Link>
            </div>
          )}
        </Step>
      </ol>
    </div>
  );
}
