"use client";
// The ways into criterio from outside, in one place on the top bar: the browser extension and the MCP connector
// for AI clients. A menu with the two, each ticked once it is connected. The button stays when both are: it is the
// only place to see the apps let in and cut one off, and an AI client that drops the connector does not tell us,
// so "connected" here can outlive the connection (Eric, 06-10).
import { useEffect, useState } from "react";
import Link from "next/link";
import { Cable, Plug } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { sectionIcon } from "./section-icons";
import ConnectDialog from "./ConnectDialog";
import { canInstall, useExtension } from "@/hooks/use-extension";
import { loadConnections } from "@/app/actions/mcp";

export default function Connectors() {
  const { t } = useT();
  const s = t.mcp;
  const { info } = useExtension();
  const [installable, setInstallable] = useState(false);
  useEffect(() => { setInstallable(canInstall()); }, []);
  // How many AI clients are let in: null until known
  const [apps, setApps] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  useEffect(() => { if (!connecting) void loadConnections().then((r) => { if (r.ok) setApps(r.data.length); }); }, [connecting]);
  const mcpDone = (apps ?? 0) > 0;
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="btn btn--ghost topbar__polish topbar__ext" title={s.openHint}>
          <Plug size={16} strokeWidth={1.5} aria-hidden /> {s.connectors}
        </PopoverTrigger>
        <PopoverContent align="end" className="pp pp--menu connectors__menu">
          {installable && (
            <Link href={info && !info.connected ? "/extension/connect" : "/extension/install"} className="ws__item" onClick={() => setOpen(false)}>
              <span className="pp__icon" aria-hidden>{sectionIcon("extension")}</span>
              <span className="ws__item-name">{s.extension}</span>
              {info?.connected && <span className="ws__item-check" aria-label={s.connectedOne}>{Icons.check}</span>}
            </Link>
          )}
          <button type="button" className="ws__item" onClick={() => { setOpen(false); setConnecting(true); }}>
            <span className="pp__icon" aria-hidden><Cable size={16} strokeWidth={1.5} /></span>
            <span className="ws__item-name">{s.open}</span>
            {mcpDone && <span className="ws__item-check" aria-label={s.connectedOne}>{Icons.check}</span>}
          </button>
        </PopoverContent>
      </Popover>
      {connecting && <ConnectDialog onClose={() => setConnecting(false)} />}
    </>
  );
}
