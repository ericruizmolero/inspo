"use client";
// The ways into criterio from outside, in one place on the top bar: the browser extension and the MCP connector
// for AI clients. A menu with the two, each ticked once it is connected. The button stays when both are: it is the
// only place to see the apps let in and cut one off, and an AI client that drops the connector does not tell us,
// so "connected" here can outlive the connection (Eric, 06-10).
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { Icon, MenuItem } from "@/components/criterio";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useT } from "./I18nProvider";
import { sectionIcon } from "./section-icons";
import ConnectDialog from "./ConnectDialog";
import { canInstall, useExtension } from "@/hooks/use-extension";
import { loadConnections } from "@/app/actions/mcp";

/** `row`: a row of the phone sheet (components/Sidebar.tsx) instead of the top bar button; the menu is the same */
export default function Connectors({ row = false }: { row?: boolean }) {
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
  const Wrap = row ? SidebarMenuItem : Fragment;
  return (
    <Wrap>
      <Popover open={open} onOpenChange={setOpen}>
        {row ? (
          <PopoverTrigger render={<SidebarMenuButton className="nav-item" title={s.openHint} />}>
            <span className="nav-item__icon"><Icon name="plug" size={16} /></span>
            <span>{s.connectors}</span>
          </PopoverTrigger>
        ) : (
          /* A segment of the view switcher's pill (the system's ViewSwitcher), its menu on chrome-panel */
          <PopoverTrigger className="cr-seg-item topbar__ext" data-tip={open ? undefined : s.openHint}>
            <Icon name="plug" size={16} /> <span className="topbar__mode-label">{s.connectors}</span>
          </PopoverTrigger>
        )}
        {/* The system's Menu: a paper window; a way in that is already connected carries the check */}
        <PopoverContent align={row ? "start" : "end"} className="cr-menu connectors__menu">
          {installable && (
            <Link href={info && !info.connected ? "/extension/connect" : "/extension/install"} role="menuitem" className={`cr-menu-item${info?.connected ? " is-checked" : ""}`} onClick={() => setOpen(false)}>
              {sectionIcon("extension")}
              <span className="cr-menu-label">{s.extension}{info?.connected && <span className="cr-visually-hidden">, {s.connectedOne}</span>}</span>
              {info?.connected && <Icon name="check" size={16} className="cr-menu-check" />}
            </Link>
          )}
          <MenuItem icon="cable" checked={mcpDone} onClick={() => { setOpen(false); setConnecting(true); }}>
            {s.open}{mcpDone && <span className="cr-visually-hidden">, {s.connectedOne}</span>}
          </MenuItem>
        </PopoverContent>
      </Popover>
      {connecting && <ConnectDialog onClose={() => setConnecting(false)} />}
    </Wrap>
  );
}
