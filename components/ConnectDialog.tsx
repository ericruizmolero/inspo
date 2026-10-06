"use client";
// Connecting an AI client to criterio: the connector's address, how to paste it into Claude, ChatGPT, Claude Code
// or Cursor, and the apps this person already let in (lib/mcp). The client signs in through the consent page
// (/mcp/authorize); nothing is typed here but the address.
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "./Sidebar";
import { disconnectApp, loadConnections } from "@/app/actions/mcp";
import { timeAgo } from "@/lib/i18n/format";
import type { McpConnection } from "@/lib/mcp/oauth";
import "./ConnectDialog.css";
import { Liquid } from "@/components/ui/liquid";

type Client = "claude" | "chatgpt" | "code" | "cursor";
const CLIENTS: Client[] = ["claude", "chatgpt", "code", "cursor"];
const CLIENT_KEY = "criterio.mcp.client";

export default function ConnectDialog({ onClose }: { onClose: () => void }) {
  const { t, locale } = useT();
  const s = t.mcp;
  const [client, setClient] = useState<Client>("claude");
  useEffect(() => { try { const c = localStorage.getItem(CLIENT_KEY); if (CLIENTS.includes(c as Client)) setClient(c as Client); } catch { /* the default stands */ } }, []);
  const pick = (c: Client) => { setClient(c); try { localStorage.setItem(CLIENT_KEY, c); } catch { /* only this visit */ } };
  const [links, setLinks] = useState<McpConnection[] | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { void loadConnections().then((r) => { if (r.ok) setLinks(r.data); else setError(r.error); }); }, []);
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/mcp`;
  const copy = async (what: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1500); } catch { /* it is on screen */ } };
  const drop = async (l: McpConnection) => { const r = await disconnectApp(l.id); if (r.ok) setLinks(r.data); else setError(r.error); };
  // What goes in the client's own box, where it is not the address alone
  const snippet = client === "code" ? `claude mcp add --transport http criterio ${url}` : client === "cursor" ? JSON.stringify({ mcpServers: { criterio: { url } } }, null, 2) : null;
  const steps = s.steps[client];

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="mcpc">
        <div className="modal__header">
          <DialogTitle>{s.title}</DialogTitle>
          <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
        </div>
        <div className="modal__body mcpc__body">
          <DialogDescription className="bimp__lead">{s.lead}</DialogDescription>
          <section className="mcpc__uses">
            <h3>{s.uses.title}</h3>
            <ul>{s.uses.items.map((u) => <li key={u}>{u}</li>)}</ul>
            <p>{s.uses.rule}</p>
          </section>
          <div className="mcpc__addr">
            <span>{s.address}</span>
            <code>{url}</code>
            <button type="button" onClick={() => void copy("url", url)}>{copied === "url" ? s.copied : s.copy}</button>
          </div>
          <Liquid className="mcpc__tabs" role="tablist">
            {CLIENTS.map((c) => <button key={c} type="button" role="tab" aria-selected={client === c} className={client === c ? "is-on" : ""} onClick={() => pick(c)}>{s.clients[c]}</button>)}
          </Liquid>
          <ol className="mcpc__steps">
            <li>{steps[0]}{snippet && (
              <span className="mcpc__snippet">
                <code>{snippet}</code>
                <button type="button" onClick={() => void copy("snippet", snippet)}>{copied === "snippet" ? s.copied : s.copy}</button>
              </span>
            )}</li>
            <li>{steps[1]}</li>
          </ol>
          <p className="bimp__hint">{s.then}</p>
          <section className="mcpc__apps">
            <h3>{s.connected}</h3>
            {links === null ? <p className="bimp__hint"><span className="spinner spinner--sm" /></p> : links.length === 0 ? <p className="bimp__hint">{s.none}</p> : (
              <ul>
                {links.map((l) => (
                  <li key={l.id}>
                    <div>
                      <b>{l.app || s.anApp}</b>
                      <small>{s.since(timeAgo(l.createdAt, locale, t))}, {l.lastUsedAt ? s.lastUsed(timeAgo(l.lastUsedAt, locale, t)) : s.neverUsed}</small>
                    </div>
                    <button type="button" onClick={() => void drop(l)}>{s.disconnect}</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {error && <p className="sysv-error" role="alert">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
