"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";

const I = {
  chevron: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.5l2.5 2.5 4.5-5" />
    </svg>
  ),
};

export default function WorkspaceMenu({ user, workspace, workspaces }: {
  user: SessionUser; workspace: Workspace; workspaces: Workspace[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const switchTo = async (id: string) => {
    if (id === workspace.id) { setOpen(false); return; }
    setBusy(true);
    await authClient.organization.setActive({ organizationId: id });
    setOpen(false); setBusy(false);
    router.refresh();
  };

  const logout = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  const personal = workspaces.filter((w) => w.kind === "personal");
  const teams = workspaces.filter((w) => w.kind === "team");

  return (
    <div className="ws" ref={ref}>
      <button className="ws__trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <span className="ws__avatar" aria-hidden>{workspace.name.slice(0, 1).toUpperCase()}</span>
        <span className="ws__names">
          <span className="display ws__name">{workspace.name}</span>
          <span className="ws__kind">{workspace.kind === "personal" ? "Personal" : "Equipo"}</span>
        </span>
        <span className="ws__chevron">{I.chevron}</span>
      </button>

      {open && (
        <div className="ws__menu" role="menu">
          <div className="ws__section">Personal</div>
          {personal.map((w) => (
            <button key={w.id} className={`ws__item${w.id === workspace.id ? " is-active" : ""}`} onClick={() => switchTo(w.id)} disabled={busy}>
              <span className="ws__item-name">{w.name}</span>
              {w.id === workspace.id && <span className="ws__item-check">{I.check}</span>}
            </button>
          ))}
          <div className="ws__section">Equipos</div>
          {teams.length === 0 && <div className="ws__empty">Aún no estás en ningún equipo</div>}
          {teams.map((w) => (
            <button key={w.id} className={`ws__item${w.id === workspace.id ? " is-active" : ""}`} onClick={() => switchTo(w.id)} disabled={busy}>
              <span className="ws__item-name">{w.name}</span>
              {w.id === workspace.id && <span className="ws__item-check">{I.check}</span>}
            </button>
          ))}
          <div className="ws__divider" />
          {workspace.kind === "team" && (
            <Link className="ws__item" href="/equipo" onClick={() => setOpen(false)}>Miembros e invitaciones</Link>
          )}
          <Link className="ws__item" href="/equipo?nuevo=1" onClick={() => setOpen(false)}>Crear equipo</Link>
          <div className="ws__divider" />
          <div className="ws__user">{user.email}</div>
          <button className="ws__item ws__item--muted" onClick={logout}>Salir</button>
        </div>
      )}
    </div>
  );
}
