"use client";
// Connecting an AI client to criterio: the connector's address, how to paste it into Claude, ChatGPT, Claude Code
// or Cursor, and the apps this person already let in (lib/mcp). The client signs in through the consent page
// (/mcp/authorize); nothing is typed here but the address. Opened from the account menu (with `workspaceId`) it is
// Conectores whole: two tabs, the MCP connector and the Chrome extension's install guide (Eric, 06-11).
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";
import { Dialog, DialogDescription, DialogWindow } from "@/components/ui/dialog";
import { disconnectApp, loadConnections } from "@/app/actions/mcp";
import { timeAgo } from "@/lib/i18n/format";
import type { McpConnection } from "@/lib/mcp/oauth";
import { Busy, Button, Card, SegmentedControl } from "@/components/criterio";
import InstallGuide from "@/app/extension/install/InstallGuide";
import manifest from "@/extension/chrome/manifest.json";
import "./ConnectDialog.css";

type Client = "claude" | "chatgpt" | "code" | "cursor";
const CLIENTS: Client[] = ["claude", "chatgpt", "code", "cursor"];
const CLIENT_KEY = "criterio.mcp.client";

type Way = "mcp" | "extension";
const WAYS: Way[] = ["mcp", "extension"];

/** `workspaceId`: the extension's guide comes too, as a second tab (it makes the key for that workspace) */
export default function ConnectDialog({ onClose, workspaceId, start = "mcp" }: { onClose: () => void; workspaceId?: string; start?: Way }) {
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
  const snippet = client === "code" ? `/plugin marketplace add ericruizmolero/inspo\n/plugin install criterio@criterio\n/criterio:setup` : client === "cursor" ? JSON.stringify({ mcpServers: { criterio: { url } } }, null, 2) : null;
  const steps = s.steps[client];
  const [way, setWay] = useState<Way>(start);
  const both = !!workspaceId;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogWindow className="mcpc" bar={s.open} heading={both ? s.connectors : s.title} closeLabel={t.common.close}>
        <div className="mcpc__body">
          {both && (
            <SegmentedControl tone="paper" className="mcpc__ways" label={s.connectors} active={WAYS.indexOf(way)} onChange={(i) => setWay(WAYS[i])}
              items={[{ label: s.open }, { label: s.extension }]} />
          )}
          {both && way === "extension" ? <InstallGuide currentId={workspaceId!} latest={manifest.version} /> : <>
          <DialogDescription className="bimp__lead">{s.lead}</DialogDescription>
          <section className="mcpc__uses">
            <h3 className="t-label">{s.uses.title}</h3>
            <ul>{s.uses.items.map((u) => <li key={u}>{u}</li>)}</ul>
            <p>{s.uses.rule}</p>
          </section>
          <Card className="mcpc__addr" eyebrow={s.address}>
            <div className="mcpc__row">
              <code>{url}</code>
              <Button size="s" icon={copied === "url" ? "check" : undefined} onClick={() => void copy("url", url)}>{copied === "url" ? s.copied : s.copy}</Button>
            </div>
          </Card>
          <SegmentedControl tone="paper" className="mcpc__tabs" label={s.title} active={CLIENTS.indexOf(client)} onChange={(i) => pick(CLIENTS[i])}
            items={CLIENTS.map((c) => ({ label: s.clients[c] }))} />
          <ol className="mcpc__steps">
            <li>{steps[0]}{snippet && (
              <Card className="mcpc__snippet">
                <div className="mcpc__row">
                  <code>{snippet}</code>
                  <Button size="s" icon={copied === "snippet" ? "check" : undefined} onClick={() => void copy("snippet", snippet)}>{copied === "snippet" ? s.copied : s.copy}</Button>
                </div>
              </Card>
            )}</li>
            <li>{steps[1]}</li>
          </ol>
          <p className="bimp__hint">{s.then}</p>
          <section className="mcpc__apps">
            <h3 className="t-label">{s.connected}</h3>
            {links === null ? <p className="bimp__hint"><Busy label={s.connected} /></p> : links.length === 0 ? <p className="bimp__hint">{s.none}</p> : (
              <ul>
                {links.map((l) => (
                  <li key={l.id}>
                    <div>
                      <b>{l.app || s.anApp}</b>
                      <small>{s.since(timeAgo(l.createdAt, locale, t))}, {l.lastUsedAt ? s.lastUsed(timeAgo(l.lastUsedAt, locale, t)) : s.neverUsed}</small>
                    </div>
                    <Button variant="quiet" size="s" className="mcpc__drop" onClick={() => void drop(l)}>{s.disconnect}</Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {error && <p className="sysv-error" role="alert">{error}</p>}
          </>}
        </div>
      </DialogWindow>
    </Dialog>
  );
}
