"use client";

import { Fragment, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import CreateTeamDialog from "./CreateTeamDialog";
import { setActiveWorkspace, useWorkspaceSwitch } from "./workspace-switch";
import { useT } from "./I18nProvider";
import { sectionIcon } from "./section-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, Icon, MenuItem, MenuLabel, Separator, toneFor } from "@/components/criterio";

/** The system's Avatar, out of the accessibility tree: the name always sits beside it */
function Face({ name, src, square, small, size, className = "" }: { name: string; src?: string | null; square?: boolean; small?: boolean; size?: number; className?: string }) {
  return (
    <span className={`ws__face ${className}`} aria-hidden>
      <Avatar initials={name.slice(0, 1).toUpperCase()} name={name} tone={toneFor(name)} src={src} square={square} size={size ?? (small ? 20 : 28)} />
    </span>
  );
}

/** Workspace avatar: the system's Avatar, square; its logo if it has one, otherwise the name's initial.
 *  `size` (px) wins over `small` (20) and the default (28): the island's tile is 26 */
export function WorkspaceAvatar({ workspace, small, size }: { workspace: Pick<Workspace, "name" | "logo">; small?: boolean; size?: number }) {
  return <Face name={workspace.name} src={workspace.logo} square small={small} size={size} />;
}

/** A workspace as a place: always square. The personal one shows your photo when it has no logo */
export function WorkspaceFace({ workspace, user, small, size }: { workspace: Pick<Workspace, "name" | "logo" | "kind">; user: Pick<SessionUser, "name" | "image">; small?: boolean; size?: number }) {
  if (workspace.kind !== "personal" || workspace.logo) return <WorkspaceAvatar workspace={workspace} small={small} size={size} />;
  return <Face name={user.name} src={user.image} square small={small} size={size} />;
}

/** A person's avatar: the system's Avatar in the person's tone, photo if they have one, otherwise the initial.
 *  Round, to tell it apart from a workspace logo. */
export function UserAvatar({ name, image, small, className = "" }: { name: string; image?: string | null; small?: boolean; className?: string }) {
  return <Face name={name} src={image} small={small} className={className} />;
}

/** The menu's glyphs the system's Icon does not draw, on its 24 grid with its 2px stroke */
const I = {
  swatches: <Icon name="swatches" size={16} />,
  gear: <Icon name="gear" size={16} />,
  activity: <Icon name="activity" size={16} />,
};

/**
 * The switcher's list in runs: the workspaces one plan pays for sit together under its account's name when the person
 * sees two or more of them; the rest run on unlabelled, as they always did. The order is listWorkspaces', personal
 * first, and a plan's group takes the place of its first workspace.
 */
function byAccount(list: Workspace[]): { account: string | null; list: Workspace[] }[] {
  const byId = new Map<string, Workspace[]>();
  for (const w of list) byId.set(w.billingAccountId, [...(byId.get(w.billingAccountId) ?? []), w]);
  const runs: { account: string | null; list: Workspace[] }[] = [];
  for (const group of byId.values()) {
    const last = runs.at(-1);
    if (group.length > 1) runs.push({ account: group[0].billingAccountName, list: group });
    else if (last && !last.account) last.list.push(group[0]);
    else runs.push({ account: null, list: group });
  }
  return runs;
}

export default function WorkspaceMenu({ user, workspace, workspaces, isAdmin = false, trigger, triggerClassName, triggerLabel, extras, onOpen }: {
  user: SessionUser; workspace: Workspace; workspaces: Workspace[]; isAdmin?: boolean;
  /** What opens the menu, in place of the workspace card (the island's avatar); the menu then hangs from it */
  trigger?: ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  /** Rows above Settings (the island puts the resources, feedback and the plan here); any click in them closes the menu */
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
    await setActiveWorkspace(id);
    setOpen(false); setBusy(false);
    router.refresh();
  };

  const logout = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  const row = (w: Workspace) => w.kind === "personal" ? (
    <MenuItem key={w.id} icon={<WorkspaceFace workspace={w} user={user} small />} checked={w.id === workspace.id} onClick={() => switchTo(w.id)} disabled={busy}>
      {w.name} <span className="ws__item-kind">{t.ws.personal}</span>
    </MenuItem>
  ) : (
    <MenuItem key={w.id} icon={<WorkspaceAvatar workspace={w} small />} checked={w.id === workspace.id} onClick={() => switchTo(w.id)} disabled={busy}>
      {w.name}
    </MenuItem>
  );

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
      {/* The system's Menu: a paper window in both themes, a quiet heading on top (no moss bar: Eric, 07-10), engraved lines between groups */}
      <PopoverContent className={trigger ? "cr-menu ws__menu ws__menu--inline" : "cr-menu ws__menu"} anchor={trigger ? undefined : ref}
        collisionAvoidance={{ side: "none", align: "shift", fallbackAxisSide: "none" }}>
          <MenuLabel>{t.ws.workspaces}</MenuLabel>
          {byAccount(workspaces).map((seg, i) => (
            <Fragment key={seg.account ?? seg.list[0].id}>
              {i > 0 && <Separator />}
              {seg.account && <MenuLabel>{seg.account}</MenuLabel>}
              {seg.list.map(row)}
            </Fragment>
          ))}
          <MenuItem icon="plus" className="is-muted" onClick={() => { setOpen(false); setCreating(true); }}>{t.ws.createTeam}</MenuItem>

          <Separator />
          {extras && <div className="ws__extras" onClick={() => setOpen(false)}>{extras}</div>}
          <Link className="cr-menu-item" role="menuitem" href="/settings" prefetch={false} onClick={() => setOpen(false)}>
            {I.gear}<span className="cr-menu-label">{t.ws.settings}</span>
          </Link>
          <Link className="cr-menu-item" role="menuitem" href="/settings/invite" prefetch={false} onClick={() => setOpen(false)}>
            {sectionIcon("invite")}<span className="cr-menu-label">{t.ws.invite}</span>
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
