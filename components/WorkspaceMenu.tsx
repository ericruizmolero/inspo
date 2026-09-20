"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { fileToSquareDataURL } from "@/lib/image-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";

/** Avatar del workspace: logo si lo tiene, si no la inicial del nombre */
export function WorkspaceAvatar({ workspace, small }: { workspace: Pick<Workspace, "name" | "logo">; small?: boolean }) {
  return (
    <span className={`ws__avatar${small ? " ws__avatar--sm" : ""}`} aria-hidden>
      {workspace.logo ? <img src={workspace.logo} alt="" /> : workspace.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** Avatar de una persona: foto si la tiene, si no la inicial. Redondo, para distinguirlo del logo de workspace. */
export function UserAvatar({ name, image, small, className = "" }: { name: string; image?: string | null; small?: boolean; className?: string }) {
  return (
    <span className={`ws__avatar ws__avatar--user${small ? " ws__avatar--sm" : ""} ${className}`} aria-hidden>
      {image ? <img src={image} alt="" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const I = {
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
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(workspace.name);

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

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || name === workspace.name) { setRenaming(false); return; }
    setBusy(true); setError("");
    const { error: err } = await authClient.organization.update({ organizationId: workspace.id, data: { name } });
    setBusy(false);
    if (err) { setError(err.message ?? "No se pudo cambiar el nombre"); return; }
    setRenaming(false); setOpen(false);
    router.refresh();
  };

  // Nombre de la persona: va en user.name y se replica al workspace personal, que lleva ese mismo nombre
  const [renamingMe, setRenamingMe] = useState(false);
  const [myName, setMyName] = useState(user.name);
  const renameMe = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = myName.trim();
    if (!name || name === user.name) { setRenamingMe(false); return; }
    setBusy(true); setError("");
    const { error: err } = await authClient.updateUser({ name });
    if (!err) {
      const personal = workspaces.find((w) => w.kind === "personal");
      if (personal) await authClient.organization.update({ organizationId: personal.id, data: { name } });
    }
    setBusy(false);
    if (err) { setError(err.message ?? "No se pudo cambiar el nombre"); return; }
    setRenamingMe(false); setOpen(false);
    router.refresh();
  };

  const logout = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  const setLogo = async (logo: string | null) => {
    setBusy(true); setError("");
    const { error: err } = await authClient.organization.update({ organizationId: workspace.id, data: { logo } });
    setBusy(false);
    if (err) { setError(err.message ?? "No se pudo guardar el logo"); return; }
    setOpen(false);
    router.refresh();
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await setLogo(await fileToSquareDataURL(file, 128));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer la imagen");
    }
  };

  // Foto del miembro: va en user.image (Better Auth), a 96px como data URL igual que el logo
  const setPhoto = async (image: string | null) => {
    setBusy(true); setError("");
    const { error: err } = await authClient.updateUser({ image });
    setBusy(false);
    if (err) { setError(err.message ?? "No se pudo guardar la foto"); return; }
    setOpen(false);
    router.refresh();
  };

  const onPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await setPhoto(await fileToSquareDataURL(file, 96));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer la imagen");
    }
  };

  const personal = workspaces.filter((w) => w.kind === "personal");
  const teams = workspaces.filter((w) => w.kind === "team");

  return (
    <div className="ws" ref={ref}>
      <button className="ws__trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <WorkspaceAvatar workspace={workspace} />
        <span className="ws__names">
          <span className="display ws__name">{workspace.name}</span>
          {/* Si el nombre ya dice "Equipo", no se repite debajo */}
          {(workspace.kind === "personal" || !/equipo/i.test(workspace.name)) && (
            <span className="ws__kind">{workspace.kind === "personal" ? "Personal" : "Equipo"}</span>
          )}
        </span>
      </button>

      {open && (
        <div className="ws__menu" role="menu">
          <div className="ws__section">Personal</div>
          {personal.map((w) => (
            <button key={w.id} className={`ws__item${w.id === workspace.id ? " is-active" : ""}`} onClick={() => switchTo(w.id)} disabled={busy}>
              <WorkspaceAvatar workspace={w} small />
              <span className="ws__item-name">{w.name}</span>
              {w.id === workspace.id && <span className="ws__item-check">{I.check}</span>}
            </button>
          ))}
          <div className="ws__section">Equipos</div>
          {teams.length === 0 && <div className="ws__empty">Aún no estás en ningún equipo</div>}
          {teams.map((w) => (
            <button key={w.id} className={`ws__item${w.id === workspace.id ? " is-active" : ""}`} onClick={() => switchTo(w.id)} disabled={busy}>
              <WorkspaceAvatar workspace={w} small />
              <span className="ws__item-name">{w.name}</span>
              {w.id === workspace.id && <span className="ws__item-check">{I.check}</span>}
            </button>
          ))}
          <div className="ws__divider" />
          {canManage && workspace.kind === "team" && (
            renaming ? (
              <form onSubmit={rename} style={{ display: "flex", gap: 6, padding: "4px 2px" }}>
                <input
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre del equipo"
                  aria-label="Nombre del equipo"
                  autoFocus
                  maxLength={60}
                  style={{ flex: 1, height: 32, fontSize: 13 }}
                  onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setRenaming(false); setNewName(workspace.name); } }}
                />
                <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>Guardar</button>
              </form>
            ) : (
              <button className="ws__item" onClick={() => { setNewName(workspace.name); setRenaming(true); }} disabled={busy}>Cambiar nombre del equipo</button>
            )
          )}
          {canManage && (
            <>
              <button className="ws__item" onClick={() => fileRef.current?.click()} disabled={busy}>
                {workspace.logo ? "Cambiar logo" : "Añadir logo de empresa"}
              </button>
              {workspace.logo && (
                <button className="ws__item ws__item--muted" onClick={() => setLogo(null)} disabled={busy}>Quitar logo</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogoFile} />
              {error && <div className="ws__empty">{error}</div>}
            </>
          )}
          {workspace.kind === "team" && (
            <Link className="ws__item" href="/equipo" onClick={() => setOpen(false)}>Miembros e invitaciones</Link>
          )}
          <Link className="ws__item" href="/equipo?nuevo=1" onClick={() => setOpen(false)}>Crear equipo</Link>
          <div className="ws__divider" />
          <div className="ws__me">
            <UserAvatar name={user.name} image={user.image} />
            <span className="ws__me-text">
              <span className="ws__me-name">{user.name}</span>
              <span className="ws__me-email">{user.email}</span>
            </span>
          </div>
          {renamingMe ? (
            <form onSubmit={renameMe} style={{ display: "flex", gap: 6, padding: "4px 2px" }}>
              <input
                className="input"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="Tu nombre"
                aria-label="Tu nombre"
                autoFocus
                maxLength={60}
                style={{ flex: 1, height: 32, fontSize: 13 }}
                onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setRenamingMe(false); setMyName(user.name); } }}
              />
              <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>Guardar</button>
            </form>
          ) : (
            <button className="ws__item" onClick={() => { setMyName(user.name); setRenamingMe(true); }} disabled={busy}>Cambiar mi nombre</button>
          )}
          <button className="ws__item" onClick={() => photoRef.current?.click()} disabled={busy}>
            {user.image ? "Cambiar mi foto" : "Añadir mi foto"}
          </button>
          {user.image && (
            <button className="ws__item ws__item--muted" onClick={() => setPhoto(null)} disabled={busy}>Quitar mi foto</button>
          )}
          <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhotoFile} />
          {error && !canManage && <div className="ws__empty">{error}</div>}
          <button className="ws__item ws__item--muted" onClick={logout}>Salir</button>
        </div>
      )}
    </div>
  );
}
