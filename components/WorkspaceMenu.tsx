"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import CreateTeamDialog from "./CreateTeamDialog";
import { useT } from "./I18nProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Workspace avatar: its logo if it has one, otherwise the name's initial */
export function WorkspaceAvatar({ workspace, small }: { workspace: Pick<Workspace, "name" | "logo">; small?: boolean }) {
  return (
    <span className={`ws__avatar${small ? " ws__avatar--sm" : ""}`} aria-hidden>
      {workspace.logo ? <img src={workspace.logo} alt="" /> : workspace.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** A person's avatar: photo if they have one, otherwise the initial. Round, to tell it apart from a workspace logo. */
export function UserAvatar({ name, image, small, className = "" }: { name: string; image?: string | null; small?: boolean; className?: string }) {
  return (
    <span className={`ws__avatar ws__avatar--user${small ? " ws__avatar--sm" : ""} ${className}`} aria-hidden>
      {image ? <img src={image} alt="" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const I = {
  gear: (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2.2" /><path d="M8 1.8v1.6M8 12.6v1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M1.8 8h1.6M12.6 8h1.6M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1" /></svg>
  ),
  activity: (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1.8 8.5h2.6l2-5 3.2 9 2-4h2.6" /></svg>
  ),
  plus: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.5l2.5 2.5 4.5-5" />
    </svg>
  ),
};

export default function WorkspaceMenu({ user, workspace, workspaces, isAdmin = false }: {
  user: SessionUser; workspace: Workspace; workspaces: Workspace[]; isAdmin?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const switchTo = async (id: string) => {
    if (id === workspace.id) { setOpen(false); return; }
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
    <div className="ws" ref={ref}>
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="ws__trigger">
        {/* The personal workspace is you: it shows your photo, not the initial */}
        {workspace.kind === "personal" && !workspace.logo
          ? <UserAvatar name={user.name} image={user.image} />
          : <WorkspaceAvatar workspace={workspace} />}
        <span className="ws__names">
          <span className="display ws__name">{workspace.name}</span>
          {/* If the name already says "Equipo" or "Team", it isn't repeated below */}
          {(workspace.kind === "personal" || !/equipo|team/i.test(workspace.name)) && (
            <span className="ws__kind">{workspace.kind === "personal" ? t.ws.personal : t.ws.team}</span>
          )}
        </span>
      </PopoverTrigger>

      {/* Anchored to the whole .ws block, so the panel spans the sidebar */}
      <PopoverContent className="ws__menu" anchor={ref}>
          <div className="ws__section">{t.ws.workspaces}</div>
          {personal.map((w) => (
            <button key={w.id} className={`ws__item${w.id === workspace.id ? " is-active" : ""}`} onClick={() => switchTo(w.id)} disabled={busy}>
              {w.logo ? <WorkspaceAvatar workspace={w} small /> : <UserAvatar name={user.name} image={user.image} small />}
              <span className="ws__item-name">{w.name}</span>
              <span className="ws__item-kind">{t.ws.personal}</span>
              {w.id === workspace.id && <span className="ws__item-check">{I.check}</span>}
            </button>
          ))}
          {teams.map((w) => (
            <button key={w.id} className={`ws__item${w.id === workspace.id ? " is-active" : ""}`} onClick={() => switchTo(w.id)} disabled={busy}>
              <WorkspaceAvatar workspace={w} small />
              <span className="ws__item-name">{w.name}</span>
              {w.id === workspace.id && <span className="ws__item-check">{I.check}</span>}
            </button>
          ))}
          <button className="ws__item ws__item--muted" onClick={() => { setOpen(false); setCreating(true); }}>
            <span className="ws__plus" aria-hidden>{I.plus}</span>
            <span className="ws__item-name">{t.ws.createTeam}</span>
          </button>

          <div className="ws__divider" />
          <Link className="ws__item" href="/settings" onClick={() => setOpen(false)}>
            <span className="ws__plus ws__plus--solid" aria-hidden>{I.gear}</span>
            <span className="ws__item-name">{t.ws.settings}</span>
          </Link>
          {isAdmin && (
            <Link className="ws__item" href="/admin" onClick={() => setOpen(false)}>
              <span className="ws__plus ws__plus--solid" aria-hidden>{I.activity}</span>
              <span className="ws__item-name">{t.ws.appActivity}</span>
            </Link>
          )}
          <button className="ws__item ws__item--muted" onClick={logout}>
            <span className="ws__item-name">{t.ws.signOut}</span>
          </button>
      </PopoverContent>
      </Popover>
      <CreateTeamDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
