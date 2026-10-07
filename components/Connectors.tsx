"use client";
// The ways into criterio from outside, in one place on the top bar: the browser extension and the MCP connector
// for AI clients. A menu with the two, each ticked once it is connected; when both are, the button goes, as a
// nudge does once it has been followed (Eric, 06-10).
import { useEffect, useState } from "react";
import Link from "next/link";
import { Cable } from "lucide-react";
import { Icon, MenuItem } from "@/components/criterio";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "./I18nProvider";
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
  const extDone = !installable || !!info?.connected;
  const mcpDone = (apps ?? 0) > 0;
  if (extDone && mcpDone) return connecting ? <ConnectDialog onClose={() => setConnecting(false)} /> : null;
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        {/* A segment of the view switcher's pill (the system's ViewSwitcher), its menu on chrome-panel */}
        <PopoverTrigger className="cr-seg-item topbar__ext" data-tip={open ? undefined : s.openHint}>
          <Icon name="plug" size={16} /> <span className="topbar__mode-label">{s.connectors}</span>
        </PopoverTrigger>
        {/* The system's Menu: a paper window; a way in that is already connected carries the check */}
        <PopoverContent align="end" className="cr-menu connectors__menu">
          {installable && (
            <Link href={info && !info.connected ? "/extension/connect" : "/extension/install"} role="menuitem" className={`cr-menu-item${info?.connected ? " is-checked" : ""}`} onClick={() => setOpen(false)}>
              {sectionIcon("extension")}
              <span className="cr-menu-label">{s.extension}{info?.connected && <span className="cr-visually-hidden">, {s.connectedOne}</span>}</span>
              {info?.connected && <Icon name="check" size={16} className="cr-menu-check" />}
            </Link>
          )}
          <MenuItem icon={<Cable className="cr-icon" size={16} strokeWidth={2} aria-hidden />} checked={mcpDone} onClick={() => { setOpen(false); setConnecting(true); }}>
            {s.open}{mcpDone && <span className="cr-visually-hidden">, {s.connectedOne}</span>}
          </MenuItem>
        </PopoverContent>
      </Popover>
      {connecting && <ConnectDialog onClose={() => setConnecting(false)} />}
    </>
  );
}
