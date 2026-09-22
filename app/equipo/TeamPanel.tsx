"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { UserAvatar } from "@/components/WorkspaceMenu";
import type { UsageSummary } from "@/lib/usage";
import { ACTION_LABEL, fmtUsd as usd } from "@/lib/usage-core";

interface Member { id: string; userId: string; name: string; email: string; image?: string | null; role: string; createdAt: string }
interface Invitation { id: string; email: string; role: string | null; expiresAt: string }

const ROLE_LABEL: Record<string, string> = { owner: "Propietario", admin: "Admin", member: "Miembro" };

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export default function TeamPanel({ workspace, me, canManage, members, invitations, startCreating, usage }: {
  workspace: Workspace; me: SessionUser; canManage: boolean; members: Member[]; invitations: Invitation[]; startCreating: boolean; usage?: UsageSummary;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(startCreating);
  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = teamName.trim();
    if (!name) return;
    setBusy(true); setError("");
    const slug = `${slugify(name) || "equipo"}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: err } = await authClient.organization.create({ name, slug });
    setBusy(false);
    if (err) { setError(err.message ?? "No se pudo crear el equipo"); return; }
    setCreating(false); setTeamName("");
    router.push("/equipo"); router.refresh();
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    setBusy(true); setError(""); setMsg("");
    const { error: err } = await authClient.organization.inviteMember({ email: value, role, organizationId: workspace.id });
    setBusy(false);
    if (err) { setError(err.message ?? "No se pudo invitar"); return; }
    setEmail(""); setMsg(`Invitación enviada a ${value}`);
    router.refresh();
  };

  const cancelInvite = async (id: string) => {
    setBusy(true);
    await authClient.organization.cancelInvitation({ invitationId: id });
    setBusy(false); router.refresh();
  };

  const removeMember = async (m: Member) => {
    if (!confirm(`¿Quitar a ${m.name} del equipo?`)) return;
    setBusy(true);
    const { error: err } = await authClient.organization.removeMember({ memberIdOrEmail: m.id, organizationId: workspace.id });
    setBusy(false);
    if (err) setError(err.message ?? "No se pudo quitar"); else router.refresh();
  };

  const leave = async () => {
    if (!confirm(`¿Salir de ${workspace.name}?`)) return;
    setBusy(true);
    const { error: err } = await authClient.organization.leave({ organizationId: workspace.id });
    setBusy(false);
    if (err) { setError(err.message ?? "No se pudo salir"); return; }
    router.push("/"); router.refresh();
  };

  return (
    <div className="page__body">
      {error && <p className="modal__error">{error}</p>}
      {msg && <p className="page__ok">{msg}</p>}

      {usage && (
        <section className="panel">
          <div className="panel__head">
            <span className="panel__title">Uso de IA</span>
            <span className="panel__meta">últimos {usage.sinceDays} días</span>
            <span className="panel__meta" style={{ marginLeft: "auto", color: "var(--text)" }}>{usd(usage.totalUsd)}</span>
          </div>
          {usage.byAction.length === 0 ? (
            <p className="panel__hint">Todavía no hay llamadas registradas. Cada DESIGN.md, etiquetado o búsqueda IA queda apuntado aquí con su coste estimado.</p>
          ) : (
            <>
              <ul className="list">
                {usage.byAction.map((a) => (
                  <li key={a.action} className="list__row">
                    <span className="list__main">
                      <span className="list__name">{ACTION_LABEL[a.action] ?? a.action}</span>
                      <span className="list__sub">{a.action.startsWith("jev_") && a.units ? `${a.units} items en ${a.calls} llamadas` : `${a.calls} ${a.calls === 1 ? "llamada" : "llamadas"}`}</span>
                    </span>
                    <span className="list__role">{usd(a.usd)}</span>
                  </li>
                ))}
              </ul>
              {usage.byUser.length > 1 && (
                <>
                  <div className="panel__head" style={{ marginTop: 12 }}><span className="panel__title">Por persona</span></div>
                  <ul className="list">
                    {usage.byUser.map((u) => (
                      <li key={u.userId ?? "sys"} className="list__row">
                        <UserAvatar name={u.name} image={members.find((m) => m.userId === u.userId)?.image} small />
                        <span className="list__main"><span className="list__name">{u.name}</span><span className="list__sub">{u.calls} llamadas</span></span>
                        <span className="list__role">{usd(u.usd)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="panel__hint">Coste estimado con la tarifa pública de Anthropic y de Jev. Sirve para dimensionar el pricing, no es la factura.</p>
            </>
          )}
        </section>
      )}

      {workspace.kind === "team" && (
        <section className="panel">
          <div className="panel__head">
            <span className="panel__title">Miembros</span>
            <span className="panel__meta">{members.length}</span>
          </div>
          <ul className="list">
            {members.map((m) => (
              <li key={m.id} className="list__row">
                <UserAvatar name={m.name} image={m.image} />
                <span className="list__main">
                  <span className="list__name">{m.name}{m.userId === me.id && <span className="list__you"> · tú</span>}</span>
                  <span className="list__sub">{m.email}</span>
                </span>
                <span className="list__role">{ROLE_LABEL[m.role.split(",")[0]] ?? m.role}</span>
                {canManage && m.userId !== me.id && (
                  <button className="btn btn--ghost btn--sm" onClick={() => removeMember(m)} disabled={busy}>Quitar</button>
                )}
              </li>
            ))}
          </ul>

          {canManage && (
            <form onSubmit={invite} className="invite">
              <input className="input" type="email" placeholder="correo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <select className="input invite__role" value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")}>
                <option value="member">Miembro</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn--primary" type="submit" disabled={busy || !email.trim()}>Invitar</button>
            </form>
          )}

          {invitations.length > 0 && (
            <>
              <div className="panel__head" style={{ marginTop: 16 }}>
                <span className="panel__title">Invitaciones pendientes</span>
              </div>
              <ul className="list">
                {invitations.map((i) => (
                  <li key={i.id} className="list__row">
                    <span className="list__main">
                      <span className="list__name">{i.email}</span>
                      <span className="list__sub">{ROLE_LABEL[i.role ?? "member"] ?? i.role} · caduca {new Date(i.expiresAt).toLocaleDateString("es-ES")}</span>
                    </span>
                    {canManage && <button className="btn btn--ghost btn--sm" onClick={() => cancelInvite(i.id)} disabled={busy}>Cancelar</button>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {workspace.role !== "owner" && (
            <button className="btn btn--ghost btn--sm" style={{ marginTop: 16 }} onClick={leave} disabled={busy}>Salir del equipo</button>
          )}
        </section>
      )}

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">Nuevo equipo</span>
        </div>
        {creating ? (
          <form onSubmit={createTeam} className="invite">
            <input className="input" autoFocus placeholder="Nombre del equipo" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
            <button className="btn btn--primary" type="submit" disabled={busy || !teamName.trim()}>Crear</button>
            {workspace.kind === "team" && <button className="btn btn--ghost" type="button" onClick={() => setCreating(false)}>Cancelar</button>}
          </form>
        ) : (
          <button className="btn btn--ghost" onClick={() => setCreating(true)}>Crear un equipo</button>
        )}
        <p className="panel__hint">Un equipo tiene su propia librería. Invita a quien quieras por correo; tú serás el propietario.</p>
      </section>
    </div>
  );
}
