"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import CreateTeamDialog from "./CreateTeamDialog";
import { useWorkspaceSwitch } from "./workspace-switch";
import { useT } from "./I18nProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, MenuItem, MenuLabel, Separator, toneFor } from "@/components/criterio";

/** The system's Avatar, out of the accessibility tree: the name always sits beside it */
function Face({ name, src, square, small, className = "" }: { name: string; src?: string | null; square?: boolean; small?: boolean; className?: string }) {
  return (
    <span className={`ws__face ${className}`} aria-hidden>
      <Avatar initials={name.slice(0, 1).toUpperCase()} name={name} tone={toneFor(name)} src={src} square={square} size={small ? 20 : 28} />
    </span>
  );
}

/** Workspace avatar: the system's Avatar, square; its logo if it has one, otherwise the name's initial */
export function WorkspaceAvatar({ workspace, small }: { workspace: Pick<Workspace, "name" | "logo">; small?: boolean }) {
  return <Face name={workspace.name} src={workspace.logo} square small={small} />;
}

/** A workspace as a place: always square. The personal one shows your photo when it has no logo */
export function WorkspaceFace({ workspace, user, small }: { workspace: Pick<Workspace, "name" | "logo" | "kind">; user: Pick<SessionUser, "name" | "image">; small?: boolean }) {
  if (workspace.kind !== "personal" || workspace.logo) return <WorkspaceAvatar workspace={workspace} small={small} />;
  return <Face name={user.name} src={user.image} square small={small} />;
}

/** A person's avatar: the system's Avatar in the person's tone, photo if they have one, otherwise the initial.
 *  Round, to tell it apart from a workspace logo. */
export function UserAvatar({ name, image, small, className = "" }: { name: string; image?: string | null; small?: boolean; className?: string }) {
  return <Face name={name} src={image} small={small} className={className} />;
}

/** The menu's glyphs the system's Icon does not draw, on its 24 grid with its 2px stroke */
const I = {
  swatches: (
    <svg className="cr-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><circle cx="16.5" cy="16.5" r="3.5" /></svg>
  ),
  gear: (
    <svg className="cr-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.4M12 18.6V21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M3 12h2.4M18.6 12H21M5.6 18.4l1.7-1.7M16.7 7.3l1.7-1.7" /></svg>
  ),
  activity: (
    <svg className="cr-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12.5h4l3-7.5 4.5 13.5 3-6H21" /></svg>
  ),
};

export default function WorkspaceMenu({ user, workspace, workspaces, isAdmin = false, trigger, triggerClassName, triggerLabel, extras, onOpen }: {
  user: SessionUser; workspace: Workspace; workspaces: Workspace[]; isAdmin?: boolean;
  /** What opens the menu, in place of the workspace card (the island's avatar); the menu then hangs from it */
  trigger?: ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  /** Rows above Settings (the island puts the directory, feedback and the plan here); any click in them closes the menu */
  extras?: ReactNode;
  /** Called each time the menu opens (the island re-reads the plan's usage, so the meter is never stale) */
  onOpen?: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Inside the library the switch is instant (the other workspaces are already loaded); elsewhere the page refreshes
  const instant = useWorkspaceSwitch();
  const switchTo = async (id: string) => {
    if (id === workspace.id) { setOpen(false); return; }
    if (instant) { setOpen(false); await instant.switchTo(id); return; }
    setBusy(true);
    await authClient.organization.setActive({ organizationId: id });
    setOpen(false); setBusy(false);
    router.refresh();
  };

  const logout = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  const personal = workspaces.filter((w) => w.kind === "personal");
  const teams = workspaces.filter((w) => w.kind === "team");

  return (
    <div className={trigger ? "ws ws--inline" : "ws"} ref={ref}>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { instant?.prefetch(); onOpen?.(); } }}>
      <PopoverTrigger className={triggerClassName ?? "ws__trigger"} aria-label={triggerLabel} onPointerEnter={() => instant?.prefetch()}>
        {trigger ?? (
          <>
            {/* The personal workspace shows your photo, square like every workspace */}
            <WorkspaceFace workspace={workspace} user={user} />
            <span className="ws__names">
              <span className="t-title-s ws__name">{workspace.name}</span>
              {/* If the name already says "Equipo" or "Team", it isn't repeated below */}
              {(workspace.kind === "personal" || !/equipo|team/i.test(workspace.name)) && (
                <span className="ws__kind">{workspace.kind === "personal" ? t.ws.personal : t.ws.team}</span>
              )}
            </span>
          </>
        )}
      </PopoverTrigger>

      {/* Anchored to the whole .ws block, so the panel spans the sidebar; from a chip, to the chip.
          It always hangs below: a menu too tall for the window scrolls inside instead of jumping to the side */}
      {/* The system's Menu: a paper window in both themes, the moss bar on top, engraved lines between groups */}
      <PopoverContent className={trigger ? "cr-menu ws__menu ws__menu--inline" : "cr-menu ws__menu"} anchor={trigger ? undefined : ref}
        collisionAvoidance={{ side: "none", align: "shift", fallbackAxisSide: "none" }}>
          <MenuLabel bar>{t.ws.workspaces}</MenuLabel>
          {personal.map((w) => (
            <MenuItem key={w.id} icon={<WorkspaceFace workspace={w} user={user} small />} checked={w.id === workspace.id} onClick={() => switchTo(w.id)} disabled={busy}>
              {w.name} <span className="ws__item-kind">{t.ws.personal}</span>
            </MenuItem>
          ))}
          {teams.map((w) => (
            <MenuItem key={w.id} icon={<WorkspaceAvatar workspace={w} small />} checked={w.id === workspace.id} onClick={() => switchTo(w.id)} disabled={busy}>
              {w.name}
            </MenuItem>
          ))}
          <MenuItem icon="plus" className="is-muted" onClick={() => { setOpen(false); setCreating(true); }}>{t.ws.createTeam}</MenuItem>

          <Separator />
          {extras && <div className="ws__extras" onClick={() => setOpen(false)}>{extras}</div>}
          <Link className="cr-menu-item" role="menuitem" href="/settings" onClick={() => setOpen(false)}>
            {I.gear}<span className="cr-menu-label">{t.ws.settings}</span>
          </Link>
          {isAdmin && (
            <Link className="cr-menu-item" role="menuitem" href="/admin" onClick={() => setOpen(false)}>
              {I.activity}<span className="cr-menu-label">{t.ws.appActivity}</span>
            </Link>
          )}
          {isAdmin && (
            <Link className="cr-menu-item" role="menuitem" href="/library" onClick={() => setOpen(false)}>
              {I.swatches}<span className="cr-menu-label">{t.ws.designSystem}</span>
            </Link>
          )}
          <Separator />
          <MenuItem className="is-muted" onClick={logout}>{t.ws.signOut}</MenuItem>
      </PopoverContent>
      </Popover>
      <CreateTeamDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
