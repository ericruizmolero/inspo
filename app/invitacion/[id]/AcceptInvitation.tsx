"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitation({ id, teamName, inviterName, inviterEmail, youAre }: {
  id: string; teamName: string; inviterName: string; inviterEmail: string; youAre: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setBusy(true); setError("");
    const { data, error: err } = await authClient.organization.acceptInvitation({ invitationId: id });
    if (err) { setBusy(false); setError(err.message ?? "No se pudo aceptar"); return; }
    const orgId = data?.invitation?.organizationId;
    if (orgId) await authClient.organization.setActive({ organizationId: orgId });
    // Confirmación antes de soltar a la persona en la librería: sin ella parece que no ha entrado
    setDone(true);
    router.refresh();
    setTimeout(() => router.push("/"), 900);
  };

  if (done) {
    return (
      <div className="auth__sent" role="status">
        <p className="auth__lead">Ya estás en {teamName}</p>
        <p className="auth__hint">Abriendo la librería del equipo…</p>
      </div>
    );
  }

  return (
    <div className="auth__sent">
      <p className="auth__lead">{inviterName} te invita a {teamName}</p>
      <p className="auth__hint">
        {inviterEmail} · Compartiréis la misma librería de inspiración: webs, vídeos e ideas, cada una con su DESIGN.md.
      </p>
      {error && <p className="modal__error">{error}</p>}
      <button className="btn btn--primary btn--block" onClick={accept} disabled={busy}>
        {busy ? "Uniéndote…" : "Unirme al equipo"}
      </button>
      <p className="auth__hint">Entras como {youAre}.</p>
    </div>
  );
}
